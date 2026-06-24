/**
 * Tiny deterministic RNG so daily-set generation is reproducible: the same date
 * seed always yields the same picks. Pure (no Date/Math.random) and testable.
 */

/** Hash a string to a 32-bit unsigned int (xfnv1a). */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  }
  return h >>> 0
}

/** mulberry32: fast seeded PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Convenience: a PRNG seeded from an arbitrary string (e.g. a date). */
export function seededRng(seed: string): () => number {
  return mulberry32(hashString(seed))
}

/** Fisher-Yates shuffle (returns a new array) using the supplied rng. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick `count` items deterministically from `items` using `rng`. */
export function pick<T>(items: readonly T[], count: number, rng: () => number): T[] {
  return shuffle(items, rng).slice(0, count)
}
