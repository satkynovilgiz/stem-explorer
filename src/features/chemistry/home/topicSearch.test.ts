import { describe, expect, it } from 'vitest'
import manifest from '../../../reference/generated/manifest.json'
import type { ManifestRow } from '../../../reference/types'
import { baseItems, referenceItems } from './chemIndex'
import { SEARCH_EXPECTATIONS } from './searchExpectations'
import { resultId, searchTopics, TOPICS } from './topicSearch'

const items = [...baseItems(), ...referenceItems(manifest as ManifestRow[])]

describe('chemistry search relevance (expectations written before the ranking)', () => {
  for (const x of SEARCH_EXPECTATIONS) {
    it(`“${x.query}”`, () => {
      const ids = searchTopics(items, x.query).map(resultId)
      expect(ids[0], ids.slice(0, 5).join(', ')).toBe(x.top)
      for (const id of x.includes ?? []) expect(ids.slice(0, 5)).toContain(id)
      for (const id of x.excludes ?? []) expect(ids.slice(0, 5)).not.toContain(id)
    })
  }

  it('mole and molecule are different words', () => {
    const ids = searchTopics(items, 'molecule').map(resultId)
    expect(ids).not.toContain('topic:mole')
    expect(ids.slice(0, 3)).toContain('section:molecules')
  })

  it('topic members are not listed again as separate results', () => {
    const ids = searchTopics(items, 'molarity').map(resultId)
    expect(ids).not.toContain('ref:molarity')
    expect(ids).not.toContain('calc:molarity')
  })

  it('every topic action points at a real destination', () => {
    const byId = new Set(items.map((i) => i.id))
    for (const t of TOPICS) {
      for (const m of t.members) expect(byId.has(m), `${t.id} member ${m}`).toBe(true)
      expect(t.actions.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('element symbols, formulas and empty queries', () => {
    expect(resultId(searchTopics(items, 'Fe')[0])).toBe('element:26')
    expect(resultId(searchTopics(items, 'C2H6O')[0])).toBe('molecule:ethanol')
    expect(searchTopics(items, '   ')).toEqual([])
    expect(searchTopics(items, 'what is a')).toEqual([])
  })
})
