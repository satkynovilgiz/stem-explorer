import { describe, expect, it } from 'vitest'
import manifest from '../../../reference/generated/manifest.json'
import { modulesOf } from '../../../data/topics'
import type { ManifestRow } from '../../../reference/types'
import { baseItems, referenceItems } from './chemIndex'
import { CHEM_DESTINATIONS, CHEM_PAGE_TITLES, CHEM_SEARCH_EXAMPLES, destinationOf } from './chemDestinations'
import { resultId, searchTopics } from './topicSearch'
import { CHEM_QUESTIONS } from './questions'

const items = [...baseItems(), ...referenceItems(manifest as ManifestRow[])]

describe('Chemistry destinations', () => {
  it('every Chemistry page belongs to one destination and has a title, except the Overview', () => {
    for (const m of modulesOf('chemistry')) {
      if (m.id === 'chemistry.topics') continue
      expect(destinationOf(m.id), m.id).toBeDefined()
      expect(CHEM_PAGE_TITLES[m.id], m.id).toBeTruthy()
    }
  })

  it('no page is listed under two destinations', () => {
    const all = CHEM_DESTINATIONS.flatMap((d) => d.modules)
    expect(new Set(all).size).toBe(all.length)
  })

  it('every listed reading page is a real explanation', () => {
    const ids = new Set(items.map((i) => i.id))
    for (const d of CHEM_DESTINATIONS) for (const p of d.pages) {
      const lt = new URL(p.href, 'https://x.test/').searchParams.get('lt')
      if (lt) expect(ids.has(`ref:${lt}`), p.href).toBe(true)
    }
  })

  it('the example searches find the topic they suggest', () => {
    const top = CHEM_SEARCH_EXAMPLES.map((q) => resultId(searchTopics(items, q)[0]))
    expect(top).toEqual(['topic:molarity', 'topic:balancing', 'topic:water'])
  })

  it('common questions all have an answer', () => {
    expect(CHEM_QUESTIONS.filter((q) => q.available(items))).toHaveLength(CHEM_QUESTIONS.length)
  })
})
