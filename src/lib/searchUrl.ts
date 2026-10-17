import { isSubjectId, type SubjectId } from '../data/subjects'
import { KIND_LABELS, type SearchKind } from './searchIndex'

export const KINDS = Object.keys(KIND_LABELS) as SearchKind[]
export const isKind = (v: string | null): v is SearchKind => v !== null && (KINDS as string[]).includes(v)

export interface SearchUrl {
  q: string
  subject: SubjectId | null
  kind: SearchKind | null
}

/** `?q=…&sf=<subject>&st=<kind>#/search`. Other keys (left over from an explorer) are ignored. */
export function parseSearchUrl(search: string): SearchUrl {
  const p = new URLSearchParams(search)
  const sf = p.get('sf')
  const st = p.get('st')
  return { q: (p.get('q') ?? '').slice(0, 100), subject: sf && isSubjectId(sf) ? sf : null, kind: isKind(st) ? st : null }
}

export function searchUrl({ q, subject, kind }: SearchUrl): string {
  const p = new URLSearchParams()
  if (q.trim()) p.set('q', q)
  if (subject) p.set('sf', subject)
  if (kind) p.set('st', kind)
  const s = p.toString()
  return s ? `?${s}` : ''
}

