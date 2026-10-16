import { findHeartPart, FLOW_STEPS, type HeartPartId, type HeartView } from '../../data/anatomy/heart'
import { isVessel, type VesselId } from '../../data/anatomy/vessels'

export interface AnatomyState {
  view: HeartView
  selected: HeartPartId | null
  isolated: boolean
  /** Index into FLOW_STEPS while the blood-flow tour is running, otherwise null. */
  tourStep: number | null
  /** Exploration state saved when the tour starts and restored when it ends. */
  beforeTour: { view: HeartView; selected: HeartPartId | null; isolated: boolean } | null
  /**
   * Vessel comparison mode, or null. While comparing, the single selection and isolation are off;
   * picks fill A, then B, then replace B. Not available during the tour.
   */
  compare: { a: VesselId | null; b: VesselId | null } | null
  announcement: string
}

export type AnatomyAction =
  | { type: 'select'; partId: string }
  | { type: 'clearSelection' }
  | { type: 'setView'; view: HeartView }
  | { type: 'isolate' }
  | { type: 'showAll' }
  | { type: 'startTour' }
  | { type: 'nextStep' }
  | { type: 'previousStep' }
  | { type: 'goToStep'; index: number }
  | { type: 'exitTour' }
  | { type: 'enterCompare' }
  | { type: 'exitCompare' }
  | { type: 'compareClear'; slot: 'a' | 'b' | 'both' }
  | { type: 'comparePreset'; a: VesselId; b: VesselId }
  /** Replaces the whole state: a guided activity's setup, or restoring the state from before it. */
  | { type: 'replace'; state: AnatomyState; announcement: string }

export function initialAnatomyState(partId: string | null, view: HeartView): AnatomyState {
  const part = partId ? findHeartPart(partId) : undefined
  return {
    // A structure inside the heart is only visible in the cutaway view.
    view: part?.internal ? 'cutaway' : view,
    selected: part?.id ?? null,
    isolated: false,
    tourStep: null,
    beforeTour: null,
    compare: null,
    announcement: '',
  }
}

function stepAnnouncement(index: number): string {
  const step = FLOW_STEPS[index]
  return `Step ${index + 1} of ${FLOW_STEPS.length}: ${step.title}. ${step.text}`
}

