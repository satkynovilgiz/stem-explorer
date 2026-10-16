import { structuresOf } from '../../data/biology/organelles'
import type { CellType, Organelle } from '../../data/biology/types'
import { normalize } from '../../lib/chemistry'

/** Matches names, tags, IDs and glossary terms, ignoring case. */
export function searchOrganelles(query: string, cellType: CellType = 'animal'): Organelle[] {
  const q = normalize(query)
  const all = structuresOf(cellType)
  if (!q) return all
  return all.filter((o) =>
    [o.name, o.instanceName ?? '', o.tag, o.id.replace(/-/g, ' '), ...o.glossary.map((g) => g.term)].some((t) =>
      normalize(t).includes(q),
    ),
  )
}
