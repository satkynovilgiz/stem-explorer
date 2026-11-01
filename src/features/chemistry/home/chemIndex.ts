import { ELEMENTS } from '../../../data/chemistry/periodicTable'
import { MOLECULES } from '../../../data/chemistry/molecules'
import { REACTIONS } from '../../../data/chemistry/reactions'
import { GLOSSARY } from '../../../data/glossary'
import { normalize } from '../../../lib/chemistry'
import type { ManifestRow } from '../../../reference/types'
import { entryHref } from '../../../reference/types'

/*
 * Everything Chemistry offers, as one list a student can search or browse by group. Each item has
 * a plain title, one useful sentence, a label (Topic, Formula, Molecule or Calculator), the group it
 * belongs to, and whether it is something to Learn (read), Explore (an interactive model) or
 * Calculate (a working tool). Text comes from the existing data; nothing here is a placeholder.
 */

export type ChemLabel = 'Topic' | 'Formula' | 'Molecule' | 'Calculator'
export type ChemRole = 'learn' | 'explore' | 'calculate'
export type ChemGroupId = 'atoms' | 'bonds' | 'moles' | 'solutions' | 'acids' | 'gases'

export interface ChemItem {
  id: string
  title: string
  sentence: string
  label: ChemLabel
  role: ChemRole
  group: ChemGroupId
  href: string
  /** Formulas, symbols and synonyms that should find this item. */
  terms: string[]
  /** What the item *is* (a molecule's formula, an element's symbol, a tool's equation): an exact match ranks first. */
  ids?: string[]
}

export interface ChemGroup {
  id: ChemGroupId
  title: string
  blurb: string
  icon: 'atom' | 'hexagon' | 'flask' | 'drop' | 'beaker' | 'cloud'
}

/** The groups on the Chemistry home page, in reading order (shown only when they have items). */
export const CHEM_GROUPS: readonly ChemGroup[] = [
  { id: 'atoms', title: 'Atoms & elements', blurb: 'Structure, the periodic table, and properties.', icon: 'atom' },
  { id: 'bonds', title: 'Bonds & shapes', blurb: 'How atoms bond and the shapes they form.', icon: 'hexagon' },
  { id: 'moles', title: 'Moles & reactions', blurb: 'Amounts, equations, and reaction types.', icon: 'flask' },
  { id: 'solutions', title: 'Solutions', blurb: 'Concentration, molarity, and dilution.', icon: 'drop' },
  { id: 'acids', title: 'Acids & bases', blurb: 'pH, neutralisation, and common examples.', icon: 'beaker' },
  { id: 'gases', title: 'Gases & energy', blurb: 'Gas laws and energy changes in reactions.', icon: 'cloud' },
]

export const ROLE_LABELS: Record<ChemRole, string> = { learn: 'Learn', explore: 'Explore', calculate: 'Calculate' }

/** Synonyms students use for a molecule (beyond its name and formula). */
const MOLECULE_TERMS: Record<string, string[]> = {
  water: ['H2O', 'why is water bent', 'bent molecule', 'polar'],
  'carbon-dioxide': ['CO2', 'linear molecule'],
  methane: ['CH4', 'natural gas', 'tetrahedral'],
  ammonia: ['NH3', 'trigonal pyramidal'],
  ethanol: ['C2H6O', 'C2H5OH', 'alcohol'],
  benzene: ['C6H6', 'aromatic ring'],
}