export function anatomyReducer(state: AnatomyState, action: AnatomyAction): AnatomyState {
  switch (action.type) {
    case 'replace':
      return { ...action.state, announcement: action.announcement }
    case 'select': {
      const part = findHeartPart(action.partId)
      if (!part || state.tourStep !== null) return state
      if (state.compare) return comparePick(state, part.id)
      const view = part.internal && state.view === 'whole' ? 'cutaway' : state.view
      return {
        ...state,
        selected: part.id,
        view,
        announcement: `${part.name} selected.${view !== state.view ? ' Switched to cutaway view.' : ''}`,
      }
    }

    case 'clearSelection':
      if (state.compare) return anatomyReducer(state, { type: 'compareClear', slot: 'both' })
      if (state.tourStep !== null || (!state.selected && !state.isolated)) return state
      return { ...state, selected: null, isolated: false, announcement: 'Selection cleared. Showing all structures.' }

    case 'setView': {
      if (action.view === state.view) return state
      const part = state.selected ? findHeartPart(state.selected) : undefined
      const hidden = action.view === 'whole' && part?.internal
      return {
        ...state,
        view: action.view,
        isolated: false,
        announcement: `${action.view === 'whole' ? 'Whole heart' : 'Cutaway'} view.${hidden ? ` ${part.name} is inside the heart and hidden in this view.` : ''}`,
      }
    }

    case 'isolate':
      if (!state.selected || state.isolated || state.tourStep !== null || state.compare) return state
      return { ...state, isolated: true, announcement: `Showing only the ${findHeartPart(state.selected)!.name.toLowerCase()}.` }

    case 'showAll':
      if (!state.isolated) return state
      return { ...state, isolated: false, announcement: 'Showing all structures.' }

    case 'startTour': {
      if (state.tourStep !== null) return state
      // Starting the tour leaves comparison mode; Exit tour returns to normal exploring, not to the comparison.
      const base = state.compare ? { ...state, compare: null, selected: state.compare.a } : state
      return {
        ...base,
        // The tour passes through valves, so it uses the cutaway view with everything shown.
        beforeTour: { view: base.view, selected: base.selected, isolated: base.isolated },
        view: 'cutaway',
        isolated: false,
        tourStep: 0,
        announcement: `${state.compare ? 'Comparison closed. ' : ''}Blood-flow tour started. ${stepAnnouncement(0)}`,
      }
    }

    case 'nextStep':
    case 'previousStep':
    case 'goToStep': {
      if (state.tourStep === null) return state
      const target =
        action.type === 'nextStep' ? state.tourStep + 1 : action.type === 'previousStep' ? state.tourStep - 1 : action.index
      if (!Number.isInteger(target) || target < 0 || target >= FLOW_STEPS.length || target === state.tourStep) return state
      return { ...state, tourStep: target, announcement: stepAnnouncement(target) }
    }

    case 'exitTour': {
      if (state.tourStep === null) return state
      const restore = state.beforeTour ?? { view: state.view, selected: state.selected, isolated: false }
      return { ...state, ...restore, tourStep: null, beforeTour: null, announcement: 'Blood-flow tour ended.' }
    }

    case 'enterCompare': {
      if (state.compare || state.tourStep !== null) return state
      const a = state.selected && isVessel(state.selected) ? state.selected : null
      return {
        ...state,
        compare: { a, b: null },
        selected: null,
        isolated: false,
        announcement: `Comparing vessels.${a ? ` ${findHeartPart(a)!.name} is vessel A; choose vessel B.` : ' Choose vessel A.'}`,
      }
    }

    case 'exitCompare': {
      if (!state.compare) return state
      // Leaving keeps vessel A selected, so you can carry on exploring it.
      return { ...state, selected: state.compare.a, compare: null, announcement: 'Comparison closed.' }
    }

    case 'compareClear': {
      if (!state.compare) return state
      const compare =
        action.slot === 'both' ? { a: null, b: null } : action.slot === 'a' ? { a: state.compare.b, b: null } : { a: state.compare.a, b: null }
      return { ...state, compare, announcement: action.slot === 'both' ? 'Both vessels cleared.' : `Vessel ${action.slot.toUpperCase()} cleared.` }
    }

    case 'comparePreset': {
      if (state.tourStep !== null) return state
      return {
        ...state,
        compare: { a: action.a, b: action.b },
        selected: null,
        isolated: false,
        announcement: `Comparing ${findHeartPart(action.a)!.name} (A) with ${findHeartPart(action.b)!.name} (B).`,
      }
    }
  }
}

/** A pick while comparing: fills A, then B; with both full it replaces B. Non-vessels are refused. */
function comparePick(state: AnatomyState, id: HeartPartId): AnatomyState {
  const compare = state.compare!
  const name = findHeartPart(id)!.name
  if (!isVessel(id)) return { ...state, announcement: `Only blood vessels can be compared; ${name} is not a vessel.` }
  if (compare.a === id || compare.b === id) return { ...state, announcement: `${name} is already being compared.` }
  if (!compare.a) return { ...state, compare: { ...compare, a: id }, announcement: `${name} is vessel A.` }
  if (!compare.b) return { ...state, compare: { ...compare, b: id }, announcement: `${name} is vessel B.` }
  return { ...state, compare: { ...compare, b: id }, announcement: `Vessel B replaced with ${name}.` }
}

/**
 * The single shareable state used by the address bar, Copy link and Save exploration.
 * During the tour it is the exploration state saved before the tour; tour progress is never shared.
 */
export function anatomyShareState(state: AnatomyState): { partId: HeartPartId | null; heartView: HeartView } {
  if (state.tourStep !== null && state.beforeTour) {
    return { partId: state.beforeTour.selected, heartView: state.beforeTour.view }
  }
  // While comparing, links share vessel A (comparison itself is not stored in links).
  if (state.compare) return { partId: state.compare.a, heartView: state.view }
  return { partId: state.selected, heartView: state.view }
}
