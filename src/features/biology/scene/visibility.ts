import { ORGANELLE_IDS, type CellView, type OrganelleId } from '../../../data/biology/types'
import type { BiologySelection } from '../state'

/** Which structure types are drawn. Anything not drawn cannot intercept clicks. */
export function visibleStructures(view: CellView, selection: BiologySelection | null, isolated: boolean): Set<OrganelleId> {
  if (isolated && selection) return new Set([selection.organelleId])
  if (view === 'whole') return new Set(['plasma-membrane'])
  return new Set<OrganelleId>(ORGANELLE_IDS)
}
