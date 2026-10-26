import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { ATLAS_SYSTEMS, findStructure, getRegion, getSystem, inSystem, type RegionId, type ReproductiveVariant, type SystemId } from '../../../data/anatomy/atlas'
import { findMovement, type MovementId, type Side } from '../../../data/anatomy/atlas/movements'
import { findTour, type AtlasTour } from '../../../data/anatomy/atlas/tours'
import { findRelationExploration, type RelationExploration } from '../../../data/anatomy/atlas/relationships'
import type { AtlasUrlState, AtlasView } from '../../../lib/urlState'

export interface AtlasState {
  selected: string | null
  /**
   * The system level of Body → System → Organ → Structure. With nothing selected the panel shows
   * this system's overview; with a structure selected it is the system it was reached through.
   */
  system: SystemId | null
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
  /** A guided tour in progress (never stored in links); `before` is restored on exit. */
  tour: { id: AtlasTour['id']; step: number; before: AtlasSnapshot } | null
  /** A curated relationship exploration (never stored in links); `before` is restored on exit. */
  relation: { id: RelationExploration['id']; before: AtlasSnapshot } | null
  /** Why the last selection changed the view (a hidden layer shown, the region cleared), in words. */
  revealNote: string | null
  announcement: string
}

export type AtlasSnapshot = Omit<AtlasState, 'tour' | 'relation' | 'announcement'>

export type AtlasAction =
  | { type: 'select'; id: string }
  /** "Where is it?": select a structure and focus its body region. */
  | { type: 'locate'; id: string }
  | { type: 'startRelation'; id: RelationExploration['id'] }
  | { type: 'exitRelation' }
  | { type: 'clearSelection' }
  /** Opens a system's overview (the System level). */
  | { type: 'openSystem'; system: SystemId }
  /** Up one level: structure → its group (organ level) → its system → the whole body. */
  | { type: 'back' }
  /** Draw only the current system's layer. */
  | { type: 'isolateSystem' }
  /** Back to the default layers, keeping the current system's layer. */
  | { type: 'showAllLayers' }
  | { type: 'isolate' }
  | { type: 'isolatePair' }
  | { type: 'showAll' }
  | { type: 'toggleMusculoskeletal' }
  | { type: 'startDemo'; id: MovementId; side: Side }
  | { type: 'setDemoSide'; side: Side }
  | { type: 'setDemoT'; t: number }
  | { type: 'exitDemo' }
  | { type: 'showSystem'; system: SystemId }
  | { type: 'startTour'; id: AtlasTour['id'] }
  | { type: 'tourNext' }
  | { type: 'tourPrevious' }
  | { type: 'tourGoTo'; index: number }
  | { type: 'exitTour' }
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
    system: (url.system as SystemId | null) ?? null,
    isolated: false,
    isolatePair: false,
    view: url.view,
    layers: url.layers as SystemId[],
    opacity: { ...DEFAULT_OPACITY },
    region: url.region as RegionId,
    variant: url.variant,
    demo: null,
    tour: null,
    relation: null,
    revealNote: null,
    announcement: '',
  }
  if (url.structureId) return reveal(base, url.structureId)
  return base.system ? { ...base, layers: base.layers.includes(base.system) ? base.layers : ordered([...base.layers, base.system]) } : base
}

/** The system a structure is shown in: the current one if it belongs to it, otherwise its own. */
const systemFor = (state: AtlasState, id: string): SystemId | null => {
  const s = findStructure(id)
  if (!s) return state.system
  return state.system && inSystem(s, state.system) ? state.system : s.system
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
  const why: string[] = []
  let { layers, variant, region } = state
  const systems = [s.system, ...(s.alsoIn ?? [])]
  if (!systems.some((sys) => layers.includes(sys))) {
    layers = ordered([...layers, s.system])
    notes.push(`${getSystem(s.system).name} layer shown`)
    why.push(`the ${getSystem(s.system).name.toLowerCase()} layer was hidden, so it has been turned on`)
  }
  if (s.variant && variant !== s.variant) {
    variant = s.variant
    notes.push(`reproductive layer showing the typical ${s.variant} configuration`)
    why.push(`it belongs to the typical ${s.variant} configuration, which is now shown`)
  }
  if (region !== 'whole-body' && s.region !== region && s.region !== 'whole-body') {
    why.push(`it lies outside the ${getRegion(region).name.toLowerCase()} region, so the region filter has been cleared`)
    region = 'whole-body'
    notes.push('region filter cleared')
  }
  return {
    ...state,
    layers,
    variant,
    region,
    selected: id,
    system: systemFor(state, id),
    isolated: state.isolated && state.selected === id,
    isolatePair: state.isolatePair && state.selected === id,
    revealNote: why.length ? `To show ${s.name}: ${why.join('; ')}.` : null,
    announcement: `${s.name} selected.${notes.length ? ` ${notes.join('; ')}.` : ''}`,
  }
}

/** Regions a structure can be focused in ("Where is it?"); structures spread over the body keep the whole body. */
const FOCUSABLE: readonly RegionId[] = ['head-neck', 'thorax', 'abdomen', 'pelvis', 'back', 'upper-limb', 'lower-limb']

const tourStepText = (tourId: AtlasTour['id'], index: number) => {
  const t = findTour(tourId)!
  const step = t.steps[index]
  return `Step ${index + 1} of ${t.steps.length}: ${step.title}. ${step.text}`
}

const snapshot = ({ tour: _t, relation: _r, announcement: _a, ...rest }: AtlasState): AtlasSnapshot => rest

