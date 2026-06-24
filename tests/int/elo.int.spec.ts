import { describe, it, expect } from 'vitest'
import { expectedScore, applyMatch, tierForElo, STARTING_ELO } from '@/lib/elo'

describe('expectedScore', () => {
  it('is 0.5 for equal ratings', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5)
  })

  it('favors the higher-rated player', () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5)
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5)
  })
})

describe('applyMatch', () => {
  it('is zero-sum-ish: winner gains what loser loses (equal ratings)', () => {
    const { a, b } = applyMatch(1000, 1000, 'win')
    expect(a).toBe(1016) // +16 at K=32, expected 0.5
    expect(b).toBe(984) // -16
  })

  it('awards fewer points for beating a much weaker opponent', () => {
    const upset = applyMatch(1000, 1400, 'win') // beat someone stronger
    const expected = applyMatch(1400, 1000, 'win') // strong beats weak
    expect(upset.a - 1000).toBeGreaterThan(expected.a - 1400)
  })

  it('leaves equal players unchanged on a draw', () => {
    const { a, b } = applyMatch(1000, 1000, 'draw')
    expect(a).toBe(1000)
    expect(b).toBe(1000)
  })
})

describe('tierForElo', () => {
  it('maps the starting rating to the Explorer tier', () => {
    expect(tierForElo(STARTING_ELO).name).toBe('Explorer')
  })

  it('floors at Tourist and caps at Grand Master', () => {
    expect(tierForElo(0).name).toBe('Tourist')
    expect(tierForElo(5000).name).toBe('Grand Master')
  })
})
