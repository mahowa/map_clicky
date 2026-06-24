import { describe, it, expect } from 'vitest'
import { selectRounds, ROUND_DIFFICULTIES, type NewsForDay } from '@/lib/daily-generator'
import type { Difficulty } from '@/lib/scoring'

const POOLS: Record<Difficulty, number[]> = {
  easy: [1, 2, 3, 4],
  medium: [5, 6, 7],
  hard: [8, 9, 10, 11],
}

const NO_NEWS: NewsForDay = { candidateIds: new Set(), eventByLocation: new Map() }

describe('selectRounds', () => {
  it('is deterministic for the same seed and fills the ramp', () => {
    const a = selectRounds({ seed: '2026-06-24', pools: POOLS, used: new Set(), news: NO_NEWS })
    const b = selectRounds({ seed: '2026-06-24', pools: POOLS, used: new Set(), news: NO_NEWS })
    expect(a).toEqual(b)
    expect(a).toHaveLength(5)
    expect(a.map((r) => r.difficulty)).toEqual(ROUND_DIFFICULTIES)
    expect(new Set(a.map((r) => r.location)).size).toBe(5) // no dupes
  })

  it('differs across seeds (news-independent selection still varies by day)', () => {
    const a = selectRounds({ seed: '2026-06-24', pools: POOLS, used: new Set(), news: NO_NEWS })
    const b = selectRounds({ seed: '2026-06-25', pools: POOLS, used: new Set(), news: NO_NEWS })
    expect(a).not.toEqual(b)
  })

  it('attaches no event blurb when there is no news', () => {
    const a = selectRounds({ seed: 's', pools: POOLS, used: new Set(), news: NO_NEWS })
    expect(a.every((r) => r.event === undefined)).toBe(true)
  })

  it('prefers news-matched places and carries their event text', () => {
    const news: NewsForDay = {
      candidateIds: new Set([3, 9]),
      eventByLocation: new Map([
        [3, 'On this day in 1789…'],
        [9, 'On this day in 1944…'],
      ]),
    }
    const rounds = selectRounds({ seed: 'x', pools: POOLS, used: new Set(), news })
    // The only news-eligible easy id is 3 → it takes the first easy slot.
    expect(rounds[0]).toEqual({ location: 3, difficulty: 'easy', event: 'On this day in 1789…' })
    // The only news-eligible hard id is 9 → it takes the first hard slot.
    expect(rounds[3]).toEqual({ location: 9, difficulty: 'hard', event: 'On this day in 1944…' })
  })

  it('avoids recently-used ids when alternatives exist', () => {
    const rounds = selectRounds({
      seed: 'avoid',
      pools: POOLS,
      used: new Set([1, 2]), // two easy ids recently used
      news: NO_NEWS,
    })
    const easyPicks = rounds.filter((r) => r.difficulty === 'easy').map((r) => r.location).sort()
    expect(easyPicks).toEqual([3, 4]) // both unused easy ids chosen instead
  })

  it('always returns a full 5 even when news ids are unrelated to the pools', () => {
    const news: NewsForDay = { candidateIds: new Set([999]), eventByLocation: new Map() }
    const rounds = selectRounds({ seed: 's2', pools: POOLS, used: new Set(), news })
    expect(rounds).toHaveLength(5)
    expect(rounds.map((r) => r.difficulty)).toEqual(ROUND_DIFFICULTIES)
  })
})
