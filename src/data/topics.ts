/*
 * The navigation map: subject → module → topic. One source for Home's subject cards, the
 * breadcrumbs, the topic drawer and "Explore by question". Every link goes through the same
 * validation as saved explorations (src/lib/links.ts), so building this map fails on a bad link.
 * Counts are read from the data, never typed in.
 */

import { ATLAS_STRUCTURES, ATLAS_SYSTEMS, findStructure } from './anatomy/atlas'
import { findHeartPart, HEART_PARTS } from './anatomy/heart'
import { CELL_STRUCTURES, findOrganelle } from './biology/organelles'
import { DIVISION_STAGES } from './biology/mitosis'
import { findMolecule, MOLECULES } from './chemistry/molecules'
import { ELEMENTS, findElement } from './chemistry/periodicTable'
import { findReaction, REACTIONS } from './chemistry/reactions'
import type { SubjectId } from './subjects'
import { FUNCTIONS } from '../math/functions'
import { PRESETS } from '../math/linear'
import { getSurface, SURFACES } from '../math/surfaces'
import { atlasLink, linkTo } from '../lib/links'
import { parseMathSection } from '../lib/mathSections'
import { anatomyModule, parseBiologySection, parseChemistrySection, parsePhysicsExperiment } from '../lib/urlState'

export interface Topic {
  label: string
  href: string
}

export interface TopicModule {
  /** Stable id, `<subject>.<module>`. */
  id: string
  subject: SubjectId
  name: string
  /** What the module actually contains, with counts from the data. */
  summary: string
  /** The module's entry point (its default state). */
  href: string
  /** A few curated topics, used as previews and in the drawer. */
  topics: readonly Topic[]
  /** Whether a query string belongs to this module. */
  matches: (search: string) => boolean
  /** The topic a query string shows, for the breadcrumb (null: the module itself). */
  current: (search: string) => string | null
}

const q = (search: string) => new URLSearchParams(search)

/** Atlas link for a structure, with its layer (and reproductive configuration) turned on. */
export function structureLink(id: string): string {
  const s = findStructure(id)
  if (!s) throw new Error(`Unknown atlas structure ${id}`)
  return atlasLink(s.id, s.system, s.variant)
}

const atlasTopic = (id: string, label?: string): Topic => ({ label: label ?? findStructure(id)!.name, href: structureLink(id) })
const molecule = (id: string): Topic => ({ label: findMolecule(id)!.name, href: linkTo('chemistry', { molecule: id, view: 'ball-and-stick' }) })
const element = (csec: 'periodic' | 'atomic', z: number): Topic => ({ label: findElement(z)!.name, href: linkTo('chemistry', { csec, el: String(z) }) })
const fn = (id: string): Topic => ({ label: `${FUNCTIONS.find((f) => f.id === id)!.name} function`, href: linkTo('mathematics', { msec: 'functions', fn: id }) })
const drawnAtlas = ATLAS_STRUCTURES.filter((s) => s.representation !== 'container').length
const cellCount = (type: keyof typeof CELL_STRUCTURES) => CELL_STRUCTURES[type].length

