import { findOrganelle, hasStructure, instanceCount, isInternal } from '../../data/biology/organelles'
import type { CellType, CellView, OrganelleId } from '../../data/biology/types'

export interface BiologySelection {
  organelleId: OrganelleId
  /** Which copy of a repeated structure (0-based); null means the structure type as a whole. */
  instance: number | null
}

export interface BiologyState {
  /** Which simplified model is shown; selections are always valid for it. */
  cellType: CellType
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
  | { type: 'setCellType'; cellType: CellType }
  /** Replaces the whole state: a guided activity's setup, or restoring the state from before it. */
  | { type: 'replace'; state: BiologyState; announcement: string }

export function initialBiologyState(structureId: string | null, view: CellView, cellType: CellType = 'animal'): BiologyState {
  const organelle = structureId && hasStructure(cellType, structureId) ? findOrganelle(structureId) : undefined
  return {
    cellType,
    // An internal structure in the URL is only visible in the cutaway view.
    view: organelle && isInternal(cellType, organelle.id) ? 'cutaway' : view,
    selection: organelle ? { organelleId: organelle.id, instance: null } : null,
    isolated: false,
    announcement: '',
  }
}

export function instanceLabel(organelleId: OrganelleId, instance: number, cellType: CellType = 'animal'): string {
  const organelle = findOrganelle(organelleId)
  return `${organelle?.instanceName ?? organelle?.name ?? organelleId} ${instance + 1} of ${instanceCount(cellType, organelleId) ?? 1}`
}

export function biologyReducer(state: BiologyState, action: BiologyAction): BiologyState {
  switch (action.type) {
    case 'replace':
      return { ...action.state, announcement: action.announcement }
    case 'select': {
      // Structures that are not part of the current model can't be selected.
      if (!hasStructure(state.cellType, action.organelleId)) return state
      const organelle = findOrganelle(action.organelleId)!
      const count = instanceCount(state.cellType, organelle.id)
      const requested = action.instance ?? null
      const instance = count && requested !== null && requested >= 0 && requested < count ? requested : null
      // Selecting something inside the cell from the whole-cell view opens the cutaway so it is visible.
      const view = isInternal(state.cellType, organelle.id) && state.view === 'whole' ? 'cutaway' : state.view
      const name = instance !== null ? instanceLabel(organelle.id, instance, state.cellType) : organelle.name
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
      const hidden = action.view === 'whole' && selected && isInternal(state.cellType, selected.id)
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

    case 'setCellType': {
      if (action.cellType === state.cellType) return state
      const name = action.cellType === 'plant' ? 'Plant cell' : action.cellType === 'bacterium' ? 'Bacterial cell' : 'Animal cell'
      const current = state.selection ? findOrganelle(state.selection.organelleId) : undefined
      // A structure both models share stays selected (as a whole type: copies differ between models).
      // Anything the new model lacks is cleared, and isolation ends either way.
      const keep = current && hasStructure(action.cellType, current.id)
      const selection = keep ? { organelleId: current.id, instance: null } : null
      const view = keep && isInternal(action.cellType, current.id) && state.view === 'whole' ? 'cutaway' : state.view
      return {
        ...state,
        cellType: action.cellType,
        selection,
        view,
        isolated: false,
        announcement: current && !keep ? `${name}. ${current.name} are not part of this model, so the selection was cleared.` : `${name}.`,
      }
    }
  }
}
