import { relationsFor, type Relation } from '../data/related'
import type { Route } from './hooks'
import { findSearchItem, type SearchItem } from './searchIndex'

/**
 * The search-item ids that describe what an explorer is showing, read from its URL. Unknown or
 * invalid values simply match nothing, so this never needs its own validation.
 */
export function topicsForLocation(route: Route, search: string): string[] {
  const q = new URLSearchParams(search)
  switch (route) {
    case 'physics':
      return [`experiment:${q.get('experiment') ?? 'projectile'}`]
    case 'mathematics': {
      const sec = q.get('msec')
      if (sec === 'functions') return [`function:${q.get('fn') ?? 'sine'}`]
      if (sec === 'vectors') return ['tool:vectors']
      return [`surface:${q.get('surface') ?? 'plane'}`]
    }
    case 'chemistry': {
      const sec = q.get('csec')
      if (sec === 'periodic' || sec === 'atomic') return [`section:${sec}`, ...(q.get('el') ? [`element:${q.get('el')}`] : [])]
      if (sec === 'bonding') return ['section:bonding']
      return [`molecule:${q.get('molecule') ?? 'water'}`]
    }
    case 'biology': {
      const sec = q.get('bsec')
      if (sec === 'dna' || sec === 'division') return [`process:${sec}`]
      if (sec === 'energy') return ['process:photosynthesis', 'process:respiration']
      return [`cell:${q.get('type') ?? 'animal'}`, ...(q.get('structure') ? [`organelle:${q.get('structure')}`] : [])]
    }
    case 'anatomy': {
      if (q.has('part') || q.has('heart')) return ['structure:heart', 'subject:anatomy']
      const atlas = q.get('atlas')
      return atlas ? [`structure:${atlas}`] : ['subject:anatomy']
    }
    default:
      return []
  }
}

export interface ResolvedRelation {
  relation: Relation
  others: SearchItem[]
}

/** Relations for the current topics, with the other side resolved to openable search items. */
export function relatedForLocation(route: Route, search: string): ResolvedRelation[] {
  return relationsFor(topicsForLocation(route, search))
    .map(({ relation, others }) => ({ relation, others: others.map(findSearchItem).filter((i): i is SearchItem => Boolean(i)) }))
    .filter((r) => r.others.length > 0)
}
