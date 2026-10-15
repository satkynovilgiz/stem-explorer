import type { HeartPartId } from '../../../data/anatomy/heart'

/*
 * Schematic, deterministic placement of the heart model (anterior view).
 * World axes: +x = toward the BODY'S LEFT (your right when facing the model), +y = superior (up),
 * +z = anterior (toward you). Sizes and positions are illustrative, not measured.
 */

export type V3 = readonly [number, number, number]

export interface Chamber {
  center: V3
  radii: V3
}

export const CHAMBERS: Record<'right-atrium' | 'left-atrium' | 'right-ventricle' | 'left-ventricle', Chamber> = {
  'right-atrium': { center: [-1.05, 0.95, 0.15], radii: [0.6, 0.55, 0.55] },
  'left-atrium': { center: [0.85, 1.05, -0.35], radii: [0.55, 0.45, 0.5] },
  'right-ventricle': { center: [-0.55, -0.35, 0.35], radii: [0.75, 0.95, 0.55] },
  // Lower and toward the body's left, so the apex points down and to the left.
  'left-ventricle': { center: [0.6, -0.5, -0.05], radii: [0.75, 1.1, 0.65] },
}

export interface Valve {
  center: V3
  /** Direction of normal blood flow through the valve. */
  normal: V3
  radius: number
  flaps: number
}

/** Flap counts follow OpenStax A&P 2e §19.1 (tricuspid 3, mitral 2, semilunar valves 3). */
export const VALVES: Record<'tricuspid-valve' | 'mitral-valve' | 'pulmonary-valve' | 'aortic-valve', Valve> = {
  'tricuspid-valve': { center: [-0.85, 0.42, 0.25], normal: [0.15, -1, 0.05], radius: 0.24, flaps: 3 },
  'mitral-valve': { center: [0.75, 0.48, -0.2], normal: [-0.05, -1, 0.05], radius: 0.22, flaps: 2 },
  // The pulmonary valve lies anterior, superior and to the body's left of the aortic valve.
  // Semilunar rings are slightly wider than their vessels so they show as collars at the root.
  'pulmonary-valve': { center: [0.12, 0.72, 0.55], normal: [0.55, 0.85, 0], radius: 0.24, flaps: 3 },
  'aortic-valve': { center: [0.02, 0.52, -0.05], normal: [-0.25, 1, 0], radius: 0.28, flaps: 3 },
}

export const SEPTUM = { center: [0.03, -0.45, 0.15] as V3, radii: [0.06, 0.92, 0.5] as V3 }

export interface Vessel {
  paths: readonly (readonly V3[])[]
  radius: number
}

export const VESSELS: Record<'aorta' | 'pulmonary-trunk' | 'pulmonary-veins' | 'superior-vena-cava' | 'inferior-vena-cava', Vessel> = {
  'superior-vena-cava': { radius: 0.2, paths: [[[-1.15, 2.45, 0.0], [-1.12, 1.9, 0.05], [-1.08, 1.4, 0.12]]] },
  'inferior-vena-cava': { radius: 0.22, paths: [[[-1.2, -1.45, -0.35], [-1.22, -0.2, -0.25], [-1.12, 0.5, 0.05]]] },
  // The ascending aorta rises behind and to the body's right of the pulmonary trunk, then arches
  // over toward the body's left and descends behind the heart.
  aorta: {
    radius: 0.24,
    paths: [[[0.1, 0.35, -0.05], [0.0, 0.6, -0.05], [-0.3, 1.3, -0.02], [-0.3, 2.15, -0.05], [0.6, 2.5, -0.4], [1.2, 2.15, -0.8], [1.3, 1.0, -0.95], [1.3, -0.7, -1.0]]],
  },
  'pulmonary-trunk': {
    radius: 0.2,
    paths: [
      // From the right ventricle's outflow, forward of the aorta, up toward the body's left.
      [[-0.2, 0.35, 0.55], [0.2, 0.8, 0.55], [0.3, 1.35, 0.6], [0.35, 1.7, 0.45]],
      // Right pulmonary artery: passes behind the ascending aorta and the superior vena cava.
      [[0.35, 1.7, 0.45], [0.2, 1.75, -0.45], [-0.6, 1.75, -0.8], [-1.9, 1.8, -0.8]],
      // Left pulmonary artery.
      [[0.35, 1.7, 0.45], [1.0, 1.7, 0.3], [1.95, 1.6, 0.0]],
    ],
  },
  'pulmonary-veins': {
    radius: 0.11,
    paths: [
      [[-2.0, 1.25, -0.8], [-0.6, 1.15, -0.75], [0.45, 1.1, -0.6]],
      [[-2.0, 0.85, -0.8], [-0.6, 0.9, -0.78], [0.5, 0.95, -0.62]],
      [[2.05, 1.3, -0.6], [1.3, 1.15, -0.45]],
      [[2.05, 0.85, -0.6], [1.3, 0.95, -0.5]],
    ],
  },
}

