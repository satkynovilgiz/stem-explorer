import { describe, expect, it } from 'vitest'
import { SOURCES } from '../../sources'
import { findStructure } from '.'
import { pathOf, TOURS } from './tours'

describe('atlas tours', () => {
  it('reference real structures and registered sources; paths are finite', () => {
    for (const t of TOURS) {
      expect(t.steps.length).toBeGreaterThan(2)
      expect(t.conceptualNote).toMatch(/[Cc]onceptual/)
      for (const s of t.steps) {
        expect(s.focus.length, `${t.id}/${s.id}`).toBeGreaterThan(0)
        for (const id of s.focus) expect(findStructure(id), `${t.id}/${s.id}: ${id}`).toBeDefined()
        for (const src of s.sources) expect(SOURCES[src], `${t.id}/${s.id}: ${src}`).toBeDefined()
        if (s.path) {
          expect(s.path.length, `${t.id}/${s.id} path`).toBeGreaterThan(1)
          for (const p of s.path) for (const v of p) expect(Number.isFinite(v)).toBe(true)
        }
        if (s.kind === 'process') expect(s.path).toBeUndefined()
      }
    }
  })

  it('the food tour separates the food’s route from accessory-organ contributions', () => {
    const food = TOURS.find((t) => t.id === 'food')!
    const route = food.steps.filter((s) => s.kind === 'route').flatMap((s) => s.focus)
    const contributions = food.steps.filter((s) => s.kind === 'contribution').flatMap((s) => s.focus)
    expect(contributions.sort()).toEqual(['bile-ducts', 'gallbladder', 'liver', 'pancreas'])
    for (const id of contributions) expect(route).not.toContain(id)
    expect(route).toEqual(expect.arrayContaining(['oral-cavity', 'esophagus', 'stomach', 'duodenum', 'jejunum-ileum', 'large-intestine']))
    // Contributions enter at the duodenum, after the stomach and before the jejunum.
    const ids = food.steps.map((s) => s.id)
    expect(ids.indexOf('bile')).toBeGreaterThan(ids.indexOf('duodenum'))
    expect(ids.indexOf('pancreas')).toBeLessThan(ids.indexOf('jejunum-ileum'))
  })

  it('the airflow tour follows the conducting zone in order and links to the gas-exchange view', () => {
    const air = TOURS.find((t) => t.id === 'airflow')!
    expect(air.steps.slice(0, 5).map((s) => s.focus[0])).toEqual(['nasal-cavity', 'pharynx', 'larynx', 'trachea', 'primary-bronchus-left'])
    expect(air.steps.find((s) => s.id === 'alveoli')!.detail).toBe('alveolus')
    // Air moves down the trachea (decreasing height) on the way in.
    const p = air.steps.find((s) => s.id === 'trachea')!.path!
    expect(p[p.length - 1][1]).toBeLessThan(p[0][1])
  })

  it('the nerve tour labels every step as central or peripheral', () => {
    const sig = TOURS.find((t) => t.id === 'signal')!
    for (const s of sig.steps) expect(s.division, s.id).toBeDefined()
    expect(sig.steps.filter((s) => s.division === 'CNS').map((s) => s.id)).toEqual(['up', 'integrate', 'down'])
  })

  it('the circulation tour descends the aorta and returns by the venae cavae, linking to the heart module', () => {
    const c = TOURS.find((t) => t.id === 'circulation')!
    const down = c.steps.find((s) => s.id === 'down')!.path!
    expect(down[down.length - 1][1]).toBeLessThan(down[0][1])
    const back = c.steps.find((s) => s.id === 'return')!.path!
    expect(back[back.length - 1][1]).toBeGreaterThan(back[0][1])
    expect(c.steps.some((s) => s.detail === 'heart')).toBe(true)
  })

  it('pathOf reads tube centre-lines', () => {
    expect(pathOf('trachea').length).toBeGreaterThan(1)
    expect(pathOf('nope')).toEqual([])
  })
})
