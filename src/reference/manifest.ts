import type { AuditReport } from './audit'
import { FORMULA_KIND_LABELS, type ManifestRow, type ReferenceEntry } from './types'

/*
 * The manifest is generated from the catalogs (see library.test.ts; run
 * `UPDATE_REFERENCE=1 npx vitest run src/reference` after editing a catalog) and checked in, so
 * search and the homepage can use real counts and titles without loading every article. A test
 * fails if it is out of date.
 */

/** Terms an entry can be found by: aliases, tags, symbols and the plain-text formula. */
export function searchTerms(e: ReferenceEntry): string[] {
  const out = [...(e.aliases ?? []), ...e.tags]
  if (e.type === 'formula') {
    out.push(e.plain, FORMULA_KIND_LABELS[e.kind])
    for (const s of e.symbols) out.push(s.symbol.replace(/\\[a-z]+|[{}\\]/gi, '').trim())
  }
  if (e.type === 'substance') out.push(e.formula.replace(/\\mathrm|[{}_\\]/g, ''))
  if (e.type === 'structure') out.push(e.system, ...(e.region ? [e.region] : []))
  if (e.topic) out.push(e.topic)
  return [...new Set(out.map((t) => t.trim()).filter(Boolean))]
}

export function buildManifest(entries: readonly ReferenceEntry[], report: AuditReport): { rows: ManifestRow[]; counts: AuditReport['counts'] } {
  const rows = entries
    .filter((e) => report.qualifying.has(e.id))
    .map((e): ManifestRow => {
      const kinds = [...new Set([...(e.links ?? []).map((l) => l.kind), ...(e.type === 'structure' && e.atlasIds?.length ? (['3d'] as const) : [])])]
      return {
        id: e.id,
        type: e.type,
        subject: e.subject,
        category: e.category,
        title: e.title,
        summary: e.summary,
        terms: searchTerms(e),
        ...(e.type === 'formula' ? { kind: e.kind } : {}),
        ...(kinds.length ? { interactive: kinds } : {}),
      }
    })
  return { rows, counts: report.counts }
}
