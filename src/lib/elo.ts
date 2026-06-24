/**
 * Elo rating + competitive tiers for ranked live duels.
 *
 * Pure module (shared between the PartyKit match server, which writes the result,
 * and any UI that previews rating changes). No DB / React / Node-only APIs.
 */

export type MatchOutcome = 'win' | 'loss' | 'draw'

/** Score value used by the Elo formula for a given outcome. */
const OUTCOME_SCORE: Record<MatchOutcome, number> = {
  win: 1,
  draw: 0.5,
  loss: 0,
}

/** Default K-factor. Higher = faster rating movement (good for a young ladder). */
export const DEFAULT_K = 32

export const STARTING_ELO = 1000

/**
 * Expected score for player A against player B (logistic curve).
 * Returns a probability in (0, 1).
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

/**
 * New rating for a player after a single game.
 */
export function newRating(
  rating: number,
  opponentRating: number,
  outcome: MatchOutcome,
  k: number = DEFAULT_K,
): number {
  const expected = expectedScore(rating, opponentRating)
  const actual = OUTCOME_SCORE[outcome]
  return Math.round(rating + k * (actual - expected))
}

/**
 * Compute both players' new ratings from player A's outcome.
 */
export function applyMatch(
  ratingA: number,
  ratingB: number,
  outcomeA: MatchOutcome,
  k: number = DEFAULT_K,
): { a: number; b: number } {
  const outcomeB: MatchOutcome =
    outcomeA === 'win' ? 'loss' : outcomeA === 'loss' ? 'win' : 'draw'
  return {
    a: newRating(ratingA, ratingB, outcomeA, k),
    b: newRating(ratingB, ratingA, outcomeB, k),
  }
}

/** Competitive tiers, mirroring the 8-tier ladder concept (Tourist -> Grand Master). */
export type Tier = {
  name: string
  minElo: number
}

export const TIERS: Tier[] = [
  { name: 'Tourist', minElo: 0 },
  { name: 'Explorer', minElo: 900 },
  { name: 'Navigator', minElo: 1100 },
  { name: 'Cartographer', minElo: 1300 },
  { name: 'Pathfinder', minElo: 1500 },
  { name: 'Globetrotter', minElo: 1700 },
  { name: 'Master', minElo: 1900 },
  { name: 'Grand Master', minElo: 2100 },
]

/** Resolve a rating to its tier (highest tier whose threshold is met). */
export function tierForElo(elo: number): Tier {
  let result = TIERS[0]
  for (const tier of TIERS) {
    if (elo >= tier.minElo) result = tier
  }
  return result
}
