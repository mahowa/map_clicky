/**
 * Streaks & personal stats for the locked daily modes (issue #32).
 *
 * Every completed daily/speed run is already saved per-day in the browser
 * (terratap:daily:<date>, terratap:speed:<date>) — this aggregates those
 * entries into the Wordle-style retention loop: current/max streak, games
 * played, best and average score. Pure core over key/value pairs so it's
 * unit-testable; a thin wrapper scans localStorage.
 */

export type DayResult = { dateKey: string; total: number }

export type DailyStats = {
  played: number
  best: number
  /** Rounded mean of all totals. */
  average: number
  /** Consecutive days ending today (or yesterday — today's game still open). */
  currentStreak: number
  maxStreak: number
}

/** Matches a completed-run key for the mode; excludes :progress entries. */
const keyPattern = (mode: 'daily' | 'speed') =>
  new RegExp(`^terratap:${mode}:(\\d{4}-\\d{2}-\\d{2})$`)

/** Pull {dateKey, total} rows out of raw storage entries for one mode. */
export function parseDayResults(
  entries: Array<[string, string]>,
  mode: 'daily' | 'speed',
): DayResult[] {
  const pattern = keyPattern(mode)
  const out: DayResult[] = []
  for (const [key, raw] of entries) {
    const m = pattern.exec(key)
    if (!m) continue
    try {
      const parsed = JSON.parse(raw) as { total?: unknown }
      if (typeof parsed.total === 'number' && Number.isFinite(parsed.total)) {
        out.push({ dateKey: m[1], total: parsed.total })
      }
    } catch {
      /* skip corrupt rows */
    }
  }
  return out
}

/** Days between two YYYY-MM-DD keys (b - a), in whole days. */
export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/**
 * Aggregate day results into stats. The current streak stays alive when
 * yesterday was played and today's game hasn't been finished yet.
 */
export function computeStats(results: DayResult[], todayKey: string): DailyStats {
  if (results.length === 0) {
    return { played: 0, best: 0, average: 0, currentStreak: 0, maxStreak: 0 }
  }
  const sorted = [...results].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  let maxStreak = 1
  let runLength = 1
  for (let i = 1; i < sorted.length; i++) {
    runLength = dayDiff(sorted[i - 1].dateKey, sorted[i].dateKey) === 1 ? runLength + 1 : 1
    if (runLength > maxStreak) maxStreak = runLength
  }
  const last = sorted[sorted.length - 1]
  const sinceLast = dayDiff(last.dateKey, todayKey)
  // Played today or yesterday → the trailing run is the live streak
  // (yesterday keeps it alive pending today's game); anything older → broken.
  const currentStreak = sinceLast === 0 || sinceLast === 1 ? runLength : 0
  const totalSum = sorted.reduce((s, r) => s + r.total, 0)
  return {
    played: sorted.length,
    best: Math.max(...sorted.map((r) => r.total)),
    average: Math.round(totalSum / sorted.length),
    currentStreak,
    maxStreak,
  }
}

/** Browser wrapper: aggregate this mode's saved results from localStorage. */
export function loadStats(mode: 'daily' | 'speed', todayKey: string): DailyStats | null {
  if (typeof window === 'undefined') return null
  try {
    const entries: Array<[string, string]> = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key) continue
      const value = window.localStorage.getItem(key)
      if (value !== null) entries.push([key, value])
    }
    return computeStats(parseDayResults(entries, mode), todayKey)
  } catch {
    return null
  }
}

/** "🔥 3-day streak" chip text; null under two days (nothing to brag about). */
export function streakText(currentStreak: number): string | null {
  return currentStreak >= 2 ? `🔥 ${currentStreak}-day streak` : null
}
