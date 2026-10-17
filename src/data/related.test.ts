import { describe, expect, it } from 'vitest'
import { findSearchItem } from '../lib/searchIndex'
import { relatedForLocation, topicsForLocation } from '../lib/relatedTopics'
import { RELATIONS } from './related'
import { SOURCES } from './sources'

describe('cross-subject relations', () => {
  it('connect real search items across different subjects, each cited and with limits', () => {
    for (const r of RELATIONS) {
      const [a, b] = r.between.map((side) => side.map((id) => findSearchItem(id)))
      for (const item of [...a, ...b]) expect(item, r.id).toBeDefined()
      const subjects = (side: typeof a) => new Set(side.map((i) => i!.subject))
      // Every relation crosses subjects: no subject appears on both sides.
      for (const s of subjects(a)) expect(subjects(b).has(s), r.id).toBe(false)
      expect(r.sources.length, r.id).toBeGreaterThan(0)
      for (const s of r.sources) expect(SOURCES[s], `${r.id}: ${s}`).toBeDefined()
      expect(r.text.length).toBeGreaterThan(40)
      expect(r.limits.length).toBeGreaterThan(20)
    }
    expect(new Set(RELATIONS.map((r) => r.id)).size).toBe(RELATIONS.length)
  })

  it('labels the circulation–circuit link as an analogy and states where it fails', () => {
    const r = RELATIONS.find((x) => x.id === 'circuit-blood-flow')!
    expect(r.kind).toBe('analogy')
    expect(r.limits).toMatch(/not an electric current/)
  })

  it('reads the current topics from explorer URLs', () => {
    expect(topicsForLocation('physics', '?experiment=wave')).toEqual(['experiment:wave'])
    expect(topicsForLocation('physics', '')).toEqual(['experiment:projectile'])
    expect(topicsForLocation('mathematics', '?msec=functions&fn=cosine')).toEqual(['function:cosine'])
    expect(topicsForLocation('biology', '?bsec=energy')).toContain('process:respiration')
    expect(topicsForLocation('anatomy', '?atlas=lung-left&bview=front')).toContain('structure:lung-left')
    expect(topicsForLocation('home', '?q=x')).toEqual([])
  })

  it('resolves both directions', () => {
    expect(relatedForLocation('physics', '?experiment=wave')[0].others.map((o) => o.id)).toEqual(['function:sine'])
    expect(relatedForLocation('mathematics', '?msec=functions&fn=sine')[0].others.map((o) => o.id)).toEqual(['experiment:wave'])
    const lung = relatedForLocation('anatomy', '?atlas=lung-right')
    expect(lung.map((r) => r.relation.id)).toEqual(['gas-exchange', 'cells-gas-exchange'])
    expect(relatedForLocation('chemistry', '?molecule=benzene')).toEqual([])
  })
})
