import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { ATLAS_SYSTEMS, findStructure, getRegion, getSystem, type RegionId, type ReproductiveVariant, type SystemId } from '../../../data/anatomy/atlas'
import { findMovement, type MovementId, type Side } from '../../../data/anatomy/atlas/movements'
import type { AtlasUrlState, AtlasView } from '../../../lib/urlState'

export interface AtlasState {
  selected: string | null
  isolated: boolean
  /** With isolation: also draw the other side of a left/right pair. */
  isolatePair: boolean
  view: AtlasView
  /** Visible systems, kept in the fixed system order. */
  layers: SystemId[]
  /** Per-system opacity, 0.1–1. Not part of links. */
  opacity: Record<SystemId, number>
  region: RegionId
  variant: ReproductiveVariant | null
  /** A movement demonstration in progress (never stored in links). t: 0 = reference posture, 1 = flexed. */
  demo: { id: MovementId; side: Side; t: number } | null
  announcement: string
}

export type AtlasAction =
  | { type: 'select'; id: string }
  | { type: 'clearSelection' }
  | { type: 'isolate' }
  | { type: 'isolatePair' }
  | { type: 'showAll' }
  | { type: 'toggleMusculoskeletal' }
  | { type: 'startDemo'; id: MovementId; side: Side }
  | { type: 'setDemoSide'; side: Side }
  | { type: 'setDemoT'; t: number }
  | { type: 'exitDemo' }
  | { type: 'setView'; view: AtlasView }
  | { type: 'toggleLayer'; system: SystemId }
  | { type: 'setLayers'; layers: SystemId[] }
  | { type: 'setOpacity'; system: SystemId; value: number }
  | { type: 'setRegion'; region: RegionId }
  | { type: 'setVariant'; variant: ReproductiveVariant | null }
  | { type: 'replace'; state: AtlasState; announcement: string }

export const MIN_OPACITY = 0.1
export const DEFAULT_OPACITY = Object.fromEntries(ATLAS_SYSTEMS.map((s) => [s.id, s.defaultOpacity])) as Record<SystemId, number>
const ORDER = ATLAS_SYSTEMS.map((s) => s.id)
const ordered = (layers: Iterable<SystemId>) => {
  const set = new Set(layers)
  return ORDER.filter((id) => set.has(id))
}

export function initialAtlasState(url: AtlasUrlState): AtlasState {
  const base: AtlasState = {
    selected: null,
    isolated: false,
    isolatePair: false,
    view: url.view,
    layers: url.layers as SystemId[],
    opacity: { ...DEFAULT_OPACITY },
    region: url.region as RegionId,
    variant: url.variant,
    demo: null,
    announcement: '',
  }
  return url.structureId ? reveal(base, url.structureId) : base
}

/**
 * Selecting something that is not currently drawn makes it drawable: its layer is shown, the
 * matching reproductive variant is chosen, and a region filter that excludes it is cleared.
 * Nothing is changed silently: the announcement says what was turned on.
 */
function reveal(state: AtlasState, id: string): AtlasState {
  const s = findStructure(id)
  if (!s) return state
  const notes: string[] = []
  let { layers, variant, region } = state
  const systems = [s.system, ...(s.alsoIn ?? [])]
  if (!systems.some((sys) => layers.includes(sys))) {
    layers = ordered([...layers, s.system])
    notes.push(`${getSystem(s.system).name} layer shown`)
  }
  if (s.variant && variant !== s.variant) {
    variant = s.variant
    notes.push(`reproductive layer showing the typical ${s.variant} configuration`)
  }
  if (region !== 'whole-body' && s.region !== region && s.region !== 'whole-body') {
    region = 'whole-body'
    notes.push('region filter cleared')
  }
  return {
    ...state,
    layers,
    variant,
    region,
    selected: id,
    isolated: state.isolated && state.selected === id,
    isolatePair: state.isolatePair && state.selected === id,
    announcement: `${s.name} selected.${notes.length ? ` ${notes.join('; ')}.` : ''}`,
  }
}

