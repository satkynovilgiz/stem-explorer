import type { Vec3 } from '../data/chemistry/types'

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Two ligands at `angleDeg` around a central atom at the origin, in the XY plane. */
export function bentLigands(bondLength: number, angleDeg: number): [Vec3, Vec3] {
  const half = toRad(angleDeg) / 2
  const x = bondLength * Math.sin(half)
  const y = -bondLength * Math.cos(half)
  return [
    [-x, y, 0],
    [x, y, 0],
  ]
}

/** Two ligands on opposite sides of the origin along X (180°). */
export function linearLigands(bondLength: number): [Vec3, Vec3] {
  return [
    [-bondLength, 0, 0],
    [bondLength, 0, 0],
  ]
}

/**
 * Four ligands on alternating cube corners, giving ideal tetrahedral angles
 * of arccos(-1/3) ≈ 109.47°. Rotated so one bond points straight up.
 */
export function tetrahedralLigands(bondLength: number): [Vec3, Vec3, Vec3, Vec3] {
  const s = bondLength / Math.sqrt(3)
  const corners: Vec3[] = [
    [s, s, s],
    [s, -s, -s],
    [-s, s, -s],
    [-s, -s, s],
  ]
  // Rotate the (1,1,1) direction onto +Y so the model sits upright.
  return corners.map((p) => rotateOntoY(p, [1, 1, 1])) as [Vec3, Vec3, Vec3, Vec3]
}

function rotateOntoY(p: Vec3, axisFrom: Vec3): Vec3 {
  const len = Math.hypot(...axisFrom)
  const a = axisFrom.map((v) => v / len) as unknown as Vec3
  // Rotation axis k = a × ŷ, angle θ = acos(a · ŷ); Rodrigues' formula.
  const k: Vec3 = [-a[2], 0, a[0]]
  const kLen = Math.hypot(...k)
  if (kLen < 1e-9) return p
  const kn = k.map((v) => v / kLen) as unknown as Vec3
  const cos = a[1]
  const sin = kLen
  const dot = kn[0] * p[0] + kn[1] * p[1] + kn[2] * p[2]
  const cross: Vec3 = [
    kn[1] * p[2] - kn[2] * p[1],
    kn[2] * p[0] - kn[0] * p[2],
    kn[0] * p[1] - kn[1] * p[0],
  ]
  return [0, 1, 2].map(
    (i) => p[i] * cos + cross[i] * sin + kn[i] * dot * (1 - cos),
  ) as unknown as Vec3
}

/** Shift points so their centroid sits at the origin. */
export function centered(points: readonly Vec3[]): Vec3[] {
  const n = points.length
  const c = [0, 1, 2].map((i) => points.reduce((sum, p) => sum + p[i], 0) / n)
  return points.map((p) => [p[0] - c[0], p[1] - c[1], p[2] - c[2]] as const)
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Angle at vertex `b` formed by a–b–c, in degrees. */
export function angleDeg(a: Vec3, b: Vec3, c: Vec3): number {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  const dot = u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
  return (Math.acos(dot / (Math.hypot(...u) * Math.hypot(...v))) * 180) / Math.PI
}
