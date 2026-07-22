import type { GameRun, Round } from './game-types'
import { QUIZZES, getQuiz, type QuizPlace } from './quizzes'
import { pick, seededRng } from './rng'

/**
 * Speed Run (issue #9): the classic game against the clock. Each round gives
 * the player a fixed countdown; when it expires the current guess auto-submits
 * (no guess = zero for the round). Pure helpers here; the ticking lives in the
 * component.
 *
 * Like the daily, the speed run is seeded by the UTC day — everyone gets the
 * same hand, and it locks after one play (issue #21).
 */

export const SPEED_ROUND_SECONDS = 15
export const SPEED_RUN_LENGTH = 5

/** Every distinct place across the built-in quiz pools (deduped by name+country). */
export function speedPool(): QuizPlace[] {
  const seen = new Set<string>()
  const out: QuizPlace[] = []
  for (const quiz of QUIZZES) {
    for (const place of quiz.pool) {
      const key = `${place.name}|${place.country ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(place)
    }
  }
  return out
}

const toRound = (place: QuizPlace): Round => ({
  name: place.name,
  country: place.country,
  lat: place.lat,
  lng: place.lng,
  difficulty: place.difficulty,
  fact: null,
})

/** Browser storage key locking a day's speed run after one play. */
export const speedLockKey = (dateKey: string) => `terratap:speed:${dateKey}`

/**
 * The day's speed run: deterministically dealt from the UTC day key so every
 * player races the same five places, and lockable to a single play.
 */
export function buildSpeedRun(dateKey: string, count: number = SPEED_RUN_LENGTH): GameRun {
  const rng = seededRng(`speed:${dateKey}`)
  const rounds = pick(speedPool(), count, rng).map(toRound)
  return {
    title: 'Speed Run',
    rounds,
    mode: 'practice',
    dateKey,
    timed: true,
    lockKey: speedLockKey(dateKey),
  }
}

/**
 * Unranked practice run (issue #33): same clock, fresh random places, no
 * daily lock — so the once-a-day seeded run stays sacred while the skill it
 * tests stays trainable. Optionally dealt from a single quiz pool ("Speed
 * Run — US State Capitals"); returns null for an unknown quiz slug.
 */
export function buildPracticeSpeedRun(
  rng: () => number,
  quizSlug?: string | null,
): GameRun | null {
  let pool = speedPool()
  let title = 'Speed Run Practice'
  if (quizSlug) {
    const quiz = getQuiz(quizSlug)
    if (!quiz) return null
    pool = quiz.pool
    title = `Speed Run — ${quiz.title}`
  }
  const rounds = pick(pool, Math.min(SPEED_RUN_LENGTH, pool.length), rng).map(toRound)
  // No lockKey and no dateKey: replays freely, never counts toward the daily
  // result, streaks, or stats.
  return { title, rounds, mode: 'practice', dateKey: '', timed: true }
}

/** What to do when the round clock hits zero. */
export function expiryAction(hasGuess: boolean): 'submit' | 'zero' {
  return hasGuess ? 'submit' : 'zero'
}

/**
 * Whether a run still needs its explicit "Start run" gate (issue #24).
 *
 * The clock must never start without the player's say-so: arming it on page
 * load burned round 1 while tiles were still streaming in — fatal for a
 * once-daily run. Timed runs therefore hold on a gate (place name hidden,
 * globe clicks ignored) until the player presses Start; untimed runs have no
 * clock and never gate.
 */
export function showStartGate(timed: boolean, started: boolean): boolean {
  return timed && !started
}

/** Initial value of the "started" flag: only timed runs wait for the gate. */
export function initialStarted(timed: boolean): boolean {
  return !timed
}

/** "83459ms" -> "1:23.4" (m:ss.t). Clamps negatives to 0:00.0. */
export function formatDuration(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalSeconds = clamped / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds - minutes * 60
  const whole = Math.floor(seconds)
  const tenth = Math.floor((seconds - whole) * 10)
  return `${minutes}:${String(whole).padStart(2, '0')}.${tenth}`
}
