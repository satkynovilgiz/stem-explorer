import { CELL_STRUCTURES, OUTER_STRUCTURE } from '../../../data/biology/organelles'
import type { CellType, CellView, OrganelleId } from '../../../data/biology/types'
import type { BiologySelection } from '../state'

/** Which structure types are drawn. Anything not drawn cannot intercept clicks. */
export function visibleStructures(
  view: CellView,
  selection: BiologySelection | null,
  isolated: boolean,
  cellType: CellType = 'animal',
): Set<OrganelleId> {
  if (isolated && selection) return new Set([selection.organelleId])
  if (view === 'whole') return new Set([OUTER_STRUCTURE[cellType]])
  return new Set<OrganelleId>(CELL_STRUCTURES[cellType])
}
