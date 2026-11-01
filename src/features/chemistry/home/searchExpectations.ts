/*
 * What each required query must find (written before the ranking was changed). `top` is the topic
 * or item that must come first; `includes` must appear in the first five; `excludes` must not
 * appear in the first five. Ids are item ids (chemIndex.ts) or topic ids (`topic:<id>`).
 */
export interface SearchExpectation {
  query: string
  top: string
  includes?: string[]
  excludes?: string[]
}

export const SEARCH_EXPECTATIONS: readonly SearchExpectation[] = [
  { query: 'mole', top: 'topic:mole', excludes: ['section:molecules', 'ref:electron-pair-geometry'] },
  { query: 'moles', top: 'topic:mole', excludes: ['section:molecules'] },
  { query: 'what is a mole', top: 'topic:mole', excludes: ['section:molecules'] },
  { query: 'molarity', top: 'topic:molarity' },
  { query: 'what is molarity', top: 'topic:molarity' },
  { query: 'how do I calculate molarity', top: 'topic:molarity' },
  { query: 'concentration', top: 'topic:molarity', includes: ['topic:dilution'] },
  { query: 'dilution', top: 'topic:dilution' },
  { query: 'how much water do I add', top: 'topic:dilution' },
  { query: 'balance an equation', top: 'topic:balancing' },
  { query: 'why is water bent', top: 'topic:water' },
  { query: 'H2O', top: 'topic:water' },
  { query: 'H₂O', top: 'topic:water' },
  { query: 'CO2', top: 'molecule:carbon-dioxide' },
]
