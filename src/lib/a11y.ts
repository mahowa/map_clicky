/**
 * Keyboard & screen-reader support for the globe (issue #30).
 *
 * MapLibre already ships keyboard navigation on its focusable canvas (arrow
 * keys pan, +/- zooms) — what made the game pointer-only was placement. The
 * missing piece: Enter drops the guess at the center of the current view,
 * with a crosshair overlay while the map has keyboard focus and a polite
 * live region narrating what happened. Pure helpers here; wiring lives in
 * the component.
 */

/** Keys that place the guess at the view center. */
export function isPlaceGuessKey(key: string): boolean {
  return key === 'Enter'
}

/** Live-region line for a placed guess, naming the country under the crosshair. */
export function describePlacement(country: string | null): string {
  return country
    ? `Guess placed in ${country}. Press Tab then Enter to submit, or keep panning to adjust.`
    : 'Guess placed in open water. Press Tab then Enter to submit, or keep panning to adjust.'
}

/** Live-region line for a revealed round. */
export function describeReveal(
  name: string,
  base: number,
  points: number,
  distanceKm: number | null,
): string {
  const distance =
    distanceKm === null
      ? 'No guess was placed in time.'
      : `Your guess was ${Math.round(distanceKm).toLocaleString()} kilometers away.`
  return `${name}: ${base} out of 100, ${points} points. ${distance}`
}

/** Instructions read to screen-reader users when the map takes focus. */
export const KEYBOARD_HELP =
  'Use the arrow keys to pan the globe and plus or minus to zoom. ' +
  'Press Enter to place your guess at the center of the view.'

/** Reveal fly-to duration honoring prefers-reduced-motion. */
export function revealDuration(reducedMotion: boolean): number {
  return reducedMotion ? 0 : 900
}

/** Browser wrapper for the reduced-motion preference; false on SSR. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
