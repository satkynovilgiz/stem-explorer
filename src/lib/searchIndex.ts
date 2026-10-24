import { HEART_PARTS } from '../data/anatomy/heart'
import { ATLAS_STRUCTURES, getSystem } from '../data/anatomy/atlas'
import { ORGANELLES, structureParams } from '../data/biology/organelles'
import { DIVISION_STAGES } from '../data/biology/mitosis'
import { ENERGY_PROCESSES } from '../data/biology/energy'
import { GLOSSARY } from '../data/glossary'
import { MOLECULES } from '../data/chemistry/molecules'
import { ELEMENTS } from '../data/chemistry/periodicTable'
import { SUBJECTS, type SubjectId } from '../data/subjects'
import { FUNCTIONS } from '../math/functions'
import { PRESETS } from '../math/linear'
import { SURFACES } from '../math/surfaces'
import { normalize } from './chemistry'
import { hrefFor } from './explorations'
import { atlasLink, linkTo } from './links'

/** What kind of thing a result is; used for grouping and the type filter. */
export type SearchKind =
  | 'subject'
  | 'structure'
  | 'cell'
  | 'element'
  | 'molecule'
  | 'section'
  | 'process'
  | 'lab'
  | 'function'
  | 'surface'
  | 'tool'
  | 'term'

export const KIND_LABELS: Record<SearchKind, string> = {
  subject: 'Subjects',
  structure: 'Body structures',
  cell: 'Cell models and structures',
  element: 'Elements',
  molecule: 'Molecules',
  section: 'Sections',
  process: 'Processes',
  lab: 'Labs',
  function: 'Functions',
  surface: 'Surfaces',
  tool: 'Tools',
  term: 'Glossary terms',
}

/** One searchable item. Text comes from the existing subject data, not a copy of it. */
export interface SearchItem {
  id: string
  name: string
  subject: SubjectId
  kind: SearchKind
  /** Formula with digits, for display with subscripts (molecules only). */
  formula?: string
  description: string
  /** Relative in-app link that opens this exact state. */
  href: string
  /** Extra terms that should match: well-established synonyms, formulas, symbols and tags. */
  terms: readonly string[]
}

const SUBJECT_BLURBS: Record<SubjectId, string> = {
  anatomy: 'A whole-body schematic atlas with systems, tours and close-ups, plus a detailed heart module.',
  chemistry: 'Molecules in 3D with measurements, the periodic table, atomic structure and bonding.',
  physics: 'Projectile, spring, DC circuit and wave labs with graphs and readouts.',
  mathematics: '2D functions with calculus tools, 3D surfaces, and vectors with 2×2 transformations.',
  biology: 'Animal, plant and bacterial cells, DNA and RNA, cell division and energy processes.',
}

const VARIANT_TEXT = { ovarian: 'ovarian', testicular: 'testicular' } as const

