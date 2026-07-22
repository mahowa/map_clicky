import 'server-only'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Difficulty } from './scoring'
import type { GameRun, Round } from './game-types'
import { dailyLockKey } from './locks'

type LocationLike = {
  name: string
  country?: string | null
  lat: number
  lng: number
  difficulty: Difficulty
  facts?: { text: string }[] | null
}

function toRound(loc: LocationLike, difficulty?: Difficulty, event?: string | null): Round {
  const locFact = loc.facts && loc.facts.length > 0 ? loc.facts[0].text : null
  return {
    name: loc.name,
    country: loc.country ?? null,
    lat: loc.lat,
    lng: loc.lng,
    difficulty: difficulty ?? loc.difficulty,
    // Prefer the "on this day" blurb that selected the place; fall back to its facts.
    fact: (event && event.trim()) || locFact,
  }
}

/** UTC day bounds [start, nextStart) for a given date (defaults to now). */
export function utcDayBounds(now: Date = new Date()): { start: string; next: string; day: string } {
  const day = now.toISOString().slice(0, 10)
  const start = `${day}T00:00:00.000Z`
  const next = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString()
  return { start, next, day }
}

/**
 * Load today's daily run (the daily-set whose date is the current UTC day).
 * Falls back to the most recent daily set, and finally to a random sample of
 * locations so the game is always playable.
 */
export async function getDailyRun(now: Date = new Date()): Promise<GameRun> {
  const payload = await getPayload({ config: await config })
  const { start, next } = utcDayBounds(now)

  // Today's set first; if none yet, fall back to the most recent.
  const today = await payload.find({
    collection: 'daily-sets',
    depth: 2,
    limit: 1,
    where: { date: { greater_than_equal: start, less_than: next } },
  })
  const daily = today.docs.length
    ? today
    : await payload.find({ collection: 'daily-sets', depth: 2, limit: 1, sort: '-date' })

  const set = daily.docs[0]
  if (set && Array.isArray(set.rounds) && set.rounds.length > 0) {
    const rounds: Round[] = set.rounds
      .filter((r) => r.location && typeof r.location === 'object')
      .map((r) =>
        toRound(
          r.location as unknown as LocationLike,
          r.difficulty as Difficulty,
          (r as { event?: string | null }).event,
        ),
      )
    if (rounds.length > 0) {
      const dateKey = typeof set.date === 'string' ? set.date.slice(0, 10) : ''
      return {
        title: `Daily — ${dateKey || 'Daily'}`,
        rounds,
        mode: 'daily',
        dateKey,
        lockKey: dateKey ? dailyLockKey(dateKey) : undefined,
      }
    }
  }

  // Fallback: any 5 locations (practice — never locks).
  const locs = await payload.find({ collection: 'locations', limit: 5, depth: 0 })
  const rounds = locs.docs.map((l) => toRound(l as unknown as LocationLike))
  return { title: 'Practice', rounds, mode: 'practice', dateKey: '' }
}
