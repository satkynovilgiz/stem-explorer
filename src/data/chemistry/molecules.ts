import { bentLigands, centered, linearLigands, tetrahedralLigands } from '../../lib/geometry'
import type { Atom, Molecule, Source, Vec3 } from './types'

/**
 * Bond lengths and angles are experimental values from the NIST Computational
 * Chemistry Comparison and Benchmark Database (CCCBDB), Release 22.
 */

const BONDI: Source = {
  label: 'Bondi, A. (1964). van der Waals Volumes and Radii. J. Phys. Chem. 68, 441–451',
  url: 'https://doi.org/10.1021/j100785a001',
  usedFor: 'Van der Waals radii for the space-filling view',
}

const JMOL_COLORS: Source = {
  label: 'Jmol — CPK element colors',
  url: 'https://jmol.sourceforge.net/jscolors/',
  usedFor: 'Atom color convention',
}

function withIds(
  atoms: readonly { element: Atom['element']; label: string }[],
  positions: readonly Vec3[],
): Atom[] {
  const c = centered(positions)
  return atoms.map((a, i) => ({ ...a, id: a.label, position: c[i] }))
}

// Water — O–H 0.958 Å, H–O–H 104.48°
const WATER_OH = 0.958
const WATER_ANGLE = 104.48
const [waterH1, waterH2] = bentLigands(WATER_OH, WATER_ANGLE)

// Carbon dioxide — C=O 1.162 Å, O–C–O 180°
const CO2_CO = 1.162
const [co2O1, co2O2] = linearLigands(CO2_CO)

// Methane — C–H 1.087 Å, H–C–H 109.47°
const CH4_CH = 1.087
const methaneH = tetrahedralLigands(CH4_CH)

export const MOLECULES: readonly Molecule[] = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    aliases: ['dihydrogen monoxide', 'oxidane'],
    summary:
      'One oxygen atom bonded to two hydrogen atoms by single covalent bonds.',
    geometry: {
      shape: 'Bent',
      bondAngleDeg: WATER_ANGLE,
      bondLabel: 'O–H',
      bondLengthAngstrom: WATER_OH,
    },
    shapeExplanation:
      'Oxygen has four electron domains: two bonding pairs and two lone pairs. They arrange roughly tetrahedrally, but only the two hydrogens are atoms, so the molecule looks bent. Lone pairs repel more strongly than bonding pairs, squeezing the H–O–H angle to about 104.5°, below the ideal tetrahedral 109.5°. Lone pairs are not drawn in this model.',
    atoms: withIds(
      [
        { element: 'O', label: 'O' },
        { element: 'H', label: 'H1' },
        { element: 'H', label: 'H2' },
      ],
      [[0, 0, 0], waterH1, waterH2],
    ),
    bonds: [
      { id: 'O-H1', atoms: ['O', 'H1'], order: 1 },
      { id: 'O-H2', atoms: ['O', 'H2'], order: 1 },
    ],
    sources: [
      {
        label: 'NIST CCCBDB — Experimental geometry of H₂O',
        url: 'https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185',
        usedFor: 'O–H bond length and H–O–H angle',
      },
      {
        label: 'PubChem — Water (CID 962)',
        url: 'https://pubchem.ncbi.nlm.nih.gov/compound/962',
        usedFor: 'Identity and formula',
      },
      BONDI,
      JMOL_COLORS,
    ],
  },
  {
    id: 'carbon-dioxide',
    name: 'Carbon dioxide',
    formula: 'CO2',
    aliases: ['carbonic anhydride'],
    summary:
      'A carbon atom joined to two oxygen atoms by two double bonds.',
    geometry: {
      shape: 'Linear',
      bondAngleDeg: 180,
      bondLabel: 'C=O',
      bondLengthAngstrom: CO2_CO,
    },
    shapeExplanation:
      'Carbon has two electron domains — the two C=O double bonds — and no lone pairs. Two domains are farthest apart on opposite sides of the central atom, so the molecule is linear with an O–C–O angle of 180°. Each double bond is shown as two parallel sticks.',
    atoms: withIds(
      [
        { element: 'O', label: 'O1' },
        { element: 'C', label: 'C' },
        { element: 'O', label: 'O2' },
      ],
      [co2O1, [0, 0, 0], co2O2],
    ),
    bonds: [
      { id: 'C=O1', atoms: ['C', 'O1'], order: 2 },
      { id: 'C=O2', atoms: ['C', 'O2'], order: 2 },
    ],
    sources: [
      {
        label: 'NIST CCCBDB — Experimental geometry of CO₂',
        url: 'https://cccbdb.nist.gov/expgeom2x.asp?casno=124389',
        usedFor: 'C=O bond length and O–C–O angle',
      },
      {
        label: 'PubChem — Carbon dioxide (CID 280)',
        url: 'https://pubchem.ncbi.nlm.nih.gov/compound/280',
        usedFor: 'Identity and formula',
      },
      BONDI,
      JMOL_COLORS,
    ],
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    aliases: ['natural gas', 'carbane'],
    summary:
      'A carbon atom bonded to four hydrogen atoms by single covalent bonds.',
    geometry: {
      shape: 'Tetrahedral',
      bondAngleDeg: 109.47,
      bondLabel: 'C–H',
      bondLengthAngstrom: CH4_CH,
    },
    shapeExplanation:
      'Carbon has four bonding pairs and no lone pairs. Four domains spread out as far as possible by pointing to the corners of a tetrahedron, giving every H–C–H angle the ideal value of about 109.5°. Rotate the model to see that all four hydrogens are equivalent.',
    atoms: withIds(
      [
        { element: 'C', label: 'C' },
        { element: 'H', label: 'H1' },
        { element: 'H', label: 'H2' },
        { element: 'H', label: 'H3' },
        { element: 'H', label: 'H4' },
      ],
      [[0, 0, 0], ...methaneH],
    ),
    bonds: [
      { id: 'C-H1', atoms: ['C', 'H1'], order: 1 },
      { id: 'C-H2', atoms: ['C', 'H2'], order: 1 },
      { id: 'C-H3', atoms: ['C', 'H3'], order: 1 },
      { id: 'C-H4', atoms: ['C', 'H4'], order: 1 },
    ],
    sources: [
      {
        label: 'NIST CCCBDB — Experimental geometry of CH₄',
        url: 'https://cccbdb.nist.gov/expgeom2x.asp?casno=74828',
        usedFor: 'C–H bond length and H–C–H angle',
      },
      {
        label: 'PubChem — Methane (CID 297)',
        url: 'https://pubchem.ncbi.nlm.nih.gov/compound/297',
        usedFor: 'Identity and formula',
      },
      BONDI,
      JMOL_COLORS,
    ],
  },
]

export function getMolecule(id: string): Molecule {
  return MOLECULES.find((m) => m.id === id) ?? MOLECULES[0]
}
