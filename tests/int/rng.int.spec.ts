import { describe, it, expect } from 'vitest'
import { hashString, seededRng, shuffle, pick } from '@/lib/rng'

describe('seededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRng('2026-06-23')
    const b = seededRng('2026-06-23')
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('differs across seeds', () => {
    const a = seededRng('2026-06-23')
    const b = seededRng('2026-06-24')
    expect(a()).not.toEqual(b())
  })

  it('produces floats in [0, 1)', () => {
    const r = seededRng('x')
    for (let i = 0; i < 100; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashString', () => {
  it('is stable and unsigned', () => {
    expect(hashString('abc')).toBe(hashString('abc'))
    expect(hashString('abc')).toBeGreaterThanOrEqual(0)
  })
})

describe('shuffle / pick', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8]

  it('shuffle is a permutation (same multiset)', () => {
    const out = shuffle(items, seededRng('s'))
    expect(out.slice().sort((a, b) => a - b)).toEqual(items)
  })

  it('shuffle is deterministic per seed', () => {
    expect(shuffle(items, seededRng('s'))).toEqual(shuffle(items, seededRng('s')))
  })

  it('pick returns the requested count of distinct items', () => {
    const out = pick(items, 3, seededRng('s'))
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })
})