export function atlasReducer(state: AtlasState, action: AtlasAction): AtlasState {
  // While a tour runs, only tour navigation and view-only changes apply; everything else waits.
  if (state.tour && !['tourNext', 'tourPrevious', 'tourGoTo', 'exitTour', 'replace', 'setView', 'setOpacity'].includes(action.type)) {
    return action.type === 'select' || action.type === 'locate' ? { ...state, announcement: 'Exit the tour to select structures.' } : state
  }
  // A relationship exploration likewise keeps its view until it is closed.
  if (state.relation && !['exitRelation', 'replace', 'setView', 'setOpacity'].includes(action.type)) {
    return action.type === 'select' || action.type === 'locate' ? { ...state, announcement: 'Close the relationship exploration to select other structures.' } : state
  }
  switch (action.type) {
    case 'replace':
      return { ...action.state, announcement: action.announcement }
    case 'select':
      return findStructure(action.id) ? { ...reveal(state, action.id), isolated: false, isolatePair: false } : state
    case 'locate': {
      const s = findStructure(action.id)
      if (!s) return state
      const next = { ...reveal({ ...state, demo: null }, action.id), isolated: false, isolatePair: false }
      const region = FOCUSABLE.includes(s.region) ? s.region : 'whole-body'
      return {
        ...next,
        region,
        announcement: `${next.announcement} ${region === 'whole-body' ? 'Shown in the whole body.' : `Focused on the ${getRegion(region).name.toLowerCase()}.`}`,
      }
    }
    case 'startRelation': {
      const e = findRelationExploration(action.id)
      if (!e) return state
      const before = snapshot({ ...state, demo: null })
      const layers = ordered(['integumentary', ...e.systems])
      return {
        ...state,
        demo: null,
        isolated: false,
        isolatePair: false,
        layers,
        region: e.region,
        selected: e.focus[0],
        relation: { id: e.id, before },
        announcement: `${e.title}: ${e.focus.length} structures highlighted. ${e.question}`,
      }
    }
    case 'exitRelation':
      return state.relation ? { ...state.relation.before, tour: null, relation: null, announcement: 'Relationship exploration closed; your previous view is back.' } : state
    case 'clearSelection':
      return { ...state, selected: null, system: null, isolated: false, isolatePair: false, announcement: 'Selection cleared.' }
    case 'openSystem': {
      const sys = getSystem(action.system)
      if (action.system === 'reproductive' && !state.variant) {
        // The reproductive layer needs a chosen configuration first (asked for in the overview).
        return { ...state, selected: null, system: action.system, isolated: false, isolatePair: false, demo: null, announcement: `${sys.name} system. Choose a configuration to draw it.` }
      }
      const shown = state.layers.includes(action.system)
      return {
        ...state,
        selected: null,
        system: action.system,
        isolated: false,
        isolatePair: false,
        demo: null,
        layers: shown ? state.layers : ordered([...state.layers, action.system]),
        announcement: `${sys.name} system.${shown ? '' : ' Its layer has been turned on.'}`,
      }
    }
    case 'back': {
      const s = state.selected ? findStructure(state.selected) : undefined
      if (s) {
        const parent = s.parent ? findStructure(s.parent) : undefined
        if (parent && state.system && inSystem(parent, state.system)) return { ...reveal(state, parent.id), isolated: false, isolatePair: false, announcement: `Back to ${parent.name}.` }
        return { ...state, selected: null, system: state.system ?? s.system, isolated: false, isolatePair: false, announcement: `Back to the ${getSystem(state.system ?? s.system).name} system.` }
      }
      return state.system ? { ...state, system: null, announcement: 'Back to the whole body.' } : state
    }
    case 'isolateSystem':
      return state.system && (state.system !== 'reproductive' || state.variant)
        ? { ...state, layers: [state.system], isolated: false, isolatePair: false, announcement: `Showing only the ${getSystem(state.system).name} layer.` }
        : state
    case 'showAllLayers': {
      const layers = ordered([...DEFAULT_LAYERS, ...(state.system && (state.system !== 'reproductive' || state.variant) ? [state.system] : [])])
      return { ...state, layers, isolated: false, isolatePair: false, announcement: 'Showing the default layers again.' }
    }
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
    case 'showSystem': {
      const layers = ordered(action.system === 'integumentary' ? ['integumentary'] : ['integumentary', action.system])
      return { ...state, layers, system: action.system, region: 'whole-body', isolated: false, isolatePair: false, demo: null, announcement: `Showing the ${getSystem(action.system).name} system.` }
    }
    case 'startTour': {
      const t = findTour(action.id)
      if (!t) return state
      return { ...state, demo: null, isolated: false, isolatePair: false, tour: { id: t.id, step: 0, before: snapshot({ ...state, demo: null }) }, announcement: `${t.title}: tour started. ${tourStepText(t.id, 0)}` }
    }
    case 'tourNext':
    case 'tourPrevious':
    case 'tourGoTo': {
      if (!state.tour) return state
      const n = findTour(state.tour.id)!.steps.length
      const index = action.type === 'tourGoTo' ? action.index : state.tour.step + (action.type === 'tourNext' ? 1 : -1)
      if (index < 0 || index >= n || index === state.tour.step) return state
      return { ...state, tour: { ...state.tour, step: index }, announcement: tourStepText(state.tour.id, index) }
    }
    case 'exitTour':
      return state.tour ? { ...state.tour.before, tour: null, relation: null, announcement: 'Tour ended; your previous view is back.' } : state
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

/** What links, saves and notes store: during a tour, the view the tour will restore. */
export function atlasShareState(state: AtlasState): AtlasUrlState {
  const s = state.tour ? state.tour.before : state.relation ? state.relation.before : state
  // A structure's own system is implied by the structure, so only a different one is stored.
  const own = s.selected ? findStructure(s.selected)?.system : undefined
  return { structureId: s.selected, system: s.system && s.system !== own ? s.system : null, view: s.view, layers: s.layers, region: s.region, variant: s.variant }
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
