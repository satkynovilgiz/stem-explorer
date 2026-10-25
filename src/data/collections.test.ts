import { describe, expect, it } from 'vitest'
import { CURATED_COLLECTIONS } from './collections'
import { SOURCES } from './sources'
import { canonicalize } from '../lib/explorations'

describe('curated collections', () => {
  it('has the four starter paths with unique ids', () => {
    expect(CURATED_COLLECTIONS.map((c) => c.title)).toEqual(['How breathing works', 'From DNA to inheritance', 'Waves, sine functions, and probability', 'Reaction quantities and conservation'])
    expect(new Set(CURATED_COLLECTIONS.map((c) => c.id)).size).toBe(CURATED_COLLECTIONS.length)
  })

  it('every step opens a real, already-canonical view', () => {
    for (const c of CURATED_COLLECTIONS) {
      for (const s of c.steps) {
        const state = canonicalize(s.subject, s.params)
        expect(state, `${c.id}: ${s.title}`).not.toBeNull()
        expect(state!.params, `${c.id}: ${s.title}`).toEqual(s.params)
        expect(s.prompt.length).toBeGreaterThan(10)
      }
    }
  })

  it('every connection states its limits and cites registered sources', () => {
    for (const c of CURATED_COLLECTIONS) {
      expect(c.connections.length).toBeGreaterThan(0)
      expect(c.limitations.length).toBeGreaterThan(20)
      for (const k of c.connections) {
        expect(k.limits.length).toBeGreaterThan(10)
        expect(k.sources.length).toBeGreaterThan(0)
        for (const id of k.sources) expect(SOURCES[id], id).toBeDefined()
      }
    }
  })

  it('makes no completion or progress claims', () => {
    const text = JSON.stringify(CURATED_COLLECTIONS).toLowerCase()
    for (const w of ['progress', 'mastered', 'completed', '% done', 'score', 'streak']) expect(text).not.toContain(w)
  })
})
