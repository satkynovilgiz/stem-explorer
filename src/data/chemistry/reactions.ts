import type { Equation, Species } from '../../chem/stoichiometry'

/*
 * Curated reactions for the reaction and stoichiometry lab. Every balanced equation, physical
 * state and condition is the one given in the cited section of OpenStax Chemistry 2e (§4.1–4.4);
 * where a section gives no states or conditions, none are shown and the entry says so. A
 * balanced equation only says that atoms (and charge) are conserved: it does not say that a
 * reaction happens, how fast, or under which conditions.
 */

/**
 * Abridged standard atomic weights (g/mol), CIAAW 2024 table (based on "Atomic Weights 2021"),
 * with the uncertainty the table gives. Only the elements used by the library are listed.
 */
export const ATOMIC_WEIGHTS: Readonly<Record<string, { value: number; uncertainty: number }>> = {
  H: { value: 1.008, uncertainty: 0.0002 },
  C: { value: 12.011, uncertainty: 0.002 },
  N: { value: 14.007, uncertainty: 0.001 },
  O: { value: 15.999, uncertainty: 0.001 },
  Na: { value: 22.99, uncertainty: 0.001 },
  Mg: { value: 24.305, uncertainty: 0.002 },
  Cl: { value: 35.45, uncertainty: 0.01 },
  Ca: { value: 40.078, uncertainty: 0.004 },
  Ag: { value: 107.87, uncertainty: 0.01 },
}

export const WEIGHTS: Readonly<Record<string, number>> = Object.fromEntries(Object.entries(ATOMIC_WEIGHTS).map(([el, w]) => [el, w.value]))

/** As printed in the CIAAW table (trailing zeros are significant). */
export const WEIGHT_TEXT: Readonly<Record<string, string>> = {
  H: '1.0080 ± 0.0002',
  C: '12.011 ± 0.002',
  N: '14.007 ± 0.001',
  O: '15.999 ± 0.001',
  Na: '22.990 ± 0.001',
  Mg: '24.305 ± 0.002',
  Cl: '35.45 ± 0.01',
  Ca: '40.078 ± 0.004',
  Ag: '107.87 ± 0.01',
}

export type ReactionType = 'synthesis' | 'decomposition' | 'combustion' | 'precipitation' | 'acid-base' | 'solution'

export const TYPE_LABEL: Record<ReactionType, string> = {
  synthesis: 'Synthesis',
  decomposition: 'Decomposition',
  combustion: 'Combustion',
  precipitation: 'Precipitation',
  'acid-base': 'Acid–base (neutralization)',
  solution: 'Ionic equations in solution',
}

export const TYPE_NOTE: Record<ReactionType, string> = {
  synthesis: 'Two or more substances combine into one product.',
  decomposition: 'One substance breaks down into two or more products.',
  combustion: 'A fuel reacts with an oxidant, here molecular oxygen, releasing heat (a kind of redox reaction).',
  precipitation: 'Dissolved ions combine into an insoluble solid, the precipitate.',
  'acid-base': 'An acid and a base react; the products are often a salt and water.',
  solution: 'A reaction in solution shown as molecular, complete ionic and net ionic equations.',
}

export interface IonicForms {
  /** Every dissolved strong electrolyte written as its ions. */
  complete: { equation: Equation; coefficients: readonly number[] }
  /** The complete ionic equation without spectator ions, in smallest whole numbers. */
  net: { equation: Equation; coefficients: readonly number[] }
  spectators: readonly string[]
}

export interface BalanceStep {
  /** Coefficients after this step, reactants then products. */
  coefficients: readonly number[]
  text: string
}

export interface Reaction {
  id: string
  name: string
  type: ReactionType
  equation: Equation
  /** The balanced coefficients from the source, reactants then products. */
  balanced: readonly number[]
  /** Conditions the source states, or null when it states none. */
  conditions: string | null
  /** Why states are missing, when the source's equation gives none. */
  statesNote?: string
  ionic?: IonicForms
  /** Balancing by inspection from all-1 coefficients. */
  steps: readonly BalanceStep[]
  /** Offer limiting-reactant and yield exploration (needs two or more reactants). */
  yieldLab: boolean
  source: string
  note?: string
}

