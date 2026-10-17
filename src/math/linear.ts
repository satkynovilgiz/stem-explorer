/*
 * 2D vectors and 2×2 matrices (OpenStax Calculus Vol. 3 §2.1, 2.3, 2.4; College Algebra 2e §7.5,
 * 7.7, 7.8). A matrix [[a, b], [c, d]] maps a vector (x, y) to (ax + by, cx + dy).
 */

export type Vec2 = readonly [number, number]
export type Mat2 = readonly [number, number, number, number] // a, b, c, d (row-major)

export const add = (u: Vec2, v: Vec2): Vec2 => [u[0] + v[0], u[1] + v[1]]
export const scale = (k: number, u: Vec2): Vec2 => [k * u[0], k * u[1]]
export const dot = (u: Vec2, v: Vec2) => u[0] * v[0] + u[1] * v[1]
export const norm = (u: Vec2) => Math.hypot(u[0], u[1])

/** Angle between two non-zero vectors, in degrees, from u·v = |u||v|cos θ; null if either is zero. */
export function angleBetween(u: Vec2, v: Vec2): number | null {
  const n = norm(u) * norm(v)
  if (n === 0) return null
  return (Math.acos(Math.min(1, Math.max(-1, dot(u, v) / n))) * 180) / Math.PI
}

export const apply = (m: Mat2, u: Vec2): Vec2 => [m[0] * u[0] + m[1] * u[1], m[2] * u[0] + m[3] * u[1]]
export const det = (m: Mat2) => m[0] * m[3] - m[1] * m[2]

/** The inverse, or null when det = 0 (singular). */
export function inverse(m: Mat2): Mat2 | null {
  const d = det(m)
  if (Math.abs(d) < 1e-12) return null
  return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d]
}

/**
 * Area of the parallelogram spanned by two plane vectors, |u × v| = |u₀v₁ − u₁v₀|. Applied to the
 * images of the unit vectors (the matrix columns), it equals |det M|: the factor by which the
 * transformation scales areas.
 */
export const parallelogramArea = (u: Vec2, v: Vec2) => Math.abs(u[0] * v[1] - u[1] * v[0])

/** What a singular matrix does to the plane: collapse onto a line, or onto the origin. */
export function collapse(m: Mat2): 'none' | 'line' | 'point' {
  if (Math.abs(det(m)) > 1e-12) return 'none'
  return m.every((x) => Math.abs(x) < 1e-12) ? 'point' : 'line'
}

export const PRESETS: readonly { id: string; name: string; m: Mat2; note: string }[] = [
  { id: 'identity', name: 'Identity', m: [1, 0, 0, 1], note: 'Leaves every vector unchanged; det = 1.' },
  { id: 'rotate', name: 'Rotate 90°', m: [0, -1, 1, 0], note: 'Turns the plane a quarter turn counter-clockwise; areas are unchanged (det = 1).' },
  { id: 'shear', name: 'Shear', m: [1, 1, 0, 1], note: 'Slides rows sideways; the unit square becomes a parallelogram of the same area (det = 1).' },
  { id: 'scale', name: 'Scale', m: [2, 0, 0, 0.5], note: 'Stretches x by 2 and squashes y by half; area unchanged (det = 1).' },
  { id: 'reflect', name: 'Reflect', m: [-1, 0, 0, 1], note: 'Mirrors across the y-axis; det = −1: the area is unchanged but the orientation is reversed.' },
  { id: 'singular', name: 'Singular', m: [1, 2, 0.5, 1], note: 'det = 0: the whole plane collapses onto a line, and no inverse exists.' },
]
