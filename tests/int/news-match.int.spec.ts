import { describe, it, expect } from 'vitest'
import {
  normalizeName,
  buildLocationIndex,
  matchEventToLocationIds,
  type MatchableLocation,
} from '@/lib/news/match-places'
import type { RawNewsEvent } from '@/lib/news/source'

const LOCS: MatchableLocation[] = [
  { id: 1, name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { id: 2, name: 'Zürich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { id: 3, name: 'Springfield', country: 'United States', lat: 39.78, lng: -89.65 }, // IL
  { id: 4, name: 'Springfield', country: 'United States', lat: 42.1015, lng: -72.59 }, // MA
  { id: 5, name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
]

const index = buildLocationIndex(LOCS)

function event(places: RawNewsEvent['places'], text = ''): RawNewsEvent {
  return { sourceId: 's', source: 'test', calendarDay: '01-01', text, places }
}

describe('normalizeName', () => {
  it('lowercases, strips diacritics, articles and parentheticals', () => {
    expect(normalizeName('Zürich')).toBe('zurich')
    expect(normalizeName('The Hague')).toBe('hague')
    expect(normalizeName('Paris (Texas)')).toBe('paris')
  })
})

describe('matchEventToLocationIds', () => {
  it('matches an exact, unambiguous normalized name', () => {
    expect(matchEventToLocationIds(event([{ title: 'Paris' }]), index)).toEqual([1])
  })

  it('matches through diacritics', () => {
    expect(matchEventToLocationIds(event([{ title: 'Zürich' }]), index)).toEqual([2])
  })

  it('prefers a nearby coordinate over name', () => {
    // Coordinates near Tokyo, title that would not name-match.
    const e = event([{ title: 'Edo Castle', lat: 35.6852, lng: 139.7528 }])
    expect(matchEventToLocationIds(e, index)).toEqual([5])
  })

  it('skips ambiguous names with no country corroboration', () => {
    expect(matchEventToLocationIds(event([{ title: 'Springfield' }]), index)).toEqual([])
  })

  it('rejects very short names', () => {
    expect(matchEventToLocationIds(event([{ title: 'Rio' }]), index)).toEqual([])
  })

  it('de-duplicates and sorts ids deterministically', () => {
    const e = event([{ title: 'Tokyo' }, { title: 'Paris' }, { title: 'Paris' }])
    expect(matchEventToLocationIds(e, index)).toEqual([1, 5])
  })
})
