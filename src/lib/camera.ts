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

/**
 * Initial globe zoom sized to the viewport (issue #34). The old fixed zoom
 * (0.9) looked right on phones but left the globe a small sphere in ~30% of a
 * desktop viewport. MapLibre's globe renders with a pixel diameter of roughly
 * tileSize·2^zoom/π, so the zoom that fills `fill` of the short viewport side
 * is log2(minSide·fill·π/tileSize). Clamped to sane globe range.
 */
export function initialGlobeZoom(width: number, height: number, fill = 0.78): number {
  const minSide = Math.min(width, height)
  if (!Number.isFinite(minSide) || minSide <= 0) return 0.9
  const zoom = Math.log2((minSide * fill * Math.PI) / 512)
  return Math.min(2.5, Math.max(0.5, zoom))
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
