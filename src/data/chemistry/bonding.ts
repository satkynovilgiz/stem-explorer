/*
 * Bonding and geometry content. Every statement cites the OpenStax Chemistry 2e section it
 * paraphrases (ids in src/data/sources.ts).
 */

export interface BondType {
  id: 'covalent' | 'ionic' | 'metallic'
  name: string
  what: string
  example: string
  properties: string
  sources: readonly string[]
}

export const BOND_TYPES: readonly BondType[] = [
  {
    id: 'covalent',
    name: 'Covalent bonding',
    what: 'Two atoms are held together by their mutual attraction to a shared pair of electrons. Identical atoms share equally (nonpolar bond); atoms with different electronegativities share unequally (polar covalent bond, with partial charges δ+ and δ−).',
    example: 'The molecules in this app: H₂O, CO₂, CH₄, O₂, N₂ and the others.',
    properties: 'Covalent compounds generally have much lower melting and boiling points than ionic ones; many are liquids or gases at room temperature.',
    sources: ['chem-7-2'],
  },
  {
    id: 'ionic',
    name: 'Ionic bonding',
    what: 'Ionic bonds are electrostatic attractions between oppositely charged ions (cations and anions).',
    example: 'Sodium chloride (table salt) contains sodium cations and chloride anions in a crystal.',
    properties: 'Ionic solids are crystalline, rigid and brittle, with high melting and boiling points. They do not conduct electricity as solids, but do when molten or dissolved, because the ions can then move.',
    sources: ['chem-7-1', 'chem-10-5'],
  },
  {
    id: 'metallic',
    name: 'Metallic bonding',
    what: 'In metallic solids such as copper, aluminum and iron, the structure is often described as a uniform distribution of atomic nuclei within a “sea” of delocalized electrons.',
    example: 'Crystals of copper, aluminum and iron.',
    properties: 'Because the electrons are delocalized rather than shared between particular pairs of atoms, there are no separate molecules to draw.',
    sources: ['chem-10-5'],
  },
]

export interface SolidKind {
  name: string
  particles: string
  discreteMolecules: boolean
  examples: string
  sources: readonly string[]
}

/** The four types of crystalline solid (OpenStax §10.5), and whether a ball-and-stick molecule fits. */
export const SOLID_KINDS: readonly SolidKind[] = [
  { name: 'Molecular solid', particles: 'Neutral molecules', discreteMolecules: true, examples: 'Ice, sucrose, iodine', sources: ['chem-10-5'] },
  { name: 'Ionic solid', particles: 'Positive and negative ions', discreteMolecules: false, examples: 'Sodium chloride, nickel oxide', sources: ['chem-10-5'] },
  { name: 'Metallic solid', particles: 'Metal atoms in delocalized electrons', discreteMolecules: false, examples: 'Copper, aluminum, iron', sources: ['chem-10-5'] },
  { name: 'Covalent network solid', particles: 'Atoms joined by covalent bonds throughout the crystal', discreteMolecules: false, examples: 'Diamond, silicon, silicon dioxide (sand), silicon carbide', sources: ['chem-10-5'] },
]

export const DISCRETE_MODEL_NOTE =
  'A ball-and-stick model of one molecule fits molecular substances. It does not fit ionic, metallic or covalent network solids: there the bonding extends through the whole crystal, so there is no single molecule to draw, and a formula such as NaCl gives the ratio of ions, not a molecule.'

/** Molecular polarity, only where the cited section states it. */
export const POLARITY: Readonly<Record<string, { polar: boolean; reason: string; sources: readonly string[] }>> = {
  water: { polar: true, reason: 'Bent: the two O–H bond moments do not cancel.', sources: ['chem-7-6'] },
  'carbon-dioxide': { polar: false, reason: 'Linear: the two polar C=O bond moments point in opposite directions and cancel.', sources: ['chem-7-6'] },
  methane: { polar: false, reason: 'Tetrahedral and highly symmetric: identical bond moments cancel.', sources: ['chem-7-6'] },
  oxygen: { polar: false, reason: 'Two identical atoms share their electrons equally.', sources: ['chem-7-2', 'chem-10-5'] },
  nitrogen: { polar: false, reason: 'Two identical atoms share their electrons equally.', sources: ['chem-7-2', 'chem-10-5'] },
}

export const ELECTRONEGATIVITY_LIMITS = {
  rule: 'The difference in electronegativity (ΔEN) between two bonded atoms is a rough measure of bond polarity: zero or very small means nonpolar covalent; larger means polar covalent or ionic.',
  exceptions:
    'It is only a general guide with many exceptions. H and F in HF differ by about 1.9 and N and H in NH₃ by about 0.9, yet both are polar covalent; Na and Cl in NaCl differ by about 2.1 and Mn and I in MnI₂ by about 1.0, yet both form ionic compounds. (Differences quoted from OpenStax, which uses its own electronegativity table.)',
  betterGuide: 'A better guide is the kinds of atoms involved: bonds between two nonmetals are generally covalent; bonds between a metal and a nonmetal are often ionic.',
  sources: ['chem-7-2'],
} as const
