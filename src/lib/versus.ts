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
  return {
    title: 'Versus',
    rounds,
    mode: 'practice',
    dateKey: '',
    versusSeed: seed,
    // One scored attempt per seed (#28): without a lock the challenged player
    // could quietly replay the same five places until happy with the result.
    lockKey: versusLockKey(seed),
  }
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

/**
 * Opponent's running total through the first `roundsPlayed` rounds (#27) —
 * the live "them" score shown while the challenged player works through the
 * same places.
 */
export function opponentRunningTotal(
  bases: number[],
  rounds: Round[],
  roundsPlayed: number,
): number {
  return totalFromBases(bases.slice(0, Math.max(0, roundsPlayed)), rounds)
}

/**
 * Persistent banner for the challenged player (#27): opening a challenge link
 * previously looked like a normal solo game until the very end — the score to
 * beat has to be on screen from round 1.
 */
export function challengeBannerText(theirTotal: number): string {
  return `⚔️ You've been challenged — beat ${theirTotal}`
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

/**
 * Challenge-link integrity (#28). Scores used to travel as plaintext
 * (?s=0.0.5.40.4) — trivially editable into an unbeatable "challenge". The
 * payload is now packed with a seed-bound checksum and base64url-encoded, so
 * casual URL editing breaks the link instead of forging it. This is
 * deterrence, not cryptography: the app is open source and fully
 * client-side, so a determined cheat can always recompute the checksum.
 */
const CHALLENGE_SALT = 'terratap-versus-v1'

/** FNV-1a over the string, as an unsigned 32-bit int. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const checksum = (seed: string, payload: string) =>
  fnv1a(`${seed}|${payload}|${CHALLENGE_SALT}`).toString(36)

/** Pack bases + seed-bound checksum into a URL-safe token. */
export function encodeChallenge(bases: number[], seed: string): string {
  const payload = encodeBases(bases)
  const packed = `${payload}~${checksum(seed, payload)}`
  return btoa(packed).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Unpack a challenge token for this seed; null when missing, malformed,
 * checksum-mismatched (edited), or bound to a different seed.
 */
export function decodeChallenge(
  raw: string | undefined | null,
  seed: string,
  expectedLength: number,
): number[] | null {
  if (!raw) return null
  let packed: string
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/')
    packed = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  } catch {
    return null
  }
  const split = packed.lastIndexOf('~')
  if (split < 0) return null
  const payload = packed.slice(0, split)
  if (packed.slice(split + 1) !== checksum(seed, payload)) return null
  return parseBases(payload, expectedLength)
}

/**
 * Browser storage key locking a versus seed to one scored attempt (#28).
 * Riding the same lock machinery as the daily: finish once, and revisiting
 * the link shows the saved result (with Rechallenge) instead of a fresh run.
 */
export const versusLockKey = (seed: string) => `terratap:versus:${seed}`

/** Challenge URL for sharing: same seed, the sharer's bases attached. */
export function challengeUrl(origin: string, seed: string, bases: number[]): string {
  return `${origin}/versus?seed=${encodeURIComponent(seed)}&s=${encodeChallenge(bases, seed)}`
}

/** Share text inviting an opponent to beat the sharer's total. */
export function formatChallengeShare(total: number, url: string): string {
  return `Terra Tap Versus — I scored ${total}. Think you can beat me?\n${url}`
}
