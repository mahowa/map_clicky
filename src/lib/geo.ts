import type { Difficulty } from './scoring'

/**
 * Derive a guessing difficulty from a city's population (and capital status).
 * Recognizable megacities and capitals are "easy"; small/obscure places are "hard".
 * Pure + deterministic so it can be reused by the importer and unit-tested.
 */
export function difficultyFromPopulation(population: number, isCapital = false): Difficulty {
  if (isCapital) return 'easy'
  if (population >= 2_000_000) return 'easy'
  if (population >= 500_000) return 'medium'
  return 'hard'
}
