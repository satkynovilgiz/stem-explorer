import type { Atom, Molecule, Source, Vec3 } from './types'

/*
 * All coordinates are Cartesian positions in ångströms (Å), copied as listed in the
 * "Experimental Geometry" pages of the NIST Computational Chemistry Comparison and
 * Benchmark Database (CCCBDB, SRD 101). They are not centered or scaled here; the
 * scene centers and rotates them for display only. Atom IDs are renumbered per
 * element for readability; `sourceLabel` keeps the CCCBDB label.
 */

const cccbdb = (casno: string, name: string): Source => ({
  id: 'cccbdb',
  label: `NIST CCCBDB — Experimental geometry of ${name}`,
  url: `https://cccbdb.nist.gov/expgeom2x.asp?casno=${casno}`,
  usedFor: 'Cartesian coordinates, bond lengths and angles',
})

const pubchem = (cid: number, name: string): Source => ({
  id: 'pubchem',
  label: `PubChem — ${name} (CID ${cid})`,
  url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
  usedFor: 'Identity, formula and connectivity check',
})

const BONDI: Source = {
  id: 'bondi',
  label: 'Bondi, A. (1964). van der Waals Volumes and Radii. J. Phys. Chem. 68, 441–451',
  url: 'https://doi.org/10.1021/j100785a001',
  usedFor: 'Van der Waals radii for the space-filling view',
}

const JMOL_COLORS: Source = {
  id: 'jmol',
  label: 'Jmol — CPK element colors',
  url: 'https://jmol.sourceforge.net/jscolors/',
  usedFor: 'Atom color convention',
}

const SHARED_LIMITATIONS = [
  'Atoms are drawn at fixed equilibrium positions; real molecules vibrate and rotate constantly.',
  'Electrons occupy clouds, not hard spheres. Lone pairs, partial charges and orbitals are not drawn.',
  'Coordinates are given to 0.0001 Å, and the reported parameters to about 0.001 Å; measurements are rounded accordingly.',
]

type AtomRow = readonly [id: string, element: Atom['element'], sourceLabel: string, x: number, y: number, z: number]

function atoms(rows: readonly AtomRow[]): Atom[] {
  return rows.map(([id, element, sourceLabel, x, y, z]) => ({
    id,
    element,
    sourceLabel,
    position: [x, y, z] as Vec3,
  }))
}

/** Bonds listed explicitly as [atomA, atomB, order]; never inferred from distances. */
function bonds(rows: readonly (readonly [string, string, Molecule['bonds'][number]['order']])[]) {
  return rows.map(([a, b, order]) => ({ id: `${a}-${b}`, atoms: [a, b] as const, order }))
}

const EXPERIMENTAL_NOTE =
  'Experimental equilibrium geometry as compiled by NIST CCCBDB (Cartesian coordinates as listed).'

