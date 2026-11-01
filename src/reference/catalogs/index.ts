import type { SubjectId } from '../../data/subjects'
import type { ReferenceEntry } from '../types'

/*
 * One catalog per subject, each its own chunk: a reference page loads only the subject it shows,
 * and the homepage loads none of them (it reads counts from generated/counts.json).
 */
const LOADERS: Record<SubjectId, () => Promise<readonly ReferenceEntry[]>> = {
  anatomy: () => import('./anatomy').then((m) => m.ENTRIES),
  chemistry: () => import('./chemistry').then((m) => m.ENTRIES),
  physics: () => import('./physics').then((m) => m.ENTRIES),
  mathematics: () => import('./mathematics').then((m) => m.ENTRIES),
  biology: () => import('./biology').then((m) => m.ENTRIES),
}

const cache = new Map<SubjectId, Promise<readonly ReferenceEntry[]>>()

export function loadCatalog(subject: SubjectId): Promise<readonly ReferenceEntry[]> {
  let p = cache.get(subject)
  if (!p) {
    p = LOADERS[subject]()
    // A failed load (offline, deploy in progress) can be retried.
    p.catch(() => cache.delete(subject))
    cache.set(subject, p)
  }
  return p
}

export const loadAllCatalogs = (subjects: readonly SubjectId[]) => Promise.all(subjects.map(loadCatalog)).then((xs) => xs.flat())
