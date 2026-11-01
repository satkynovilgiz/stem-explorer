import { normalize } from '../../lib/chemistry'
import type { ManifestRow } from '../../reference/types'

/*
 * Formula-aware matching for the reference manifest. Spaces, "·", "×", "*" and "^" are dropped
 * from formula text, so "F = ma", "F=m·a" and "f = m * a" all match; Unicode super/subscripts
 * match plain digits (normalize).
 */
export const squash = (s: string) =>
  normalize(s)
    .replace(/[\s·×*^()]/g, '')
    .replace(/−/g, '-')

export function scoreRow(row: ManifestRow, query: string): number {
  const q = normalize(query.trim())
  if (!q) return 0
  const title = normalize(row.title)
  const sq = squash(query)
  if (title === q) return 6
  if (title.startsWith(q)) return 5
  if (title.includes(q)) return 4
  const terms = row.terms.map(normalize)
  if (terms.some((t) => t === q)) return 3.5
  if (sq.length > 1 && row.terms.some((t) => squash(t) === sq)) return 3.5
  if (terms.some((t) => t.includes(q))) return 2.5
  if (sq.length > 2 && row.terms.some((t) => squash(t).includes(sq))) return 2
  if (q.length >= 3 && normalize(row.summary).includes(q)) return 1
  if (normalize(row.category).includes(q)) return 0.8
  // Every word somewhere in the title, terms or summary.
  const words = q.split(/\s+/).filter((w) => w.length > 1)
  const hay = `${title} ${terms.join(' ')} ${normalize(row.summary)}`
  if (words.length > 1 && words.every((w) => hay.includes(w))) return 0.6
  return 0
}

export function searchManifest(rows: readonly ManifestRow[], query: string): ManifestRow[] {
  if (!query.trim()) return [...rows]
  return rows
    .map((row) => ({ row, s: scoreRow(row, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.row.title.localeCompare(b.row.title))
    .map((x) => x.row)
}
