import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatDailyShare,
  formatShareDate,
  playUrlFromLocation,
  scoreEmoji,
  PLAY_URL,
} from '@/lib/share'

describe('formatShareDate', () => {
  it('formats an ISO day as "Month D"', () => {
    expect(formatShareDate('2026-06-23')).toBe('June 23')
    expect(formatShareDate('2026-01-01')).toBe('January 1')
    expect(formatShareDate('2026-12-09')).toBe('December 9')
  })
})

describe('scoreEmoji', () => {
  it('gives a bullseye only for near-perfect scores', () => {
    expect(scoreEmoji(100)).toBe('🎯')
    expect(scoreEmoji(95)).toBe('🎯')
  })
  it('never gives a bullseye to a bad score', () => {
    expect(scoreEmoji(1)).toBe('📍')
    expect(scoreEmoji(0)).toBe('📍')
    expect(scoreEmoji(49)).toBe('📍')
  })
  it('steps down with score', () => {
    expect(scoreEmoji(90)).toBe('🏅')
    expect(scoreEmoji(75)).toBe('🏆')
    expect(scoreEmoji(60)).toBe('🎓')
  })
})

describe('formatDailyShare', () => {
  it('badges each round by its score, best to worst', () => {
    const text = formatDailyShare('2026-06-23', [100, 88, 72, 55, 1], 316)
    expect(text).toBe(
      'Terra Tap — June 23\n100🎯 88🏅 72🏆 55🎓 1📍\nFinal score: 316\nhttps://map-clicky.vercel.app/play',
    )
  })

  it('uses the caller-provided play URL when given', () => {
    const text = formatDailyShare('2026-06-23', [100], 100, 'https://terratap.example/play')
    expect(text.endsWith('\nhttps://terratap.example/play')).toBe(true)
  })
})

describe('playUrlFromLocation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("builds the play URL from the browser's own origin", () => {
    vi.stubGlobal('window', { location: { origin: 'https://terratap.example' } })
    expect(playUrlFromLocation()).toBe('https://terratap.example/play')
  })

  it('falls back to the canonical URL without a DOM', () => {
    vi.stubGlobal('window', undefined)
    expect(playUrlFromLocation()).toBe(PLAY_URL)
  })
})