/** The interactive parts of Chemistry (fixed: these are the modules that exist). */
const SECTION_ITEMS: ChemItem[] = [
  {
    id: 'section:periodic',
    title: 'Periodic table',
    sentence: 'All 118 elements: pick one to see its symbol, atomic number, mass and where it sits in the table.',
    label: 'Topic',
    role: 'explore',
    group: 'atoms',
    href: '?csec=periodic#/chemistry',
    terms: ['elements', 'atomic number', 'groups', 'periods'],
  },
  {
    id: 'section:atomic',
    title: 'Inside an atom',
    sentence: 'See how many protons, neutrons and electrons an atom has, and what makes isotopes different.',
    label: 'Topic',
    role: 'explore',
    group: 'atoms',
    href: '?csec=atomic#/chemistry',
    terms: ['atomic structure', 'protons', 'neutrons', 'electrons', 'isotopes', 'nucleus', 'mass number'],
  },
  {
    id: 'section:bonding',
    title: 'Bonding and molecular shape',
    sentence: 'Compare ionic and covalent bonds and see why electron pairs give molecules their shapes.',
    label: 'Topic',
    role: 'explore',
    group: 'bonds',
    href: '?csec=bonding#/chemistry',
    terms: ['ionic bond', 'covalent bond', 'VSEPR', 'molecular geometry', 'lone pair', 'electronegativity'],
  },
  {
    id: 'section:molecules',
    title: 'Molecules in 3D',
    sentence: 'Turn 12 real molecules and measure their bond lengths and bond angles.',
    label: 'Molecule',
    role: 'explore',
    group: 'bonds',
    href: '?molecule=water&view=ball-and-stick#/chemistry',
    terms: ['3D model', 'ball and stick', 'bond length', 'bond angle', 'measure'],
  },
  {
    id: 'calc:balance',
    title: 'Balance a chemical equation',
    sentence: 'Change the coefficients until every element has the same number of atoms on both sides, with hints at each step.',
    label: 'Calculator',
    role: 'calculate',
    group: 'moles',
    href: '?csec=reactions#/chemistry',
    terms: ['how do I balance an equation', 'balancing equations', 'coefficients', 'conservation of mass'],
  },
  {
    id: 'calc:stoichiometry',
    title: 'Moles, mole ratios and limiting reactant',
    sentence: 'Use a balanced equation to turn an amount of one substance into the amount of another, and find which reactant runs out first.',
    label: 'Calculator',
    role: 'calculate',
    group: 'moles',
    href: '?csec=reactions&rx=ammonia-synthesis#/chemistry',
    terms: ['stoichiometry', 'mole ratio', 'limiting reactant', 'theoretical yield', 'moles', 'molar mass'],
  },
  {
    id: 'calc:molarity',
    title: 'Molarity calculator',
    sentence: 'Find the concentration of a solution from the moles of solute and the volume of solution (or work backwards).',
    label: 'Calculator',
    role: 'calculate',
    group: 'solutions',
    href: '?csec=solutions&st=molarity#/chemistry',
    terms: ['how do I calculate molarity', 'molarity', 'concentration', 'mol/L', 'M = n/V', 'molar concentration'],
    ids: ['M = n/V', 'molarity'],
  },
  {
    id: 'calc:dilution',
    title: 'Dilution calculator',
    sentence: 'Find how much stock solution to dilute, or the new concentration after adding solvent (C₁V₁ = C₂V₂).',
    label: 'Calculator',
    role: 'calculate',
    group: 'solutions',
    href: '?csec=solutions&st=dilution#/chemistry',
    terms: ['how do I calculate a dilution', 'dilution', 'C1V1 = C2V2', 'stock solution', 'dilute'],
    ids: ['C1V1 = C2V2', 'dilution'],
  },
  {
    id: 'lab:gas',
    title: 'Gas pressure and volume (Boyle’s law)',
    sentence: 'Squeeze a gas at constant temperature and watch the pressure rise as the volume falls (a Physics lab).',
    label: 'Calculator',
    role: 'explore',
    group: 'gases',
    href: '?experiment=gas#/physics',
    terms: ['gas laws', 'Boyle', 'pressure', 'volume', 'PV = constant'],
  },
]

const sub = (f: string) => f.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)])

function moleculeItems(): ChemItem[] {
  return MOLECULES.map((m) => ({
    id: `molecule:${m.id}`,
    title: m.name.includes('(') ? m.name : `${m.name} (${sub(m.formula)})`,
    sentence: `${m.shapeSummary} molecule. ${m.summary}`,
    label: 'Molecule' as const,
    role: 'explore' as const,
    group: 'bonds' as const,
    href: `?molecule=${m.id}&view=ball-and-stick#/chemistry`,
    terms: [m.formula, ...(m.aliases ?? []), ...(MOLECULE_TERMS[m.id] ?? []), m.shapeSummary],
    ids: [m.formula, ...(MOLECULE_TERMS[m.id] ?? []).filter((t) => /^[A-Z][A-Za-z0-9]*$/.test(t))],
  }))
}

function reactionItems(): ChemItem[] {
  return REACTIONS.map((r) => ({
    id: `reaction:${r.id}`,
    title: r.name,
    sentence: 'Balance this equation step by step, then use it to calculate amounts.',
    label: 'Calculator' as const,
    role: 'calculate' as const,
    group: 'moles' as const,
    href: `?csec=reactions&rx=${r.id}#/chemistry`,
    terms: [...r.equation.reactants, ...r.equation.products].flatMap((s) => [s.formula, s.name]),
  }))
}

