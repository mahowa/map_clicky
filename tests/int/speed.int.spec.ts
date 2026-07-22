import { describe, it, expect } from 'vitest'
import {
  SPEED_ROUND_SECONDS,
  SPEED_RUN_LENGTH,
  buildSpeedRun,
  expiryAction,
  formatDuration,
  speedPool,
} from '@/lib/speed'
import { seededRng } from '@/lib/rng'

describe('speedPool', () => {
  it('merges all quiz pools without duplicates', () => {
    const pool = speedPool()
    const keys = pool.map((p) => `${p.name}|${p.country ?? ''}`)
    expect(new Set(keys).size).toBe(keys.length)
    // Far bigger than any single quiz: capitals + cities + continents combined.
    expect(pool.length).toBeGreaterThan(100)
  })

  it('keeps places that share a name but not a country (e.g. the two Columbias)', () => {
    const pool = speedPool()
    const columbus = pool.filter((p) => p.name === 'Columbia')
    // "Columbia, South Carolina" (US capitals) — distinct from Colombia places.
    expect(columbus.length).toBeGreaterThanOrEqual(1)
  })
})

describe('buildSpeedRun', () => {
  it('builds a timed practice run of distinct places', () => {
    const run = buildSpeedRun(seededRng('speed-test'))
    expect(run.timed).toBe(true)
    expect(run.mode).toBe('practice')
    expect(run.dateKey).toBe('')
    expect(run.title).toBe('Speed Run')
    expect(run.rounds.length).toBe(SPEED_RUN_LENGTH)
    const names = run.rounds.map((r) => `${r.name}|${r.country ?? ''}`)
    expect(new Set(names).size).toBe(names.length)
  })

  it('is deterministic per seed', () => {
    const a = buildSpeedRun(seededRng('s')).rounds.map((r) => r.name)
    const b = buildSpeedRun(seededRng('s')).rounds.map((r) => r.name)
    expect(a).toEqual(b)
  })
})

describe('expiryAction', () => {
  it('submits whatever guess is on the board when the clock expires', () => {
    expect(expiryAction(true)).toBe('submit')
  })
  it('scores a zero when no guess was placed', () => {
    expect(expiryAction(false)).toBe('zero')
  })
})

describe('formatDuration', () => {
  it('formats m:ss.t', () => {
    expect(formatDuration(83459)).toBe('1:23.4')
    expect(formatDuration(0)).toBe('0:00.0')
    expect(formatDuration(5000)).toBe('0:05.0')
    expect(formatDuration(60000)).toBe('1:00.0')
  })
  it('clamps negatives to zero', () => {
    expect(formatDuration(-500)).toBe('0:00.0')
  })
  it('a full no-guess speed run reads as expected', () => {
    expect(formatDuration(SPEED_RUN_LENGTH * SPEED_ROUND_SECONDS * 1000)).toBe('1:15.0')
  })
})
