import { describe, it, expect } from 'vitest'
import {
  VERSUS_RUN_LENGTH,
  buildVersusRun,
  challengeBannerText,
  challengeUrl,
  encodeBases,
  formatChallengeShare,
  newVersusSeed,
  opponentRunningTotal,
  parseBases,
  pointsFromBase,
  totalFromBases,
  versusOutcome,
} from '@/lib/versus'
import { seededRng } from '@/lib/rng'
import type { Round } from '@/lib/game-types'

describe('buildVersusRun', () => {
  it('deals both players identical rounds for the same seed', () => {
    const a = buildVersusRun('abc123')
    const b = buildVersusRun('abc123')
    expect(a.rounds).toEqual(b.rounds)
    expect(a.versusSeed).toBe('abc123')
    expect(a.mode).toBe('practice')
    expect(a.rounds.length).toBe(VERSUS_RUN_LENGTH)
  })

  it('different seeds deal different hands', () => {
    const a = buildVersusRun('seed-one').rounds.map((r) => r.name)
    const b = buildVersusRun('seed-two').rounds.map((r) => r.name)
    expect(a).not.toEqual(b)
  })
})

describe('newVersusSeed', () => {
  it('produces url-safe seeds accepted by the versus page', () => {
    const seed = newVersusSeed(seededRng('x'))
    expect(seed).toMatch(/^[a-z0-9]{8}$/)
  })
})

describe('bases codec', () => {
  it('round-trips scores through the URL parameter', () => {
    const bases = [100, 88, 72, 55, 1]
    expect(parseBases(encodeBases(bases), 5)).toEqual(bases)
  })

  it('clamps out-of-range scores on encode', () => {
    expect(encodeBases([150, -5])).toBe('100.0')
  })

  it('rejects malformed, wrong-length, or out-of-range input', () => {
    expect(parseBases(undefined, 5)).toBeNull()
    expect(parseBases('', 5)).toBeNull()
    expect(parseBases('100.88.72', 5)).toBeNull()
    expect(parseBases('100.88.72.55.abc', 5)).toBeNull()
    expect(parseBases('100.88.72.55.101', 5)).toBeNull()
    expect(parseBases('100.88.72.55.1.9', 5)).toBeNull()
  })
})

const round = (difficulty: Round['difficulty']): Round => ({
  name: 'X',
  country: null,
  lat: 0,
  lng: 0,
  difficulty,
  fact: null,
})

describe('scoring from bases', () => {
  it('applies the round difficulty multiplier', () => {
    expect(pointsFromBase(80, round('easy'))).toBe(80) // ×1
    expect(pointsFromBase(80, round('medium'))).toBe(160) // ×2
    expect(pointsFromBase(80, round('hard'))).toBe(240) // ×3
  })

  it('totals across rounds, ignoring bases with no matching round', () => {
    const rounds = [round('easy'), round('hard')]
    expect(totalFromBases([100, 50, 999], rounds)).toBe(100 + 150)
  })
})

describe('versusOutcome', () => {
  it('declares wins, losses, and ties', () => {
    expect(versusOutcome(300, 200).result).toBe('win')
    expect(versusOutcome(200, 300).result).toBe('lose')
    expect(versusOutcome(250, 250).result).toBe('tie')
    expect(versusOutcome(300, 200).message).toContain('300')
    expect(versusOutcome(300, 200).message).toContain('200')
  })
})

describe('challenge context (#27)', () => {
  it('banner names the score to beat', () => {
    expect(challengeBannerText(54)).toContain('54')
    expect(challengeBannerText(54)).toMatch(/challenged/i)
  })

  it("tracks the opponent's pace through the rounds played so far", () => {
    const rounds = [round('easy'), round('medium'), round('hard')]
    const bases = [100, 50, 10]
    expect(opponentRunningTotal(bases, rounds, 0)).toBe(0)
    expect(opponentRunningTotal(bases, rounds, 1)).toBe(100)
    expect(opponentRunningTotal(bases, rounds, 2)).toBe(100 + 100)
    expect(opponentRunningTotal(bases, rounds, 3)).toBe(100 + 100 + 30)
  })

  it('pace through every round equals the full total', () => {
    const rounds = [round('easy'), round('medium'), round('hard')]
    const bases = [90, 80, 70]
    expect(opponentRunningTotal(bases, rounds, rounds.length)).toBe(
      totalFromBases(bases, rounds),
    )
  })

  it('clamps a negative rounds-played to zero', () => {
    expect(opponentRunningTotal([100], [round('easy')], -1)).toBe(0)
  })
})

describe('challenge link', () => {
  it('builds a URL carrying the seed and encoded bases', () => {
    const url = challengeUrl('https://terratap.example', 'abc123', [100, 0, 55, 88, 72])
    expect(url).toBe('https://terratap.example/versus?seed=abc123&s=100.0.55.88.72')
  })

  it('share text includes the total and the link', () => {
    const text = formatChallengeShare(316, 'https://terratap.example/versus?seed=a&s=1.2.3.4.5')
    expect(text).toContain('316')
    expect(text).toContain('https://terratap.example/versus?seed=a&s=1.2.3.4.5')
  })
})
