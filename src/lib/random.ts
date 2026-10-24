/*
 * A small seeded pseudo-random number generator for simulations that must be repeatable: the
 * same seed always gives the same sequence, in every browser. Not for security.
 * Algorithm: mulberry32 (32-bit state, public domain).
 */

export const MAX_SEED = 4294967295

export function isValidSeed(seed: number): boolean {
  return Number.isInteger(seed) && seed >= 0 && seed <= MAX_SEED
}

/** Returns a function giving numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh seed for "Run again" (from the platform's random source when available). */
export function newSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) return crypto.getRandomValues(new Uint32Array(1))[0]
  return Math.floor(Math.random() * MAX_SEED)
}
