import { describe, it, expect } from 'vitest'
import {
  SPEED_ROUND_SECONDS,
  SPEED_RUN_LENGTH,
  buildPracticeSpeedRun,
  buildSpeedRun,
  expiryAction,
  formatDuration,
  initialStarted,
  showStartGate,
  speedLockKey,
  speedPool,
} from '@/lib/speed'
import { seededRng } from '@/lib/rng'
import { getQuiz } from '@/lib/quizzes'

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
  it('builds a timed, lockable run of distinct places for the day', () => {
    const run = buildSpeedRun('2026-07-22')
    expect(run.timed).toBe(true)
    expect(run.mode).toBe('practice')
    expect(run.dateKey).toBe('2026-07-22')
    expect(run.lockKey).toBe(speedLockKey('2026-07-22'))
    expect(run.title).toBe('Speed Run')
    expect(run.rounds.length).toBe(SPEED_RUN_LENGTH)
    const names = run.rounds.map((r) => `${r.name}|${r.country ?? ''}`)
    expect(new Set(names).size).toBe(names.length)
  })

  it('deals everyone the same hand on the same day (#21)', () => {
    const a = buildSpeedRun('2026-07-22').rounds.map((r) => r.name)
    const b = buildSpeedRun('2026-07-22').rounds.map((r) => r.name)
    expect(a).toEqual(b)
  })

  it('deals a different hand on a different day', () => {
    const a = buildSpeedRun('2026-07-22').rounds.map((r) => r.name)
    const b = buildSpeedRun('2026-07-23').rounds.map((r) => r.name)
    expect(a).not.toEqual(b)
  })

  it("uses a lock key namespace distinct from the daily's", () => {
    expect(speedLockKey('2026-07-22')).toBe('terratap:speed:2026-07-22')
    expect(speedLockKey('2026-07-22')).not.toContain('daily')
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

describe('buildPracticeSpeedRun (#33)', () => {
  it('is timed but carries no lock and no date — replays freely, never counts', () => {
    const run = buildPracticeSpeedRun(seededRng('p1'))!
    expect(run.timed).toBe(true)
    expect(run.lockKey).toBeUndefined()
    expect(run.dateKey).toBe('')
    expect(run.mode).toBe('practice')
    expect(run.title).toBe('Speed Run Practice')
    expect(run.rounds.length).toBe(SPEED_RUN_LENGTH)
  })

  it('deals different hands across runs (unseeded trainer)', () => {
    const a = buildPracticeSpeedRun(seededRng('p1'))!.rounds.map((r) => r.name)
    const b = buildPracticeSpeedRun(seededRng('p2'))!.rounds.map((r) => r.name)
    expect(a).not.toEqual(b)
  })

  it('drills a single quiz pool when given its slug', () => {
    const run = buildPracticeSpeedRun(seededRng('p1'), 'us-state-capitals')!
    expect(run.title).toBe('Speed Run — US State Capitals')
    const poolNames = new Set(getQuiz('us-state-capitals')!.pool.map((p) => p.name))
    for (const r of run.rounds) expect(poolNames.has(r.name)).toBe(true)
  })

  it('rejects an unknown quiz slug', () => {
    expect(buildPracticeSpeedRun(seededRng('p1'), 'not-a-quiz')).toBeNull()
  })

  it('still gates on mount like every timed run (#24)', () => {
    const run = buildPracticeSpeedRun(seededRng('p1'))!
    expect(showStartGate(!!run.timed, initialStarted(!!run.timed))).toBe(true)
  })
})

describe('start gate (#24)', () => {
  it('holds a timed run behind the gate until the player starts it', () => {
    expect(showStartGate(true, false)).toBe(true)
  })

  it('releases the gate once started', () => {
    expect(showStartGate(true, true)).toBe(false)
  })

  it('never gates untimed runs', () => {
    expect(showStartGate(false, false)).toBe(false)
    expect(showStartGate(false, true)).toBe(false)
  })

  it('timed runs mount un-started; untimed runs mount started', () => {
    expect(initialStarted(true)).toBe(false)
    expect(initialStarted(false)).toBe(true)
  })

  it('a freshly-built speed run is timed, so it will gate on mount', () => {
    const run = buildSpeedRun('2026-07-22')
    expect(showStartGate(!!run.timed, initialStarted(!!run.timed))).toBe(true)
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
