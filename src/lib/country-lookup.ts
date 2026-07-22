import type { LatLng } from './scoring'

/**
 * Offline reverse-geocode: which country does a lat/lng fall in?
 * Backed by a pruned Natural Earth 110m admin-0 GeoJSON (name + geometry only)
 * so lookups work client-side with no network calls. 110m resolution is coarse
 * but plenty for "your guess landed in France" feedback (issue #2).
 */

type Position = [number, number]
type Ring = Position[]
type CountryFeature = {
  properties: { name: string }
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] }
}
export type CountryCollection = { features: CountryFeature[] }

/** Ray-cast a point against a single linear ring ([lng, lat] positions). */
export function pointInRing(point: LatLng, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

/** Inside the outer ring and outside every hole. */
export function pointInPolygon(point: LatLng, rings: Ring[]): boolean {
  if (!rings.length || !pointInRing(point, rings[0])) return false
  for (let i = 1; i < rings.length; i++) {
    if (pointInRing(point, rings[i])) return false
  }
  return true
}

/** Name of the country containing the point, or null (ocean / uncovered). */
export function countryAtSync(point: LatLng, countries: CountryCollection): string | null {
  for (const f of countries.features) {
    const g = f.geometry
    if (g.type === 'Polygon') {
      if (pointInPolygon(point, g.coordinates)) return f.properties.name
    } else {
      for (const poly of g.coordinates) {
        if (pointInPolygon(point, poly)) return f.properties.name
      }
    }
  }
  return null
}

let dataPromise: Promise<CountryCollection> | null = null

/** Lazy-load the country data (kept out of the initial bundle). */
function loadCountries(): Promise<CountryCollection> {
  dataPromise ??= import('./data/countries-110m.json').then(
    (m) => (m.default ?? m) as unknown as CountryCollection,
  )
  return dataPromise
}

/** Async lookup that lazy-loads the dataset on first use. */
export async function countryAt(point: LatLng): Promise<string | null> {
  return countryAtSync(point, await loadCountries())
}

/**
 * One-liner telling the player where their miss actually landed (issue #2).
 * Returns null for perfect hits — nothing to explain.
 */
export function describeMiss(
  guessCountry: string | null,
  answerCountry: string | null,
  base: number,
): string | null {
  if (base >= 100) return null
  if (guessCountry && guessCountry === answerCountry) return 'Right country — wrong spot.'
  if (guessCountry) return `Your guess landed in ${guessCountry}.`
  return 'Your guess landed in open water.'
}