export const MODULES: readonly TopicModule[] = [
  {
    id: 'anatomy.atlas',
    subject: 'anatomy',
    name: 'Body atlas',
    summary: `${drawnAtlas} schematic structures in ${ATLAS_SYSTEMS.length} system layers, with tours and movement demos`,
    href: linkTo('anatomy', { bview: 'front' }),
    topics: [atlasTopic('lung-left'), atlasTopic('kidney-left'), atlasTopic('femur-left'), atlasTopic('biceps-brachii-left')],
    matches: (s) => anatomyModule(s) === 'atlas',
    current: (s) => {
      const id = q(s).get('atlas')
      return id ? (findStructure(id)?.name ?? null) : null
    },
  },
  {
    id: 'anatomy.breathing',
    subject: 'anatomy',
    name: 'Breathing mechanics',
    summary: 'Inspiration and expiration step by step: diaphragm, ribs, lungs, airflow and gas exchange',
    href: linkTo('anatomy', { breath: 'inspiration', bpos: '0', bshow: 'airflow' }),
    topics: [
      { label: 'Inspiration', href: linkTo('anatomy', { breath: 'inspiration', bpos: '50', bshow: 'airflow' }) },
      { label: 'Expiration', href: linkTo('anatomy', { breath: 'expiration', bpos: '50', bshow: 'airflow' }) },
      { label: 'Airflow and gas exchange', href: linkTo('anatomy', { breath: 'inspiration', bpos: '50', bshow: 'exchange' }) },
    ],
    matches: (s) => anatomyModule(s) === 'breathing',
    current: (s) => {
      const q = new URLSearchParams(s)
      return q.get('bshow') === 'exchange' ? 'Airflow and gas exchange' : q.get('breath') === 'expiration' ? 'Expiration' : 'Inspiration'
    },
  },
  {
    id: 'anatomy.heart',
    subject: 'anatomy',
    name: 'Heart (detailed)',
    summary: `${HEART_PARTS.length} heart structures, cutaway view and a blood-flow tour`,
    href: linkTo('anatomy', { heart: 'whole' }),
    topics: [
      { label: 'Mitral valve', href: linkTo('anatomy', { part: 'mitral-valve', heart: 'cutaway' }) },
      { label: 'Left ventricle', href: linkTo('anatomy', { part: 'left-ventricle', heart: 'cutaway' }) },
      { label: 'Aorta', href: linkTo('anatomy', { part: 'aorta', heart: 'whole' }) },
    ],
    matches: (s) => anatomyModule(s) === 'heart',
    current: (s) => {
      const id = q(s).get('part')
      return id ? (findHeartPart(id)?.name ?? null) : null
    },
  },
  {
    id: 'chemistry.periodic',
    subject: 'chemistry',
    name: 'Periodic table',
    summary: `All ${ELEMENTS.length} elements by block and category`,
    href: linkTo('chemistry', { csec: 'periodic', el: '1' }),
    topics: [element('periodic', 8), element('periodic', 26), element('periodic', 11)],
    matches: (s) => parseChemistrySection(s).section === 'periodic',
    current: (s) => findElement(parseChemistrySection(s).element)?.name ?? null,
  },
  {
    id: 'chemistry.atomic',
    subject: 'chemistry',
    name: 'Atomic structure',
    summary: 'Protons, electrons, configurations and an isotope library',
    href: linkTo('chemistry', { csec: 'atomic', el: '6' }),
    topics: [element('atomic', 6), element('atomic', 17), element('atomic', 92)],
    matches: (s) => parseChemistrySection(s).section === 'atomic',
    current: (s) => findElement(parseChemistrySection(s).element)?.name ?? null,
  },
  {
    id: 'chemistry.molecules',
    subject: 'chemistry',
    name: 'Molecules',
    summary: `${MOLECULES.length} 3D molecules from experimental geometry, with distance and angle tools`,
    href: linkTo('chemistry', { molecule: 'water', view: 'ball-and-stick' }),
    topics: [molecule('water'), molecule('methane'), molecule('benzene'), molecule('carbon-dioxide')],
    matches: (s) => parseChemistrySection(s).section === 'molecules',
    current: (s) => findMolecule(q(s).get('molecule') ?? 'water')?.name ?? null,
  },
  {
    id: 'chemistry.bonding',
    subject: 'chemistry',
    name: 'Bonding and geometry',
    summary: 'Covalent, ionic and metallic bonding; molecular shape and polarity',
    href: linkTo('chemistry', { csec: 'bonding' }),
    topics: [],
    matches: (s) => parseChemistrySection(s).section === 'bonding',
    current: () => null,
  },
  {
    id: 'chemistry.reactions',
    subject: 'chemistry',
    name: 'Reactions and stoichiometry',
    summary: `${REACTIONS.length} curated reactions to balance, with mole ratios, limiting reactants and yields`,
    href: linkTo('chemistry', { csec: 'reactions' }),
    topics: ['ammonia-synthesis', 'methane-combustion', 'silver-chloride-precipitation'].map((id) => ({ label: findReaction(id)!.name, href: linkTo('chemistry', { csec: 'reactions', rx: id }) })),
    matches: (s) => parseChemistrySection(s).section === 'reactions',
    current: (s) => findReaction(parseChemistrySection(s).reaction)?.name ?? null,
  },
  {
    id: 'chemistry.solutions',
    subject: 'chemistry',
    name: 'Solutions and dilution',
    summary: 'Molarity from amount and volume of solution, unit conversions and C₁V₁ = C₂V₂, with worked steps',
    href: linkTo('chemistry', { csec: 'solutions' }),
    topics: [
      { label: 'Molarity', href: linkTo('chemistry', { csec: 'solutions', st: 'molarity' }) },
      { label: 'Dilution', href: linkTo('chemistry', { csec: 'solutions', st: 'dilution' }) },
    ],
    matches: (s) => parseChemistrySection(s).section === 'solutions',
    current: (s) => (new URLSearchParams(s).get('st') === 'dilution' ? 'Dilution' : 'Molarity'),
  },
  {
    id: 'biology.cells',
    subject: 'biology',
    name: 'Cells',
    summary: `Animal, plant and bacterial cell models (${cellCount('animal')}, ${cellCount('plant')} and ${cellCount('bacterium')} structures)`,
    href: linkTo('biology', { cell: 'cutaway' }),
    topics: [
      { label: 'Animal cell', href: linkTo('biology', { cell: 'cutaway' }) },
      { label: 'Plant cell', href: linkTo('biology', { cell: 'cutaway', type: 'plant' }) },
      { label: 'Bacterium', href: linkTo('biology', { cell: 'cutaway', type: 'bacterium' }) },
    ],
    matches: (s) => parseBiologySection(s).section === 'cells',
    current: (s) => {
      const p = q(s)
      const id = p.get('structure')
      if (id) return findOrganelle(id)?.name ?? null
      const type = p.get('type')
      return type === 'plant' ? 'Plant cell' : type === 'bacterium' ? 'Bacterium' : 'Animal cell'
    },
  },
  {
    id: 'biology.dna',
    subject: 'biology',
    name: 'DNA and RNA',
    summary: 'Base pairing, strand direction and transcription, step by step',
    href: linkTo('biology', { bsec: 'dna' }),
    topics: [],
    matches: (s) => parseBiologySection(s).section === 'dna',
    current: () => null,
  },
  {
    id: 'biology.division',
    subject: 'biology',
    name: 'Cell division',
    summary: `Mitosis in ${DIVISION_STAGES.length} manual stages with consistent chromosome counts`,
    href: linkTo('biology', { bsec: 'division' }),
    topics: [],
    matches: (s) => parseBiologySection(s).section === 'division',
    current: () => null,
  },
  {
    id: 'biology.meiosis',
    subject: 'biology',
    name: 'Meiosis',
    summary: 'Meiosis I and II in a 2n = 4 cell, crossing over, independent assortment, and a comparison with mitosis',
    href: linkTo('biology', { bsec: 'meiosis' }),
    topics: [],
    matches: (s) => parseBiologySection(s).section === 'meiosis',
    current: () => null,
  },
  {
    id: 'biology.inheritance',
    subject: 'biology',
    name: 'Inheritance',
    summary: 'One-gene Mendelian crosses: Punnett square, probabilities and a repeatable sampling simulation',
    href: linkTo('biology', { bsec: 'inheritance' }),
    topics: [
      { label: 'Yy × Yy', href: linkTo('biology', { bsec: 'inheritance', p1: 'Yy', p2: 'Yy' }) },
      { label: 'Yy × yy (test cross)', href: linkTo('biology', { bsec: 'inheritance', p1: 'Yy', p2: 'yy' }) },
    ],
    matches: (s) => parseBiologySection(s).section === 'inheritance',
    current: (s) => {
      const { p1, p2 } = parseBiologySection(s).parents
      return p1 === 'Yy' && p2 === 'yy' ? 'Yy × yy (test cross)' : `${p1} × ${p2}`
    },
  },
  {
    id: 'biology.energy',
    subject: 'biology',
    name: 'Energy processes',
    summary: 'Photosynthesis and cellular respiration: net equations and stages',
    href: linkTo('biology', { bsec: 'energy' }),
    topics: [],
    matches: (s) => parseBiologySection(s).section === 'energy',
    current: () => null,
  },
  {
    id: 'biology.diffusion',
    subject: 'biology',
    name: 'Diffusion',
    summary: 'Random particle motion between two compartments: net movement, dynamic equilibrium and a selective membrane',
    href: linkTo('biology', { bsec: 'diffusion' }),
    topics: [
      { label: 'Wall with an opening', href: linkTo('biology', { bsec: 'diffusion', dfm: 'gap' }) },
      { label: 'Selective membrane', href: linkTo('biology', { bsec: 'diffusion', dfm: 'membrane', dfb: '60' }) },
    ],
    matches: (s) => parseBiologySection(s).section === 'diffusion',
    current: (s) => (new URLSearchParams(s).get('dfm') === 'membrane' ? 'Selective membrane' : 'Wall with an opening'),
  },
  {
    id: 'physics.projectile',
    subject: 'physics',
    name: 'Projectile motion',
    summary: 'Launch, compare two runs, vectors and graphs',
    href: linkTo('physics', {}),
    topics: [],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'projectile',
    current: () => null,
  },
  {
    id: 'physics.spring',
    subject: 'physics',
    name: 'Spring–mass oscillator',
    summary: 'Period, forces and energy of an ideal spring',
    href: linkTo('physics', { experiment: 'spring' }),
    topics: [],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'spring',
    current: () => null,
  },
  {
    id: 'physics.circuit',
    subject: 'physics',
    name: 'DC circuits',
    summary: 'Series, parallel and mixed resistors with Ohm’s law readouts',
    href: linkTo('physics', { experiment: 'circuit' }),
    topics: [],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'circuit',
    current: () => null,
  },
  {
    id: 'physics.wave',
    subject: 'physics',
    name: 'Travelling waves',
    summary: 'Frequency, wavelength and speed of a sine wave',
    href: linkTo('physics', { experiment: 'wave' }),
    topics: [],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'wave',
    current: () => null,
  },
  {
    id: 'physics.optics',
    subject: 'physics',
    name: 'Geometric optics',
    summary: 'Reflection, refraction and total internal reflection; thin lenses with principal rays',
    href: linkTo('physics', { experiment: 'optics' }),
    topics: [
      { label: 'Reflection and refraction', href: linkTo('physics', { experiment: 'optics', opt: 'refraction', n1: '1.333', n2: '1.0003', inc: '48.63' }) },
      { label: 'Thin lens', href: linkTo('physics', { experiment: 'optics', opt: 'lens', lens: 'converging', f: '10', do: '5' }) },
    ],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'optics',
    current: (s) => (new URLSearchParams(s).get('opt') === 'lens' ? 'Thin lens' : 'Reflection and refraction'),
  },
  {
    id: 'physics.gas',
    subject: 'physics',
    name: 'Gas pressure and volume',
    summary: 'Boyle’s law for a fixed amount of gas at constant temperature, with a P–V graph',
    href: linkTo('physics', { experiment: 'gas' }),
    topics: [
      { label: 'Halve the volume', href: linkTo('physics', { experiment: 'gas', gp: '101.3', gv1: '2', gv2: '1' }) },
      { label: 'Double the volume', href: linkTo('physics', { experiment: 'gas', gp: '101.3', gv1: '2', gv2: '4' }) },
    ],
    matches: (s) => parsePhysicsExperiment(s).experiment === 'gas',
    current: (s) => {
      const q = new URLSearchParams(s)
      const ratio = Number(q.get('gv2')) / Number(q.get('gv1'))
      return ratio === 0.5 ? 'Halve the volume' : ratio === 2 ? 'Double the volume' : null
    },
  },
  {
    id: 'mathematics.functions',
    subject: 'mathematics',
    name: '2D functions',
    summary: `${FUNCTIONS.length} functions with tangent, secant and integral tools`,
    href: linkTo('mathematics', { msec: 'functions' }),
    topics: [fn('quadratic'), fn('sine'), fn('exponential')],
    matches: (s) => parseMathSection(s).section === 'functions',
    current: (s) => {
      const f = FUNCTIONS.find((x) => x.id === q(s).get('fn'))
      return f ? `${f.name} function` : null
    },
  },
  {
    id: 'mathematics.surfaces',
    subject: 'mathematics',
    name: '3D surfaces',
    summary: `${SURFACES.length} surfaces z = f(x, y) with tangent planes and cross-sections`,
    href: linkTo('mathematics', {}),
    topics: SURFACES.slice(1, 3).map((s) => ({ label: s.name, href: linkTo('mathematics', { surface: s.id }) })),
    matches: (s) => parseMathSection(s).section === 'surfaces',
    current: (s) => getSurface((q(s).get('surface') ?? 'paraboloid') as never)?.name ?? null,
  },
  {
    id: 'mathematics.statistics',
    subject: 'mathematics',
    name: 'Statistics and probability',
    summary: 'Descriptive statistics with histograms and box plots; the binomial distribution with a seeded simulation',
    href: linkTo('mathematics', { msec: 'statistics' }),
    topics: [
      { label: 'Descriptive statistics', href: linkTo('mathematics', { msec: 'statistics', sv: 'describe' }) },
      { label: 'Binomial probability', href: linkTo('mathematics', { msec: 'statistics', sv: 'binomial' }) },
    ],
    matches: (s) => parseMathSection(s).section === 'statistics',
    current: (s) => (new URLSearchParams(s).get('sv') === 'binomial' ? 'Binomial probability' : 'Descriptive statistics'),
  },
  {
    id: 'mathematics.vectors',
    subject: 'mathematics',
    name: 'Vectors and transformations',
    summary: `Vector operations and 2×2 matrices with ${PRESETS.length} presets`,
    href: linkTo('mathematics', { msec: 'vectors' }),
    topics: [],
    matches: (s) => parseMathSection(s).section === 'vectors',
    current: () => null,
  },
]

