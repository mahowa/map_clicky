import type { LatLng } from '@/lib/scoring'

/**
 * What the globe camera should do after a round-state change.
 * - 'fit-pair': frame the guess + answer together (reveal).
 * - 'stay': leave the camera exactly where it is. Rounds after the first start
 *   from wherever the player left off — zooming back out to a full-globe view
 *   between rounds was disorienting (issue #7).
 */
export type CameraAction = 'fit-pair' | 'stay'

export function cameraActionFor(
  phase: 'guessing' | 'revealed' | 'done',
  guess: LatLng | null,
  answer: LatLng | null,
): CameraAction {
  if (phase === 'revealed' && guess && answer) return 'fit-pair'
  return 'stay'
}

/** Bounds ([sw, ne]) framing both points, for MapLibre fitBounds. */
export function pairBounds(
  a: LatLng,
  b: LatLng,
): [[number, number], [number, number]] {
  return [
    [Math.min(a.lng, b.lng), Math.min(a.lat, b.lat)],
    [Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)],
  ]
}
