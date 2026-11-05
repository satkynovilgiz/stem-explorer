import { normalize } from '../../lib/chemistry'
import { containsTerm, queryCore, startsWithTerm, wordScore } from '../../lib/queryMatch'
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

const singular = (s: string) => queryCore(s) || s

export function scoreRow(row: ManifestRow, query: string): number {
  const typed = scoreText(row, query)
  const core = queryCore(query)
  // The same question without its question words ("what is a mole" → "mole") scores the same.
  const best = Math.max(typed, core && core !== normalize(query.trim()) ? scoreText(row, core) : 0)
  // Otherwise the question's words anywhere (up to 0.5, below every whole-phrase match).
  return best || 0.5 * wordScore(query, { name: row.title, terms: row.terms, description: row.summary })
}

function scoreText(row: ManifestRow, query: string): number {
  const q = normalize(query.trim())
  if (!q) return 0
  const title = normalize(row.title)
  const sq = squash(query)
  if (title === q || singular(title) === q) return 6
  if (startsWithTerm(title, q)) return 5
  if (containsTerm(title, q)) return 4
  const terms = row.terms.map(normalize)
  if (terms.some((t) => t === q)) return 3.5
  if (sq.length > 1 && row.terms.some((t) => squash(t) === sq)) return 3.5
  if (terms.some((t) => containsTerm(t, q))) return 2.5
  if (sq.length > 2 && row.terms.some((t) => squash(t).includes(sq))) return 2
  if (q.length >= 3 && containsTerm(normalize(row.summary), q)) return 1
  if (containsTerm(normalize(row.category), q)) return 0.8
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
