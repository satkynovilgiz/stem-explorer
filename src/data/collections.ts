import type { SubjectId } from './subjects'
import { RELATIONS } from './related'
import { RELATIONSHIPS } from './anatomy/atlas/relationships'
import { structureLink } from './topics'
import { linkTo } from '../lib/links'

/*
 * Curated starter collections: short paths through views that already exist, each step with a
 * question to try. Connection statements are not new claims: they reuse the source-checked links
 * in related.ts and the atlas relationships, which cite the sections that state them. Each
 * collection also says where the connection stops. No progress or completion is tracked.
 */

export interface CuratedStep {
  subject: SubjectId
  params: Record<string, string>
  title: string
  /** A question or something to try in this view. */
  prompt: string
}

export interface CuratedConnection {
  text: string
  limits: string
  sources: readonly string[]
}

export interface CuratedCollection {
  id: string
  title: string
  summary: string
  steps: readonly CuratedStep[]
  connections: readonly CuratedConnection[]
  /** What this path leaves out or simplifies. */
  limitations: string
}

/** The subject and parameters behind a validated link such as "?a=1#/physics". */
function step(href: string, title: string, prompt: string): CuratedStep {
  const [query, hash] = href.split('#/')
  return { subject: hash as SubjectId, params: Object.fromEntries(new URLSearchParams(query)), title, prompt }
}

const relation = (id: string): CuratedConnection => {
  const r = RELATIONS.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown relation ${id}`)
  return { text: r.text, limits: r.limits, sources: r.sources }
}

const anatomyFact = (id: string, limits: string): CuratedConnection => {
  const r = RELATIONSHIPS.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown relationship ${id}`)
  return { text: r.statement, limits, sources: [r.source] }
}