export function modulesOf(subject: SubjectId): TopicModule[] {
  return MODULES.filter((m) => m.subject === subject)
}

/** The module and topic a subject's query string shows. Falls back to the subject's first module. */
export function locate(subject: SubjectId, search: string): { module: TopicModule; topic: string | null } {
  const modules = modulesOf(subject)
  const module = modules.find((m) => m.matches(search)) ?? modules[0]
  return { module, topic: module.current(search) }
}

export function findModule(id: string): TopicModule | undefined {
  return MODULES.find((m) => m.id === id)
}

/**
 * Curated questions for Home. A question is listed only when the module that answers it exists,
 * so a question can be written before its module and appears once the module ships.
 */
export interface Question {
  question: string
  /** What the destination shows, in one line. */
  answer: string
  moduleId: string
  /** Built lazily: the destination module may not exist yet. */
  href: () => string
}

const QUESTIONS: readonly Question[] = [
  {
    question: 'How does breathing work?',
    answer: 'The diaphragm, lungs and airway in the body atlas, with a step-by-step breath tour.',
    moduleId: 'anatomy.atlas',
    href: () => structureLink('diaphragm'),
  },
  {
    question: 'Why do molecules have different shapes?',
    answer: 'Electron groups around a central atom, with linear, bent and tetrahedral examples.',
    moduleId: 'chemistry.bonding',
    href: () => linkTo('chemistry', { csec: 'bonding' }),
  },
  {
    question: 'How does a lens form an image?',
    answer: 'Principal rays through a thin lens, with real and virtual images.',
    moduleId: 'physics.optics',
    href: () => linkTo('physics', { experiment: 'optics', opt: 'lens', lens: 'converging', f: '10', do: '30' }),
  },
]

export function availableQuestions(): { question: string; answer: string; href: string; subject: SubjectId }[] {
  return QUESTIONS.flatMap((x) => {
    const m = findModule(x.moduleId)
    return m ? [{ question: x.question, answer: x.answer, href: x.href(), subject: m.subject }] : []
  })
}
