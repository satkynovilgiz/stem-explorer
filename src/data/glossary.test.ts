import { describe, expect, it } from 'vitest'
import { canonicalize } from '../lib/explorations'
import { ORGANELLES } from './biology/organelles'
import { GLOSSARY, slug } from './glossary'
import { GUIDES } from './guides'
import { SOURCES } from './sources'
import { SUBJECTS } from './subjects'

const ids = new Set(GLOSSARY.map((g) => g.id))

describe('glossary', () => {
  it('has unique ids and one definition per term', () => {
    expect(ids.size).toBe(GLOSSARY.length)
    const terms = GLOSSARY.map((g) => g.term.toLowerCase())
    expect(new Set(terms).size).toBe(terms.length)
  })

  it('has no conflicting copies: a biology term used by several structures has one definition', () => {
    const seen = new Map<string, string>()
    for (const o of ORGANELLES) {
      for (const g of o.glossary) {
        const prev = seen.get(slug(g.term))
        if (prev !== undefined) expect(g.definition, g.term).toBe(prev)
        seen.set(slug(g.term), g.definition)
      }
    }
    // Every structure term reaches the glossary page.
    for (const key of seen.keys()) expect(ids.has(key), key).toBe(true)
  })

  it('cites known sources, unless marked as an app convention or unit', () => {
    for (const g of GLOSSARY) {
      for (const s of g.sourceIds) expect(SOURCES[s], `${g.id}: ${s}`).toBeDefined()
      if (g.sourceIds.length === 0) expect(g.kind, g.id).toBeDefined()
    }
  })

  it('links only to valid relative exploration routes', () => {
    for (const g of GLOSSARY) {
      for (const l of g.links) {
        expect(l.href, g.id).toMatch(/^(\?[^#]*)?#\/[a-z]+$/)
        const [query, subject] = l.href.split('#/')
        expect(canonicalize(subject, Object.fromEntries(new URLSearchParams(query.replace(/^\?/, '')))), l.href).not.toBeNull()
      }
    }
  })
})

describe('subject guides', () => {
  it('cover every subject with every section', () => {
    for (const { id } of SUBJECTS) {
      const g = GUIDES[id]
      expect(g.subject).toBe(id)
      expect(g.summary.length).toBeGreaterThan(40)
      expect(g.deeper.length).toBeGreaterThan(0)
      expect(g.keyTerms.length).toBeGreaterThan(0)
      expect(g.relations.length).toBeGreaterThan(0)
      expect(g.misconceptions.length).toBeGreaterThan(0)
      expect(g.simplifications.length).toBeGreaterThan(0)
      expect(Object.values(g.modelKinds).flat().length).toBeGreaterThan(0)
    }
  })

  it('reference existing glossary terms and sources; explanations are always cited', () => {
    for (const g of Object.values(GUIDES)) {
      for (const t of g.keyTerms) expect(ids.has(t), `${g.subject}: ${t}`).toBe(true)
      const cited = [...g.deeper, ...g.relations, ...g.misconceptions]
      for (const c of cited) for (const s of c.sourceIds) expect(SOURCES[s], `${g.subject}: ${s}`).toBeDefined()
      for (const d of g.deeper) expect(d.sourceIds.length, d.text).toBeGreaterThan(0)
    }
  })

  it('every equation symbol table entry has a unit (or says none)', () => {
    for (const g of Object.values(GUIDES)) for (const s of g.symbols) expect(s.unit.length, s.symbol).toBeGreaterThan(0)
  })
})
