/**
 * Deterministic, conservative matching of history events → location ids.
 *
 * Pure (no DB, no Date): callers pass a snapshot of locations. Under-matching is
 * safe — the daily generator falls back to population-based selection — but a
 * mis-placed round is not, so ambiguous names are skipped unless the event's
 * country corroborates one candidate, and very short names are rejected.
 */
import { haversineKm } from '../scoring'
import type { RawNewsEvent, RawPlaceCandidate } from './source'

/** A location as far as matching cares. */
export type MatchableLocation = {
  id: number
  name: string
  country: string
  lat: number
  lng: number
}

/** Names shorter than this are too ambiguous to trust on an exact match. */
const MIN_NAME_LEN = 4
/** A coordinate candidate within this many km of a location is a match. */
const COORD_MATCH_KM = 25

/**
 * Normalize a place/article name for comparison: lowercase, strip diacritics,
 * drop a leading article and any "(disambiguator)" suffix, collapse whitespace.
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/^(the|le|la|les|el|los|las)\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export type LocationIndex = {
  /** normalized name → location ids sharing it (>1 ⇒ ambiguous). */
  byName: Map<string, number[]>
  /** normalized country → set of location ids, for corroboration. */
  byCountry: Map<string, Set<number>>
  byId: Map<number, MatchableLocation>
}

export function buildLocationIndex(locations: MatchableLocation[]): LocationIndex {
  const byName = new Map<string, number[]>()
  const byCountry = new Map<string, Set<number>>()
  const byId = new Map<number, MatchableLocation>()

  // Sort by id so ambiguity lists + tie-breaks are deterministic.
  for (const loc of [...locations].sort((a, b) => a.id - b.id)) {
    byId.set(loc.id, loc)
    const n = normalizeName(loc.name)
    if (n) {
      const list = byName.get(n)
      if (list) list.push(loc.id)
      else byName.set(n, [loc.id])
    }
    const c = normalizeName(loc.country)
    if (c) {
      const set = byCountry.get(c)
      if (set) set.add(loc.id)
      else byCountry.set(c, new Set([loc.id]))
    }
  }
  return { byName, byCountry, byId }
}

/** Closest location within COORD_MATCH_KM of a coordinate, or null. */
function matchByCoord(cand: RawPlaceCandidate, index: LocationIndex): number | null {
  if (typeof cand.lat !== 'number' || typeof cand.lng !== 'number') return null
  let best: { id: number; km: number } | null = null
  for (const loc of index.byId.values()) {
    const km = haversineKm({ lat: cand.lat, lng: cand.lng }, { lat: loc.lat, lng: loc.lng })
    if (km > COORD_MATCH_KM) continue
    // Tie-break on distance, then lowest id (byId iterates in insertion order = id order).
    if (!best || km < best.km) best = { id: loc.id, km }
  }
  return best?.id ?? null
}

/** Country ids referenced anywhere in the event (for disambiguation). */
function eventCountryIds(event: RawNewsEvent, index: LocationIndex): Set<number> {
  const ids = new Set<number>()
  const haystack = ` ${normalizeName(event.text)} `
  for (const [country, set] of index.byCountry) {
    if (haystack.includes(` ${country} `)) for (const id of set) ids.add(id)
  }
  return ids
}

/**
 * Resolve an event to a deterministic, de-duplicated list of location ids.
 * Priority per place candidate: coordinate match → exact normalized name match
 * (single mapping, or country-corroborated when ambiguous).
 */
export function matchEventToLocationIds(event: RawNewsEvent, index: LocationIndex): number[] {
  const found = new Set<number>()
  let countryIds: Set<number> | null = null

  for (const cand of event.places) {
    const byCoord = matchByCoord(cand, index)
    if (byCoord != null) {
      found.add(byCoord)
      continue
    }

    const n = normalizeName(cand.title)
    if (n.length < MIN_NAME_LEN) continue
    const ids = index.byName.get(n)
    if (!ids || ids.length === 0) continue
    if (ids.length === 1) {
      found.add(ids[0])
      continue
    }
    // Ambiguous: accept only a candidate corroborated by the event's country.
    if (!countryIds) countryIds = eventCountryIds(event, index)
    const corroborated = ids.filter((id) => countryIds!.has(id))
    if (corroborated.length === 1) found.add(corroborated[0])
  }

  return [...found].sort((a, b) => a - b)
}
