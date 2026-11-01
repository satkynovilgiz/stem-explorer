import { describe, expect, it } from 'vitest'
import manifest from '../../../reference/generated/manifest.json'
import type { ManifestRow } from '../../../reference/types'
import { canonicalize } from '../../../lib/explorations'
import { baseItems, CHEM_GROUPS, referenceItems, searchChem } from './chemIndex'

const items = [...baseItems(), ...referenceItems(manifest as ManifestRow[])]
const top = (q: string) => searchChem(items, q)[0]

describe('chemistry search', () => {
  it('finds molecules by formula however it is typed', () => {
    for (const q of ['H2O', 'h2o', 'H₂O', 'water']) expect(top(q)?.id, q).toMatch(/water/)
    for (const q of ['CO2', 'CO₂', 'carbon dioxide']) expect(top(q)?.id, q).toBe('molecule:carbon-dioxide')
    for (const q of ['ethanol', 'C2H6O', 'C2H5OH']) expect(top(q)?.id, q).toBe('molecule:ethanol')
  })

  it('matches synonyms and student questions to the right tool', () => {
    expect(top('molarity')?.id).toBe('calc:molarity')
    expect(searchChem(items, 'concentration').map((i) => i.id)).toContain('calc:molarity')
    expect(top('how do I calculate a dilution')?.id).toBe('calc:dilution')
    for (const q of ['C1V1=C2V2', 'c1 v1 = c2 v2', 'C₁V₁ = C₂V₂']) expect(searchChem(items, q).map((i) => i.id), q).toContain('calc:dilution')
    expect(top('balance')?.id).toBe('calc:balance')
    expect(top('Fe')?.id).toBe('element:26')
  })

  it('labels every item as Topic, Formula, Molecule or Calculator, with a sentence and a link that opens', () => {
    for (const i of items) {
      expect(['Topic', 'Formula', 'Molecule', 'Calculator']).toContain(i.label)
      expect(i.sentence.length, i.id).toBeGreaterThan(10)
      const url = new URL(i.href, 'https://x.test/')
      const route = url.hash.replace(/^#\//, '').split('/')[0]
      if (route === 'glossary' || route === 'reference') continue
      expect(canonicalize(route, Object.fromEntries(url.searchParams)), i.href).not.toBeNull()
    }
  })

  it('every group shown on the Chemistry home page has real items', () => {
    const groups = new Set(items.map((i) => i.group))
    for (const g of CHEM_GROUPS) if (groups.has(g.id)) expect(items.filter((i) => i.group === g.id).length).toBeGreaterThan(0)
  })
})
