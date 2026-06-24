import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { seededRng, shuffle } from './rng'
import type { Difficulty } from './scoring'

/** The daily ramp: two easy, one medium, two hard (mirrors MapTap). */
export const ROUND_DIFFICULTIES: Difficulty[] = ['easy', 'easy', 'medium', 'hard', 'hard']

/** Don't reuse a location that appeared in a daily within this many days. */
export const AVOID_RECENT_DAYS = 30

/** Max candidates considered per difficulty (deterministic, sorted by id). */
const POOL_LIMIT = 1000

type DailyResult = { created: boolean; reason?: string; date: string; locationIds: number[] }

function dayBounds(dateStr: string): { start: string; next: string } {
  const start = `${dateStr}T00:00:00.000Z`
  const next = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString()
  return { start, next }
}

async function poolForDifficulty(payload: Payload, difficulty: Difficulty): Promise<number[]> {
  const res = await payload.find({
    collection: 'locations',
    where: { difficulty: { equals: difficulty } },
    sort: 'id',
    limit: POOL_LIMIT,
    depth: 0,
  })
  return res.docs.map((d) => d.id as number)
}

export type NewsForDay = {
  /** Location ids referenced by any of today's history events. */
  candidateIds: Set<number>
  /** Location id → the event blurb that selected it (first event, stable order). */
  eventByLocation: Map<number, string>
}

/**
 * Read today's history events from the news inbox and resolve which locations
 * they reference. `dateStr` is YYYY-MM-DD (UTC); events recur on the MM-DD
 * calendar day. Returns empty sets when nothing is ingested — the caller then
 * falls back to the population-based pools.
 */
async function newsForDay(payload: Payload, dateStr: string): Promise<NewsForDay> {
  const calendarDay = dateStr.slice(5, 10)
  const res = await payload.find({
    collection: 'news-items',
    where: { calendarDay: { equals: calendarDay } },
    sort: 'sourceId', // stable order so first-event-wins is deterministic
    limit: 1000,
    depth: 0,
  })

  const candidateIds = new Set<number>()
  const eventByLocation = new Map<number, string>()
  for (const item of res.docs) {
    const text = typeof item.text === 'string' ? item.text : ''
    const matched = (item.matchedLocations ?? []) as (number | { id: number })[]
    for (const m of matched) {
      const id = typeof m === 'object' ? m.id : m
      if (typeof id !== 'number') continue
      candidateIds.add(id)
      if (text && !eventByLocation.has(id)) eventByLocation.set(id, text)
    }
  }
  return { candidateIds, eventByLocation }
}

export type SelectedRound = { location: number; difficulty: Difficulty; event?: string }

type SelectInput = {
  seed: string
  /** Candidate location ids per difficulty, in a fixed (id-sorted) order. */
  pools: Record<Difficulty, number[]>
  /** Ids used in the recent window — avoided when possible. */
  used: Set<number>
  news: NewsForDay
}

/**
 * Pure, deterministic round selection: shuffle each difficulty pool with the
 * date-seeded RNG, then fill the ramp preferring today's news-matched places,
 * falling back to unused, then any. With empty news this is byte-identical to
 * the legacy population-based order. Extracted so it's testable without a DB.
 */
export function selectRounds({ seed, pools, used, news }: SelectInput): SelectedRound[] {
  const rng = seededRng(seed)
  const shuffled: Record<Difficulty, number[]> = {
    easy: shuffle(pools.easy, rng),
    medium: shuffle(pools.medium, rng),
    hard: shuffle(pools.hard, rng),
  }

  const chosen = new Set<number>()
  const isNews = (id: number): boolean => news.candidateIds.has(id)
  const take = (difficulty: Difficulty): number | null => {
    const pool = shuffled[difficulty]
    // News-first within the difficulty: news+unused, then news (allow used),
    // then unused, then any. With no news these collapse to the legacy order.
    for (const id of pool) if (!chosen.has(id) && !used.has(id) && isNews(id)) return id
    for (const id of pool) if (!chosen.has(id) && isNews(id)) return id
    for (const id of pool) if (!chosen.has(id) && !used.has(id)) return id
    for (const id of pool) if (!chosen.has(id)) return id
    // Last resort: any difficulty (news-preferred there too).
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[])
      for (const id of shuffled[d]) if (!chosen.has(id) && isNews(id)) return id
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[])
      for (const id of shuffled[d]) if (!chosen.has(id)) return id
    return null
  }

  const rounds: SelectedRound[] = []
  for (const difficulty of ROUND_DIFFICULTIES) {
    const id = take(difficulty)
    if (id == null) break
    chosen.add(id)
    const event = news.eventByLocation.get(id)
    rounds.push(event ? { location: id, difficulty, event } : { location: id, difficulty })
  }
  return rounds
}

/**
 * Create the daily set for `dateStr` (YYYY-MM-DD, UTC) if it doesn't exist.
 * Deterministic: the same date + same location pool always yields the same set.
 */
export async function getOrCreateDailySet(
  dateStr: string,
  payloadArg?: Payload,
): Promise<DailyResult> {
  const payload = payloadArg ?? (await getPayload({ config: await config }))
  const { start, next } = dayBounds(dateStr)

  const existing = await payload.find({
    collection: 'daily-sets',
    where: { date: { greater_than_equal: start, less_than: next } },
    limit: 1,
    depth: 0,
  })
  if (existing.docs.length > 0) {
    return { created: false, reason: 'already exists', date: dateStr, locationIds: [] }
  }

  // Locations used in the recent window — avoid repeats.
  const recentStart = new Date(Date.parse(start) - AVOID_RECENT_DAYS * 86400000).toISOString()
  const recent = await payload.find({
    collection: 'daily-sets',
    where: { date: { greater_than_equal: recentStart, less_than: start } },
    limit: 1000,
    depth: 0,
  })
  const used = new Set<number>()
  for (const set of recent.docs) {
    for (const r of (set.rounds ?? []) as { location: number | { id: number } }[]) {
      const id = typeof r.location === 'object' ? r.location.id : r.location
      if (typeof id === 'number') used.add(id)
    }
  }

  // Today's history events drive *which* places are chosen; empty ⇒ legacy behavior.
  const news = await newsForDay(payload, dateStr)
  const pools: Record<Difficulty, number[]> = {
    easy: await poolForDifficulty(payload, 'easy'),
    medium: await poolForDifficulty(payload, 'medium'),
    hard: await poolForDifficulty(payload, 'hard'),
  }

  const rounds = selectRounds({ seed: dateStr, pools, used, news })

  if (rounds.length === 0) {
    return { created: false, reason: 'no locations in pool', date: dateStr, locationIds: [] }
  }

  await payload.create({
    collection: 'daily-sets',
    data: { date: start, rounds },
  })

  return { created: true, date: dateStr, locationIds: rounds.map((r) => r.location) }
}
