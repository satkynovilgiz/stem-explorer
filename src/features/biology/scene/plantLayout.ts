import type { OrganelleId } from '../../../data/biology/types'
import type { FocusTarget, InstancePlacement, V3 } from './layout'

/*
 * Deterministic, schematic placement for the plant-cell model. A box-shaped cell (wall outside,
 * membrane just inside), a large central vacuole, and the other structures squeezed into the
 * cytoplasm around it. Arbitrary scene units; nothing is to scale.
 */

/** Outer half-extents of the cell wall (x, y, z) and its thickness. */
export const WALL = { half: [5.6, 3.8, 3.4] as V3, thickness: 0.35 }
/** Plasma membrane half-extents: just inside the wall. */
export const MEMBRANE = {
  half: [WALL.half[0] - WALL.thickness - 0.08, WALL.half[1] - WALL.thickness - 0.08, WALL.half[2] - WALL.thickness - 0.08] as V3,
  thickness: 0.06,
}
/** Radius used to frame the whole cell with the camera. */
export const PLANT_CELL_RADIUS = 6.6

export const VACUOLE = { center: [0.7, -0.2, -0.4] as V3, radii: [3.3, 2.5, 2.2] as V3 }
export const PLANT_NUCLEUS = { center: [-3.9, 1.6, 0.6] as V3, radius: 1.15 }
export const PLANT_NUCLEOLUS = { center: [-3.75, 1.5, 0.85] as V3, radius: 0.42 }

export const PLANT_ROUGH_ER = { radii: [1.45, 1.7, 1.95], startDeg: 200, endDeg: 300, tube: 0.07, depthScale: 2.2 }

export const PLANT_SMOOTH_ER_PATHS: readonly (readonly V3[])[] = [
  [[-2.7, 2.4, 0.7], [-2.2, 2.9, 0.9], [-1.6, 2.7, 0.6], [-1.2, 3.0, 0.8]],
  [[-2.9, 2.0, 1.2], [-2.3, 2.3, 1.5], [-1.9, 2.1, 1.3]],
]

export const PLANT_GOLGI = { center: [-3.6, -2.2, 0.8] as V3, sacs: 4, spacing: 0.22, arcRadius: 0.8, tube: 0.08, depthScale: 2.4 }

/** Lens-shaped chloroplasts in the cytoplasm around the vacuole. */
export const CHLOROPLASTS: readonly InstancePlacement[] = [
  { center: [3.9, 2.6, 0.9], rotationDeg: 15 },
  { center: [4.3, -1.6, 1.0], rotationDeg: 80 },
  { center: [1.5, -2.9, 1.3], rotationDeg: -10 },
  { center: [-1.5, 2.85, 1.2], rotationDeg: 5 },
  { center: [-0.3, -2.9, 1.6], rotationDeg: -25 },
]
export const CHLOROPLAST_RADII: V3 = [0.75, 0.4, 0.35]

export const PLANT_MITOCHONDRIA: readonly InstancePlacement[] = [
  { center: [2.5, 2.9, 1.0], rotationDeg: 80 },
  { center: [4.3, 0.9, 1.3], rotationDeg: 0 },
  { center: [-2.4, -3.0, 0.6], rotationDeg: 90 },
]
export const PLANT_MITOCHONDRION = { radius: 0.32, length: 1.0 }

function insideMembrane([x, y, z]: V3, margin: number): boolean {
  const [hx, hy, hz] = MEMBRANE.half
  return Math.abs(x) < hx - margin && Math.abs(y) < hy - margin && Math.abs(z) < hz - margin
}

function insideVacuole([x, y, z]: V3, margin: number): boolean {
  const [cx, cy, cz] = VACUOLE.center
  const [rx, ry, rz] = VACUOLE.radii
  return ((x - cx) / (rx + margin)) ** 2 + ((y - cy) / (ry + margin)) ** 2 + ((z - cz) / (rz + margin)) ** 2 < 1
}

const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

/** Free ribosomes in the cytoplasm band between the vacuole and the membrane. */
export const PLANT_FREE_RIBOSOMES: readonly V3[] = (() => {
  const points: V3[] = []
  const avoid: [V3, number][] = [
    [PLANT_NUCLEUS.center, PLANT_NUCLEUS.radius + 0.25],
    [PLANT_GOLGI.center, 1.0],
    ...CHLOROPLASTS.map((c): [V3, number] => [c.center, 0.95]),
    ...PLANT_MITOCHONDRIA.map((m): [V3, number] => [m.center, 0.8]),
  ]
  for (let i = 0; points.length < 30 && i < 2000; i++) {
    // Deterministic quasi-random points (fractional parts of multiples of irrational numbers).
    const p: V3 = [((i * 0.618034) % 1) * 10 - 5, ((i * 0.754878) % 1) * 6.8 - 3.4, ((i * 0.569840) % 1) * 2.4 - 0.2]
    if (!insideMembrane(p, 0.3) || insideVacuole(p, 0.25)) continue
    if (avoid.some(([c, d]) => dist(p, c) < d)) continue
    points.push(p)
  }
  return points
})()

