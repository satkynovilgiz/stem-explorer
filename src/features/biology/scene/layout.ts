import type { OrganelleId } from '../../../data/biology/types'

/*
 * Deterministic, schematic placement of every structure in the cell model.
 * Units are arbitrary scene units; nothing here is to scale. All positions are fixed
 * (no randomness), so the model is identical on every render and every visit.
 */

export type V3 = readonly [number, number, number]

/** Cell is a slightly flattened sphere. */
export const CELL_RADIUS = 6
export const CELL_Y_SCALE = 0.82

/** Cutaway wedge: everything is opened by this half-angle around the +z (front) direction. */
export const CUT_HALF_ANGLE = Math.PI / 3

export const NUCLEUS = { center: [-1.3, 0.7, -0.6] as V3, radius: 1.9 }
export const NUCLEOLUS = { center: [-1.05, 0.55, -0.25] as V3, radius: 0.7 }

/** Rough ER sheets: concentric arcs around the nucleus (lower-left), in degrees. */
export const ROUGH_ER = {
  radii: [2.35, 2.7, 3.05, 3.4],
  startDeg: 192,
  endDeg: 300,
  tube: 0.09,
  depthScale: 2.6,
}

/** Smooth ER: a few tubules near the rough ER's upper-left end. */
export const SMOOTH_ER_PATHS: readonly (readonly V3[])[] = [
  [[-3.9, 1.0, 0.2], [-3.4, 1.8, 0.6], [-2.6, 2.1, 0.2], [-2.2, 2.9, 0.5]],
  [[-4.3, 0.2, -0.2], [-4.4, 1.3, 0.3], [-3.8, 2.5, 0.0], [-3.0, 3.1, 0.3]],
  [[-3.3, 1.2, 0.9], [-2.9, 1.5, 1.4], [-3.4, 2.3, 1.2], [-2.7, 2.6, 1.0]],
]

/** Golgi stack: curved sacs concave toward the nucleus (cis face left, trans face right). */
export const GOLGI = {
  center: [2.5, 0.5, 0.3] as V3,
  sacs: 5,
  spacing: 0.27,
  arcRadius: 1.5,
  tube: 0.1,
  depthScale: 3,
  vesicles: [
    [3.65, 1.3, 0.5],
    [3.85, 0.4, 0.2],
    [3.7, -0.5, 0.6],
    [4.15, 1.0, 0.9],
    [1.3, 1.4, 0.6],
    [1.25, -0.3, 0.4],
  ] as readonly V3[],
}

export interface InstancePlacement {
  center: V3
  /** Rotation about the viewing (z) axis, in degrees; keeps the cut face toward the front. */
  rotationDeg: number
}

export const MITOCHONDRIA: readonly InstancePlacement[] = [
  { center: [2.9, -2.3, 0.6], rotationDeg: 70 },
  { center: [-0.6, -3.5, 0.9], rotationDeg: 95 },
  { center: [3.3, 2.5, -0.1], rotationDeg: 35 },
  { center: [0.6, 3.25, 0.4], rotationDeg: -60 },
]
export const MITOCHONDRION_SIZE = { radius: 0.42, length: 1.25 }

export const LYSOSOMES: readonly V3[] = [
  [1.2, -1.5, 1.5],
  [-2.9, -2.6, 1.3],
  [1.6, 2.0, 1.6],
]
export const LYSOSOME_RADIUS = 0.32

function insideEllipsoid([x, y, z]: V3, margin: number): boolean {
  const r = CELL_RADIUS - margin
  return (x / r) ** 2 + (y / (r * CELL_Y_SCALE)) ** 2 + (z / r) ** 2 < 1
}