export const SEARCH_INDEX: readonly SearchItem[] = [
  ...SUBJECTS.map((s) => ({
    id: `subject:${s.id}`,
    name: s.name,
    subject: s.id,
    kind: 'subject' as const,
    description: SUBJECT_BLURBS[s.id],
    href: `#/${s.id}`,
    terms: [s.tagline],
  })),

  // Anatomy
  // The detailed heart module first: for equal names ("Aorta") it is the richer view.
  ...HEART_PARTS.map((p) => ({
    id: `heart:${p.id}`,
    name: p.name,
    subject: 'anatomy' as const,
    kind: 'structure' as const,
    description: `Heart module. ${p.summary}`,
    href: hrefFor({ subject: 'anatomy', params: { part: p.id, heart: p.internal ? 'cutaway' : 'whole' } }),
    terms: [p.tag, p.kind, 'heart'],
  })),

  ...ATLAS_STRUCTURES.map((s) => ({
    id: `structure:${s.id}`,
    name: s.name,
    subject: 'anatomy' as const,
    kind: 'structure' as const,
    description: `${getSystem(s.system).name} system${s.variant ? ` · shown with the ${VARIANT_TEXT[s.variant]} configuration` : ''}. ${s.description}`,
    href: atlasLink(s.id, s.system, s.variant),
    terms: [...(s.aliases ?? []), getSystem(s.system).name, ...(s.alsoIn ?? []).map((x) => getSystem(x).name)],
  })),
  // Chemistry
  {
    id: 'section:periodic',
    name: 'Periodic table',
    subject: 'chemistry',
    kind: 'section',
    description: 'All 118 elements by period and group, with blocks, categories and the molecules that contain each element.',
    href: linkTo('chemistry', { csec: 'periodic' }),
    terms: ['elements', 'groups', 'periods', 'blocks'],
  },
  {
    id: 'section:atomic',
    name: 'Atomic structure',
    subject: 'chemistry',
    kind: 'section',
    description: 'Protons, neutrons and electrons, shells and subshells, electron configurations and isotopes.',
    href: linkTo('chemistry', { csec: 'atomic' }),
    terms: ['atom', 'isotope', 'isotopes', 'electron configuration', 'shell', 'proton', 'neutron', 'electron', 'bohr model'],
  },
  {
    id: 'section:bonding',
    name: 'Bonding and geometry',
    subject: 'chemistry',
    kind: 'section',
    description: 'Ionic, polar and nonpolar covalent bonds from electronegativity differences, and molecular geometry.',
    href: linkTo('chemistry', { csec: 'bonding' }),
    terms: ['bond', 'ionic', 'covalent', 'electronegativity', 'polarity', 'polar', 'geometry', 'vsepr'],
  },
  ...ELEMENTS.map((e) => ({
    id: `element:${e.number}`,
    name: e.name,
    subject: 'chemistry' as const,
    kind: 'element' as const,
    description: `Element ${e.number} (${e.symbol}) · ${e.category} · period ${e.period}${e.group ? `, group ${e.group}` : ''}.`,
    href: linkTo('chemistry', { csec: 'periodic', el: String(e.number) }),
    terms: [e.symbol, String(e.number)],
  })),
  ...MOLECULES.map((m) => ({
    id: `molecule:${m.id}`,
    name: m.name,
    subject: 'chemistry' as const,
    kind: 'molecule' as const,
    formula: m.formula,
    description: m.summary,
    href: hrefFor({ subject: 'chemistry', params: { molecule: m.id, view: 'ball-and-stick' } }),
    terms: [m.formula, ...m.aliases, m.shapeSummary],
  })),

  // Biology
  ...(['animal', 'plant', 'bacterium'] as const).map((type) => ({
    id: `cell:${type}`,
    name: type === 'bacterium' ? 'Bacterial cell' : type === 'plant' ? 'Plant cell' : 'Animal cell',
    subject: 'biology' as const,
    kind: 'cell' as const,
    description:
      type === 'bacterium'
        ? 'A generalized rod-shaped bacterium (a prokaryote): no nucleus; nucleoid, ribosomes, cell wall and other structures.'
        : `A generalized ${type} cell (a eukaryote) with its organelles.`,
    href: linkTo('biology', type === 'animal' ? {} : { type }),
    terms: type === 'bacterium' ? ['prokaryote', 'prokaryotic', 'bacteria', 'microorganism'] : ['eukaryote', 'eukaryotic'],
  })),
  ...ORGANELLES.map((o) => ({
    id: `organelle:${o.id}`,
    name: o.name,
    subject: 'biology' as const,
    kind: 'cell' as const,
    description: o.summary,
    href: hrefFor({ subject: 'biology', params: structureParams(o.id) }),
    terms: [o.tag, o.instanceName ?? '', ...o.glossary.map((g) => g.term)],
  })),
  {
    id: 'process:dna',
    name: 'DNA and RNA',
    subject: 'biology',
    kind: 'process',
    description: 'Base pairing in a DNA double helix, and transcription of a DNA template into RNA.',
    href: linkTo('biology', { bsec: 'dna' }),
    terms: ['dna', 'rna', 'base pairing', 'double helix', 'transcription', 'adenine', 'thymine', 'guanine', 'cytosine', 'uracil', 'nucleotide', 'gene'],
  },
  {
    id: 'process:division',
    name: 'Cell division: mitosis',
    subject: 'biology',
    kind: 'process',
    description: 'Interphase, the stages of mitosis and cytokinesis, step by step with chromosome counts.',
    href: linkTo('biology', { bsec: 'division' }),
    terms: ['mitosis', 'cell division', 'cell cycle', 'chromosome', 'chromatid', ...DIVISION_STAGES.map((s) => s.name)],
  },
  ...ENERGY_PROCESSES.map((p) => ({
    id: `process:${p.id}`,
    name: p.id === 'respiration' ? 'Cellular respiration' : p.name,
    subject: 'biology' as const,
    kind: 'process' as const,
    description: `Simplified net equation ${p.netEquation.reactants} → ${p.netEquation.products}, then the stages: ${p.stages.map((s) => s.name).join(', ')}.`,
    href: linkTo('biology', { bsec: 'energy' }),
    terms: [p.name, ...p.stages.map((s) => s.name), p.id === 'respiration' ? 'atp' : 'light', 'energy'],
  })),

  // Physics
  {
    id: 'experiment:projectile',
    name: 'Projectile motion lab',
    subject: 'physics',
    kind: 'lab',
    description: 'Launch a projectile, scrub through time, and compare two trajectories (no air resistance).',
    href: '#/physics',
    terms: ['projectile', 'trajectory', 'launch', 'gravity', 'parabola', 'range', 'velocity'],
  },
  {
    id: 'experiment:spring',
    name: 'Spring–mass oscillation lab',
    subject: 'physics',
    kind: 'lab',
    description: 'Release a mass on an ideal spring and follow its position, velocity, force and energy (no friction).',
    href: '?experiment=spring&mass=1&k=20&x0=0.2#/physics',
    terms: ['spring', 'oscillation', 'harmonic', 'period', 'hooke', 'energy', 'frequency'],
  },
  {
    id: 'experiment:circuit',
    name: 'DC circuit lab',
    subject: 'physics',
    kind: 'lab',
    description: 'Resistors in series, parallel and a mixed arrangement with an ideal battery: currents, voltages and power.',
    href: linkTo('physics', { experiment: 'circuit' }),
    terms: ['circuit', 'electric circuit', 'resistor', 'resistance', 'current', 'voltage', 'ohm', "ohm's law", 'series', 'parallel', 'battery', 'emf', 'power'],
  },
  {
    id: 'experiment:wave',
    name: 'Wave lab',
    subject: 'physics',
    kind: 'lab',
    description: 'A sinusoidal traveling wave: amplitude, frequency and wavelength, with the speed derived as v = fλ.',
    href: linkTo('physics', { experiment: 'wave' }),
    terms: ['wave', 'traveling wave', 'wavelength', 'frequency', 'amplitude', 'wave speed', 'period', 'transverse'],
  },

  // Mathematics
  ...FUNCTIONS.map((f) => ({
    id: `function:${f.id}`,
    name: `${f.name} function`,
    subject: 'mathematics' as const,
    kind: 'function' as const,
    description: `${f.formula}. Domain: ${f.domainText}. With tangent, secant and definite-integral tools.`,
    href: linkTo('mathematics', { msec: 'functions', fn: f.id }),
    terms: [f.formula, f.name, 'graph', 'derivative', 'tangent line', 'secant', 'integral', 'slope', 'area under a curve'],
  })),
  {
    id: 'tool:vectors',
    name: 'Vectors and transformations',
    subject: 'mathematics',
    kind: 'tool',
    description: 'Vector addition, scalar multiples, the dot product and angle, and a 2×2 matrix acting on the plane with its determinant.',
    href: linkTo('mathematics', { msec: 'vectors' }),
    terms: ['vector', 'vectors', 'dot product', 'matrix', 'linear transformation', 'determinant', 'inverse', 'parallelogram'],
  },
  ...PRESETS.map((p) => ({
    id: `matrix:${p.id}`,
    name: `${p.name} matrix`,
    subject: 'mathematics' as const,
    kind: 'tool' as const,
    description: p.note,
    href: linkTo('mathematics', { msec: 'vectors', vm: p.m.join(',') }),
    terms: ['matrix', 'transformation', p.id],
  })),
  ...SURFACES.map((s) => ({
    id: `surface:${s.id}`,
    name: s.name,
    subject: 'mathematics' as const,
    kind: 'surface' as const,
    description: `${s.formula}. ${s.description}`,
    href: `?surface=${s.id}#/mathematics`,
    terms: [s.formula, '3d surface', 'tangent plane', 'cross-section'],
  })),

  // Glossary definitions, ranked after explorer content (see searchAll).
  ...GLOSSARY.map((g) => ({
    id: `term:${g.id}`,
    name: g.term,
    subject: g.subjects[0],
    kind: 'term' as const,
    description: `Glossary: ${g.definition}`,
    href: `?term=${g.id}#/glossary`,
    terms: [] as string[],
  })),
]

