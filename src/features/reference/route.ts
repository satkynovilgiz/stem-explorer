import { isSubjectId, type SubjectId } from '../../data/subjects'
import type { EntryType } from '../../reference/types'

/** `#/reference` (library) or `#/reference/<subject>/<id>` (one entry). */
export type ReferenceRoute = { page: 'library' } | { page: 'subject'; subject: SubjectId } | { page: 'entry'; subject: SubjectId; id: string } | { page: 'unknown'; path: string }

export function parseReferenceHash(hash: string): ReferenceRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] !== 'reference') return { page: 'unknown', path: hash }
  if (parts.length === 1) return { page: 'library' }
  const subject = parts[1]
  if (!isSubjectId(subject)) return { page: 'unknown', path: parts.slice(1).join('/') }
  if (parts.length === 2) return { page: 'subject', subject }
  if (parts.length === 3 && /^[a-z0-9-]+$/.test(parts[2])) return { page: 'entry', subject, id: parts[2] }
  return { page: 'unknown', path: parts.slice(1).join('/') }
}

/** Library filters kept in the query: `rq` text, `rs` subject, `rt` type, `rc` category. */
export interface LibraryFilters {
  q: string
  subject: SubjectId | null
  type: EntryType | null
  category: string | null
}

const TYPES: readonly EntryType[] = ['formula', 'concept', 'structure', 'process', 'substance', 'worked-example']

export function parseLibraryFilters(search: string): LibraryFilters {
  const p = new URLSearchParams(search)
  const s = p.get('rs')
  const t = p.get('rt')
  return {
    q: (p.get('rq') ?? '').slice(0, 120),
    subject: s && isSubjectId(s) ? s : null,
    type: t && (TYPES as readonly string[]).includes(t) ? (t as EntryType) : null,
    category: p.get('rc')?.slice(0, 80) || null,
  }
}

export function libraryHref(f: Partial<LibraryFilters>): string {
  const p = new URLSearchParams()
  if (f.q) p.set('rq', f.q)
  if (f.subject) p.set('rs', f.subject)
  if (f.type) p.set('rt', f.type)
  if (f.category) p.set('rc', f.category)
  const q = p.toString()
  return `${q ? `?${q}` : '?'}#/reference`
}