/** Labelled markers for destinations outside the heart (never drawn as heart structures). */
export const EXTERNAL_MARKERS: { key: string; destination: 'lungs' | 'body'; position: V3; text: string }[] = [
  { key: 'lungs-right', destination: 'lungs', position: [-2.45, 1.55, -0.6], text: 'To / from right lung' },
  { key: 'lungs-left', destination: 'lungs', position: [2.45, 1.5, -0.3], text: 'To / from left lung' },
  { key: 'body-upper', destination: 'body', position: [-1.15, 2.85, 0.0], text: 'From upper body' },
  { key: 'body-lower', destination: 'body', position: [-1.2, -1.85, -0.35], text: 'From lower body' },
  { key: 'body-aorta', destination: 'body', position: [1.35, -1.1, -1.0], text: 'To body' },
]

/** Orientation labels move with the model, so left/right stay attached to the body’s sides. */
export const ORIENTATION_MARKERS: { key: string; position: V3; text: string }[] = [
  { key: 'o-right', position: [-2.9, -0.4, 0.2], text: 'Body’s right' },
  { key: 'o-left', position: [2.9, -0.4, 0.2], text: 'Body’s left' },
  { key: 'o-superior', position: [0.2, 3.2, 0], text: 'Superior (up)' },
  { key: 'o-inferior', position: [0, -2.3, 0], text: 'Inferior (down)' },
]

export function partCenter(id: HeartPartId): V3 {
  if (id in CHAMBERS) return CHAMBERS[id as keyof typeof CHAMBERS].center
  if (id in VALVES) return VALVES[id as keyof typeof VALVES].center
  if (id === 'interventricular-septum') return SEPTUM.center
  const path = VESSELS[id as keyof typeof VESSELS].paths[0]
  return path[Math.floor(path.length / 2)]
}

/** Focus distance scale: how big a region to frame around the part. */
export function partRadius(id: HeartPartId): number {
  if (id in CHAMBERS) return Math.max(...CHAMBERS[id as keyof typeof CHAMBERS].radii) * 1.4
  if (id in VALVES) return 0.6
  if (id === 'interventricular-septum') return 1.1
  return id === 'aorta' || id === 'pulmonary-trunk' || id === 'pulmonary-veins' ? 1.9 : 1.1
}

/** Anchor for a part's label: a front-facing point of the part. */
export function labelAnchor(id: HeartPartId): V3 {
  if (id in CHAMBERS) {
    const { center, radii } = CHAMBERS[id as keyof typeof CHAMBERS]
    return [center[0], center[1] + radii[1] * 0.35, center[2] + radii[2] * 0.85]
  }
  if (id in VALVES) return VALVES[id as keyof typeof VALVES].center
  if (id === 'interventricular-septum') return [SEPTUM.center[0], SEPTUM.center[1] - 0.3, SEPTUM.center[2] + 0.3]
  const anchors: Record<string, V3> = {
    aorta: [-0.3, 2.2, 0.2],
    'pulmonary-trunk': [0.3, 1.35, 0.85],
    'pulmonary-veins': [1.7, 1.15, -0.45],
    'superior-vena-cava': [-1.12, 2.0, 0.25],
    'inferior-vena-cava': [-1.22, -0.6, -0.05],
  }
  return anchors[id]
}

/** Conceptual marker path for each tour step (by step id). Direction only — not speed or timing. */
export const STEP_PATHS: Record<string, readonly V3[]> = {
  'systemic-veins': [[-1.15, 2.45, 0.0], [-1.1, 1.5, 0.1]],
  'right-atrium': [[-1.1, 1.3, 0.15], [-1.0, 0.95, 0.15], [-0.9, 0.6, 0.2]],
  tricuspid: [[-0.95, 0.75, 0.2], [-0.85, 0.42, 0.25], [-0.75, 0.0, 0.3]],
  'right-ventricle': [[-0.7, -0.2, 0.35], [-0.45, 0.15, 0.5], [-0.15, 0.4, 0.55]],
  'pulmonary-valve': [[-0.1, 0.45, 0.55], [0.12, 0.72, 0.55], [0.25, 1.05, 0.58]],
  'pulmonary-arteries': [[0.3, 1.35, 0.6], [0.35, 1.7, 0.45], [0.2, 1.75, -0.45], [-0.6, 1.75, -0.8], [-1.9, 1.8, -0.8]],
  lungs: [[-1.9, 1.8, -0.8], [-2.45, 1.55, -0.85], [-2.0, 1.25, -0.8]],
  'pulmonary-veins': [[-2.0, 1.25, -0.8], [-0.6, 1.15, -0.75], [0.45, 1.1, -0.6]],
  'left-atrium': [[0.5, 1.1, -0.4], [0.85, 1.0, -0.3], [0.8, 0.7, -0.25]],
  mitral: [[0.8, 0.75, -0.25], [0.75, 0.48, -0.2], [0.7, 0.0, -0.1]],
  'left-ventricle': [[0.65, -0.4, -0.05], [0.35, 0.05, -0.05], [0.1, 0.35, -0.05]],
  'aortic-valve': [[0.1, 0.35, -0.05], [0.02, 0.52, -0.05], [-0.1, 0.85, -0.04]],
  aorta: [[-0.3, 1.3, -0.02], [-0.3, 2.15, -0.05], [0.6, 2.5, -0.4], [1.2, 2.15, -0.8], [1.3, 1.0, -0.95], [1.3, -0.7, -1.0]],
  body: [[1.3, -0.7, -1.0], [1.3, -1.1, -1.0], [0.1, -1.9, -0.7], [-1.2, -1.45, -0.35]],
}
