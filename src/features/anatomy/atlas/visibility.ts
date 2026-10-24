import { ATLAS_STRUCTURES, descendantsOf, findStructure, shownWithVariant, type AtlasStructure, type Shape } from '../../../data/anatomy/atlas'
import { angleAt, demoMembers, demoPivot, findMovement, rotateShape, stretchShape } from '../../../data/anatomy/atlas/movements'
import { findTour } from '../../../data/anatomy/atlas/tours'
import { findRelationExploration } from '../../../data/anatomy/atlas/relationships'
import type { AtlasState } from './atlasState'

export interface DrawnStructure {
  structure: AtlasStructure
  opacity: number
  /** Outside the chosen region: drawn faintly for context and not clickable. */
  dimmed: boolean
  /** Posed shapes during a movement demonstration (otherwise the structure's own shapes). */
  shapes?: readonly Shape[]
  /** Role in a movement demonstration. */
  role?: 'principal' | 'opposing'
  /** Highlighted (tour focus or demo principal): glows and is labelled. */
  highlight?: boolean
  /** Text label drawn in the view (the role or step, in words). */
  label?: string
  labelStyle?: 'primary' | 'secondary'
}

/** Faint context during tours (skin and skeleton), never clickable. */
const CONTEXT_OPACITY = { integumentary: 0.05, skeletal: 0.08 } as const
const TOUR_OTHER_OPACITY = 0.28
const unsided = (name: string) => name.replace(/^(Left|Right) /, '')

/** Opacity used for context outside the chosen region. */
export const DIMMED_OPACITY = 0.08

/**
 * What the scene draws for a given state. Kept free of Three.js so it can be unit tested and so
 * the HTML list can say exactly what is visible.
 */
export function drawnStructures(state: Pick<AtlasState, 'selected' | 'isolated' | 'isolatePair' | 'layers' | 'opacity' | 'region' | 'variant' | 'demo' | 'tour'> & Partial<Pick<AtlasState, 'relation'>>): DrawnStructure[] {
  if (state.relation) {
    // A relationship exploration: its structures numbered in reading order, the rest of its systems faint.
    const e = findRelationExploration(state.relation.id)!
    const order = new Map(e.focus.map((id, i) => [id, i + 1]))
    const out: DrawnStructure[] = []
    for (const s of ATLAS_STRUCTURES) {
      if (s.shapes.length === 0 || !shownWithVariant(s, state.variant)) continue
      const n = order.get(s.id)
      if (n) {
        out.push({ structure: s, opacity: 1, dimmed: false, highlight: true, label: `${n} · ${s.name}`, labelStyle: 'primary' })
      } else if ([s.system, ...(s.alsoIn ?? [])].some((sys) => e.systems.includes(sys))) {
        out.push({ structure: s, opacity: TOUR_OTHER_OPACITY, dimmed: true })
      } else if (s.system === 'integumentary') {
        out.push({ structure: s, opacity: CONTEXT_OPACITY.integumentary, dimmed: true })
      }
    }
    return out
  }
  if (state.tour) {
    const tour = findTour(state.tour.id)!
    const step = tour.steps[state.tour.step]
    const focus = new Set(step.focus)
    const variant = state.tour.before.variant
    const out: DrawnStructure[] = []
    for (const s of ATLAS_STRUCTURES) {
      if (s.shapes.length === 0 || !shownWithVariant(s, variant)) continue
      const inTour = [s.system, ...(s.alsoIn ?? [])].some((sys) => tour.systems.includes(sys))
      if (focus.has(s.id)) {
        out.push({ structure: s, opacity: 1, dimmed: false, highlight: true, label: `Step ${state.tour.step + 1} · ${s.name}`, labelStyle: 'primary' })
      } else if (inTour) {
        out.push({ structure: s, opacity: TOUR_OTHER_OPACITY, dimmed: true })
      } else if (s.system === 'integumentary' || s.system === 'skeletal') {
        out.push({ structure: s, opacity: CONTEXT_OPACITY[s.system], dimmed: true })
      }
    }
    return out
  }
  if (state.demo) {
    const m = findMovement(state.demo.id)!
    const { moving, spanning, context } = demoMembers(m, state.demo.side)
    const pivot = demoPivot(m, state.demo.side)
    const angle = angleAt(m, state.demo.t)
    const role = (id: string) => {
      const base = id.replace(/-(left|right)$/, '')
      return m.principal.some((p) => p.id === base) ? 'principal' : m.opposing.some((p) => p.id === base) ? 'opposing' : undefined
    }
    const labelled = (id: string): Partial<DrawnStructure> => {
      const r = role(id)
      if (!r) return {}
      const name = unsided(findStructure(id)!.name)
      return r === 'principal'
        ? { role: r, highlight: true, label: `Flexor · ${name}`, labelStyle: 'primary' }
        : { role: r, label: `Opposes · ${name}`, labelStyle: 'secondary' }
    }
    const out: DrawnStructure[] = []
    for (const id of context) out.push({ structure: findStructure(id)!, opacity: 1, dimmed: false, ...labelled(id) })
    for (const id of moving) {
      const s = findStructure(id)!
      out.push({ structure: s, opacity: 1, dimmed: false, shapes: s.shapes.map((sh) => rotateShape(sh, pivot, angle)), ...labelled(id) })
    }
    for (const id of spanning) {
      const s = findStructure(id)!
      out.push({ structure: s, opacity: 1, dimmed: false, shapes: s.shapes.map((sh) => stretchShape(sh, pivot, angle)), ...labelled(id) })
    }
    return out
  }
  if (state.isolated && state.selected) {
    const pairId = state.isolatePair ? findStructure(state.selected)?.pairId : undefined
    const roots = pairId ? [state.selected, pairId] : [state.selected]
    const ids = new Set(roots.flatMap((r) => [r, ...descendantsOf(r).map((d) => d.id)]))
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
