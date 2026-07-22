import type { GameRun } from './game-types'

/**
 * Post-game navigation (issue #21): the results screen links back to the main
 * menu and out to the other game modes. Pure helpers so the mapping is
 * unit-testable.
 */

export type GameKind = 'daily' | 'speed' | 'versus' | 'history' | 'quiz'

export type GameLink = { href: string; label: string; kind: GameKind }

export const GAME_LINKS: GameLink[] = [
  { href: '/play', label: 'Play the Daily', kind: 'daily' },
  { href: '/quizzes', label: 'Pop Quizzes', kind: 'quiz' },
  { href: '/speed', label: 'Speed Run', kind: 'speed' },
  { href: '/history', label: 'Geography History', kind: 'history' },
  { href: '/versus', label: 'Versus', kind: 'versus' },
]

/** Which game a run belongs to (drives which CTA to omit post-game). */
export function runKind(run: GameRun): GameKind {
  if (run.mode === 'daily') return 'daily'
  if (run.versusSeed) return 'versus'
  if (run.timed) return 'speed'
  if (run.labeled) return 'history'
  return 'quiz'
}

/** Every game link except the one just played. */
export function otherGameLinks(kind: GameKind): GameLink[] {
  return GAME_LINKS.filter((l) => l.kind !== kind)
}
