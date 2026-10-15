export type Vec3 = readonly [number, number, number]

export type ElementSymbol = 'H' | 'C' | 'N' | 'O'

export interface ElementInfo {
  symbol: ElementSymbol
  name: string
  atomicNumber: number
  /** Display color following the common CPK / Jmol convention. */
  color: string
  /** Van der Waals radius in ångströms (Bondi, 1964). */
  vdwRadius: number
}

export interface Atom {
  /** Stable, per-element ID shown to users, e.g. "O1" or "H2". */
  id: string
  element: ElementSymbol
  /** Position in ångströms, exactly as listed by the coordinate source (not centered or scaled). */
  position: Vec3
  /** Atom label used by the coordinate source, for traceability (e.g. CCCBDB "H4"). */
  sourceLabel: string
}

/** 'aromatic' marks a bond in a delocalized ring (e.g. benzene), not an integer order. */
export type BondOrder = 1 | 2 | 3 | 'aromatic'

export interface Bond {
  id: string
  atoms: readonly [string, string]
  order: BondOrder
}

export interface Source {
  id: string
  label: string
  url: string
  /** What this source was used for. */
  usedFor: string
}

/**
 * experimental — derived from measurements (spectroscopy, diffraction);
 * computed — from quantum-chemistry calculations;
 * illustrative — hand-built for teaching, not a measurement.
 */
export type GeometryKind = 'experimental' | 'computed' | 'illustrative'

export interface CoordinateInfo {
  kind: GeometryKind
  unit: 'Å'
  sourceId: string
  note: string
}

/** A bond length or angle as reported by a source (not recomputed from coordinates). */
export interface GeometryParameter {
  label: string
  value: number
  unit: 'Å' | '°'
  kind: GeometryKind
  sourceId: string
}

/** Local geometry around one atom, e.g. "trigonal pyramidal around N1". */
export interface AtomCenterGeometry {
  atomId: string
  shape: string
  description: string
}

export interface MoleculeNote {
  title: string
  body: string
}

export interface DisplayTransform {
  /** Rotation applied only when drawing, to give a readable default view. */
  rotation?: { axis: Vec3; angleDeg: number }
}

export interface Molecule {
  id: string
  name: string
  /** Display formula in ASCII; digits are rendered as subscripts. */
  formula: string
  /** Extra search terms (other formulas, synonyms). */
  aliases: readonly string[]
  summary: string
  /** One-line shape summary for the library list. */
  shapeSummary: string
  centers: readonly AtomCenterGeometry[]
  parameters: readonly GeometryParameter[]
  shapeExplanation: string
  notes: readonly MoleculeNote[]
  coordinates: CoordinateInfo
  limitations: readonly string[]
  display: DisplayTransform
  atoms: readonly Atom[]
  bonds: readonly Bond[]
  sources: readonly Source[]
}

export type Representation = 'ball-and-stick' | 'space-filling'
