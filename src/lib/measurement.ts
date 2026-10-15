import type { Atom, Molecule, Vec3 } from '../data/chemistry/types'

export type InteractionMode = 'inspect' | 'distance' | 'angle'
export type MeasureMode = Exclude<InteractionMode, 'inspect'>

export const ATOMS_REQUIRED: Record<MeasureMode, number> = { distance: 2, angle: 3 }

/** Coordinates carry four decimals, so distances are shown to 0.001 Å and angles to 0.1°. */
export const DISTANCE_DECIMALS = 3
export const ANGLE_DECIMALS = 1

const EPSILON = 1e-9

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/**
 * Angle a–b–c at vertex b, in degrees. Returns null when either arm has zero length
 * (coincident atoms), where the angle is undefined.
 */
export function angleAt(a: Vec3, b: Vec3, c: Vec3): number | null {
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const v = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
  const lu = Math.hypot(u[0], u[1], u[2])
  const lv = Math.hypot(v[0], v[1], v[2])
  if (lu < EPSILON || lv < EPSILON) return null
  const cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv)
  // Rounding can push the cosine just outside [-1, 1], which would make acos return NaN.
  const clamped = Math.min(1, Math.max(-1, cos))
  return (Math.acos(clamped) * 180) / Math.PI
}

export function areBonded(molecule: Molecule, a: string, b: string): boolean {
  return molecule.bonds.some(
    ({ atoms: [x, y] }) => (x === a && y === b) || (x === b && y === a),
  )
}

export type PickOutcome = 'added' | 'duplicate' | 'restarted'

/**
 * Adds an atom to an ordered measurement selection.
 * - An atom already in the selection is ignored (no duplicates).
 * - Once the selection is complete, the next pick starts a new measurement.
 */
export function pickAtom(
  selection: readonly string[],
  atomId: string,
  mode: MeasureMode,
): { selection: string[]; outcome: PickOutcome } {
  const required = ATOMS_REQUIRED[mode]
  if (selection.length >= required) return { selection: [atomId], outcome: 'restarted' }
  if (selection.includes(atomId)) return { selection: [...selection], outcome: 'duplicate' }
  return { selection: [...selection, atomId], outcome: 'added' }
}

export type MeasurementResult =
  | { kind: 'distance'; atoms: [Atom, Atom]; value: number; bonded: boolean }
  | { kind: 'angle'; atoms: [Atom, Atom, Atom]; value: number; bondAngle: boolean }

/**
 * Computes a measurement from the model's source coordinates (never screen positions).
 * Returns null until the selection is complete or when the result is undefined.
 */
export function measure(
  molecule: Molecule,
  selection: readonly string[],
  mode: MeasureMode,
): MeasurementResult | null {
  if (selection.length !== ATOMS_REQUIRED[mode]) return null
  if (new Set(selection).size !== selection.length) return null
  const atoms = selection.map((id) => molecule.atoms.find((a) => a.id === id))
  if (atoms.some((a) => !a)) return null
  const found = atoms as Atom[]

  if (mode === 'distance') {
    const [a, b] = found
    return {
      kind: 'distance',
      atoms: [a, b],
      value: distance(a.position, b.position),
      bonded: areBonded(molecule, a.id, b.id),
    }
  }

  const [a, vertex, c] = found
  const value = angleAt(a.position, vertex.position, c.position)
  if (value === null) return null
  return {
    kind: 'angle',
    atoms: [a, vertex, c],
    value,
    bondAngle: areBonded(molecule, a.id, vertex.id) && areBonded(molecule, vertex.id, c.id),
  }
}

export function formatDistance(value: number): string {
  return `${value.toFixed(DISTANCE_DECIMALS)} Å`
}

export function formatAngle(value: number): string {
  return `${value.toFixed(ANGLE_DECIMALS)}°`
}

export function measurementLabel(result: MeasurementResult): string {
  if (result.kind === 'distance') return result.bonded ? 'Bond length' : 'Interatomic distance'
  return result.bondAngle ? 'Bond angle' : 'Angle'
}