export interface SearchFilters {
  subject?: SubjectId | null
  kind?: SearchKind | null
}

export interface ScoredResult {
  item: SearchItem
  score: number
}

/** A plain plural ("ribosomes", "bones") also matches the singular name. */
const variants = (q: string) => {
  const out = [q]
  if (q.length > 3 && q.endsWith('ies')) out.push(`${q.slice(0, -3)}y`)
  else if (q.length > 3 && q.endsWith('es')) out.push(q.slice(0, -2), q.slice(0, -1))
  else if (q.length > 3 && q.endsWith('s')) out.push(q.slice(0, -1))
  return out
}

function scoreItem(item: SearchItem, qs: string[]): number {
  const name = normalize(item.name)
  const formula = item.formula ? normalize(item.formula) : ''
  const terms = item.terms.map(normalize)
  let best = 0
  for (const q of qs) {
    let score = 0
    // An element symbol typed exactly ("Fe", "O") counts as an exact match.
    if (name === q || formula === q || (item.kind === 'element' && terms[0] === q)) score = 4
    else if (name.startsWith(q)) score = 3
    else if (name.includes(q) || formula.includes(q)) score = 2
    else if (terms.some((t) => t === q)) score = 1.5
    else if (q.length > 1 && terms.some((t) => t.includes(q))) score = 1
    // Whole words in the description rank last, only for longer queries; compounds such as
    // "oxygen-rich" do not count, to avoid noise.
    else if (q.length >= 4 && item.kind !== 'term' && new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(normalize(item.description))) score = 0.5
    best = Math.max(best, score)
  }
  return best
}

