export type Vec3 = readonly [number, number, number]

export type ElementSymbol = 'H' | 'C' | 'O'

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
  id: string
  element: ElementSymbol
  /** Short label shown in the scene, e.g. "O" or "H1". */
  label: string
  /** Position in ångströms, centered on the molecule. */
  position: Vec3
}

export type BondOrder = 1 | 2 | 3

export interface Bond {
  id: string
  atoms: readonly [string, string]
  order: BondOrder
}

export interface Source {
  label: string
  url: string
  /** What this source was used for. */
  usedFor: string
}

export interface MoleculeGeometry {
  /** VSEPR shape name, e.g. "Bent". */
  shape: string
  bondAngleDeg: number
  bondLabel: string
  bondLengthAngstrom: number
}

export interface Molecule {
  id: string
  name: string
  /** ASCII formula; digits are rendered as subscripts. */
  formula: string
  /** Extra search terms. */
  aliases: readonly string[]
  summary: string
  geometry: MoleculeGeometry
  shapeExplanation: string
  atoms: readonly Atom[]
  bonds: readonly Bond[]
  sources: readonly Source[]
}

export type Representation = 'ball-and-stick' | 'space-filling'
