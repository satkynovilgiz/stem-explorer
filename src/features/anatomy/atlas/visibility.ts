import { ATLAS_STRUCTURES, descendantsOf, shownWithVariant, type AtlasStructure } from '../../../data/anatomy/atlas'
import type { AtlasState } from './atlasState'

export interface DrawnStructure {
  structure: AtlasStructure
  opacity: number
  /** Outside the chosen region: drawn faintly for context and not clickable. */
  dimmed: boolean
}

/** Opacity used for context outside the chosen region. */
export const DIMMED_OPACITY = 0.08

/**
 * What the scene draws for a given state. Kept free of Three.js so it can be unit tested and so
 * the HTML list can say exactly what is visible.
 */
export function drawnStructures(state: Pick<AtlasState, 'selected' | 'isolated' | 'layers' | 'opacity' | 'region' | 'variant'>): DrawnStructure[] {
  if (state.isolated && state.selected) {
    const ids = new Set([state.selected, ...descendantsOf(state.selected).map((d) => d.id)])
    return ATLAS_STRUCTURES.filter((s) => ids.has(s.id) && s.shapes.length > 0).map((structure) => ({ structure, opacity: 1, dimmed: false }))
  }
  const out: DrawnStructure[] = []
  for (const s of ATLAS_STRUCTURES) {
    if (s.shapes.length === 0 || !shownWithVariant(s, state.variant)) continue
    const systems = [s.system, ...(s.alsoIn ?? [])].filter((sys) => state.layers.includes(sys))
    if (systems.length === 0) continue
    const opacity = Math.max(...systems.map((sys) => state.opacity[sys]))
    const dimmed = state.region !== 'whole-body' && s.region !== state.region && s.region !== 'whole-body'
    out.push({ structure: s, opacity: dimmed ? Math.min(opacity, DIMMED_OPACITY) : opacity, dimmed })
  }
  return out
}
