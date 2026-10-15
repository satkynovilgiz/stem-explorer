import { describe, expect, it } from 'vitest'
import { BIOLOGY_SOURCES, INSTANCE_COUNTS, ORGANELLES } from './organelles'
import { ORGANELLE_IDS } from './types'

describe('organelle content', () => {
  it('covers exactly the required structures, in a stable order with unique IDs', () => {
    expect(ORGANELLES.map((o) => o.id)).toEqual([...ORGANELLE_IDS])
    expect(new Set(ORGANELLES.map((o) => o.id)).size).toBe(ORGANELLES.length)
  })

  it('uses URL-safe IDs', () => {
    for (const o of ORGANELLES) expect(o.id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  describe.each(ORGANELLES.map((o) => [o.name, o] as const))('%s', (_, o) => {
    it('has every required content field', () => {
      expect(o.name.trim()).not.toBe('')
      expect(o.summary.length).toBeGreaterThan(30)
      expect(o.functions.length).toBeGreaterThan(0)
      expect(o.structure.length).toBeGreaterThan(30)
      expect(o.simplifications.length).toBeGreaterThan(0)
    })

    it('cites only known sources, with https URLs', () => {
      expect(o.sourceIds.length).toBeGreaterThan(0)
      for (const id of o.sourceIds) {
        expect(BIOLOGY_SOURCES[id], id).toBeDefined()
        expect(BIOLOGY_SOURCES[id].url).toMatch(/^https:\/\//)
      }
    })

    it('relates only to other existing structures', () => {
      for (const r of o.relationships) {
        expect(ORGANELLE_IDS).toContain(r.targetId)
        expect(r.targetId).not.toBe(o.id)
      }
    })
  })

  it('distinguishes cytoplasm from cytosol', () => {
    const cytoplasm = ORGANELLES.find((o) => o.id === 'cytoplasm')!
    expect(cytoplasm.structure).toMatch(/cytosol/i)
    expect(cytoplasm.glossary.some((g) => g.term === 'Cytosol')).toBe(true)
  })

  it('does not claim that all proteins pass through the Golgi apparatus', () => {
    const golgi = ORGANELLES.find((o) => o.id === 'golgi')!
    const text = [golgi.summary, ...golgi.functions, golgi.structure, ...golgi.relationships.map((r) => r.text)].join(' ')
    expect(text).not.toMatch(/all proteins/i)
    expect(text).toMatch(/not every protein/i)
  })

  it('gives instance counts only for structures with repeated, individually selectable copies', () => {
    for (const [id, count] of Object.entries(INSTANCE_COUNTS)) {
      const organelle = ORGANELLES.find((o) => o.id === id)!
      expect(organelle.instanceName, id).toBeDefined()
      expect(count).toBeGreaterThan(1)
    }
  })
})