export const CURATED_COLLECTIONS: readonly CuratedCollection[] = [
  {
    id: 'breathing',
    title: 'How breathing works',
    summary: 'From the muscle that drives breathing, along the airways to the lungs, to the two gases that are exchanged there.',
    steps: [
      step(structureLink('diaphragm'), 'The diaphragm', 'Where is the diaphragm relative to the lungs and the abdominal organs?'),
      step(structureLink('trachea'), 'The trachea', 'Follow the airway: what does the trachea lead air into?'),
      step(structureLink('lung-left'), 'The left lung', 'Find the apex and the base of the lung. Then open the respiratory tour’s gas-exchange close-up.'),
      step(linkTo('chemistry', { molecule: 'oxygen', view: 'ball-and-stick' }), 'Oxygen molecule (O₂)', 'Which gas moves from the alveoli into the blood?'),
      step(linkTo('chemistry', { molecule: 'carbon-dioxide', view: 'ball-and-stick' }), 'Carbon dioxide molecule (CO₂)', 'Which gas moves the other way, and where was it made?'),
    ],
    connections: [
      anatomyFact('diaphragm-moves-inferiorly', 'The atlas shows positions, not movement; it does not animate breathing.'),
      relation('gas-exchange'),
      relation('cells-gas-exchange'),
    ],
    limitations:
      'A schematic path. The atlas models are simplified, and the molecule views show single molecules, not air or blood. Nothing here describes or predicts anyone’s health or breathing.',
  },
  {
    id: 'dna-inheritance',
    title: 'From DNA to inheritance',
    summary: 'From the structure of DNA, through cell division and meiosis, to a one-gene cross and the binomial distribution that describes its counts.',
    steps: [
      step(linkTo('biology', { bsec: 'dna' }), 'DNA structure', 'Which bases pair with which?'),
      step(linkTo('biology', { bsec: 'division' }), 'Mitosis', 'How many cells result, and how do their chromosomes compare with the parent cell’s?'),
      step(linkTo('biology', { bsec: 'meiosis' }), 'Meiosis', 'At which stage do homologous chromosomes separate? How does that differ from mitosis?'),
      step(linkTo('biology', { bsec: 'inheritance', p1: 'Yy', p2: 'Yy' }), 'A Yy × Yy cross', 'What fraction of offspring are expected to have green seeds (yy)?'),
      step(linkTo('mathematics', { msec: 'statistics', sv: 'binomial', bn: '100', bp: '0.25' }), 'Binomial distribution, n = 100, p = 0.25', 'Run the simulation: how close do the simulated counts come to the expected 25?'),
    ],
    connections: [relation('inheritance-binomial')],
    limitations:
      'The cross uses one gene with complete dominance. Most traits are not inherited this way, and the binomial model assumes independent offspring with a fixed probability.',
  },
  {
    id: 'waves-probability',
    title: 'Waves, sine functions, and probability',
    summary: 'The same sine and cosine functions describe a wave and an oscillating spring. A random count needs a different kind of model.',
    steps: [
      step(linkTo('physics', { experiment: 'wave' }), 'A travelling wave', 'Pause the wave: what shape does it have at one instant?'),
      step(linkTo('mathematics', { msec: 'functions', fn: 'sine' }), 'The sine function', 'Compare the curve with the paused wave. What plays the role of the wavelength?'),
      step(linkTo('physics', { experiment: 'spring' }), 'A mass on a spring', 'Read the position–time graph: which function does it follow?'),
      step(linkTo('mathematics', { msec: 'functions', fn: 'cosine' }), 'The cosine function', 'Where does the cosine start, compared with a mass released from rest?'),
      step(linkTo('mathematics', { msec: 'statistics', sv: 'binomial', bn: '20', bp: '0.5', br: '1000', seed: '2026' }), 'Binomial distribution, n = 20, p = 0.5', 'Run it twice with different seeds. Why do the results change here, when a wave’s shape does not?'),
    ],
    connections: [
      relation('wave-sine'),
      relation('spring-cosine'),
      {
        text: 'The wave and the spring are deterministic: the same settings always give the same motion. The binomial count is a random model: only its probabilities are fixed, and each simulated run differs.',
        limits: 'A contrast between kinds of model, not a physical connection. Repeating curves and random counts describe different things.',
        sources: ['up1-16-2', 'up-15-1', 'stat-4-3'],
      },
    ],
    limitations: 'Ideal models: a perfectly sinusoidal wave, a frictionless spring, and independent trials with a fixed probability.',
  },
  {
    id: 'reaction-quantities',
    title: 'Reaction quantities and conservation',
    summary: 'Balancing equations conserves atoms; mole ratios then set how much product forms and which reactant runs out first.',
    steps: [
      step(linkTo('chemistry', { molecule: 'water', view: 'ball-and-stick' }), 'The water molecule', 'Count the atoms of each element in one molecule.'),
      step(linkTo('chemistry', { csec: 'reactions', rx: 'water-decomposition' }), 'Decomposing water', 'Check the atom counts on both sides: are they equal?'),
      step(linkTo('chemistry', { csec: 'reactions', rx: 'ammonia-synthesis' }), 'Making ammonia', 'Read the mole ratio: how many moles of H₂ react with one mole of N₂?'),
      step(linkTo('chemistry', { csec: 'reactions', rx: 'hcl-synthesis' }), 'Making hydrogen chloride', 'Enter unequal amounts of H₂ and Cl₂: which is the limiting reactant?'),
      step(linkTo('chemistry', { csec: 'periodic', el: '8' }), 'Oxygen in the periodic table', 'Find oxygen’s atomic number. A reaction rearranges atoms but never changes an element into another.'),
    ],
    connections: [
      {
        text: 'A balanced equation has the same number of atoms of each element on both sides. Its coefficients give the mole ratios used to find amounts of products and the limiting reactant.',
        limits: 'The calculations assume the reaction goes to completion as written. Actual yields are usually lower.',
        sources: ['chem-4-1', 'chem-4-3', 'chem-4-4', 'chem-2-3'],
      },
    ],
    limitations: 'The reactions lab does not store amounts in links, so enter them yourself in the limiting-reactant step.',
  },
]
