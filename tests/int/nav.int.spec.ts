import { describe, it, expect } from 'vitest'
import { GAME_LINKS, otherGameLinks, runKind } from '@/lib/nav'
import { dailyLockKey, legacyDailyLockKey } from '@/lib/locks'
import type { GameRun } from '@/lib/game-types'

const base: GameRun = { title: 'X', rounds: [], mode: 'practice', dateKey: '' }

describe('runKind', () => {
  it('classifies each run shape', () => {
    expect(runKind({ ...base, mode: 'daily' })).toBe('daily')
    expect(runKind({ ...base, versusSeed: 'abc' })).toBe('versus')
    expect(runKind({ ...base, timed: true })).toBe('speed')
    expect(runKind({ ...base, labeled: true })).toBe('history')
    expect(runKind(base)).toBe('quiz')
  })

  it('daily wins over other flags, versus over timed', () => {
    expect(runKind({ ...base, mode: 'daily', timed: true })).toBe('daily')
    expect(runKind({ ...base, versusSeed: 'abc', timed: true })).toBe('versus')
  })
})

describe('otherGameLinks', () => {
  it('offers every game except the one just played', () => {
    for (const link of GAME_LINKS) {
      const others = otherGameLinks(link.kind)
      expect(others.length).toBe(GAME_LINKS.length - 1)
      expect(others.map((l) => l.kind)).not.toContain(link.kind)
    }
  })

  it('covers all five modes with working hrefs', () => {
    expect(GAME_LINKS.map((l) => l.href).sort()).toEqual(
      ['/history', '/play', '/quizzes', '/speed', '/versus'].sort(),
    )
  })
})

describe('lock keys', () => {
  it('daily and legacy keys match the historical storage format', () => {
    expect(dailyLockKey('2026-07-22')).toBe('terratap:daily:2026-07-22')
    expect(legacyDailyLockKey('2026-07-22')).toBe('mapclippy:daily:2026-07-22')
  })
})
