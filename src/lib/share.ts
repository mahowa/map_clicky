/**
 * Pure helpers for the Wordle-style daily share text. No DOM / Date / storage,
 * so it's unit-testable and reused by the UI.
 *
 * Example output:
 *   Terra Tap — June 23
 *   99🎯 100🎯 94🏅 93🏆 86🎓
 *   Final score: 924
 *   https://map-clicky.vercel.app/play
 */

/**
 * Fallback play URL appended to shared results so it spreads with a
 * click-through. Callers with a DOM should pass the live origin instead
 * (see playUrlFromLocation) so shares always point at the site being played.
 */
export const PLAY_URL = 'https://map-clicky.vercel.app/play'

/** Play URL derived from the browser's own origin; falls back to PLAY_URL on SSR. */
export function playUrlFromLocation(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return PLAY_URL
  return `${window.location.origin}/play`
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Performance badge for a round's base score (0–100). Better score = better badge.
 * 🎯 is a bullseye (near-perfect); a low score gets a "way off" pin.
 */
export function scoreEmoji(base: number): string {
  if (base >= 95) return '🎯' // bullseye — nailed it
  if (base >= 85) return '🏅' // very close
  if (base >= 70) return '🏆' // good
  if (base >= 50) return '🎓' // in the area
  return '📍' // way off
}

/** "2026-06-23" -> "June 23". Returns the input unchanged if it can't parse. */
export function formatShareDate(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!m) return dateKey
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${month} ${Number(m[3])}` : dateKey
}

/** Build the share text block from per-round base scores and the final total. */
export function formatDailyShare(
  dateKey: string,
  bases: number[],
  total: number,
  playUrl: string = PLAY_URL,
): string {
  const line = bases.map((b) => `${b}${scoreEmoji(b)}`).join(' ')
  return `Terra Tap — ${formatShareDate(dateKey)}\n${line}\nFinal score: ${total}\n${playUrl}`
}
