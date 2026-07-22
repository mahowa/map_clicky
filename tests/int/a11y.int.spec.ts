import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  KEYBOARD_HELP,
  describePlacement,
  describeReveal,
  isPlaceGuessKey,
  prefersReducedMotion,
  revealDuration,
} from '@/lib/a11y'

describe('isPlaceGuessKey (#30)', () => {
  it('places on Enter', () => {
    expect(isPlaceGuessKey('Enter')).toBe(true)
  })
  it("leaves MapLibre's own navigation keys alone", () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', ' ', 'Tab']) {
      expect(isPlaceGuessKey(key)).toBe(false)
    }
  })
})

describe('describePlacement (#30)', () => {
  it('names the country under the crosshair', () => {
    expect(describePlacement('India')).toContain('Guess placed in India')
  })
  it('narrates open water when no country is under the crosshair', () => {
    expect(describePlacement(null)).toContain('open water')
  })
  it('tells the player how to submit', () => {
    expect(describePlacement('India')).toMatch(/submit/i)
    expect(describePlacement(null)).toMatch(/submit/i)
  })
})

describe('describeReveal (#30)', () => {
  it('narrates score, points, and distance', () => {
    const line = describeReveal('Bengaluru', 73, 73, 1152.4)
    expect(line).toContain('Bengaluru')
    expect(line).toContain('73 out of 100')
    expect(line).toContain('73 points')
    expect(line).toContain('1,152 kilometers')
  })
  it('narrates a timed-out round', () => {
    expect(describeReveal('Dingxi', 0, 0, null)).toContain('No guess was placed in time')
  })
})

describe('keyboard help (#30)', () => {
  it('covers pan, zoom, and placement', () => {
    expect(KEYBOARD_HELP).toMatch(/arrow keys/i)
    expect(KEYBOARD_HELP).toMatch(/zoom/i)
    expect(KEYBOARD_HELP).toMatch(/enter/i)
  })
})

describe('reduced motion (#30)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('jumps instead of flying when reduced', () => {
    expect(revealDuration(true)).toBe(0)
    expect(revealDuration(false)).toBe(900)
  })

  it('reads the media query in the browser', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('reduce') }),
    })
    expect(prefersReducedMotion()).toBe(true)
  })

  it('defaults to full motion on SSR', () => {
    vi.stubGlobal('window', undefined)
    expect(prefersReducedMotion()).toBe(false)
  })
})
