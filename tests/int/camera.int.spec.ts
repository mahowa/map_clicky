import { describe, it, expect } from 'vitest'
import { cameraActionFor, initialGlobeZoom, pairBounds } from '@/lib/camera'

const PARIS = { lat: 48.8566, lng: 2.3522 }
const LONDON = { lat: 51.5074, lng: -0.1278 }

describe('cameraActionFor', () => {
  it('frames the guess/answer pair on reveal', () => {
    expect(cameraActionFor('revealed', PARIS, LONDON)).toBe('fit-pair')
  })

  it('stays put at the start of a new round (no zoom-out reset, issue #7)', () => {
    expect(cameraActionFor('guessing', null, LONDON)).toBe('stay')
  })

  it('stays put while the player is placing/adjusting a guess', () => {
    expect(cameraActionFor('guessing', PARIS, LONDON)).toBe('stay')
  })

  it('stays put on reveal if either point is missing', () => {
    expect(cameraActionFor('revealed', null, LONDON)).toBe('stay')
    expect(cameraActionFor('revealed', PARIS, null)).toBe('stay')
  })

  it('stays put on the results screen', () => {
    expect(cameraActionFor('done', PARIS, LONDON)).toBe('stay')
  })
})

describe('pairBounds', () => {
  it('returns [sw, ne] covering both points', () => {
    const [sw, ne] = pairBounds(PARIS, LONDON)
    expect(sw).toEqual([-0.1278, 48.8566])
    expect(ne).toEqual([2.3522, 51.5074])
  })

  it('is order-independent', () => {
    expect(pairBounds(PARIS, LONDON)).toEqual(pairBounds(LONDON, PARIS))
  })
})

describe('initialGlobeZoom (#34)', () => {
  it('zooms a desktop viewport well past the old fixed 0.9', () => {
    const z = initialGlobeZoom(1516, 936)
    expect(z).toBeGreaterThan(1.8)
    expect(z).toBeLessThanOrEqual(2.5)
  })

  it('keeps phones near the old framing that already looked right', () => {
    const z = initialGlobeZoom(390, 844)
    expect(z).toBeGreaterThan(0.7)
    expect(z).toBeLessThan(1.1)
  })

  it('scales with the SHORT side (landscape phone ≈ portrait phone)', () => {
    expect(initialGlobeZoom(844, 390)).toBeCloseTo(initialGlobeZoom(390, 844), 5)
  })

  it('monotonically increases with viewport size', () => {
    expect(initialGlobeZoom(800, 800)).toBeGreaterThan(initialGlobeZoom(400, 400))
  })

  it('clamps to the sane globe range', () => {
    expect(initialGlobeZoom(50, 50)).toBe(0.5)
    expect(initialGlobeZoom(10000, 10000)).toBe(2.5)
  })

  it('falls back to the classic zoom for degenerate dimensions', () => {
    expect(initialGlobeZoom(0, 0)).toBe(0.9)
    expect(initialGlobeZoom(NaN, 500)).toBe(0.9)
    expect(initialGlobeZoom(-10, 500)).toBe(0.9)
  })
})
