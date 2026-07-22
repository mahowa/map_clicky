import type { GameRun, Round } from './game-types'
import { DIFFICULTY_MULTIPLIER } from './scoring'
import { seededRng, pick } from './rng'
import { speedPool } from './speed'

/**
 * Versus mode (issue #5): head-to-head via challenge links. Player A plays a
 * seeded run, then shares a URL carrying the seed + their per-round base
 * scores. Player B's link deals the exact same rounds; the results screen
 * compares the two round-by-round and declares a winner. Rounds are derived
 * deterministically from the seed, so nothing is stored server-side.
 */

export const VERSUS_RUN_LENGTH = 5

/** Deterministic run for a challenge seed — both players see identical rounds. */
export function buildVersusRun(seed: string, count: number = VERSUS_RUN_LENGTH): GameRun {
  const rng = seededRng(`versus:${seed}`)
  const rounds: Round[] = pick(speedPool(), count, rng).map((place) => ({
    name: place.name,
    country: place.country,
    lat: place.lat,
    lng: place.lng,
    difficulty: place.difficulty,
    fact: null,
  }))
  return { title: 'Versus', rounds, mode: 'practice', dateKey: '', versusSeed: seed }
}

/** Random URL-safe seed. rng injected (pages pass Math.random). */
export function newVersusSeed(rng: () => number): string {
  let seed = ''
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 8; i++) seed += alphabet[Math.floor(rng() * alphabet.length)]
  return seed
}

/** Serialize per-round base scores for the challenge URL (?s=100.88.72.55.1). */
export function encodeBases(bases: number[]): string {
  return bases.map((b) => String(Math.max(0, Math.min(100, Math.round(b))))).join('.')
}

/** Parse an opponent's encoded bases; null if missing/malformed/wrong length. */
export function parseBases(raw: string | undefined | null, expectedLength: number): number[] | null {
  if (!raw) return null
  const parts = raw.split('.')
  if (parts.length !== expectedLength) return null
  const bases = parts.map((p) => Number(p))
  if (bases.some((b) => !Number.isInteger(b) || b < 0 || b > 100)) return null
  return bases
}

/** Points for a base score on a given round (base × difficulty multiplier). */
export function pointsFromBase(base: number, round: Round): number {
  return Math.round(base * DIFFICULTY_MULTIPLIER[round.difficulty])
}

/** Total points an opponent's bases are worth over the given rounds. */
export function totalFromBases(bases: number[], rounds: Round[]): number {
  return bases.reduce((sum, base, i) => sum + (rounds[i] ? pointsFromBase(base, rounds[i]) : 0), 0)
}

export type VersusOutcome = { result: 'win' | 'lose' | 'tie'; message: string }

/** Winner banner for the results screen. */
export function versusOutcome(myTotal: number, theirTotal: number): VersusOutcome {
  if (myTotal > theirTotal) {
    return { result: 'win', message: `You win, ${myTotal} to ${theirTotal}! 🏆` }
  }
  if (myTotal < theirTotal) {
    return { result: 'lose', message: `You lose, ${myTotal} to ${theirTotal}.` }
  }
  return { result: 'tie', message: `Dead heat — ${myTotal} apiece.` }
}

/** Challenge URL for sharing: same seed, the sharer's bases attached. */
export function challengeUrl(origin: string, seed: string, bases: number[]): string {
  return `${origin}/versus?seed=${encodeURIComponent(seed)}&s=${encodeBases(bases)}`
}

/** Share text inviting an opponent to beat the sharer's total. */
export function formatChallengeShare(total: number, url: string): string {
  return `Terra Tap Versus — I scored ${total}. Think you can beat me?\n${url}`
}
