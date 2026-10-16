import { findHeartPart, FLOW_STEPS, type HeartPartId, type HeartView } from '../../data/anatomy/heart'

export interface AnatomyState {
  view: HeartView
  selected: HeartPartId | null
  isolated: boolean
  /** Index into FLOW_STEPS while the blood-flow tour is running, otherwise null. */
  tourStep: number | null
  /** Exploration state saved when the tour starts and restored when it ends. */
  beforeTour: { view: HeartView; selected: HeartPartId | null; isolated: boolean } | null
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

export function initialAnatomyState(partId: string | null, view: HeartView): AnatomyState {
  const part = partId ? findHeartPart(partId) : undefined
  return {
    // A structure inside the heart is only visible in the cutaway view.
    view: part?.internal ? 'cutaway' : view,
    selected: part?.id ?? null,
    isolated: false,
    tourStep: null,
    beforeTour: null,
    announcement: '',
  }
}

function stepAnnouncement(index: number): string {
  const step = FLOW_STEPS[index]
  return `Step ${index + 1} of ${FLOW_STEPS.length}: ${step.title}. ${step.text}`
}

export function anatomyReducer(state: AnatomyState, action: AnatomyAction): AnatomyState {
  switch (action.type) {
    case 'select': {
      const part = findHeartPart(action.partId)
      if (!part || state.tourStep !== null) return state
      const view = part.internal && state.view === 'whole' ? 'cutaway' : state.view
      return {
        ...state,
        selected: part.id,
        view,
        announcement: `${part.name} selected.${view !== state.view ? ' Switched to cutaway view.' : ''}`,
      }
    }

    case 'clearSelection':
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
      if (!state.selected || state.isolated || state.tourStep !== null) return state
      return { ...state, isolated: true, announcement: `Showing only the ${findHeartPart(state.selected)!.name.toLowerCase()}.` }

    case 'showAll':
      if (!state.isolated) return state
      return { ...state, isolated: false, announcement: 'Showing all structures.' }

    case 'startTour':
      if (state.tourStep !== null) return state
      return {
        ...state,
        // The tour passes through valves, so it uses the cutaway view with everything shown.
        beforeTour: { view: state.view, selected: state.selected, isolated: state.isolated },
        view: 'cutaway',
        isolated: false,
        tourStep: 0,
        announcement: `Blood-flow tour started. ${stepAnnouncement(0)}`,
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
  }
}

/**
 * The single shareable state used by the address bar, Copy link and Save exploration.
 * During the tour it is the exploration state saved before the tour; tour progress is never shared.
 */
export function anatomyShareState(state: AnatomyState): { partId: HeartPartId | null; heartView: HeartView } {
  if (state.tourStep !== null && state.beforeTour) {
    return { partId: state.beforeTour.selected, heartView: state.beforeTour.view }
  }
  return { partId: state.selected, heartView: state.view }
}
