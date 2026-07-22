/**
 * Mid-run progress persistence for lockable runs (issue #26).
 *
 * Completed daily/speed runs were already saved to the browser, but a refresh
 * mid-run restarted the same seed at round 1: progress was lost, and — worse —
 * a player could deliberately refresh before finishing to replay early rounds
 * with foreknowledge, only "committing" the run they liked. Rounds are now
 * persisted as they complete and restored on reload, so a refresh resumes the
 * day's attempt instead of restarting it.
 *
 * Timed runs additionally record which round's clock was armed. A refresh
 * mid-round would otherwise grant a fresh clock for a place the player already
 * saw — on restore an armed-but-unfinished round scores zero, exactly like
 * letting the clock run out.
 */

/** The serializable slice of a completed round (mirrors the final save shape). */
export type ProgressRound = {
  name: string
  base: number
  multiplier: number
  points: number
  /** null = timed out (or was forfeited) with no guess. */
  distanceKm: number | null
}

export type SavedProgress = {
  dateKey: string
  /** Rounds completed so far, in play order. */
  rounds: ProgressRound[]
  /** Total play time banked so far (timed runs). */
  elapsedMs: number
  /** Timed runs: index of the round whose clock was running at unload, if any. */
  armedIndex: number | null
}

/** Storage key for in-flight progress, namespaced under the run's lock key. */
export const progressKey = (lockKey: string) => `${lockKey}:progress`

/**
 * Validate a raw storage payload into progress for this run, or null.
 * Guards against stale dates, foreign shapes, and impossible indices.
 */
export function parseProgress(
  raw: string | null,
  dateKey: string,
  totalRounds: number,
): SavedProgress | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const p = parsed as Record<string, unknown>
  if (p.dateKey !== dateKey) return null
  if (!Array.isArray(p.rounds) || p.rounds.length > totalRounds) return null
  const rounds: ProgressRound[] = []
  for (const r of p.rounds) {
    if (typeof r !== 'object' || r === null) return null
    const row = r as Record<string, unknown>
    if (
      typeof row.name !== 'string' ||
      typeof row.base !== 'number' ||
      typeof row.multiplier !== 'number' ||
      typeof row.points !== 'number' ||
      !(row.distanceKm === null || typeof row.distanceKm === 'number')
    ) {
      return null
    }
    rounds.push({
      name: row.name,
      base: row.base,
      multiplier: row.multiplier,
      points: row.points,
      distanceKm: row.distanceKm,
    })
  }
  const elapsedMs = typeof p.elapsedMs === 'number' && p.elapsedMs >= 0 ? p.elapsedMs : 0
  // An armed index behind the completed rounds is stale (the round finished
  // after it was recorded); ahead of the next round is impossible.
  let armedIndex =
    typeof p.armedIndex === 'number' && Number.isInteger(p.armedIndex) ? p.armedIndex : null
  if (armedIndex !== null && (armedIndex !== rounds.length || armedIndex >= totalRounds)) {
    armedIndex = null
  }
  return { dateKey, rounds, elapsedMs, armedIndex }
}

export function loadProgress(
  lockKey: string,
  dateKey: string,
  totalRounds: number,
): SavedProgress | null {
  if (typeof window === 'undefined' || !lockKey) return null
  try {
    return parseProgress(window.localStorage.getItem(progressKey(lockKey)), dateKey, totalRounds)
  } catch {
    return null
  }
}

export function saveProgress(lockKey: string, progress: SavedProgress): void {
  if (typeof window === 'undefined' || !lockKey) return
  try {
    window.localStorage.setItem(progressKey(lockKey), JSON.stringify(progress))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function clearProgress(lockKey: string): void {
  if (typeof window === 'undefined' || !lockKey) return
  try {
    window.localStorage.removeItem(progressKey(lockKey))
  } catch {
    /* ignore */
  }
}

/** How a restored run should pick back up. */
export type ResumePlan = {
  /** Round index play resumes at (may equal totalRounds when finished). */
  resumeIndex: number
  /** Timed runs: the armed round is forfeited (scored zero) on restore. */
  forfeitArmed: boolean
  /** Every round is accounted for — go straight to the results screen. */
  finished: boolean
}

export function resumePlan(
  progress: SavedProgress,
  timed: boolean,
  totalRounds: number,
): ResumePlan {
  const completed = progress.rounds.length
  const forfeitArmed = timed && progress.armedIndex === completed && completed < totalRounds
  const resumeIndex = completed + (forfeitArmed ? 1 : 0)
  return { resumeIndex, forfeitArmed, finished: resumeIndex >= totalRounds }
}