export function atlasReducer(state: AtlasState, action: AtlasAction): AtlasState {
  switch (action.type) {
    case 'replace':
      return { ...action.state, announcement: action.announcement }
    case 'select':
      return findStructure(action.id) ? { ...reveal(state, action.id), isolated: false, isolatePair: false } : state
    case 'clearSelection':
      return { ...state, selected: null, isolated: false, isolatePair: false, announcement: 'Selection cleared.' }
    case 'isolate':
      return state.selected ? { ...state, isolated: true, isolatePair: false, demo: null, announcement: `Showing only ${findStructure(state.selected)!.name}.` } : state
    case 'isolatePair': {
      const s = state.selected ? findStructure(state.selected) : undefined
      if (!s?.pairId) return state
      return { ...state, isolated: true, isolatePair: true, demo: null, announcement: `Showing only ${s.name} and ${findStructure(s.pairId)!.name}.` }
    }
    case 'showAll':
      return { ...state, isolated: false, isolatePair: false, announcement: 'Showing all visible layers.' }
    case 'toggleMusculoskeletal': {
      const both = state.layers.includes('skeletal') && state.layers.includes('muscular')
      const layers = both ? state.layers.filter((l) => l !== 'skeletal' && l !== 'muscular') : ordered([...state.layers, 'skeletal', 'muscular'])
      return { ...state, layers, announcement: both ? 'Skeletal and muscular layers hidden.' : 'Skeletal and muscular layers shown.' }
    }
    case 'startDemo': {
      const m = findMovement(action.id)
      if (!m) return state
      return { ...state, isolated: false, isolatePair: false, demo: { id: action.id, side: action.side, t: 0 }, announcement: `${m.name} demonstration, ${action.side} side, at the reference posture.` }
    }
    case 'setDemoSide':
      return state.demo ? { ...state, demo: { ...state.demo, side: action.side }, announcement: `Showing the ${action.side} side.` } : state
    case 'setDemoT':
      return state.demo ? { ...state, demo: { ...state.demo, t: Math.min(1, Math.max(0, action.t)) } } : state
    case 'exitDemo':
      return { ...state, demo: null, announcement: 'Demonstration closed.' }
    case 'setView':
      return { ...state, view: action.view, announcement: `${action.view === 'front' ? 'Front (anterior)' : action.view === 'back' ? 'Back (posterior)' : 'Side (left lateral)'} view.` }
    case 'toggleLayer': {
      const on = state.layers.includes(action.system)
      if (action.system === 'reproductive' && !on && !state.variant) {
        // The reproductive layer needs a chosen configuration; the panel asks for one first.
        return state
      }
      const layers = on ? state.layers.filter((l) => l !== action.system) : ordered([...state.layers, action.system])
      const variant = action.system === 'reproductive' && on ? null : state.variant
      return { ...state, layers, variant, announcement: `${getSystem(action.system).name} layer ${on ? 'hidden' : 'shown'}.` }
    }
    case 'setLayers':
      return { ...state, layers: ordered(action.layers.filter((l) => l !== 'reproductive' || state.variant)), announcement: action.layers.length ? 'Layers updated.' : 'All layers hidden.' }
    case 'setOpacity':
      return { ...state, opacity: { ...state.opacity, [action.system]: Math.min(1, Math.max(MIN_OPACITY, action.value)) } }
    case 'setRegion':
      return { ...state, region: action.region, announcement: `Region: ${getRegion(action.region).name}.` }
    case 'setVariant': {
      if (action.variant === null) {
        const sel = state.selected ? findStructure(state.selected) : undefined
        return {
          ...state,
          variant: null,
          layers: state.layers.filter((l) => l !== 'reproductive'),
          selected: sel?.variant ? null : state.selected,
          announcement: 'Reproductive layer hidden.',
        }
      }
      const sel = state.selected ? findStructure(state.selected) : undefined
      return {
        ...state,
        variant: action.variant,
        layers: ordered([...state.layers, 'reproductive']),
        // A structure from the other configuration can't stay selected.
        selected: sel?.variant && sel.variant !== action.variant ? null : state.selected,
        announcement: `Reproductive layer: typical ${action.variant} configuration.`,
      }
    }
  }
}

export function atlasShareState(state: AtlasState): AtlasUrlState {
  return { structureId: state.selected, view: state.view, layers: state.layers, region: state.region, variant: state.variant }
}

export const DEFAULT_LAYERS = ATLAS_CONFIG.defaultLayers as SystemId[]

export const VIEW_TEXT: Record<AtlasView, string> = {
  front: 'Front (anterior) view: the body’s right is on your left.',
  back: 'Back (posterior) view: the body’s right is on your right.',
  side: 'Side view from the body’s left (left lateral): anterior is on your left.',
}

/** Camera direction for each view (from the body towards the camera), in body coordinates. */
export const VIEW_DIRECTIONS: Record<AtlasView, readonly [number, number, number]> = {
  front: [0, 0.08, 1],
  back: [0, 0.08, -1],
  // Left lateral: the camera is on the body's left (+x), looking at its left side.
  side: [1, 0.08, 0],
}

/**
 * The body axis that points to the right of the screen for a view (camera up is +y):
 * right = forward × up, with forward = −direction. Used to check the view descriptions.
 */
export function screenRight(view: AtlasView): [number, number, number] {
  const [dx, , dz] = VIEW_DIRECTIONS[view]
  // forward = (−dx, ·, −dz); forward × (0, 1, 0) = (dz, 0, −dx) after dropping the small tilt.
  return [dz === 0 ? 0 : Math.sign(dz), 0, dx === 0 ? 0 : -Math.sign(dx)]
}
