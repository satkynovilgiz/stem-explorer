import type { ChemGroupId, ChemItem } from './chemIndex'

/*
 * The Chemistry table of contents: chapters in the order a beginner learns them, each listing its
 * topics explicitly (by item id) in reading order. Membership is written out, not guessed from
 * words, so "molecule" can never land in the moles chapter by accident. A topic appears only if its
 * item exists (real content); a chapter with no available topics is not shown.
 */
export interface Chapter {
  id: ChemGroupId
  title: string
  blurb: string
  items: string[]
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'atoms',
    title: 'Atoms & elements',
    blurb: 'What everything is made of, and how to read a formula.',
    items: ['ref:atoms-elements-molecules', 'ref:reading-chemical-formulas', 'section:atomic', 'section:periodic'],
  },
  {
    id: 'bonds',
    title: 'Bonds & shapes',
    blurb: 'How atoms join together, and why molecules have shapes.',
    items: ['ref:chemical-bonds', 'ref:electron-pair-geometry', 'ref:water', 'ref:molecule-models', 'section:bonding', 'section:molecules'],
  },
  {
    id: 'moles',
    title: 'Moles & reactions',
    blurb: 'Counting particles, and balancing and using chemical equations.',
    items: ['ref:the-mole', 'ref:molar-mass', 'ref:balancing-equations', 'calc:balance', 'ref:mole-ratios', 'calc:stoichiometry'],
  },
  {
    id: 'solutions',
    title: 'Solutions',
    blurb: 'Concentration, molarity and dilution.',
    items: ['ref:molarity', 'calc:molarity', 'ref:dilution', 'calc:dilution'],
  },
  {
    id: 'acids',
    title: 'Acids & bases',
    blurb: 'What acids and bases are, pH, and neutralisation.',
    items: ['ref:acids-and-bases', 'ref:ph-scale', 'ref:neutralization'],
  },
  {
    id: 'gases',
    title: 'Gases & energy',
    blurb: 'How gases behave, and energy changes in reactions.',
    items: ['ref:ideal-gas-law', 'lab:gas', 'ref:exothermic-endothermic'],
  },
]

/** Labels written for the contents (a student's wording; the pages keep their full titles). */
export const CONTENTS_LABELS: Record<string, string> = {
  'ref:atoms-elements-molecules': 'Atoms, elements, molecules and compounds',
  'ref:electron-pair-geometry': 'Why molecules have shapes (VSEPR)',
  'ref:water': 'Why is water bent?',
  'section:bonding': 'Ionic and covalent bonding lab',
  'calc:balance': 'Practise balancing, step by step',
  'calc:stoichiometry': 'Mole-ratio and limiting-reactant calculator',
  'ref:mole-ratios': 'Using a mole ratio',
  'lab:gas': 'Gas pressure and volume lab (Physics)',
}

/** The chapters with their available items, in order (chapters with none are dropped). */
export function availableChapters(items: readonly ChemItem[]): { chapter: Chapter; items: ChemItem[] }[] {
  const byId = new Map(items.map((i) => [i.id, i]))
  return CHAPTERS.map((chapter) => ({ chapter, items: chapter.items.map((id) => byId.get(id)).filter((i): i is ChemItem => Boolean(i)) })).filter((c) => c.items.length > 0)
}

/** Common elements shown on the Chemistry page (atomic numbers); all 118 are in the periodic table. */
export const FEATURED_ELEMENTS = [1, 2, 6, 7, 8, 11, 12, 17, 20, 26, 29, 79]