export const MOLECULES: readonly Molecule[] = [
  {
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    aliases: ['dihydrogen monoxide', 'oxidane'],
    summary: 'One oxygen atom bonded to two hydrogen atoms by single covalent bonds.',
    shapeSummary: 'Bent',
    centers: [
      {
        atomId: 'O1',
        shape: 'Bent',
        description: 'Two bonding pairs and two lone pairs around oxygen.',
      },
    ],
    parameters: [
      { label: 'O–H bond length', value: 0.958, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'H–O–H angle', value: 104.4776, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'Oxygen has four electron domains: two bonding pairs and two lone pairs. They arrange roughly tetrahedrally, but only the two hydrogens are atoms, so the molecule looks bent. Lone pairs repel more strongly than bonding pairs, squeezing the H–O–H angle to about 104.5°, below the ideal tetrahedral 109.5°.',
    notes: [],
    coordinates: { kind: 'experimental', unit: 'Å', sourceId: 'cccbdb', note: EXPERIMENTAL_NOTE },
    limitations: SHARED_LIMITATIONS,
    // Source lies in the yz-plane with O on +z; show it upright in the screen plane.
    display: { rotation: { axis: [1, 1, 1], angleDeg: -120 } },
    atoms: atoms([
      ['O1', 'O', 'O1', 0.0, 0.0, 0.1173],
      ['H1', 'H', 'H2', 0.0, 0.7572, -0.4692],
      ['H2', 'H', 'H3', 0.0, -0.7572, -0.4692],
    ]),
    bonds: bonds([
      ['O1', 'H1', 1],
      ['O1', 'H2', 1],
    ]),
    sources: [cccbdb('7732185', 'H₂O'), pubchem(962, 'Water'), BONDI, JMOL_COLORS],
  },
  {
    id: 'carbon-dioxide',
    name: 'Carbon dioxide',
    formula: 'CO2',
    aliases: ['carbonic anhydride'],
    summary: 'A carbon atom joined to two oxygen atoms by two double bonds.',
    shapeSummary: 'Linear',
    centers: [
      {
        atomId: 'C1',
        shape: 'Linear',
        description: 'Two double bonds and no lone pairs around carbon.',
      },
    ],
    parameters: [
      { label: 'C=O bond length', value: 1.162, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'O–C–O angle', value: 180, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'Carbon has two electron domains — the two C=O double bonds — and no lone pairs. Two domains are farthest apart on opposite sides of the central atom, so the molecule is linear with an O–C–O angle of 180°. Each double bond is drawn as two parallel sticks.',
    notes: [],
    coordinates: { kind: 'experimental', unit: 'Å', sourceId: 'cccbdb', note: EXPERIMENTAL_NOTE },
    limitations: SHARED_LIMITATIONS,
    // Source axis is z; lay the molecule horizontally.
    display: { rotation: { axis: [0, 1, 0], angleDeg: 90 } },
    atoms: atoms([
      ['C1', 'C', 'C1', 0.0, 0.0, 0.0],
      ['O1', 'O', 'O2', 0.0, 0.0, 1.1621],
      ['O2', 'O', 'O3', 0.0, 0.0, -1.1621],
    ]),
    bonds: bonds([
      ['C1', 'O1', 2],
      ['C1', 'O2', 2],
    ]),
    sources: [cccbdb('124389', 'CO₂'), pubchem(280, 'Carbon dioxide'), BONDI, JMOL_COLORS],
  },
  {
    id: 'methane',
    name: 'Methane',
    formula: 'CH4',
    aliases: ['carbane', 'marsh gas'],
    summary: 'A carbon atom bonded to four hydrogen atoms by single covalent bonds.',
    shapeSummary: 'Tetrahedral',
    centers: [
      {
        atomId: 'C1',
        shape: 'Tetrahedral',
        description: 'Four bonding pairs and no lone pairs around carbon.',
      },
    ],
    parameters: [
      { label: 'C–H bond length', value: 1.087, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'H–C–H angle', value: 109.471, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'Carbon has four bonding pairs and no lone pairs. Four domains spread out as far as possible by pointing to the corners of a tetrahedron, giving every H–C–H angle the ideal value of about 109.5°. Rotate the model to see that all four hydrogens are equivalent.',
    notes: [],
    coordinates: { kind: 'experimental', unit: 'Å', sourceId: 'cccbdb', note: EXPERIMENTAL_NOTE },
    limitations: SHARED_LIMITATIONS,
    // Turn the (1,1,1) C–H bond to point straight up.
    display: { rotation: { axis: [-1, 0, 1], angleDeg: 54.7356 } },
    atoms: atoms([
      ['C1', 'C', 'C1', 0.0, 0.0, 0.0],
      ['H1', 'H', 'H2', 0.6276, 0.6276, 0.6276],
      ['H2', 'H', 'H3', 0.6276, -0.6276, -0.6276],
      ['H3', 'H', 'H4', -0.6276, 0.6276, -0.6276],
      ['H4', 'H', 'H5', -0.6276, -0.6276, 0.6276],
    ]),
    bonds: bonds([
      ['C1', 'H1', 1],
      ['C1', 'H2', 1],
      ['C1', 'H3', 1],
      ['C1', 'H4', 1],
    ]),
    sources: [cccbdb('74828', 'CH₄'), pubchem(297, 'Methane'), BONDI, JMOL_COLORS],
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH3',
    aliases: ['H3N', 'azane'],
    summary: 'A nitrogen atom bonded to three hydrogen atoms, with one lone pair on nitrogen.',
    shapeSummary: 'Trigonal pyramidal',
    centers: [
      {
        atomId: 'N1',
        shape: 'Trigonal pyramidal',
        description: 'Three bonding pairs and one lone pair around nitrogen.',
      },
    ],
    parameters: [
      { label: 'N–H bond length', value: 1.012, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'H–N–H angle', value: 106.67, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'Nitrogen has four electron domains: three bonding pairs and one lone pair. The domains point roughly toward the corners of a tetrahedron, but only three are atoms, so the molecule is a low pyramid with nitrogen at the top. The lone pair pushes the bonds slightly closer together, giving H–N–H angles of about 106.7°, a little below 109.5°.',
    notes: [
      {
        title: 'The lone pair is not drawn',
        body: 'The empty space above nitrogen is where the lone pair sits. It shapes the molecule but is not an atom, so the model does not show it.',
      },
    ],
    coordinates: { kind: 'experimental', unit: 'Å', sourceId: 'cccbdb', note: EXPERIMENTAL_NOTE },
    limitations: [
      ...SHARED_LIMITATIONS,
      'Ammonia can invert through a planar shape, like an umbrella turning inside out. The model shows one pyramidal form.',
    ],
    // Source C3 axis is z with N on top; stand it upright.
    display: { rotation: { axis: [1, 0, 0], angleDeg: -90 } },
    atoms: atoms([
      ['N1', 'N', 'N1', 0.0, 0.0, 0.0],
      ['H1', 'H', 'H2', 0.0, -0.9377, -0.3816],
      ['H2', 'H', 'H3', 0.8121, 0.4689, -0.3816],
      ['H3', 'H', 'H4', -0.8121, 0.4689, -0.3816],
    ]),
    bonds: bonds([
      ['N1', 'H1', 1],
      ['N1', 'H2', 1],
      ['N1', 'H3', 1],
    ]),
    sources: [cccbdb('7664417', 'NH₃'), pubchem(222, 'Ammonia'), BONDI, JMOL_COLORS],
  },
  {
    id: 'ethanol',
    name: 'Ethanol',
    formula: 'C2H6O',
    aliases: ['C2H5OH', 'CH3CH2OH', 'ethyl alcohol', 'EtOH'],
    summary:
      'Two carbon atoms joined by a single bond. One carbon carries three hydrogens (CH₃); the other carries two hydrogens and an –OH group.',
    shapeSummary: 'Tetrahedral C, bent O',
    centers: [
      {
        atomId: 'C1',
        shape: 'Approximately tetrahedral',
        description: 'Methyl carbon: bonded to C2 and three hydrogens.',
      },
      {
        atomId: 'C2',
        shape: 'Approximately tetrahedral',
        description: 'Bonded to C1, O1 and two hydrogens. The C–C–O angle is 107.8°.',
      },
      {
        atomId: 'O1',
        shape: 'Bent',
        description: 'Two bonds (to C2 and H6) and two lone pairs. The C–O–H angle is 105.4°.',
      },
    ],
    parameters: [
      { label: 'C–C bond length', value: 1.512, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–O bond length', value: 1.431, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'O–H bond length', value: 0.971, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–H (CH₂) bond length', value: 1.086, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–C–O angle', value: 107.8, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–O–H angle', value: 105.4, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'A molecule this size has no single shape. Each carbon has four bonds and no lone pairs, so the bonds around it point roughly toward the corners of a tetrahedron. Oxygen has two bonds and two lone pairs, so the C–O–H unit is bent, like water.',
    notes: [
      {
        title: 'One conformation of many',
        body: 'Groups can rotate around the C–C and C–O single bonds, so ethanol constantly changes shape. These coordinates show the anti (trans) form: the O–H hydrogen points away from the CH₃ group (C1–C2–O1–H6 dihedral 180°). Gauche forms, in which the O–H is turned about 120° from this position, also exist.',
      },
    ],
    coordinates: {
      kind: 'experimental',
      unit: 'Å',
      sourceId: 'cccbdb',
      note: `${EXPERIMENTAL_NOTE} CCCBDB cites the internal coordinates to Coussan et al. (1998), which reports only some bond lengths and angles; positions of the remaining hydrogens come from the CCCBDB coordinate set and are less certain.`,
    },
    limitations: [
      ...SHARED_LIMITATIONS,
      'This is a single conformation. A sample of ethanol contains a mixture of interconverting conformations.',
      'The CCCBDB listing gives the methyl C–H lengths as 1.088 Å and 1.098 Å, but its internal coordinates and Cartesian table assign them to different hydrogens. This model follows the Cartesian table, so treat methyl C–H distances as approximate.',
    ],
    display: {},
    atoms: atoms([
      ['C1', 'C', 'C1', 1.1879, -0.3829, 0.0],
      ['C2', 'C', 'C2', 0.0, 0.5526, 0.0],
      ['O1', 'O', 'O3', -1.1867, -0.2472, 0.0],
      ['H1', 'H', 'H5', 2.0985, 0.2306, 0.0],
      ['H2', 'H', 'H6', 1.1184, -1.0093, 0.8869],
      ['H3', 'H', 'H7', 1.1184, -1.0093, -0.8869],
      ['H4', 'H', 'H8', -0.0227, 1.1812, 0.8852],
      ['H5', 'H', 'H9', -0.0227, 1.1812, -0.8852],
      ['H6', 'H', 'H4', -1.9237, 0.385, 0.0],
    ]),
    bonds: bonds([
      ['C1', 'C2', 1],
      ['C2', 'O1', 1],
      ['O1', 'H6', 1],
      ['C1', 'H1', 1],
      ['C1', 'H2', 1],
      ['C1', 'H3', 1],
      ['C2', 'H4', 1],
      ['C2', 'H5', 1],
    ]),
    sources: [
      cccbdb('64175', 'ethanol'),
      {
        id: 'coussan1998',
        label:
          'Coussan, S., Bouteiller, Y., Perchard, J. P., Zheng, W. Q. (1998). Rotational Isomerism of Ethanol and Matrix Isolation Infrared Spectroscopy. J. Phys. Chem. A 102, 5789–5793',
        url: 'https://doi.org/10.1021/jp9805961',
        usedFor: 'Internal coordinates cited by CCCBDB',
      },
      pubchem(702, 'Ethanol'),
      BONDI,
      JMOL_COLORS,
    ],
  },
  {
    id: 'benzene',
    name: 'Benzene',
    formula: 'C6H6',
    aliases: ['benzol', 'cyclohexatriene'],
    summary: 'Six carbon atoms in a flat hexagonal ring, each bonded to one hydrogen.',
    shapeSummary: 'Planar ring',
    centers: [
      {
        atomId: 'C1',
        shape: 'Trigonal planar (every carbon)',
        description:
          'Each carbon bonds to two ring carbons and one hydrogen, with 120° between them. All 12 atoms lie in one plane.',
      },
    ],
    parameters: [
      { label: 'C–C bond length (all six)', value: 1.397, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–H bond length', value: 1.084, unit: 'Å', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'C–C–C angle', value: 120, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
      { label: 'H–C–C angle', value: 120, unit: '°', kind: 'experimental', sourceId: 'cccbdb' },
    ],
    shapeExplanation:
      'Each carbon has three bonding domains and no lone pairs, giving a trigonal-planar arrangement with 120° angles. Six such carbons close into a flat regular hexagon.',
    notes: [
      {
        title: 'Aromatic, delocalized bonding',
        body: 'All six C–C bonds have the same length (1.397 Å). Instead of fixed alternating single and double bonds, six π electrons are shared around the whole ring. The model draws every ring bond the same way: a solid stick plus a dashed inner stick, standing for this shared bonding. Textbook structures with alternating single and double lines (Kekulé structures) are a simplified notation, not two real forms that flip back and forth.',
      },
    ],
    coordinates: { kind: 'experimental', unit: 'Å', sourceId: 'cccbdb', note: EXPERIMENTAL_NOTE },
    limitations: [
      ...SHARED_LIMITATIONS,
      'The dashed inner sticks are a drawing convention for delocalized π bonding, not a measured feature.',
    ],
    display: {},
    atoms: atoms([
      ['C1', 'C', 'C1', 0.0, 1.397, 0.0],
      ['C2', 'C', 'C2', 1.2098, 0.6985, 0.0],
      ['C3', 'C', 'C3', 1.2098, -0.6985, 0.0],
      ['C4', 'C', 'C4', 0.0, -1.397, 0.0],
      ['C5', 'C', 'C5', -1.2098, -0.6985, 0.0],
      ['C6', 'C', 'C6', -1.2098, 0.6985, 0.0],
      ['H1', 'H', 'H7', 0.0, 2.481, 0.0],
      ['H2', 'H', 'H8', 2.1486, 1.2405, 0.0],
      ['H3', 'H', 'H9', 2.1486, -1.2405, 0.0],
      ['H4', 'H', 'H10', 0.0, -2.481, 0.0],
      ['H5', 'H', 'H11', -2.1486, -1.2405, 0.0],
      ['H6', 'H', 'H12', -2.1486, 1.2405, 0.0],
    ]),
    bonds: bonds([
      ['C1', 'C2', 'aromatic'],
      ['C2', 'C3', 'aromatic'],
      ['C3', 'C4', 'aromatic'],
      ['C4', 'C5', 'aromatic'],
      ['C5', 'C6', 'aromatic'],
      ['C6', 'C1', 'aromatic'],
      ['C1', 'H1', 1],
      ['C2', 'H2', 1],
      ['C3', 'H3', 1],
      ['C4', 'H4', 1],
      ['C5', 'H5', 1],
      ['C6', 'H6', 1],
    ]),
    sources: [cccbdb('71432', 'C₆H₆'), pubchem(241, 'Benzene'), BONDI, JMOL_COLORS],
  },
]

export const DEFAULT_MOLECULE_ID = MOLECULES[0].id

export function findMolecule(id: string): Molecule | undefined {
  return MOLECULES.find((m) => m.id === id)
}

export function getMolecule(id: string): Molecule {
  return findMolecule(id) ?? MOLECULES[0]
}
