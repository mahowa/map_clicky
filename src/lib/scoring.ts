/**
 * Shared scoring logic for Terra Tap.
 *
 * This module is intentionally pure (no DB, no React, no Node-only APIs) so the
 * exact same code can run in:
 *   - the browser (optimistic UI),
 *   - Next.js route handlers (daily / practice / async results),
 *   - the authoritative PartyKit match server (ranked live duels).
 *
 * Keeping a single source of truth prevents client/server scoring drift.
 */

export type LatLng = { lat: number; lng: number }

export type Difficulty = 'easy' | 'medium' | 'hard'

/** Per-difficulty point multiplier applied to the raw proximity score. */
export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
}

/** Mean Earth radius in kilometres (used by the haversine formula). */
export const EARTH_RADIUS_KM = 6371.0088

/**
 * Stretched-exponential ("Weibull-shaped") scoring curve:
 *   score = 100 * exp( -(distance / SCALE_KM) ^ SHAPE )
 *
 * Two parameters so near- and far-distance behavior decouple. SHAPE > 1 flattens
 * the top (close guesses cluster near 100) and steepens the mid/far range, while
 * SCALE_KM sets the overall width. Tuned to anchors 300km -> ~95, 5000km -> ~10.
 * Sample: 281km -> 95, 1000km -> 77, 2000km -> 51, 5000km -> 10, antipode -> 0.
 */
export const SCALE_KM = 2700
export const SHAPE = 1.35

/** @deprecated retained for back-compat; the curve now uses SCALE_KM + SHAPE. */
export const DEFAULT_SCALE_KM = SCALE_KM

const toRadians = (deg: number): number => (deg * Math.PI) / 180

/**
 * Great-circle distance between two points in kilometres (haversine).
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_KM * c
}

/**
 * Raw proximity score in [0, 100] from a distance, using a stretched-exponential
 * decay. Identical location -> 100; very far -> approaches 0.
 */
export function proximityScore(
  distanceKm: number,
  scaleKm: number = SCALE_KM,
  shape: number = SHAPE,
): number {
  const score = 100 * Math.exp(-Math.pow(Math.max(0, distanceKm) / scaleKm, shape))
  return Math.round(score)
}

export type RoundScore = {
  distanceKm: number
  base: number
  multiplier: number
  points: number
}

/**
 * Score a single round: guess vs. true location, with a difficulty multiplier.
 */
export function scoreRound(
  guess: LatLng,
  answer: LatLng,
  difficulty: Difficulty = 'easy',
  scaleKm: number = SCALE_KM,
): RoundScore {
  const distanceKm = haversineKm(guess, answer)
  const base = proximityScore(distanceKm, scaleKm)
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty]
  return { distanceKm, base, multiplier, points: base * multiplier }
}

/** Sum of round points into a single match/run total. */
export function totalScore(rounds: Pick<RoundScore, 'points'>[]): number {
  return rounds.reduce((sum, r) => sum + r.points, 0)
}
