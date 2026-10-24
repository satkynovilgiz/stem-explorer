import { describe, expect, it } from 'vitest'
import { ATLAS_STRUCTURES, ATLAS_SYSTEMS } from './anatomy/atlas'
import { MOVEMENTS } from './anatomy/atlas/movements'
import { TOURS } from './anatomy/atlas/tours'
import { RELATION_EXPLORATIONS, RELATIONSHIPS } from './anatomy/atlas/relationships'
import { DIVISION_STAGES } from './biology/mitosis'
import { meiosisStages } from './biology/meiosis'
import { ISOTOPES } from './chemistry/atomic'
import { GLOSSARY } from './glossary'
import { RELATIONS } from './related'
import { SOURCES } from './sources'
import { SEARCH_INDEX } from '../lib/searchIndex'
import readme from '../../README.md?raw'

const count = (prefix: string) => SEARCH_INDEX.filter((i) => i.id.startsWith(prefix)).length

describe('README content inventory', () => {
  it('matches the data', () => {
    const table = readme.slice(readme.indexOf('### Content inventory'), readme.indexOf('### Attribution'))
    const rows = Object.fromEntries([...table.matchAll(/^\| ([^|]+?) \| (\d+) \|$/gm)].map((m) => [m[1], Number(m[2])]))
    expect(rows).toEqual({
      'Atlas structures': ATLAS_STRUCTURES.length,
      'Atlas systems': ATLAS_SYSTEMS.length,
      'Atlas tours': TOURS.length,
      'Movement demonstrations': MOVEMENTS.length,
      'Sourced anatomical relationships': RELATIONSHIPS.length,
      'Relationship explorations': RELATION_EXPLORATIONS.length,
      'Heart module structures': count('heart:'),
      Elements: count('element:'),
      Molecules: count('molecule:'),
      'Curated reactions': count('reaction:'),
      'Isotopes in the library': ISOTOPES.length,
      'Cell structures (animal, plant, bacterial)': count('organelle:'),
      'Cell division stages': DIVISION_STAGES.length,
      'Meiosis stages': meiosisStages({ crossover: true, orientation: 'same' }).length,
      'Physics labs': count('experiment:'),
      'Function families': count('function:'),
      Surfaces: count('surface:'),
      'Matrix presets': count('matrix:'),
      'Glossary terms': GLOSSARY.length,
      'Cross-subject relations': RELATIONS.length,
      'Registered sources': Object.keys(SOURCES).length,
      'Search index entries': SEARCH_INDEX.length,
    })
  })
})