function elementItems(): ChemItem[] {
  return ELEMENTS.map((e) => ({
    id: `element:${e.number}`,
    title: `${e.name} (${e.symbol})`,
    sentence: `Element ${e.number} in the periodic table.`,
    label: 'Topic' as const,
    role: 'explore' as const,
    group: 'atoms' as const,
    href: `?csec=periodic&el=${e.number}#/chemistry`,
    terms: [e.symbol, `element ${e.number}`],
    ids: [e.symbol],
  }))
}

function glossaryItems(): ChemItem[] {
  return GLOSSARY.filter((g) => g.subjects.includes('chemistry')).map((g) => ({
    id: `term:${g.id}`,
    title: g.term,
    sentence: g.definition,
    label: 'Topic' as const,
    role: 'learn' as const,
    group: /bond|angle|lone pair|domain|polar|geometr/i.test(`${g.term} ${g.definition}`) ? ('bonds' as const) : /mole|reaction|coefficient|yield/i.test(g.term) ? ('moles' as const) : ('atoms' as const),
    href: `?term=${g.id}#/glossary`,
    terms: [],
  }))
}

/** Reference-library entries for Chemistry (from the generated manifest), grouped by their category. */
export function referenceItems(rows: readonly ManifestRow[]): ChemItem[] {
  const groupOf = (r: ManifestRow): ChemGroupId => {
    const t = `${r.category} ${r.title} ${r.terms.join(' ')}`.toLowerCase()
    if (/acid|base|ph\b|neutrali/.test(t)) return 'acids'
    if (/gas|pressure|energy|heat|thermo|endothermic|exothermic/.test(t)) return 'gases'
    if (/solution|molarity|dilution|concentration/.test(t)) return 'solutions'
    if (/mole|reaction|equation|stoichiometr|molar mass/.test(t)) return 'moles'
    if (/bond|shape|geometry|vsepr|molecule/.test(t)) return 'bonds'
    return 'atoms'
  }
  return rows
    .filter((r) => r.subject === 'chemistry')
    .map((r) => ({
      id: `ref:${r.id}`,
      title: r.title,
      sentence: r.summary,
      label: r.type === 'formula' ? ('Formula' as const) : r.type === 'substance' ? ('Molecule' as const) : ('Topic' as const),
      role: 'learn' as const,
      group: groupOf(r),
      href: entryHref(r),
      terms: r.terms,
    }))
}

let base: ChemItem[] | null = null
/** The built-in items (everything except reference entries, which load with the manifest). */
export function baseItems(): ChemItem[] {
  base ??= [...SECTION_ITEMS, ...moleculeItems(), ...reactionItems(), ...glossaryItems(), ...elementItems()]
  return base
}

/** Squashes spacing and multiplication signs so "C1V1=C2V2", "c1 v1 = c2 v2" and "C₁V₁ = C₂V₂" match. */
const squash = (s: string) => normalize(s).replace(/[\s·×*()]/g, '')

/**
 * Ranks items for a query: exact title or formula first, then title starts, title contains,
 * an exact synonym/formula, a partial synonym, then words in the sentence. Elements rank below
 * everything else for the same score, so "carbon" shows carbon dioxide and methane before the
 * element card only when they match equally well.
 */
export function searchChem(items: readonly ChemItem[], query: string): ChemItem[] {
  const q = normalize(query.trim())
  if (!q) return []
  const sq = squash(query)
  const words = q.split(/\s+/).filter((w) => w.length > 1)
  const scored: { item: ChemItem; score: number }[] = []
  for (const item of items) {
    const title = normalize(item.title)
    const titleName = title.replace(/\s*\(.*\)$/, '')
    const terms = item.terms.map(normalize)
    let score = 0
    if (titleName === q || title === q || (item.ids ?? []).some((t) => normalize(t) === q || squash(t) === sq)) score = 6
    else if (titleName.startsWith(q)) score = 5
    else if (title.includes(q)) score = 4
    else if (terms.some((t) => t === q)) score = 3.5
    else if (q.length > 2 && terms.some((t) => t.includes(q))) score = 2.5
    else if (sq.length > 2 && item.terms.some((t) => squash(t).includes(sq))) score = 2
    else if (words.length && words.every((w) => `${title} ${terms.join(' ')} ${normalize(item.sentence)}`.includes(w))) score = 1
    if (score) scored.push({ item, score: score - (item.id.startsWith('element:') ? 0.25 : 0) })
  }
  return scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title)).map((s) => s.item)
}
