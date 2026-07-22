import { describe, it, expect } from 'vitest'
import { cameraActionFor, pairBounds } from '@/lib/camera'

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
