import { describe, expect, it } from 'vitest'
import { ATLAS_STRUCTURES, findStructure, getSystem, type Shape, type Vec3 } from '.'
import { CARDIOVASCULAR_ADDITIONS, LYMPHATIC_ADDITIONS } from './structures/circulation'
import { SOURCES } from '../../sources'

const NEW = [...CARDIOVASCULAR_ADDITIONS, ...LYMPHATIC_ADDITIONS]

/* ---------- Geometry: where drawn shapes meet ---------- */

type Probe = { p: Vec3; r: number }
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: Vec3) => Math.sqrt(dot(a, a))

function segmentDistance(p: Vec3, a: Vec3, b: Vec3) {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)))
  return len(sub(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]))
}

/** Points along a shape's centre (sampled densely along tubes) with the shape's radius there. */
function probes(shape: Shape): Probe[] {
  if (shape.kind !== 'tube') return []
  const out: Probe[] = []
  for (let i = 0; i < shape.points.length - 1; i++) {
    const [a, b] = [shape.points[i], shape.points[i + 1]]
    for (let k = 0; k <= 20; k++) out.push({ p: [a[0] + (b[0] - a[0]) * (k / 20), a[1] + (b[1] - a[1]) * (k / 20), a[2] + (b[2] - a[2]) * (k / 20)], r: shape.radius })
  }
  return out
}

/** Whether a sphere touches a shape (rotation of ellipsoids ignored: the margin is small). */
function touches({ p, r }: Probe, shape: Shape): boolean {
  switch (shape.kind) {
    case 'tube':
      return shape.points.slice(1).some((b, i) => segmentDistance(p, shape.points[i], b) < r + shape.radius)
    case 'capsule':
      return segmentDistance(p, shape.from, shape.to) < r + shape.radius
    case 'ellipsoid': {
      const d = sub(p, shape.center)
      // A dome (the diaphragm) is only the upper half.
      if (shape.dome && d[1] < -r) return false
      return (d[0] / (shape.radii[0] + r)) ** 2 + (d[1] / (shape.radii[1] + r)) ** 2 + (d[2] / (shape.radii[2] + r)) ** 2 < 1
    }
    case 'box':
      return false
  }
}

const allProbes = (shapes: readonly Shape[]): Probe[] =>
  shapes.flatMap((sh) => (sh.kind === 'tube' ? probes(sh) : sh.kind === 'ellipsoid' ? [{ p: sh.center, r: Math.min(...sh.radii) }] : []))

/** Organ systems whose drawn shapes are checked for contact (the skin, bones and muscles are context). */
const CHECKED = new Set(['cardiovascular', 'lymphatic', 'respiratory', 'digestive', 'urinary', 'endocrine', 'nervous'])

function contacts(id: string): string[] {
  const s = findStructure(id)!
  const mine = allProbes(s.shapes)
  return ATLAS_STRUCTURES.filter((o) => o.id !== id && CHECKED.has(o.system) && o.shapes.length && mine.some((pr) => o.shapes.some((sh) => touches(pr, sh)))).map((o) => o.id)
}

/**
 * Junctions where several vessels really meet at one point: each venous angle (internal jugular
 * and subclavian veins, the brachiocephalic vein they form, and the lymphatic duct emptying there),
 * the top of the superior vena cava, and the branching of the pulmonary trunk and of the
 * brachiocephalic artery.
 */
const JUNCTIONS = [
  ['internal-jugular-vein-left', 'subclavian-vein-left', 'brachiocephalic-vein-left', 'thoracic-duct'],
  ['internal-jugular-vein-right', 'subclavian-vein-right', 'brachiocephalic-vein-right', 'right-lymphatic-duct'],
  ['brachiocephalic-vein-left', 'brachiocephalic-vein-right', 'superior-vena-cava'],
  ['pulmonary-trunk', 'pulmonary-artery-left', 'pulmonary-artery-right'],
  ['brachiocephalic-trunk', 'subclavian-artery-right', 'common-carotid-artery-right'],
]