const sp = (formula: string, name: string, state?: Species['state'], charge?: number): Species => ({ formula, name, state, charge })

export const REACTIONS: readonly Reaction[] = [
  {
    id: 'water-decomposition',
    name: 'Decomposition of water',
    type: 'decomposition',
    equation: { reactants: [sp('H2O', 'water')], products: [sp('H2', 'hydrogen'), sp('O2', 'oxygen')] },
    balanced: [2, 2, 1],
    conditions: null,
    statesNote: 'The cited example balances the equation without physical states or conditions, so none are shown.',
    steps: [
      { coefficients: [1, 1, 1], text: 'Start with every coefficient 1. H: 2 on each side, but O: 1 on the left and 2 on the right.' },
      { coefficients: [2, 1, 1], text: 'Balance O: 2 H₂O gives 2 O on the left. H is now 4 on the left and 2 on the right.' },
      { coefficients: [2, 2, 1], text: 'Balance H: 2 H₂ gives 4 H on the right. Every element is balanced.' },
    ],
    yieldLab: false,
    source: 'chem-4-1',
  },
  {
    id: 'methane-combustion',
    name: 'Combustion of methane',
    type: 'combustion',
    equation: { reactants: [sp('CH4', 'methane'), sp('O2', 'oxygen')], products: [sp('CO2', 'carbon dioxide'), sp('H2O', 'water')] },
    balanced: [1, 2, 1, 2],
    conditions: null,
    statesNote: 'The cited example gives the equation without physical states, so none are shown.',
    steps: [
      { coefficients: [1, 1, 1, 1], text: 'Start with every coefficient 1. C: 1 = 1. H: 4 on the left, 2 on the right.' },
      { coefficients: [1, 1, 1, 2], text: 'Balance H: 2 H₂O gives 4 H. O is now 2 on the left and 2 + 2 = 4 on the right.' },
      { coefficients: [1, 2, 1, 2], text: 'Balance O last, because O₂ contains only oxygen: 2 O₂ gives 4 O. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-1',
  },
  {
    id: 'octane-combustion',
    name: 'Combustion of octane',
    type: 'combustion',
    equation: { reactants: [sp('C8H18', 'octane'), sp('O2', 'oxygen')], products: [sp('CO2', 'carbon dioxide'), sp('H2O', 'water')] },
    balanced: [2, 25, 16, 18],
    conditions: null,
    statesNote: 'The cited example gives the equation without physical states, so none are shown.',
    steps: [
      { coefficients: [1, 1, 1, 1], text: 'Start with every coefficient 1. C: 8 on the left, 1 on the right.' },
      { coefficients: [1, 1, 8, 1], text: 'Balance C: 8 CO₂. Then H: 18 on the left, 2 on the right.' },
      { coefficients: [1, 1, 8, 9], text: 'Balance H: 9 H₂O. O on the right is now 16 + 9 = 25, which would need 12½ O₂.' },
      { coefficients: [2, 25, 16, 18], text: 'Coefficients are whole numbers, so double every coefficient: 2 C₈H₁₈ + 25 O₂ → 16 CO₂ + 18 H₂O.' },
    ],
    yieldLab: true,
    source: 'chem-4-3',
  },
  {
    id: 'ammonia-synthesis',
    name: 'Synthesis of ammonia',
    type: 'synthesis',
    equation: { reactants: [sp('N2', 'nitrogen', 'g'), sp('H2', 'hydrogen', 'g')], products: [sp('NH3', 'ammonia', 'g')] },
    balanced: [1, 3, 2],
    conditions: null,
    steps: [
      { coefficients: [1, 1, 1], text: 'Start with every coefficient 1. N: 2 on the left, 1 on the right.' },
      { coefficients: [1, 1, 2], text: 'Balance N: 2 NH₃. H is now 2 on the left and 6 on the right.' },
      { coefficients: [1, 3, 2], text: 'Balance H: 3 H₂ gives 6 H. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-3',
    note: 'The cited section uses this equation for stoichiometric ratios; the industrial conditions are not part of it.',
  },
  {
    id: 'sodium-chloride-synthesis',
    name: 'Sodium and chlorine form sodium chloride',
    type: 'synthesis',
    equation: { reactants: [sp('Na', 'sodium', 's'), sp('Cl2', 'chlorine', 'g')], products: [sp('NaCl', 'sodium chloride', 's')] },
    balanced: [2, 1, 2],
    conditions: null,
    steps: [
      { coefficients: [1, 1, 1], text: 'Start with every coefficient 1. Cl: 2 on the left, 1 on the right.' },
      { coefficients: [1, 1, 2], text: 'Balance Cl: 2 NaCl. Na is now 1 on the left and 2 on the right.' },
      { coefficients: [2, 1, 2], text: 'Balance Na: 2 Na. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-2',
    note: 'The cited section also treats this as a redox reaction: sodium loses electrons and chlorine gains them.',
  },
  {
    id: 'hcl-synthesis',
    name: 'Hydrogen and chlorine form hydrogen chloride',
    type: 'synthesis',
    equation: { reactants: [sp('H2', 'hydrogen', 'g'), sp('Cl2', 'chlorine', 'g')], products: [sp('HCl', 'hydrogen chloride', 'g')] },
    balanced: [1, 1, 2],
    conditions: null,
    steps: [
      { coefficients: [1, 1, 1], text: 'Start with every coefficient 1. H and Cl: 2 on the left, 1 each on the right.' },
      { coefficients: [1, 1, 2], text: 'Balance both with 2 HCl. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-4',
    note: 'The cited section uses this reaction to introduce limiting and excess reactants.',
  },
  {
    id: 'sodium-azide-decomposition',
    name: 'Decomposition of sodium azide',
    type: 'decomposition',
    equation: { reactants: [sp('NaN3', 'sodium azide', 's')], products: [sp('N2', 'nitrogen', 'g'), sp('Na', 'sodium', 's')] },
    balanced: [2, 3, 2],
    conditions: 'Initiated by an electric current, as in some vehicle airbag systems (the cited section’s example).',
    steps: [
      { coefficients: [1, 1, 1], text: 'Start with every coefficient 1. N: 3 on the left, 2 on the right.' },
      { coefficients: [2, 3, 1], text: 'Balance N with the least common multiple, 6: 2 NaN₃ and 3 N₂. Na is now 2 on the left, 1 on the right.' },
      { coefficients: [2, 3, 2], text: 'Balance Na: 2 Na. Balanced.' },
    ],
    yieldLab: false,
    source: 'chem-4-3',
  },
  {
    id: 'silver-chloride-precipitation',
    name: 'Precipitation of silver chloride',
    type: 'precipitation',
    equation: {
      reactants: [sp('CaCl2', 'calcium chloride', 'aq'), sp('AgNO3', 'silver nitrate', 'aq')],
      products: [sp('Ca(NO3)2', 'calcium nitrate', 'aq'), sp('AgCl', 'silver chloride', 's')],
    },
    balanced: [1, 2, 1, 2],
    conditions: null,
    ionic: {
      complete: {
        equation: {
          reactants: [sp('Ca', 'calcium ion', 'aq', 2), sp('Cl', 'chloride ion', 'aq', -1), sp('Ag', 'silver ion', 'aq', 1), sp('NO3', 'nitrate ion', 'aq', -1)],
          products: [sp('Ca', 'calcium ion', 'aq', 2), sp('NO3', 'nitrate ion', 'aq', -1), sp('AgCl', 'silver chloride', 's')],
        },
        coefficients: [1, 2, 2, 2, 1, 2, 2],
      },
      net: {
        equation: { reactants: [sp('Ag', 'silver ion', 'aq', 1), sp('Cl', 'chloride ion', 'aq', -1)], products: [sp('AgCl', 'silver chloride', 's')] },
        coefficients: [1, 1, 1],
      },
      spectators: ['Ca²⁺', 'NO₃⁻'],
    },
    steps: [
      { coefficients: [1, 1, 1, 1], text: 'Start with every coefficient 1. Cl: 2 on the left, 1 on the right.' },
      { coefficients: [1, 1, 1, 2], text: 'Balance Cl: 2 AgCl. Ag is now 1 on the left and 2 on the right.' },
      { coefficients: [1, 2, 1, 2], text: 'Balance Ag: 2 AgNO₃. That also gives 2 nitrate groups on each side. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-1',
  },
  {
    id: 'magnesium-hydroxide-neutralization',
    name: 'Magnesium hydroxide neutralizes hydrochloric acid',
    type: 'acid-base',
    equation: {
      reactants: [sp('Mg(OH)2', 'magnesium hydroxide', 's'), sp('HCl', 'hydrochloric acid', 'aq')],
      products: [sp('MgCl2', 'magnesium chloride', 'aq'), sp('H2O', 'water', 'l')],
    },
    balanced: [1, 2, 1, 2],
    conditions: null,
    steps: [
      { coefficients: [1, 1, 1, 1], text: 'Start with every coefficient 1. Cl: 1 on the left, 2 on the right.' },
      { coefficients: [1, 2, 1, 1], text: 'Balance Cl: 2 HCl. H is now 2 + 2 = 4 on the left and 2 on the right.' },
      { coefficients: [1, 2, 1, 2], text: 'Balance H: 2 H₂O. O: 2 on each side. Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-2',
    note: 'The cited section’s example: an antacid (milk of magnesia) and stomach acid. Its net ionic form is not given there, so it is not shown.',
  },
  {
    id: 'carbon-dioxide-hydroxide',
    name: 'Carbon dioxide in sodium hydroxide solution',
    type: 'solution',
    equation: {
      reactants: [sp('CO2', 'carbon dioxide', 'aq'), sp('NaOH', 'sodium hydroxide', 'aq')],
      products: [sp('Na2CO3', 'sodium carbonate', 'aq'), sp('H2O', 'water', 'l')],
    },
    balanced: [1, 2, 1, 1],
    conditions: null,
    ionic: {
      complete: {
        equation: {
          reactants: [sp('CO2', 'carbon dioxide', 'aq'), sp('Na', 'sodium ion', 'aq', 1), sp('OH', 'hydroxide ion', 'aq', -1)],
          products: [sp('Na', 'sodium ion', 'aq', 1), sp('CO3', 'carbonate ion', 'aq', -2), sp('H2O', 'water', 'l')],
        },
        coefficients: [1, 2, 2, 2, 1, 1],
      },
      net: {
        equation: {
          reactants: [sp('CO2', 'carbon dioxide', 'aq'), sp('OH', 'hydroxide ion', 'aq', -1)],
          products: [sp('CO3', 'carbonate ion', 'aq', -2), sp('H2O', 'water', 'l')],
        },
        coefficients: [1, 2, 1, 1],
      },
      spectators: ['Na⁺'],
    },
    steps: [
      { coefficients: [1, 1, 1, 1], text: 'Start with every coefficient 1. Na: 1 on the left, 2 on the right.' },
      { coefficients: [1, 2, 1, 1], text: 'Balance Na: 2 NaOH. Check H (2 = 2) and O (2 + 2 = 4 = 3 + 1). Balanced.' },
    ],
    yieldLab: true,
    source: 'chem-4-1',
  },
]

export const REACTION_IDS = REACTIONS.map((r) => r.id)
export const DEFAULT_REACTION = 'methane-combustion'
export const findReaction = (id: string) => REACTIONS.find((r) => r.id === id)

/** Physical-state labels as written in equations. */
export const STATE_TEXT = { s: '(s)', l: '(l)', g: '(g)', aq: '(aq)' } as const
export const STATE_NAME = { s: 'solid', l: 'liquid', g: 'gas', aq: 'aqueous (dissolved in water)' } as const
