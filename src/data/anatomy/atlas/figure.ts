import type { Shape, Vec3 } from './types'

/*
 * Landmarks of the schematic figure (body units, see types.ts). Left-side landmarks have x > 0;
 * `mirror` gives the right side. Proportions follow a conventional eight-head drawing figure, not
 * measurements of a real body.
 */

export const HEIGHT = 10

export const L = {
  shoulder: [1.3, 8.0, 0] as Vec3,
  elbow: [1.62, 6.25, -0.05] as Vec3,
  wrist: [1.85, 4.65, 0.05] as Vec3,
  hand: [1.95, 4.12, 0.08] as Vec3,
  hip: [0.55, 4.6, 0.05] as Vec3,
  knee: [0.55, 2.55, 0.08] as Vec3,
  ankle: [0.55, 0.45, -0.05] as Vec3,
  foot: [0.55, 0.16, 0.28] as Vec3,
}

export const mirror = (v: Vec3): Vec3 => [-v[0], v[1], v[2]]

/** Point a fraction t of the way from a to b. */
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Moves a point by an offset. */
export const add = (a: Vec3, d: Vec3): Vec3 => [a[0] + d[0], a[1] + d[1], a[2] + d[2]]

/** Mirrors every point of a shape across the midline (x → −x), flipping rotations to match. */
export function mirrorShape(s: Shape): Shape {
  switch (s.kind) {
    case 'ellipsoid':
      return { ...s, center: mirror(s.center), rotation: s.rotation ? [s.rotation[0], -s.rotation[1], -s.rotation[2]] : undefined }
    case 'box':
      return { ...s, center: mirror(s.center), rotation: s.rotation ? [s.rotation[0], -s.rotation[1], -s.rotation[2]] : undefined }
    case 'capsule':
      return { ...s, from: mirror(s.from), to: mirror(s.to) }
    case 'tube':
      return { ...s, points: s.points.map(mirror) }
  }
}

/** Returns [left, right] versions of a set of left-side shapes. */
export const bothSides = (left: readonly Shape[]): [readonly Shape[], readonly Shape[]] => [left, left.map(mirrorShape)]

/** Points on an elliptical arc in the x–z plane at height y (for ribs): from angle a0 to a1 (radians, 0 = +z). */
export function arc(cx: number, cy: number, cz: number, rx: number, rz: number, a0: number, a1: number, n = 8, drop = 0): Vec3[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const a = a0 + (a1 - a0) * t
    return [cx + rx * Math.sin(a), cy - drop * Math.sin(Math.PI * t * 0.5), cz + rz * Math.cos(a)] as Vec3
  })
}
