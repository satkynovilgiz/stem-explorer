import { BODY_STRUCTURES } from './structures/body'
import { MUSCLES } from './structures/muscles'
import { SKELETON } from './structures/skeleton'
import { ORGAN_STRUCTURES } from './structures/organs'
import { REPRODUCTIVE } from './structures/reproductive'
import { ATLAS_SYSTEMS, getSystem } from './systems'
import type { AtlasStructure, ReproductiveVariant, Shape, SystemId, Vec3 } from './types'

export * from './types'
export { ATLAS_REGIONS, ATLAS_SYSTEMS, getRegion, getSystem, REGION_IDS, SYSTEM_IDS } from './systems'

export const ATLAS_STRUCTURES: readonly AtlasStructure[] = [...BODY_STRUCTURES, ...SKELETON, ...MUSCLES, ...ORGAN_STRUCTURES, ...REPRODUCTIVE]

const BY_ID = new Map(ATLAS_STRUCTURES.map((s) => [s.id, s]))
export const ATLAS_IDS = ATLAS_STRUCTURES.map((s) => s.id)
export const findStructure = (id: string): AtlasStructure | undefined => BY_ID.get(id)

export const childrenOf = (id: string) => ATLAS_STRUCTURES.filter((s) => s.parent === id)
export const inSystem = (s: AtlasStructure, system: SystemId) => s.system === system || (s.alsoIn?.includes(system) ?? false)
export const limitationsOf = (s: AtlasStructure) => s.limitations ?? getSystem(s.system).limitation

/** Whether a structure is part of the current display (reproductive structures need a variant). */
export const shownWithVariant = (s: AtlasStructure, variant: ReproductiveVariant | null) => !s.variant || s.variant === variant

/** Ancestors from the root down to the direct parent. */
export function ancestorsOf(id: string): AtlasStructure[] {
  const out: AtlasStructure[] = []
  let p = findStructure(id)?.parent
  while (p) {
    const s = findStructure(p)
    if (!s) break
    out.unshift(s)
    p = s.parent
  }
  return out
}

/** All descendants (children, grandchildren…), used to select or isolate a group's members. */
export function descendantsOf(id: string): AtlasStructure[] {
  return childrenOf(id).flatMap((c) => [c, ...descendantsOf(c.id)])
}

/** Points that bound a shape (box corners, capsule ends ± radius, tube points ± radius). */
function shapeExtents(s: Shape): Vec3[] {
  const grow = (c: Vec3, r: Vec3): Vec3[] => [
    [c[0] - r[0], c[1] - r[1], c[2] - r[2]],
    [c[0] + r[0], c[1] + r[1], c[2] + r[2]],
  ]
  switch (s.kind) {
    case 'ellipsoid':
      // Rotation can only move points within the largest radius.
      return s.rotation ? grow(s.center, Array(3).fill(Math.max(...s.radii)) as unknown as Vec3) : grow(s.center, s.radii)
    case 'box': {
      const h = s.size.map((v) => v / 2) as unknown as Vec3
      return s.rotation ? grow(s.center, Array(3).fill(Math.hypot(...h)) as unknown as Vec3) : grow(s.center, h)
    }
    case 'capsule':
      return [...grow(s.from, [s.radius, s.radius, s.radius]), ...grow(s.to, [s.radius, s.radius, s.radius])]
    case 'tube':
      return s.points.flatMap((p) => grow(p, [s.radius, s.radius, s.radius]))
  }
}

export interface Bounds {
  min: Vec3
  max: Vec3
  center: Vec3
  /** Largest side length. */
  size: number
}

/** Axis-aligned bounds of a structure, including its descendants' shapes; null when nothing is drawn. */
export function boundsOf(id: string): Bounds | null {
  const s = findStructure(id)
  if (!s) return null
  const pts = [s, ...descendantsOf(id)].flatMap((x) => x.shapes.flatMap(shapeExtents))
  if (pts.length === 0) return null
  const min = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i]))) as unknown as Vec3
  const max = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i]))) as unknown as Vec3
  return {
    min,
    max,
    center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    size: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]),
  }
}

const normalise = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Local atlas search over names, aliases and system names; exact and prefix matches first. */
export function searchAtlas(query: string, variant: ReproductiveVariant | null = null): AtlasStructure[] {
  const q = normalise(query)
  if (!q) return []
  const scored: { s: AtlasStructure; score: number }[] = []
  for (const s of ATLAS_STRUCTURES) {
    const names = [s.name, ...(s.aliases ?? [])].map(normalise)
    let score = -1
    if (names.some((n) => n === q)) score = 0
    else if (names.some((n) => n.startsWith(q) || n.split(' ').some((w) => w.startsWith(q)))) score = 1
    else if (names.some((n) => n.includes(q))) score = 2
    else if (normalise(getSystem(s.system).name).startsWith(q)) score = 3
    if (score >= 0) scored.push({ s, score: score + (shownWithVariant(s, variant) ? 0 : 0.5) })
  }
  return scored.sort((a, b) => a.score - b.score || a.s.name.localeCompare(b.s.name)).map((x) => x.s)
}

/** Counts for the "What is included" inventory. */
export function inventory() {
  return ATLAS_SYSTEMS.map((sys) => {
    const members = ATLAS_STRUCTURES.filter((s) => s.system === sys.id && s.representation !== 'container')
    return {
      system: sys,
      individual: members.filter((s) => s.representation === 'individual'),
      groups: members.filter((s) => s.representation === 'group'),
      alsoShown: ATLAS_STRUCTURES.filter((s) => s.alsoIn?.includes(sys.id)),
    }
  })
}