const relatedIds = (id: string) => {
  const s = findStructure(id)!
  const out = new Set(s.related?.map((r) => r.id) ?? [])
  for (const j of JUNCTIONS) if (j.includes(id)) for (const other of j) out.add(other)
  // Relations are listed on either side.
  for (const o of ATLAS_STRUCTURES) if (o.related?.some((r) => r.id === id)) out.add(o.id)
  return out
}

describe('cardiovascular and lymphatic additions', () => {
  it('every new structure has an introduction, location, functions, connections, key terms, limitations and real sources', () => {
    for (const s of NEW) {
      expect(s.description.length, s.id).toBeGreaterThan(30)
      expect(s.location?.length, s.id).toBeGreaterThan(10)
      expect(s.function.length, s.id).toBeGreaterThan(20)
      expect(s.related?.length, s.id).toBeGreaterThan(0)
      for (const r of s.related!) expect(findStructure(r.id), `${s.id} → ${r.id}`).toBeDefined()
      expect(s.terms?.length, s.id).toBeGreaterThan(0)
      expect((s.limitations ?? getSystem(s.system).limitation).length, s.id).toBeGreaterThan(20)
      expect(s.sources.length, s.id).toBeGreaterThan(0)
      for (const src of s.sources) expect(SOURCES[src]?.url, src).toMatch(/^https:\/\/openstax\.org\//)
      expect(s.parent && findStructure(s.parent)?.representation, s.id).toBe('container')
    }
  })

  it('new shapes touch only the structures they are anatomically connected to', () => {
    // Checked for the new shapes. (Some older shapes, such as the large liver and lung ellipsoids, overlap neighbours by design.)
    const unexpected = NEW.flatMap((s) => {
      const related = relatedIds(s.id)
      return contacts(s.id)
        .filter((c) => !related.has(c))
        .map((c) => `${s.id} touches ${c}`)
    })
    expect(unexpected).toEqual([])
  })

  it('the connections that matter are drawn as touching', () => {
    const pairs: [string, string][] = [
      ['pulmonary-trunk', 'heart'],
      ['pulmonary-trunk', 'pulmonary-artery-left'],
      ['pulmonary-trunk', 'pulmonary-artery-right'],
      ['pulmonary-artery-left', 'lung-left'],
      ['pulmonary-artery-right', 'lung-right'],
      ['pulmonary-veins', 'heart'],
      ['pulmonary-veins', 'lung-left'],
      ['pulmonary-veins', 'lung-right'],
      ['brachiocephalic-trunk', 'aorta'],
      ['brachiocephalic-trunk', 'subclavian-artery-right'],
      ['brachiocephalic-trunk', 'common-carotid-artery-right'],
      ['subclavian-artery-left', 'aorta'],
      ['subclavian-vein-left', 'internal-jugular-vein-left'],
      ['brachiocephalic-vein-left', 'superior-vena-cava'],
      ['brachiocephalic-vein-right', 'superior-vena-cava'],
      ['hepatic-portal-vein', 'liver'],
      ['thoracic-duct', 'cisterna-chyli'],
      ['thoracic-duct', 'subclavian-vein-left'],
      ['right-lymphatic-duct', 'subclavian-vein-right'],
      ['lymphatic-vessels', 'lymph-nodes'],
    ]
    for (const [a, b] of pairs) expect(contacts(a), `${a} touches ${b}`).toContain(b)
  })

  it('the thoracic duct reaches the left venous angle and the right lymphatic duct the right one', () => {
    const end = (id: string) => {
      const sh = findStructure(id)!.shapes[0]
      return sh.kind === 'tube' ? sh.points[sh.points.length - 1] : null
    }
    expect(end('thoracic-duct')![0]).toBeGreaterThan(0)
    expect(end('right-lymphatic-duct')![0]).toBeLessThan(0)
  })

  it('keeps every existing structure id (links stay valid)', () => {
    for (const id of ['heart', 'aorta', 'superior-vena-cava', 'internal-jugular-vein-left', 'thoracic-duct', 'lymph-nodes', 'thymus', 'spleen', 'tonsils', 'common-carotid-artery-right']) expect(findStructure(id), id).toBeDefined()
  })
})
