import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearProgress,
  loadProgress,
  parseProgress,
  progressKey,
  resumePlan,
  saveProgress,
  type SavedProgress,
} from '@/lib/progress'

const DATE = '2026-07-22'
const LOCK = 'terratap:daily:2026-07-22'
const TOTAL = 5

const round = (name: string, base: number, multiplier = 1) => ({
  name,
  base,
  multiplier,
  points: base * multiplier,
  distanceKm: base === 0 ? null : 1000,
})

const progress = (overrides: Partial<SavedProgress> = {}): SavedProgress => ({
  dateKey: DATE,
  rounds: [round('Bengaluru', 73), round('Budapest', 3)],
  elapsedMs: 12345,
  armedIndex: null,
  ...overrides,
})

describe('progressKey', () => {
  it('namespaces under the run lock key', () => {
    expect(progressKey(LOCK)).toBe('terratap:daily:2026-07-22:progress')
  })
})

describe('parseProgress (#26)', () => {
  it('round-trips a valid payload', () => {
    const p = parseProgress(JSON.stringify(progress()), DATE, TOTAL)
    expect(p).not.toBeNull()
    expect(p!.rounds.length).toBe(2)
    expect(p!.rounds[0].name).toBe('Bengaluru')
    expect(p!.elapsedMs).toBe(12345)
  })

  it('rejects null, garbage, and non-object payloads', () => {
    expect(parseProgress(null, DATE, TOTAL)).toBeNull()
    expect(parseProgress('not json', DATE, TOTAL)).toBeNull()
    expect(parseProgress('42', DATE, TOTAL)).toBeNull()
  })

  it("rejects another day's progress — stale seeds never leak forward", () => {
    const p = parseProgress(JSON.stringify(progress()), '2026-07-23', TOTAL)
    expect(p).toBeNull()
  })

  it('rejects more rounds than the run has', () => {
    const bloated = progress({ rounds: Array(6).fill(round('X', 1)) })
    expect(parseProgress(JSON.stringify(bloated), DATE, TOTAL)).toBeNull()
  })

  it('rejects malformed round rows', () => {
    const bad = { ...progress(), rounds: [{ name: 'X' }] }
    expect(parseProgress(JSON.stringify(bad), DATE, TOTAL)).toBeNull()
  })

  it('normalizes a stale armed index (round completed after arming)', () => {
    const p = parseProgress(JSON.stringify(progress({ armedIndex: 0 })), DATE, TOTAL)
    expect(p!.armedIndex).toBeNull()
  })

  it('keeps an armed index pointing at the next round', () => {
    const p = parseProgress(JSON.stringify(progress({ armedIndex: 2 })), DATE, TOTAL)
    expect(p!.armedIndex).toBe(2)
  })
})

describe('resumePlan (#26)', () => {
  it('resumes an untimed run at the first unplayed round', () => {
    const plan = resumePlan(progress(), false, TOTAL)
    expect(plan).toEqual({ resumeIndex: 2, forfeitArmed: false, finished: false })
  })

  it('never forfeits untimed runs, even with an armed index', () => {
    const plan = resumePlan(progress({ armedIndex: 2 }), false, TOTAL)
    expect(plan.forfeitArmed).toBe(false)
    expect(plan.resumeIndex).toBe(2)
  })

  it('forfeits the armed round of a timed run — no fresh clock for a seen place', () => {
    const plan = resumePlan(progress({ armedIndex: 2 }), true, TOTAL)
    expect(plan).toEqual({ resumeIndex: 3, forfeitArmed: true, finished: false })
  })

  it('resumes a timed run without forfeit when no clock was running', () => {
    const plan = resumePlan(progress(), true, TOTAL)
    expect(plan).toEqual({ resumeIndex: 2, forfeitArmed: false, finished: false })
  })

  it('finishes the run when the forfeited round was the last', () => {
    const fourDone = progress({ rounds: Array(4).fill(round('X', 10)), armedIndex: 4 })
    const plan = resumePlan(fourDone, true, TOTAL)
    expect(plan.finished).toBe(true)
    expect(plan.forfeitArmed).toBe(true)
  })

  it('finishes when every round is already recorded', () => {
    const allDone = progress({ rounds: Array(5).fill(round('X', 10)) })
    expect(resumePlan(allDone, true, TOTAL).finished).toBe(true)
    expect(resumePlan(allDone, false, TOTAL).finished).toBe(true)
  })
})

describe('storage round-trip (#26)', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves, loads, and clears progress under the namespaced key', () => {
    saveProgress(LOCK, progress())
    expect(window.localStorage.getItem(progressKey(LOCK))).not.toBeNull()
    const loaded = loadProgress(LOCK, DATE, TOTAL)
    expect(loaded!.rounds.length).toBe(2)
    clearProgress(LOCK)
    expect(loadProgress(LOCK, DATE, TOTAL)).toBeNull()
  })

  it('load ignores an empty lock key', () => {
    expect(loadProgress('', DATE, TOTAL)).toBeNull()
  })
})