const isTerm = (item: SearchItem) => (item.kind === 'term' ? 1 : 0)

/**
 * Case-insensitive search over names and terms, optionally filtered by subject and kind. Unicode
 * subscripts match plain digits ("H₂O" and "h2o"). Ranked: explorer content before glossary terms;
 * then exact name, name prefix, name contains, exact synonym, other terms; then by name.
 */
/** True when the name already shows the formula, e.g. "Oxygen (O₂)". */
export const nameShowsFormula = (item: SearchItem) => Boolean(item.formula && normalize(item.name).includes(normalize(item.formula)))

export function searchAll(query: string, filters: SearchFilters = {}): SearchItem[] {
  const q = normalize(query)
  if (!q) return []
  const qs = variants(q)
  const scored: ScoredResult[] = []
  for (const item of SEARCH_INDEX) {
    if (filters.subject && item.subject !== filters.subject) continue
    if (filters.kind && item.kind !== filters.kind) continue
    const score = scoreItem(item, qs)
    if (score) scored.push({ item, score })
  }
  return scored
    .sort((a, b) => isTerm(a.item) - isTerm(b.item) || b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((s) => s.item)
}

/** The first `limit` results of an unfiltered search (Home). */
export function searchExplorations(query: string, limit = 12): SearchItem[] {
  return searchAll(query).slice(0, limit)
}

/** Results grouped by subject (in the app's subject order) and then by kind. */
export function groupResults(results: readonly SearchItem[]): { subject: SubjectId; kinds: { kind: SearchKind; items: SearchItem[] }[] }[] {
  const order = Object.keys(KIND_LABELS) as SearchKind[]
  return SUBJECTS.map((s) => {
    const inSubject = results.filter((r) => r.subject === s.id)
    return {
      subject: s.id,
      kinds: order.map((kind) => ({ kind, items: inSubject.filter((r) => r.kind === kind) })).filter((g) => g.items.length > 0),
    }
  }).filter((g) => g.kinds.length > 0)
}

export const findSearchItem = (id: string) => SEARCH_INDEX.find((i) => i.id === id)
