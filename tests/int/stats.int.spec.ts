import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeStats,
  dayDiff,
  loadStats,
  parseDayResults,
  streakText,
  type DayResult,
} from '@/lib/stats'

const day = (dateKey: string, total: number): DayResult => ({ dateKey, total })

describe('parseDayResults (#32)', () => {
  it('collects completed runs for the mode, skipping progress and foreign keys', () => {
    const entries: Array<[string, string]> = [
      ['terratap:daily:2026-07-20', JSON.stringify({ total: 300 })],
      ['terratap:daily:2026-07-21', JSON.stringify({ total: 450 })],
      ['terratap:daily:2026-07-21:progress', JSON.stringify({ rounds: [] })],
      ['terratap:speed:2026-07-21', JSON.stringify({ total: 90 })],
      ['terratap:versus:abc123', JSON.stringify({ total: 500 })],
      ['mapclippy:daily:2026-06-24', JSON.stringify({ total: 100 })],
      ['unrelated', 'x'],
    ]
    const rows = parseDayResults(entries, 'daily')
    expect(rows).toEqual([day('2026-07-20', 300), day('2026-07-21', 450)])
    expect(parseDayResults(entries, 'speed')).toEqual([day('2026-07-21', 90)])
  })

  it('skips corrupt and total-less rows', () => {
    const rows = parseDayResults(
      [
        ['terratap:daily:2026-07-20', 'not json'],
        ['terratap:daily:2026-07-21', JSON.stringify({ rounds: [] })],
      ],
      'daily',
    )
    expect(rows).toEqual([])
  })
})

describe('dayDiff', () => {
  it('counts whole days across month and year boundaries', () => {
    expect(dayDiff('2026-07-21', '2026-07-22')).toBe(1)
    expect(dayDiff('2026-06-30', '2026-07-01')).toBe(1)
    expect(dayDiff('2025-12-31', '2026-01-01')).toBe(1)
    expect(dayDiff('2026-07-22', '2026-07-22')).toBe(0)
    expect(dayDiff('2026-07-01', '2026-07-22')).toBe(21)
  })
})

describe('computeStats (#32)', () => {
  const TODAY = '2026-07-22'

  it('returns zeros with no games', () => {
    expect(computeStats([], TODAY)).toEqual({
      played: 0,
      best: 0,
      average: 0,
      currentStreak: 0,
      maxStreak: 0,
    })
  })

  it('counts a streak ending today', () => {
    const s = computeStats(
      [day('2026-07-20', 100), day('2026-07-21', 200), day('2026-07-22', 300)],
      TODAY,
    )
    expect(s.currentStreak).toBe(3)
    expect(s.maxStreak).toBe(3)
    expect(s.played).toBe(3)
    expect(s.best).toBe(300)
    expect(s.average).toBe(200)
  })

  it("keeps yesterday's streak alive before today's game is finished", () => {
    const s = computeStats([day('2026-07-20', 100), day('2026-07-21', 200)], TODAY)
    expect(s.currentStreak).toBe(2)
  })

  it('breaks the streak after a missed day, but remembers the max', () => {
    const s = computeStats(
      [day('2026-07-15', 100), day('2026-07-16', 100), day('2026-07-17', 100), day('2026-07-20', 100)],
      TODAY,
    )
    expect(s.currentStreak).toBe(0)
    expect(s.maxStreak).toBe(3)
  })

  it('a gap splits runs — trailing run is the live streak', () => {
    const s = computeStats(
      [day('2026-07-10', 100), day('2026-07-21', 100), day('2026-07-22', 100)],
      TODAY,
    )
    expect(s.currentStreak).toBe(2)
    expect(s.maxStreak).toBe(2)
  })

  it('handles unsorted input', () => {
    const s = computeStats(
      [day('2026-07-22', 300), day('2026-07-20', 100), day('2026-07-21', 200)],
      TODAY,
    )
    expect(s.currentStreak).toBe(3)
  })

  it('rounds the average', () => {
    expect(computeStats([day('2026-07-21', 100), day('2026-07-22', 101)], TODAY).average).toBe(101)
  })
})

describe('streakText (#32)', () => {
  it('brags from two days up', () => {
    expect(streakText(2)).toBe('🔥 2-day streak')
    expect(streakText(12)).toBe('🔥 12-day streak')
  })
  it('stays quiet under two days', () => {
    expect(streakText(0)).toBeNull()
    expect(streakText(1)).toBeNull()
  })
})

describe('loadStats (#32)', () => {
  beforeEach(() => window.localStorage.clear())

  it('aggregates saved results straight from localStorage', () => {
    window.localStorage.setItem('terratap:daily:2026-07-21', JSON.stringify({ total: 250 }))
    window.localStorage.setItem('terratap:daily:2026-07-22', JSON.stringify({ total: 350 }))
    window.localStorage.setItem(
      'terratap:daily:2026-07-22:progress',
      JSON.stringify({ rounds: [] }),
    )
    const s = loadStats('daily', '2026-07-22')
    expect(s).toEqual({ played: 2, best: 350, average: 300, currentStreak: 2, maxStreak: 2 })
  })
})
