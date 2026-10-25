import { describe, expect, it } from 'vitest'
import { canonicalize } from './explorations'
import { ATLAS_STRUCTURES } from '../data/anatomy/atlas'
import { groupResults, SEARCH_INDEX, searchAll, searchExplorations } from './searchIndex'

const parse = (href: string) => {
  const [query, hash] = href.split('#/')
  return { subject: hash, params: Object.fromEntries(new URLSearchParams(query.replace(/^\?/, ''))) }
}

describe('search index', () => {
  it('covers all subjects and the content of every explorer', () => {
    const count = (prefix: string) => SEARCH_INDEX.filter((i) => i.id.startsWith(prefix)).length
    expect(count('subject:')).toBe(5)
    expect(count('molecule:')).toBe(12)
    expect(count('organelle:')).toBe(23) // 10 animal-model structures + 4 plant-only + 9 bacterial
    expect(count('heart:')).toBe(14)
    expect(count('surface:')).toBe(4)
    expect(count('experiment:')).toBe(6)
    expect(count('structure:')).toBe(ATLAS_STRUCTURES.length)
    expect(count('element:')).toBe(118)
    expect(count('process:')).toBe(4)
    expect(count('function:')).toBe(7)
    expect(count('section:')).toBe(11)
    expect(count('reaction:')).toBe(10)
    expect(count('cell:')).toBe(3)
    expect(count('term:')).toBeGreaterThan(40)
  })

  it('links only to valid, relative routes', () => {
    for (const item of SEARCH_INDEX.filter((i) => i.id.startsWith('term:'))) expect(item.href).toMatch(/^\?term=[a-z0-9-]+#\/glossary$/)
    for (const item of SEARCH_INDEX.filter((i) => !i.id.startsWith('term:'))) {
      expect(item.href).toMatch(/^(\?[^#]*)?#\/[a-z]+$/)
      const { subject, params } = parse(item.href)
      expect(canonicalize(subject, params), item.href).not.toBeNull()
    }
  })
})

describe('searchAll', () => {
  it('finds the new content and opens its exact state', () => {
    expect(searchAll('femur')[0]).toMatchObject({ subject: 'anatomy', kind: 'structure' })
    expect(searchAll('femur')[0].href).toContain('atlas=femur-')
    // A structure in a layer that is off by default turns that layer on.
    expect(new URLSearchParams(searchAll('biceps')[0].href.split('#')[0]).get('layers')).toContain('muscular')
    expect(searchAll('Fe')[0]).toMatchObject({ name: 'Iron', kind: 'element' })
    expect(searchAll('Fe')[0].href).toMatch(/csec=periodic&el=26#\/chemistry$/)
    expect(searchAll('prophase')[0]).toMatchObject({ id: 'process:division' })
    expect(searchAll('glycolysis').map((r) => r.id)).toContain('process:respiration')
    expect(searchAll('resistor')[0]).toMatchObject({ id: 'experiment:circuit' })
    expect(searchAll('wavelength')[0]).toMatchObject({ id: 'experiment:wave' })
    expect(searchAll('derivative').some((r) => r.id === 'function:sine')).toBe(true)
    expect(searchAll('determinant')[0]).toMatchObject({ id: 'tool:vectors' })
    expect(searchAll('prokaryote')[0]).toMatchObject({ id: 'cell:bacterium' })
  })

  it('matches synonyms and plain plurals', () => {
    expect(searchAll('windpipe')[0]).toMatchObject({ name: 'Trachea' })
    expect(searchAll('ribosomes')[0].name).toBe('Ribosomes')
    expect(searchAll('isotopes')[0]).toMatchObject({ id: 'section:atomic' })
  })

  it('filters by subject and kind, and reproductive structures open their own configuration', () => {
    expect(new Set(searchAll('energy').map((r) => r.subject))).toEqual(new Set(['biology', 'physics']))
    expect(searchAll('energy', { subject: 'physics' }).every((r) => r.subject === 'physics')).toBe(true)
    expect(searchAll('oxygen', { subject: 'chemistry' }).every((r) => r.subject === 'chemistry')).toBe(true)
    expect(searchAll('oxygen', { kind: 'element' }).map((r) => r.name)).toEqual(['Oxygen'])
    expect(searchAll('quasar', { subject: 'physics' })).toEqual([])
    const ovary = searchAll('ovary').find((r) => r.kind === 'structure')!
    expect(ovary.href).toContain('repro=ovarian')
    expect(ovary.description).toContain('ovarian configuration')
  })

  it('groups by subject in app order, then by kind', () => {
    expect(groupResults(searchAll('energy')).map((g) => g.subject)).toEqual(['physics', 'biology'])
    const chem = groupResults(searchAll('carbon')).find((g) => g.subject === 'chemistry')!
    expect(chem.kinds.map((k) => k.kind)).toEqual(expect.arrayContaining(['element', 'molecule']))
  })
})

describe('searchExplorations', () => {
  it('is case-insensitive and matches formulas written with digits or subscripts', () => {
    expect(searchExplorations('WATER')[0].name).toBe('Water')
    expect(searchExplorations('h2o')[0].name).toBe('Water')
    expect(searchExplorations('H₂O')[0].name).toBe('Water')
    expect(searchExplorations('c₂h₆o')[0].name).toBe('Ethanol')
  })

  it('finds structures in different subjects, with the subject attached', () => {
    const golgi = searchExplorations('golgi')[0]
    expect(golgi).toMatchObject({ name: 'Golgi apparatus', subject: 'biology', href: '?structure=golgi&cell=cutaway#/biology' })
    const mitral = searchExplorations('mitral')[0]
    expect(mitral).toMatchObject({ name: 'Mitral valve', subject: 'anatomy', href: '?part=mitral-valve&heart=cutaway#/anatomy' })
    expect(searchExplorations('saddle')[0].subject).toBe('mathematics')
    expect(searchExplorations('trajectory')[0].name).toBe('Projectile motion lab')
    // Definitions follow the explorations.
    expect(searchExplorations('trajectory')[1]).toMatchObject({ name: 'Trajectory', href: '?term=trajectory#/glossary' })
  })

  it('ranks exact and prefix name matches first', () => {
    const results = searchExplorations('aort')
    expect(results[0].name).toBe('Aorta')
    expect(results.map((r) => r.name)).toContain('Aortic valve')
  })

  it('returns nothing for empty or unmatched queries', () => {
    expect(searchExplorations('   ')).toEqual([])
    expect(searchExplorations('quasar')).toEqual([])
  })
})
