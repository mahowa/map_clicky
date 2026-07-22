/**
 * Browser-storage keys for once-per-day runs (#21). Kept pure/shared so the
 * server (rounds.ts) and the game component agree on the exact keys.
 */

export const dailyLockKey = (dateKey: string) => `terratap:daily:${dateKey}`

/** Pre-rename key (issue #8) — read as a fallback so an in-flight day isn't lost. */
export const legacyDailyLockKey = (dateKey: string) => `mapclippy:daily:${dateKey}`
