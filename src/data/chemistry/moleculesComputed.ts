import { COMPUTED_ROWS } from './moleculesComputed.data'
import type { Atom, Molecule, MoleculeNote, Source, Vec3 } from './types'

/*
 * Molecules whose drawn geometry is PubChem's computed 3D conformer (see moleculesComputed.data.ts).
 * No measured gas-phase structure is listed for most of them, so no bond lengths or angles are
 * quoted as "reported": students measure the model with the Distance and Angle tools, and every
 * page says the positions are computed.
 */

const pubchem3d = (cid: number, name: string): Source => ({
  id: 'pubchem3d',
  label: `PubChem — ${name} (CID ${cid}), 3D conformer`,
  url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=3D-Conformer`,
  usedFor: 'Computed 3D coordinates and bonds (PubChem3D: OpenEye OMEGA, MMFF94s force field)',
})

const COMPUTED_NOTE =
  'Computed by PubChem (a PubChem3D conformer from the MMFF94s force field), not measured. Lengths and angles measured here are close to, but not the same as, experimental values.'

const COMPUTED_LIMITATIONS = [
  'This is one computed low-energy shape (a conformer). Flexible molecules can twist about single bonds into other shapes.',
  'Force-field geometries are approximate: bond lengths are typically within a few hundredths of an ångström of measured values.',
]

interface Meta {
  id: keyof typeof COMPUTED_ROWS
  name: string
  formula: string
  aliases: string[]
  summary: string
  shapeSummary: string
  centers: Molecule['centers']
  shapeExplanation: string
  notes: MoleculeNote[]
  limitations?: string[]
}

const META: Meta[] = [
  {
    id: 'glucose',
    name: 'Glucose',
    formula: 'C6H12O6',
    aliases: ['D-glucose', 'dextrose', 'blood sugar', 'sugar', 'glucopyranose'],
    summary: 'The sugar cells burn for energy, shown in its ring form: five carbons and one oxygen in a six-membered ring.',
    shapeSummary: 'Six-membered ring (chair)',
    centers: [
      { atomId: 'C1', shape: 'Tetrahedral', description: 'Four single bonds around each ring carbon.' },
      { atomId: 'O1', shape: 'Bent', description: 'The ring oxygen has two bonds and two lone pairs.' },
    ],
    shapeExplanation:
      'Every ring atom has four regions of electron density, so the bond angles are close to tetrahedral (about 109.5°). A flat hexagon would force 120° angles, so the ring puckers into a chair. The OH groups point outward, where they can hydrogen-bond with water, which is why glucose dissolves so well.',
    notes: [
      { title: 'Ring and chain', body: 'In water, glucose is almost entirely in this ring (pyranose) form; a small fraction is an open chain with an aldehyde group. Ring closure creates a new stereocentre, giving two forms (α and β).' },
      { title: 'Why it matters', body: 'Cellular respiration oxidises glucose to CO₂ and water: C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O.' },
    ],
    limitations: ['This PubChem record does not specify the α or β form; the model shows one of them.'],
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    formula: 'C8H10N4O2',
    aliases: ['1,3,7-trimethylxanthine', 'coffee', 'stimulant'],
    summary: 'A stimulant in coffee and tea: two fused rings containing four nitrogens, with three methyl groups.',
    shapeSummary: 'Flat fused rings, three methyl groups',
    centers: [
      { atomId: 'C3', shape: 'Trigonal planar', description: 'A C=O carbon: three regions of electron density.' },
      { atomId: 'N4', shape: 'Bent', description: 'Two bonds (one double) and one lone pair.' },
      { atomId: 'C6', shape: 'Tetrahedral', description: 'A methyl carbon: four single bonds.' },
    ],
    shapeExplanation:
      'The ring atoms are all trigonal planar, and electrons are shared (delocalised) across the two fused rings, so the ring system is flat. Only the hydrogens of the three methyl (CH₃) groups stick out of the plane.',
    notes: [{ title: 'Why it matters', body: 'Its flat ring system resembles adenosine, so caffeine blocks adenosine receptors in the brain, which reduces the feeling of tiredness.' }],
  },
  {
    id: 'aspirin',
    name: 'Aspirin',
    formula: 'C9H8O4',
    aliases: ['acetylsalicylic acid', 'ASA', 'painkiller'],
    summary: 'A painkiller: a benzene ring carrying a carboxylic acid group and an ester (acetyl) group side by side.',
    shapeSummary: 'Flat ring with two groups',
    centers: [
      { atomId: 'C7', shape: 'Trigonal planar', description: 'The carboxylic-acid carbon: C=O, C–OH and the ring bond.' },
      { atomId: 'C8', shape: 'Trigonal planar', description: 'The ester carbon: C=O, C–O and the methyl bond.' },
      { atomId: 'O1', shape: 'Bent', description: 'The ester oxygen: two bonds and two lone pairs.' },
      { atomId: 'C9', shape: 'Tetrahedral', description: 'The methyl carbon: four single bonds.' },
    ],
    shapeExplanation:
      'The benzene ring is flat (six trigonal-planar carbons, aromatic bonds). Each C=O carbon is trigonal planar too. The two groups sit next to each other on the ring and crowd each other, so they can twist out of the ring plane; this model shows one such arrangement.',
    notes: [{ title: 'Why it matters', body: 'Aspirin transfers its acetyl group to the enzyme cyclooxygenase (COX), switching it off; that reduces the prostaglandins that cause pain and inflammation.' }],
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol',
    formula: 'C8H9NO2',
    aliases: ['acetaminophen', 'Tylenol', 'APAP', 'painkiller'],
    summary: 'A painkiller: a benzene ring with an OH group on one side and an amide (–NH–CO–CH₃) on the opposite side.',
    shapeSummary: 'Flat ring with groups at opposite ends',
    centers: [
      { atomId: 'C7', shape: 'Trigonal planar', description: 'The amide carbon: C=O, C–N and the methyl bond.' },
      { atomId: 'N1', shape: 'Nearly trigonal planar', description: 'Three bonds and a lone pair that is partly shared with the C=O (amide resonance), which flattens the nitrogen.' },
      { atomId: 'O1', shape: 'Bent', description: 'The OH oxygen: two bonds and two lone pairs.' },
    ],
    shapeExplanation:
      'The ring is flat and aromatic. The amide group is also nearly flat, because the nitrogen lone pair is delocalised into the C=O. The two groups sit at opposite (para) positions of the ring, hence the name para-acetylaminophenol.',
    notes: [{ title: 'Name', body: '“Paracetamol” (UK/international) and “acetaminophen” (US) are the same molecule.' }],
  },
  {
    id: 'ascorbic-acid',
    name: 'Vitamin C (ascorbic acid)',
    formula: 'C6H8O6',
    aliases: ['ascorbic acid', 'vitamin C', 'ascorbate', 'antioxidant'],
    summary: 'Vitamin C: a five-membered ring (a lactone) with a C=C double bond carrying two OH groups, and a two-carbon side chain.',
    shapeSummary: 'Flat five-membered ring with a side chain',
    centers: [
      { atomId: 'C5', shape: 'Trigonal planar', description: 'A ring carbon in the C=C double bond.' },
      { atomId: 'C6', shape: 'Trigonal planar', description: 'The ring C=O (lactone) carbon.' },
      { atomId: 'C1', shape: 'Tetrahedral', description: 'The ring carbon joined to the side chain: four single bonds.' },
    ],
    shapeExplanation:
      'Most ring atoms are trigonal planar (the C=C and C=O), so the five-membered ring is nearly flat. The side chain, with its two tetrahedral carbons, hangs off one ring carbon and can rotate.',
    notes: [{ title: 'Why it matters', body: 'The two OH groups on the C=C (an enediol) give up electrons easily, which is why vitamin C is an antioxidant and why it is acidic.' }],
  },
  {
    id: 'acetic-acid',
    name: 'Acetic acid',
    formula: 'C2H4O2',
    aliases: ['ethanoic acid', 'CH3COOH', 'vinegar'],
    summary: 'The acid in vinegar: a methyl group bonded to a carboxylic acid group (–COOH).',
    shapeSummary: 'Trigonal planar at the acid carbon',
    centers: [
      { atomId: 'C1', shape: 'Tetrahedral', description: 'The methyl carbon: four single bonds.' },
      { atomId: 'C2', shape: 'Trigonal planar', description: 'The carboxyl carbon: C=O, C–OH and C–C.' },
      { atomId: 'O1', shape: 'Bent', description: 'The OH oxygen: two bonds and two lone pairs.' },
    ],
    shapeExplanation:
      'The carboxyl carbon has three regions of electron density, so the –COOH group is flat with angles near 120°. The methyl carbon is tetrahedral.',
    notes: [{ title: 'Weak acid', body: 'In water only a small fraction gives up the O–H proton (Ka ≈ 1.8 × 10⁻⁵ at 25 °C, pKa ≈ 4.76), so acetic acid is a weak acid.' }],
  },
  {
    id: 'formic-acid',
    name: 'Formic acid',
    formula: 'CH2O2',
    aliases: ['methanoic acid', 'HCOOH'],
    summary: 'The simplest carboxylic acid: one carbon with a C=O, an OH and a hydrogen.',
    shapeSummary: 'Planar',
    centers: [
      { atomId: 'C1', shape: 'Trigonal planar', description: 'Three regions of electron density around carbon.' },
      { atomId: 'O1', shape: 'Bent', description: 'The OH oxygen: two bonds and two lone pairs.' },
    ],
    shapeExplanation: 'The carbon is trigonal planar and the OH hydrogen lies in the same plane, so the whole molecule is flat.',
    notes: [{ title: 'Where it is found', body: 'Some ants spray formic acid in defence; its name comes from the Latin formica, “ant”.' }],
  },
  {
    id: 'acetone',
    name: 'Acetone',
    formula: 'C3H6O',
    aliases: ['propanone', 'dimethyl ketone', 'nail polish remover'],
    summary: 'The simplest ketone: a C=O carbon between two methyl groups. A common solvent.',
    shapeSummary: 'Trigonal planar at the C=O carbon',
    centers: [
      { atomId: 'C1', shape: 'Trigonal planar', description: 'The C=O carbon: three regions of electron density.' },
      { atomId: 'C2', shape: 'Tetrahedral', description: 'A methyl carbon: four single bonds.' },
    ],
    shapeExplanation:
      'The central carbon has a double bond to oxygen and two single bonds, so the C–C(=O)–C core is flat with angles near 120°. The methyl carbons are tetrahedral.',
    notes: [{ title: 'Why it dissolves so much', body: 'The polar C=O can accept hydrogen bonds from water, and the methyl groups mix with oils, so acetone mixes with both water and many non-polar substances.' }],
  },
  {
    id: 'methanol',
    name: 'Methanol',
    formula: 'CH4O',
    aliases: ['methyl alcohol', 'CH3OH', 'wood alcohol'],
    summary: 'The simplest alcohol: a methyl group bonded to an OH group.',
    shapeSummary: 'Tetrahedral carbon, bent at oxygen',
    centers: [
      { atomId: 'C1', shape: 'Tetrahedral', description: 'Four single bonds around carbon.' },
      { atomId: 'O1', shape: 'Bent', description: 'Two bonds and two lone pairs around oxygen, like water.' },
    ],
    shapeExplanation: 'Carbon has four bonds (tetrahedral); oxygen has two bonds and two lone pairs, so the C–O–H angle is bent, a little like water’s H–O–H angle.',
    notes: [{ title: 'Safety', body: 'Methanol is toxic: the body oxidises it to formaldehyde and formic acid. Compare ethanol, which has one more carbon.' }],
  },
  {
    id: 'urea',
    name: 'Urea',
    formula: 'CH4N2O',
    aliases: ['carbamide', 'CO(NH2)2'],
    summary: 'The main nitrogen waste in urine: a C=O carbon bonded to two NH₂ groups.',
    shapeSummary: 'Trigonal planar at carbon',
    centers: [
      { atomId: 'C1', shape: 'Trigonal planar', description: 'C=O and two C–N bonds: three regions of electron density.' },
      { atomId: 'N1', shape: 'Trigonal pyramidal to nearly planar', description: 'Three bonds and a lone pair; the lone pair is partly shared with the C=O, which flattens the nitrogen.' },
    ],
    shapeExplanation:
      'Carbon is trigonal planar. Each nitrogen has three bonds and a lone pair, which alone would make it pyramidal, but the lone pair is partly delocalised into the C=O, so the NH₂ groups are close to flat.',
    notes: [{ title: 'History', body: 'Friedrich Wöhler made urea from inorganic ammonium cyanate in 1828, a landmark in showing that “organic” compounds can be made in the laboratory.' }],
  },
  {
    id: 'glycine',
    name: 'Glycine',
    formula: 'C2H5NO2',
    aliases: ['amino acid', 'aminoacetic acid', 'Gly', 'G'],
    summary: 'The simplest amino acid: an amino group (–NH₂) and a carboxylic acid (–COOH) on the same carbon.',
    shapeSummary: 'Tetrahedral central carbon',
    centers: [
      { atomId: 'C1', shape: 'Tetrahedral', description: 'The α-carbon: bonded to N, the carboxyl carbon and two hydrogens.' },
      { atomId: 'C2', shape: 'Trigonal planar', description: 'The carboxyl carbon.' },
      { atomId: 'N1', shape: 'Trigonal pyramidal', description: 'Three bonds and one lone pair, like ammonia.' },
    ],
    shapeExplanation:
      'The α-carbon is tetrahedral, the carboxyl carbon trigonal planar and the amino nitrogen trigonal pyramidal. Glycine is the only common amino acid whose α-carbon has two hydrogens, so it is not chiral.',
    notes: [{ title: 'In water it is a zwitterion', body: 'This model shows the neutral form (–NH₂ and –COOH). In water and in the solid, the proton moves from –COOH to –NH₂, giving ⁺H₃N–CH₂–COO⁻.' }],
  },
  {
    id: 'ethane',
    name: 'Ethane',
    formula: 'C2H6',
    aliases: ['C2H6', 'alkane'],
    summary: 'Two carbons joined by a single bond, each with three hydrogens. The second-simplest alkane.',
    shapeSummary: 'Tetrahedral at each carbon (staggered)',
    centers: [
      { atomId: 'C1', shape: 'Tetrahedral', description: 'Four single bonds around each carbon.' },
      { atomId: 'C2', shape: 'Tetrahedral', description: 'Four single bonds around each carbon.' },
    ],
    shapeExplanation:
      'Both carbons are tetrahedral. Looking along the C–C bond, the hydrogens on the two carbons are staggered (as far apart as possible), the lowest-energy arrangement.',
    notes: [{ title: 'Rotation', body: 'The two ends rotate almost freely about the C–C single bond; the eclipsed arrangement is only about 12 kJ/mol higher in energy than the staggered one.' }],
  },
  {
    id: 'propane',
    name: 'Propane',
    formula: 'C3H8',
    aliases: ['C3H8', 'alkane', 'LPG', 'fuel gas'],
    summary: 'A three-carbon alkane and common fuel gas: a chain of three tetrahedral carbons.',
    shapeSummary: 'Zig-zag chain of tetrahedral carbons',
    centers: [{ atomId: 'C1', shape: 'Tetrahedral', description: 'The middle carbon: two C–C and two C–H bonds.' }],
    shapeExplanation: 'Every carbon is tetrahedral, so the C–C–C chain is not straight: it bends at the middle carbon, at an angle near the tetrahedral 109.5°.',
    notes: [{ title: 'Combustion', body: 'C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O. Balance it in the equation balancer.' }],
  },
  {
    id: 'cyclohexane',
    name: 'Cyclohexane',
    formula: 'C6H12',
    aliases: ['C6H12', 'cycloalkane', 'chair'],
    summary: 'Six CH₂ groups joined in a ring. The classic example of the chair shape.',
    shapeSummary: 'Chair-shaped ring',
    centers: [{ atomId: 'C1', shape: 'Tetrahedral', description: 'Each ring carbon has two C–C and two C–H bonds.' }],
    shapeExplanation:
      'A flat hexagon would need 120° angles, but tetrahedral carbons prefer about 109.5°. Puckering into a chair lets every angle stay near tetrahedral and staggers all neighbouring C–H bonds, so the chair has almost no ring strain.',
    notes: [{ title: 'Axial and equatorial', body: 'In the chair, six hydrogens point straight up or down (axial) and six point outward around the ring (equatorial). Compare benzene, which is flat because its carbons are trigonal planar.' }],
  },
  {
    id: 'hydrogen-cyanide',
    name: 'Hydrogen cyanide',
    formula: 'HCN',
    aliases: ['prussic acid', 'hydrocyanic acid', 'methanenitrile'],
    summary: 'A hydrogen and a nitrogen on either side of a carbon, with a C≡N triple bond.',
    shapeSummary: 'Linear',
    centers: [{ atomId: 'C1', shape: 'Linear', description: 'Two regions of electron density (the C–H bond and the C≡N triple bond).' }],
    shapeExplanation: 'Carbon has two regions of electron density — the triple bond counts as one — so the molecule is linear (180°), like acetylene.',
    notes: [{ title: 'Safety', body: 'HCN is highly toxic: cyanide blocks cytochrome c oxidase, the last enzyme of cellular respiration.' }],
  },
]

/** Builds the computed molecules, adding the shared sources and limitations used for every molecule. */
export function computedMolecules(shared: { sources: readonly Source[]; limitations: readonly string[] }): Molecule[] {
  return META.map((m) => {
    const rows = COMPUTED_ROWS[m.id]
    const atoms: Atom[] = rows.atoms.map(([id, element, sourceLabel, x, y, z]) => ({ id, element, sourceLabel, position: [x, y, z] as Vec3 }))
    return {
      id: m.id,
      name: m.name,
      formula: m.formula,
      aliases: m.aliases,
      summary: m.summary,
      shapeSummary: m.shapeSummary,
      centers: m.centers,
      parameters: [],
      shapeExplanation: m.shapeExplanation,
      notes: m.notes,
      coordinates: { kind: 'computed', unit: 'Å', sourceId: 'pubchem3d', note: COMPUTED_NOTE },
      limitations: [...shared.limitations, ...COMPUTED_LIMITATIONS, ...(m.limitations ?? [])],
      display: {},
      atoms,
      bonds: rows.bonds.map(([a, b, order]) => ({ id: `${a}-${b}`, atoms: [a, b] as const, order })),
      sources: [pubchem3d(rows.cid, m.name), ...shared.sources],
    }
  })
}
