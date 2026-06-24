import { describe, it, expect } from 'vitest'
import { pickReaction, pickVerdict } from '@/lib/reactions'

describe('pickReaction', () => {
  it('returns a non-empty string across the whole score range', () => {
    for (const base of [0, 15, 35, 55, 75, 90, 100]) {
      const r = pickReaction(base, () => 0)
      expect(typeof r).toBe('string')
      expect(r.length).toBeGreaterThan(0)
    }
  })

  it('picks praise for great guesses and snark for terrible ones', () => {
    expect(pickReaction(100, () => 0)).toMatch(/bullseye/i)
    expect(pickReaction(5, () => 0)).toMatch(/spin/i) // "Did you close your eyes and spin?"
  })

  it('is deterministic given a fixed rng, and varies with it', () => {
    expect(pickReaction(80, () => 0)).toBe(pickReaction(80, () => 0))
    const first = pickReaction(80, () => 0)
    const last = pickReaction(80, () => 0.999)
    expect(first).not.toBe(last)
  })

  it('clamps to a valid quip even at boundary scores', () => {
    // rng→0.999 must not index past the end of any tier.
    for (const base of [0, 29, 30, 49, 50, 69, 70, 84, 85, 94, 95]) {
      expect(pickReaction(base, () => 0.999)).toBeTruthy()
    }
  })
})

describe('pickVerdict', () => {
  it('returns a non-empty verdict across the whole percent range', () => {
    for (const pct of [0, 10, 25, 45, 65, 80, 95, 100]) {
      const v = pickVerdict(pct, () => 0.5)
      expect(typeof v).toBe('string')
      expect(v.length).toBeGreaterThan(0)
    }
  })

  it('praises a near-perfect run and roasts a disastrous one', () => {
    expect(pickVerdict(100, () => 0)).toMatch(/wizard/i)
    expect(pickVerdict(3, () => 0)).toMatch(/catastrophic/i)
  })

  it('never indexes past a tier at any boundary', () => {
    for (const pct of [0, 14, 15, 34, 35, 54, 55, 74, 75, 89, 90, 100]) {
      expect(pickVerdict(pct, () => 0.999)).toBeTruthy()
    }
  })
})
