import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  proximityScore,
  scoreRound,
  totalScore,
  DIFFICULTY_MULTIPLIER,
} from '@/lib/scoring'

const PARIS = { lat: 48.8566, lng: 2.3522 }
const LONDON = { lat: 51.5074, lng: -0.1278 }

describe('haversineKm', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(PARIS, PARIS)).toBe(0)
  })

  it('matches the known Paris<->London great-circle distance (~343km)', () => {
    const d = haversineKm(PARIS, LONDON)
    expect(d).toBeGreaterThan(330)
    expect(d).toBeLessThan(355)
  })

  it('is roughly half the circumference for antipodes (~20015km)', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })
    expect(d).toBeGreaterThan(19900)
    expect(d).toBeLessThan(20100)
  })
})

describe('proximityScore', () => {
  it('is 100 for a perfect guess', () => {
    expect(proximityScore(0)).toBe(100)
  })

  it('approaches 0 for very large distances', () => {
    expect(proximityScore(20000)).toBe(0)
  })

  it('decreases monotonically with distance', () => {
    expect(proximityScore(100)).toBeGreaterThan(proximityScore(1000))
  })

  it('is generous for near guesses (281km ~= 95, not 50)', () => {
    expect(proximityScore(281)).toBeGreaterThanOrEqual(93)
    expect(proximityScore(281)).toBeLessThanOrEqual(97)
  })

  it('keeps a sensible mid-range curve', () => {
    expect(proximityScore(1000)).toBeGreaterThanOrEqual(72)
    expect(proximityScore(1000)).toBeLessThanOrEqual(82)
    expect(proximityScore(2000)).toBeGreaterThanOrEqual(45)
    expect(proximityScore(2000)).toBeLessThanOrEqual(57)
  })

  it('still punishes wrong-continent guesses', () => {
    expect(proximityScore(5000)).toBeLessThanOrEqual(15)
    expect(proximityScore(8000)).toBeLessThanOrEqual(3)
  })
})

describe('scoreRound', () => {
  it('gives full base points for an exact tap', () => {
    const r = scoreRound(PARIS, PARIS, 'easy')
    expect(r.base).toBe(100)
    expect(r.points).toBe(100)
  })

  it('applies the difficulty multiplier', () => {
    const easy = scoreRound(PARIS, LONDON, 'easy')
    const hard = scoreRound(PARIS, LONDON, 'hard')
    expect(hard.points).toBe(easy.base * DIFFICULTY_MULTIPLIER.hard)
    expect(hard.multiplier).toBe(3)
  })
})

describe('totalScore', () => {
  it('sums round points', () => {
    expect(totalScore([{ points: 100 }, { points: 50 }, { points: 30 }])).toBe(180)
  })
})
