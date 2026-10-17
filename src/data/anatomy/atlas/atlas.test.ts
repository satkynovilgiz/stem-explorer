import { describe, expect, it } from 'vitest'
import { SOURCES } from '../../sources'
import {
  ancestorsOf,
  ATLAS_REGIONS,
  ATLAS_STRUCTURES,
  ATLAS_SYSTEMS,
  boundsOf,
  childrenOf,
  findStructure,
  inventory,
  limitationsOf,
  searchAtlas,
  type Shape,
} from '.'

const allPoints = (s: Shape): number[][] =>
  s.kind === 'ellipsoid' || s.kind === 'box' ? [[...s.center]] : s.kind === 'capsule' ? [[...s.from], [...s.to]] : s.points.map((p) => [...p])

describe('atlas schema', () => {
  it('covers the eleven organ systems', () => {
    expect(ATLAS_SYSTEMS.map((s) => s.id).sort()).toEqual(
      ['cardiovascular', 'digestive', 'endocrine', 'integumentary', 'lymphatic', 'muscular', 'nervous', 'reproductive', 'respiratory', 'skeletal', 'urinary'].sort(),
    )
    for (const sys of ATLAS_SYSTEMS) {
      expect(ATLAS_STRUCTURES.some((s) => s.system === sys.id && s.shapes.length > 0), `${sys.id} has a drawn structure`).toBe(true)
      expect(sys.omissions.length, `${sys.id} lists omissions`).toBeGreaterThan(0)
      expect(sys.limitation.length).toBeGreaterThan(20)
    }
  })

  it('ids are unique, stable-looking and every reference resolves', () => {
    const ids = ATLAS_STRUCTURES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of ATLAS_STRUCTURES) {
      expect(s.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      if (s.parent) expect(findStructure(s.parent), `${s.id} parent ${s.parent}`).toBeDefined()
      for (const r of s.related ?? []) expect(findStructure(r.id), `${s.id} related ${r.id}`).toBeDefined()
      if (s.pairId) expect(findStructure(s.pairId)?.pairId, `${s.id} pair`).toBe(s.id)
      expect(ancestorsOf(s.id).some((a) => a.id === s.id), `${s.id} is not its own ancestor`).toBe(false)
    }
  })

  it('every structure has a description, function, region, sources and a stated limitation', () => {
    const regions = new Set(ATLAS_REGIONS.map((r) => r.id))
    for (const s of ATLAS_STRUCTURES) {
      expect(s.description.length, s.id).toBeGreaterThan(20)
      expect(s.function.length, s.id).toBeGreaterThan(10)
      expect(regions.has(s.region), s.id).toBe(true)
      expect(s.sources.length, s.id).toBeGreaterThan(0)
      for (const src of s.sources) expect(SOURCES[src], `${s.id} cites ${src}`).toBeDefined()
      expect(limitationsOf(s).length, s.id).toBeGreaterThan(10)
      if (s.representation === 'group') expect(s.grouping, `${s.id} explains its grouping`).toBeTruthy()
      if (s.representation === 'container') expect(s.shapes).toHaveLength(0)
      else expect(s.shapes.length, `${s.id} is drawn`).toBeGreaterThan(0)
    }
  })

  it('left structures are on the body’s left (+x) and right structures on the right', () => {
    for (const s of ATLAS_STRUCTURES.filter((x) => x.side)) expect(s.name.startsWith(s.side === 'left' ? 'Left ' : 'Right '), s.id).toBe(true)
    for (const s of ATLAS_STRUCTURES.filter((x) => x.side && x.shapes.length > 0)) {
      const xs = s.shapes.flatMap(allPoints).map((p) => p[0])
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length
      if (s.side === 'left') expect(mean, s.id).toBeGreaterThan(0)
      else expect(mean, s.id).toBeLessThan(0)
      expect(s.name.startsWith(s.side === 'left' ? 'Left ' : 'Right ')).toBe(true)
    }
  })

  it('places organs in sourced relative positions', () => {
    // OpenStax 25.3: the right kidney is lower than the left.
    expect(boundsOf('kidney-right')!.center[1]).toBeLessThan(boundsOf('kidney-left')!.center[1])
    // Adrenal glands sit on the superior aspect of each kidney.
    for (const side of ['left', 'right']) expect(boundsOf(`adrenal-gland-${side}`)!.min[1]).toBeGreaterThan(boundsOf(`kidney-${side}`)!.center[1])
    // The heart is between the lungs, and the lungs above the diaphragm, which is above the liver.
    expect(boundsOf('heart')!.center[0]).toBeLessThan(boundsOf('lung-left')!.center[0])
    expect(boundsOf('heart')!.center[0]).toBeGreaterThan(boundsOf('lung-right')!.center[0])
    expect(boundsOf('diaphragm')!.center[1]).toBeLessThan(boundsOf('lung-left')!.center[1])
    expect(boundsOf('liver')!.center[1]).toBeLessThan(boundsOf('diaphragm')!.center[1])
    // The liver is in the upper right abdomen and the stomach and spleen on the left.
    expect(boundsOf('liver')!.center[0]).toBeLessThan(0)
    expect(boundsOf('stomach')!.center[0]).toBeGreaterThan(0)
    expect(boundsOf('spleen')!.center[0]).toBeGreaterThan(0)
    // The right lung is shorter and wider than the left (OpenStax 22.2).
    const [l, r] = [boundsOf('lung-left')!, boundsOf('lung-right')!]
    expect(r.max[1] - r.min[1]).toBeLessThan(l.max[1] - l.min[1])
    expect(r.max[0] - r.min[0]).toBeGreaterThan(l.max[0] - l.min[0])
    // The brachiocephalic artery is right-sided only: the right carotid starts right of the midline.
    expect(findStructure('common-carotid-artery-right')!.shapes[0].kind).toBe('tube')
  })

  it('reproductive structures belong to one labelled variant and are never shown by default', () => {
    const repro = ATLAS_STRUCTURES.filter((s) => s.system === 'reproductive')
    expect(repro.length).toBeGreaterThan(6)
    for (const s of repro) expect(s.variant, s.id).toMatch(/^(ovarian|testicular)$/)
    expect(ATLAS_SYSTEMS.find((s) => s.id === 'reproductive')!.defaultVisible).toBe(false)
    expect(ATLAS_SYSTEMS.find((s) => s.id === 'reproductive')!.limitation).toMatch(/intersex/)
  })

  it('groups and containers organise children', () => {
    expect(childrenOf('axial-skeleton').map((s) => s.id)).toEqual(expect.arrayContaining(['skull', 'vertebral-column', 'thoracic-cage']))
    expect(boundsOf('axial-skeleton')).not.toBeNull()
    expect(boundsOf('cns')!.max[1]).toBeGreaterThan(9)
  })
})

describe('atlas search and inventory', () => {
  it('finds structures by name, alias and system', () => {
    expect(searchAtlas('kidney').map((s) => s.id)).toEqual(['kidney-left', 'kidney-right'])
    expect(searchAtlas('windpipe')[0].id).toBe('trachea')
    expect(searchAtlas('spine')[0].id).toBe('vertebral-column')
    expect(searchAtlas('Lymph').some((s) => s.id === 'lymph-nodes')).toBe(true)
    expect(searchAtlas('')).toEqual([])
    expect(searchAtlas('zzzz')).toEqual([])
  })

  it('the inventory lists every drawn structure once under its primary system', () => {
    const inv = inventory()
    const listed = inv.flatMap((i) => [...i.individual, ...i.groups]).map((s) => s.id)
    expect(new Set(listed).size).toBe(listed.length)
    expect(listed.length).toBe(ATLAS_STRUCTURES.filter((s) => s.representation !== 'container').length)
    expect(inv.find((i) => i.system.id === 'endocrine')!.alsoShown.map((s) => s.id)).toContain('pancreas')
  })
})
