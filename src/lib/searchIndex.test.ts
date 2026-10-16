import { describe, expect, it } from 'vitest'
import { canonicalize } from './explorations'
import { SEARCH_INDEX, searchExplorations } from './searchIndex'

const parse = (href: string) => {
  const [query, hash] = href.split('#/')
  return { subject: hash, params: Object.fromEntries(new URLSearchParams(query.replace(/^\?/, ''))) }
}

describe('search index', () => {
  it('covers all subjects and the content of every explorer', () => {
    const count = (prefix: string) => SEARCH_INDEX.filter((i) => i.id.startsWith(prefix)).length
    expect(count('subject:')).toBe(5)
    expect(count('molecule:')).toBe(6)
    expect(count('organelle:')).toBe(10)
    expect(count('heart:')).toBe(14)
    expect(count('surface:')).toBe(4)
    expect(count('experiment:')).toBe(1)
  })

  it('links only to valid, relative routes', () => {
    for (const item of SEARCH_INDEX) {
      expect(item.href).toMatch(/^(\?[^#]*)?#\/[a-z]+$/)
      const { subject, params } = parse(item.href)
      expect(canonicalize(subject, params), item.href).not.toBeNull()
    }
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