export const PLANT_BOUND_RIBOSOMES: readonly V3[] = (() => {
  const points: V3[] = []
  const [cx, cy, cz] = PLANT_NUCLEUS.center
  PLANT_ROUGH_ER.radii.forEach((radius, sheet) => {
    for (let deg = PLANT_ROUGH_ER.startDeg + 5; deg <= PLANT_ROUGH_ER.endDeg - 5; deg += 11) {
      const a = (deg * Math.PI) / 180
      const r = radius + PLANT_ROUGH_ER.tube + 0.05
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a), cz + (sheet % 2 === 0 ? 0.1 : -0.1)])
    }
  })
  return points
})()

const PLANT_FOCUS: Partial<Record<OrganelleId, FocusTarget>> = {
  'cell-wall': { center: [0, 0, 0], radius: PLANT_CELL_RADIUS },
  'plasma-membrane': { center: [0, 0, 0], radius: PLANT_CELL_RADIUS * 0.95 },
  cytoplasm: { center: [0, 0, 0], radius: PLANT_CELL_RADIUS * 0.9 },
  nucleus: { center: PLANT_NUCLEUS.center, radius: PLANT_NUCLEUS.radius * 1.3 },
  nucleolus: { center: PLANT_NUCLEOLUS.center, radius: PLANT_NUCLEOLUS.radius * 2 },
  chloroplast: { center: [1.3, 0, 1.2], radius: 4.6 },
  'central-vacuole': { center: VACUOLE.center, radius: 3.4 },
  'vacuole-membrane': { center: VACUOLE.center, radius: 3.5 },
  mitochondrion: { center: [1.4, 0.3, 1.0], radius: 4.4 },
  'rough-er': { center: [-3.9, 0.2, 0.6], radius: 2 },
  'smooth-er': { center: [-2.0, 2.6, 1.0], radius: 1.2 },
  golgi: { center: PLANT_GOLGI.center, radius: 1.1 },
  ribosome: { center: [0, 0, 0.8], radius: 5 },
}

export function plantFocusTarget(organelleId: OrganelleId, instance: number | null): FocusTarget {
  if (instance !== null && organelleId === 'chloroplast' && CHLOROPLASTS[instance]) return { center: CHLOROPLASTS[instance].center, radius: 1.1 }
  if (instance !== null && organelleId === 'mitochondrion' && PLANT_MITOCHONDRIA[instance]) {
    return { center: PLANT_MITOCHONDRIA[instance].center, radius: PLANT_MITOCHONDRION.length }
  }
  return PLANT_FOCUS[organelleId] ?? { center: [0, 0, 0], radius: PLANT_CELL_RADIUS }
}

export function plantLabelAnchor(organelleId: OrganelleId, instance: number | null, view: 'whole' | 'cutaway'): V3 {
  const [hx, hy, hz] = WALL.half
  switch (organelleId) {
    case 'cell-wall':
      return view === 'whole' ? [-hx * 0.55, hy, hz * 0.6] : [-hx + 0.2, hy - 0.4, hz * 0.5]
    case 'plasma-membrane':
      // Front edge of the membrane's lower wall, just inside the wall's edge.
      return [1.6, -MEMBRANE.half[1] + 0.05, MEMBRANE.half[2] - 0.2]
    case 'cytoplasm':
      return [3.2, -0.4, -MEMBRANE.half[2] + 0.1]
    case 'nucleus':
      return [PLANT_NUCLEUS.center[0], PLANT_NUCLEUS.center[1] + PLANT_NUCLEUS.radius, PLANT_NUCLEUS.center[2] + 0.2]
    case 'nucleolus':
      return [PLANT_NUCLEOLUS.center[0], PLANT_NUCLEOLUS.center[1] + PLANT_NUCLEOLUS.radius, PLANT_NUCLEOLUS.center[2] + 0.2]
    case 'chloroplast': {
      const c = CHLOROPLASTS[instance ?? 0]
      return [c.center[0], c.center[1] + CHLOROPLAST_RADII[1], c.center[2] + 0.1]
    }
    case 'central-vacuole':
      return [VACUOLE.center[0] + 0.6, VACUOLE.center[1] - 0.6, VACUOLE.center[2] - VACUOLE.radii[2] * 0.6]
    case 'vacuole-membrane':
      return [VACUOLE.center[0] - VACUOLE.radii[0] * 0.75, VACUOLE.center[1] + VACUOLE.radii[1] * 0.6, VACUOLE.center[2]]
    case 'mitochondrion': {
      const m = PLANT_MITOCHONDRIA[instance ?? 0]
      return [m.center[0], m.center[1] + 0.4, m.center[2] + 0.1]
    }
    case 'rough-er':
      return [PLANT_NUCLEUS.center[0] + 0.3, PLANT_NUCLEUS.center[1] - 1.9, PLANT_NUCLEUS.center[2]]
    case 'smooth-er':
      return [-1.9, 2.9, 1.0]
    case 'golgi':
      return [PLANT_GOLGI.center[0] + 0.3, PLANT_GOLGI.center[1] + 0.8, PLANT_GOLGI.center[2] + 0.2]
    case 'ribosome':
      return PLANT_FREE_RIBOSOMES[0] ?? [0, 0, 0]
    default:
      return [0, 0, 0]
  }
}
