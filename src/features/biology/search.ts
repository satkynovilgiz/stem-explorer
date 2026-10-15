import { ORGANELLES } from '../../data/biology/organelles'
import type { Organelle } from '../../data/biology/types'
import { normalize } from '../../lib/chemistry'

/** Matches names, tags, IDs and glossary terms, ignoring case. */
export function searchOrganelles(query: string): Organelle[] {
  const q = normalize(query)
  if (!q) return [...ORGANELLES]
  return ORGANELLES.filter((o) =>
    [o.name, o.instanceName ?? '', o.tag, o.id.replace(/-/g, ' '), ...o.glossary.map((g) => g.term)].some((t) =>
      normalize(t).includes(q),
    ),
  )
}