function distance(a: V3, b: V3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Free ribosomes on a golden-angle spiral, skipping the nucleus and other organelles. */
export const FREE_RIBOSOMES: readonly V3[] = (() => {
  const points: V3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  const avoid: [V3, number][] = [
    [NUCLEUS.center, NUCLEUS.radius + 0.3],
    [GOLGI.center, 1.6],
    ...MITOCHONDRIA.map((m): [V3, number] => [m.center, 1.0]),
    ...LYSOSOMES.map((l): [V3, number] => [l, 0.6]),
  ]
  for (let i = 0; points.length < 34 && i < 400; i++) {
    const r = 1.4 + ((i * 0.618034) % 1) * 3.6
    const theta = i * golden
    const p: V3 = [r * Math.cos(theta), r * Math.sin(theta) * CELL_Y_SCALE, ((i * 0.37) % 1) * 2.6 - 0.4]
    if (!insideEllipsoid(p, 0.8)) continue
    if (avoid.some(([c, d]) => distance(p, c) < d)) continue
    points.push(p)
  }
  return points
})()

/** Bound ribosomes dotted along the outer edge of each rough ER sheet. */
export const BOUND_RIBOSOMES: readonly V3[] = (() => {
  const points: V3[] = []
  const [cx, cy, cz] = NUCLEUS.center
  ROUGH_ER.radii.forEach((radius, sheet) => {
    for (let deg = ROUGH_ER.startDeg + 4; deg <= ROUGH_ER.endDeg - 4; deg += 9) {
      const a = (deg * Math.PI) / 180
      const r = radius + ROUGH_ER.tube + 0.05
      const z = cz + (sheet % 2 === 0 ? 0.12 : -0.12) * (deg % 2 === 0 ? 1 : -1)
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z])
    }
  })
  return points
})()

/** Where to point the camera and how far to stay when focusing on a structure. */
export interface FocusTarget {
  center: V3
  radius: number
}

const TYPE_FOCUS: Partial<Record<OrganelleId, FocusTarget>> = {
  'plasma-membrane': { center: [0, 0, 0], radius: CELL_RADIUS },
  cytoplasm: { center: [0, 0, 0], radius: CELL_RADIUS * 0.9 },
  nucleus: { center: NUCLEUS.center, radius: NUCLEUS.radius },
  nucleolus: { center: NUCLEOLUS.center, radius: NUCLEOLUS.radius * 1.4 },
  mitochondrion: { center: [1.2, 0, 0.3], radius: 4.2 },
  'rough-er': { center: [-1.6, -1.4, -0.6], radius: 2.8 },
  'smooth-er': { center: [-3.3, 1.8, 0.5], radius: 1.7 },
  golgi: { center: GOLGI.center, radius: 1.7 },
  ribosome: { center: [0, 0, 0.5], radius: 4.5 },
  lysosome: { center: [0.2, -0.4, 1.5], radius: 3.5 },
}

export function focusTarget(organelleId: OrganelleId, instance: number | null): FocusTarget {
  if (instance !== null && organelleId === 'mitochondrion' && MITOCHONDRIA[instance]) {
    return { center: MITOCHONDRIA[instance].center, radius: MITOCHONDRION_SIZE.length * 0.9 }
  }
  if (instance !== null && organelleId === 'lysosome' && LYSOSOMES[instance]) {
    return { center: LYSOSOMES[instance], radius: LYSOSOME_RADIUS * 2.5 }
  }
  return TYPE_FOCUS[organelleId] ?? { center: [0, 0, 0], radius: CELL_RADIUS }
}

/**
 * Label anchors: one per structure type, placed on a front-facing surface so the
 * label can be hidden when other geometry is in front of it.
 */
export function labelAnchor(organelleId: OrganelleId, instance: number | null, view: 'whole' | 'cutaway'): V3 {
  switch (organelleId) {
    case 'plasma-membrane':
      return view === 'whole' ? [-3.2, 3.1, 3.0] : [-4.6, 2.6, -1.8]
    case 'cytoplasm':
      return [2.4, -2.9, -2.6]
    case 'nucleus':
      return [NUCLEUS.center[0] - 0.4, NUCLEUS.center[1] + NUCLEUS.radius * 0.95, NUCLEUS.center[2] + 0.3]
    case 'nucleolus':
      return [NUCLEOLUS.center[0], NUCLEOLUS.center[1] + NUCLEOLUS.radius, NUCLEOLUS.center[2] + 0.2]
    case 'mitochondrion': {
      const m = MITOCHONDRIA[instance ?? 0]
      return [m.center[0], m.center[1] + 0.45, m.center[2] + 0.1]
    }
    case 'rough-er':
      return [-2.9, -1.8, -0.4]
    case 'smooth-er':
      return [-3.4, 2.4, 0.6]
    case 'golgi':
      return [GOLGI.center[0] + 0.4, GOLGI.center[1] + 1.25, GOLGI.center[2] + 0.2]
    case 'ribosome':
      return FREE_RIBOSOMES[0]
    case 'lysosome': {
      const l = LYSOSOMES[instance ?? 0]
      return [l[0], l[1] + LYSOSOME_RADIUS, l[2] + 0.05]
    }
    default:
      return [0, 0, 0]
  }
}
