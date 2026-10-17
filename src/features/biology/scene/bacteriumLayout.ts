import type { OrganelleId } from '../../../data/biology/types'
import type { FocusTarget, V3 } from './layout'

/*
 * A representative rod-shaped bacterium, axis along x. Model units match the other cell scenes so
 * the same camera works; the real cell is 0.1–5.0 µm across, far smaller than the eukaryotic cells.
 */

export const ROD = { halfLength: 3.6 }
export const RADII = { capsule: 2.95, wall: 2.6, membrane: 2.42, cytoplasm: 2.36 }
export const BACTERIUM_RADIUS = ROD.halfLength + RADII.capsule + 2.5

/** Deterministic pseudo-random numbers, so the model is the same on every load. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** A point inside the rod (cylinder plus hemispherical caps) of radius r. */
function insideRod(rand: () => number, r: number): V3 {
  for (;;) {
    const x = (rand() * 2 - 1) * (ROD.halfLength + r)
    const y = (rand() * 2 - 1) * r
    const z = (rand() * 2 - 1) * r
    const dx = Math.max(0, Math.abs(x) - ROD.halfLength)
    if (dx * dx + y * y + z * z < r * r) return [x, y, z]
  }
}

/** The nucleoid's DNA as a loose closed tangle around the cell centre. */
export const NUCLEOID_PATH: readonly V3[] = (() => {
  const rand = seeded(11)
  return Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2
    return [Math.cos(a) * 1.9 + (rand() - 0.5) * 0.9, Math.sin(a * 2) * 0.7 + (rand() - 0.5) * 0.7, Math.sin(a) * 0.8 + (rand() - 0.5) * 0.6] as V3
  })
})()

export const RIBOSOMES: readonly V3[] = (() => {
  const rand = seeded(5)
  const out: V3[] = []
  while (out.length < 70) {
    const p = insideRod(rand, RADII.cytoplasm - 0.35)
    // Keep them out of the nucleoid's middle so the DNA stays readable.
    if (Math.hypot(p[0] / 2.2, p[1] / 1.0, p[2] / 1.0) > 1.1) out.push(p)
  }
  return out
})()

/** The flagellum: a helix leaving the +x end. */
export const FLAGELLUM_PATH: readonly V3[] = Array.from({ length: 60 }, (_, i) => {
  const t = i / 59
  const x = ROD.halfLength + RADII.capsule - 0.2 + t * 7
  return [x, Math.sin(t * Math.PI * 6) * 0.45, Math.cos(t * Math.PI * 6) * 0.45 - 0.45 * (1 - t)] as V3
})

export const PILI: readonly (readonly V3[])[] = [
  [[-1.0, RADII.wall, 0.6], [-1.3, RADII.capsule + 1.6, 1.0], [-1.8, RADII.capsule + 2.8, 1.2]],
  [[1.2, -RADII.wall, -0.4], [1.5, -RADII.capsule - 1.5, -0.8], [2.1, -RADII.capsule - 2.6, -1.1]],
]

/** Short fimbriae spread over the surface: [base, tip]. */
export const FIMBRIAE: readonly (readonly [V3, V3])[] = (() => {
  const rand = seeded(23)
  const out: [V3, V3][] = []
  for (let i = 0; i < 34; i++) {
    const x = (rand() * 2 - 1) * ROD.halfLength
    const a = rand() * Math.PI * 2
    const n: V3 = [0, Math.cos(a), Math.sin(a)]
    const base: V3 = [x, n[1] * RADII.wall, n[2] * RADII.wall]
    const tip: V3 = [x, n[1] * (RADII.capsule + 0.55), n[2] * (RADII.capsule + 0.55)]
    out.push([base, tip])
  }
  return out
})()

const FOCUS: Partial<Record<OrganelleId, FocusTarget>> = {
  capsule: { center: [0, 0, 0], radius: BACTERIUM_RADIUS - 1.5 },
  'bacterial-wall': { center: [0, 0, 0], radius: BACTERIUM_RADIUS - 2 },
  'bacterial-membrane': { center: [0, 0, 0], radius: BACTERIUM_RADIUS - 2 },
  'bacterial-cytoplasm': { center: [0, 0, 0], radius: BACTERIUM_RADIUS - 2 },
  nucleoid: { center: [0, 0, 0], radius: 2.6 },
  'bacterial-ribosomes': { center: [0, 0, 0], radius: 4 },
  flagellum: { center: [ROD.halfLength + RADII.capsule + 3.3, 0, 0], radius: 4 },
  pili: { center: [0, 0, 0], radius: 5.5 },
  fimbriae: { center: [0, 0, 0], radius: 5 },
}

export function bacteriumFocusTarget(organelleId: OrganelleId): FocusTarget {
  return FOCUS[organelleId] ?? { center: [0, 0, 0], radius: BACTERIUM_RADIUS }
}

export function bacteriumLabelAnchor(organelleId: OrganelleId, _instance: number | null, view: 'whole' | 'cutaway'): V3 {
  switch (organelleId) {
    case 'capsule':
      return [-ROD.halfLength * 0.6, RADII.capsule, 0.6]
    case 'bacterial-wall':
      return view === 'whole' ? [ROD.halfLength * 0.4, -RADII.wall, 0.8] : [-ROD.halfLength, RADII.wall - 0.2, 0.3]
    case 'bacterial-membrane':
      return [ROD.halfLength * 0.3, -RADII.membrane + 0.1, 0.4]
    case 'bacterial-cytoplasm':
      return [-ROD.halfLength * 0.7, -0.9, -RADII.cytoplasm + 0.2]
    case 'nucleoid':
      return [0.4, 1.2, 0.6]
    case 'bacterial-ribosomes':
      return [RIBOSOMES[0][0], RIBOSOMES[0][1] + 0.2, RIBOSOMES[0][2]]
    case 'flagellum':
      return FLAGELLUM_PATH[40]
    case 'pili':
      return PILI[0][2]
    case 'fimbriae':
      return FIMBRIAE[0][1]
    default:
      return [0, 0, 0]
  }
}
