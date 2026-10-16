import { findMolecule } from '../../data/chemistry/molecules'
import type { Representation } from '../../data/chemistry/types'
import {
  ATOMS_REQUIRED,
  formatAngle,
  formatDistance,
  measure,
  measurementLabel,
  pickAtom,
  type InteractionMode,
} from '../../lib/measurement'

export interface ChemistryState {
  moleculeId: string
  representation: Representation
  mode: InteractionMode
  /** Atom shown in the info panel while inspecting. */
  inspectedAtomId: string | null
  /** Ordered atom IDs for the active distance or angle measurement. */
  measureSelection: string[]
  /** Short message for screen readers about the last meaningful change. */
  announcement: string
}

export type ChemistryAction =
  | { type: 'selectMolecule'; moleculeId: string }
  | { type: 'setRepresentation'; representation: Representation }
  | { type: 'setMode'; mode: InteractionMode }
  | { type: 'pickAtom'; atomId: string }
  | { type: 'clearSelection' }
  /** Replaces the whole state: a guided activity's setup, or restoring the state from before it. */
  | { type: 'replace'; state: ChemistryState; announcement: string }

export function initialChemistryState(moleculeId: string, representation: Representation): ChemistryState {
  return {
    moleculeId,
    representation,
    mode: 'inspect',
    inspectedAtomId: null,
    measureSelection: [],
    announcement: '',
  }
}

const MODE_NAMES: Record<InteractionMode, string> = {
  inspect: 'Inspect',
  distance: 'Distance',
  angle: 'Angle',
}

export function chemistryReducer(state: ChemistryState, action: ChemistryAction): ChemistryState {
  switch (action.type) {
    case 'replace':
      return { ...action.state, announcement: action.announcement }
    case 'selectMolecule': {
      const molecule = findMolecule(action.moleculeId)
      if (!molecule || molecule.id === state.moleculeId) return state
      // Atom IDs belong to one molecule, so any selection or measurement becomes stale.
      return {
        ...state,
        moleculeId: molecule.id,
        inspectedAtomId: null,
        measureSelection: [],
        announcement: `${molecule.name} loaded.`,
      }
    }

    case 'setRepresentation':
      return { ...state, representation: action.representation }

    case 'setMode':
      if (action.mode === state.mode) return state
      return {
        ...state,
        mode: action.mode,
        inspectedAtomId: null,
        measureSelection: [],
        announcement:
          action.mode === 'inspect'
            ? 'Inspect mode.'
            : `${MODE_NAMES[action.mode]} mode. Select ${ATOMS_REQUIRED[action.mode]} atoms.`,
      }

    case 'pickAtom': {
      const molecule = findMolecule(state.moleculeId)
      if (!molecule?.atoms.some((a) => a.id === action.atomId)) return state

      if (state.mode === 'inspect') {
        const same = state.inspectedAtomId === action.atomId
        return {
          ...state,
          inspectedAtomId: same ? null : action.atomId,
          announcement: same ? 'Selection cleared.' : `Atom ${action.atomId} selected.`,
        }
      }

      const { selection, outcome } = pickAtom(state.measureSelection, action.atomId, state.mode)
      if (outcome === 'duplicate') {
        return { ...state, announcement: `${action.atomId} is already selected. Choose a different atom.` }
      }
      const result = measure(molecule, selection, state.mode)
      let announcement = `${action.atomId} selected (${selection.length} of ${ATOMS_REQUIRED[state.mode]}).`
      if (outcome === 'restarted') announcement = `New measurement started with ${action.atomId}.`
      if (result) {
        const value = result.kind === 'distance' ? formatDistance(result.value) : formatAngle(result.value)
        announcement = `${measurementLabel(result)} ${selection.join('–')}: ${value}.`
      }
      return { ...state, measureSelection: selection, announcement }
    }

    case 'clearSelection':
      if (!state.inspectedAtomId && state.measureSelection.length === 0) return state
      return {
        ...state,
        inspectedAtomId: null,
        measureSelection: [],
        announcement: state.mode === 'inspect' ? 'Selection cleared.' : 'Measurement cleared.',
      }
  }
}
