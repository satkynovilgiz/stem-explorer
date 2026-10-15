import { findOrganelle, INSTANCE_COUNTS } from '../../data/biology/organelles'
import type { CellView, OrganelleId } from '../../data/biology/types'

export interface BiologySelection {
  organelleId: OrganelleId
  /** Which copy of a repeated structure (0-based); null means the structure type as a whole. */
  instance: number | null
}

export interface BiologyState {
  view: CellView
  selection: BiologySelection | null
  /** Show only the selected structure type. */
  isolated: boolean
  /** Short message for screen readers about the last meaningful change. */
  announcement: string
}

export type BiologyAction =
  | { type: 'select'; organelleId: string; instance?: number | null }
  | { type: 'clearSelection' }
  | { type: 'setView'; view: CellView }
  | { type: 'isolate' }
  | { type: 'showAll' }

export function initialBiologyState(structureId: string | null, view: CellView): BiologyState {
  const organelle = structureId ? findOrganelle(structureId) : undefined
  return {
    // An internal structure in the URL is only visible in the cutaway view.
    view: organelle?.internal ? 'cutaway' : view,
    selection: organelle ? { organelleId: organelle.id, instance: null } : null,
    isolated: false,
    announcement: '',
  }
}

export function instanceLabel(organelleId: OrganelleId, instance: number): string {
  const organelle = findOrganelle(organelleId)
  return `${organelle?.instanceName ?? organelle?.name ?? organelleId} ${instance + 1} of ${INSTANCE_COUNTS[organelleId] ?? 1}`
}

export function biologyReducer(state: BiologyState, action: BiologyAction): BiologyState {
  switch (action.type) {
    case 'select': {
      const organelle = findOrganelle(action.organelleId)
      if (!organelle) return state
      const count = INSTANCE_COUNTS[organelle.id]
      const requested = action.instance ?? null
      const instance = count && requested !== null && requested >= 0 && requested < count ? requested : null
      // Selecting something inside the cell from the whole-cell view opens the cutaway so it is visible.
      const view = organelle.internal && state.view === 'whole' ? 'cutaway' : state.view
      const name = instance !== null ? instanceLabel(organelle.id, instance) : organelle.name
      return {
        ...state,
        view,
        selection: { organelleId: organelle.id, instance },
        announcement:
          view !== state.view ? `${name} selected. Switched to cutaway view.` : `${name} selected.`,
      }
    }

    case 'clearSelection':
      if (!state.selection && !state.isolated) return state
      return { ...state, selection: null, isolated: false, announcement: 'Selection cleared. Showing all structures.' }

    case 'setView': {
      if (action.view === state.view) return state
      const selected = state.selection ? findOrganelle(state.selection.organelleId) : undefined
      const hidden = action.view === 'whole' && selected?.internal
      return {
        ...state,
        view: action.view,
        isolated: false,
        announcement:
          (action.view === 'whole' ? 'Whole-cell view.' : 'Cutaway view.') +
          (hidden ? ` ${selected.name} is inside the cell and hidden in this view.` : ''),
      }
    }

    case 'isolate': {
      if (!state.selection || state.isolated) return state
      const organelle = findOrganelle(state.selection.organelleId)
      return { ...state, isolated: true, announcement: `Showing only ${organelle?.name ?? 'the selection'}.` }
    }

    case 'showAll':
      if (!state.isolated) return state
      return { ...state, isolated: false, announcement: 'Showing all structures.' }
  }
}
