import type { GameRun, Round } from './game-types'
import { QUIZZES, type QuizPlace } from './quizzes'
import { pick } from './rng'

/**
 * Speed Run (issue #9): the classic game against the clock. Each round gives
 * the player a fixed countdown; when it expires the current guess auto-submits
 * (no guess = zero for the round). Pure helpers here; the ticking lives in the
 * component.
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

/** A timed practice run sampled from the whole speed pool. */
export function buildSpeedRun(rng: () => number, count: number = SPEED_RUN_LENGTH): GameRun {
  const rounds = pick(speedPool(), count, rng).map(toRound)
  return { title: 'Speed Run', rounds, mode: 'practice', dateKey: '', timed: true }
}

/** What to do when the round clock hits zero. */
export function expiryAction(hasGuess: boolean): 'submit' | 'zero' {
  return hasGuess ? 'submit' : 'zero'
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
