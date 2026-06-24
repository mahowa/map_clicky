import { describe, it, expect } from 'vitest'
import { parseOnThisDay, calendarDayOf } from '@/lib/news/source'

const FIXTURE = {
  events: [
    {
      text: 'The Battle of Carillon is fought near Fort Carillon.',
      year: 1758,
      pages: [
        {
          normalizedtitle: 'Fort Ticonderoga',
          coordinates: { lat: 43.84, lon: -73.39 },
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Fort_Ticonderoga' } },
        },
      ],
    },
    {
      text: 'A treaty is signed in Paris.',
      year: 1783,
      pages: [{ title: 'Paris' }],
    },
    { text: '   ', year: 1900, pages: [] }, // blank text → dropped
  ],
}

describe('parseOnThisDay', () => {
  it('maps events, places, year and link, skipping blank text', () => {
    const out = parseOnThisDay(FIXTURE, '07-08')
    expect(out).toHaveLength(2)

    const [first, second] = out
    expect(first.calendarDay).toBe('07-08')
    expect(first.source).toBe('wikipedia-onthisday')
    expect(first.year).toBe(1758)
    expect(first.link).toBe('https://en.wikipedia.org/wiki/Fort_Ticonderoga')
    expect(first.places[0]).toEqual({ title: 'Fort Ticonderoga', lat: 43.84, lng: -73.39 })

    expect(second.places[0]).toEqual({ title: 'Paris' })
  })

  it('produces a stable, content-derived sourceId', () => {
    const a = parseOnThisDay(FIXTURE, '07-08')
    const b = parseOnThisDay(FIXTURE, '07-08')
    expect(a.map((e) => e.sourceId)).toEqual(b.map((e) => e.sourceId))
    expect(a[0].sourceId).toMatch(/^wp-onthisday:07-08:1758:[0-9a-f]{8}$/)
  })

  it('is defensive against missing/garbage payloads', () => {
    expect(parseOnThisDay(null, '01-01')).toEqual([])
    expect(parseOnThisDay({}, '01-01')).toEqual([])
    expect(parseOnThisDay({ events: 'nope' }, '01-01')).toEqual([])
  })

  it('calendarDayOf extracts MM-DD', () => {
    expect(calendarDayOf('2026-06-24')).toBe('06-24')
  })
})
