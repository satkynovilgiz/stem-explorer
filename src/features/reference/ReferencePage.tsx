import { Search, X } from 'lucide-react'
import '../../styles/reference.css'
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react'
import { useManifest, type Manifest } from './useManifest'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { ENTRY_TYPE_LABELS, entryHref, FORMULA_KIND_LABELS, type EntryType, type ManifestRow } from '../../reference/types'
import { EntryPage } from './EntryPage'
import { libraryHref, parseLibraryFilters, parseReferenceHash, type LibraryFilters } from './route'
import { searchManifest } from './search'

const subscribe = (cb: () => void) => {
  window.addEventListener('popstate', cb)
  window.addEventListener('hashchange', cb)
  return () => {
    window.removeEventListener('popstate', cb)
    window.removeEventListener('hashchange', cb)
  }
}
const useLocation = () => useSyncExternalStore(subscribe, () => window.location.search + window.location.hash)

/** `#/reference…`: the library index, or one entry. */
export function ReferencePage() {
  const loc = useLocation()
  const route = parseReferenceHash(window.location.hash)
  const [manifest, retry] = useManifest()
  // Printing shows every section, including collapsed ones.
  useEffect(() => {
    const open = () => document.querySelectorAll<HTMLDetailsElement>('.ref-section').forEach((d) => (d.open = true))
    window.addEventListener('beforeprint', open)
    return () => window.removeEventListener('beforeprint', open)
  }, [])
  const byId = manifest.state === 'ready' ? manifest.byId : null
  if (route.page === 'entry') return <EntryPage key={`${route.subject}/${route.id}`} subject={route.subject} id={route.id} manifest={byId} />
  return <Library key={loc.split('#')[0]} manifest={manifest} retry={retry} initialSubject={route.page === 'subject' ? route.subject : null} unknown={route.page === 'unknown' ? route.path : null} />
}

const TYPES = Object.keys(ENTRY_TYPE_LABELS) as EntryType[]
const subjectName = (s: SubjectId) => SUBJECTS.find((x) => x.id === s)!.name
const INTERACTIVE = { lab: 'Lab', '3d': '3D', tool: 'Tool' } as const

function Library({ manifest, retry, initialSubject, unknown }: { manifest: Manifest; retry: () => void; initialSubject: SubjectId | null; unknown: string | null }) {
  const id = useId()
  const fromUrl = parseLibraryFilters(window.location.search)
  const [f, setF] = useState<LibraryFilters>({ ...fromUrl, subject: fromUrl.subject ?? initialSubject })
  // The address is rewritten to the library below, so remember an unknown path from the first render.
  const [notice] = useState(unknown)
  // Filters live in the address, so a filtered view can be shared and Back restores it.
  useEffect(() => {
    const href = libraryHref(f)
    const next = `${window.location.pathname}${href}`
    if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(null, '', next)
  }, [f])
  useEffect(() => {
    document.title = 'Reference library · STEM Explorer'
  }, [])

  const rows = useMemo(() => (manifest.state === 'ready' ? manifest.rows : []), [manifest])
  const scoped = useMemo(() => rows.filter((r) => (!f.subject || r.subject === f.subject) && (!f.type || r.type === f.type)), [rows, f.subject, f.type])
  const categories = useMemo(() => [...new Set(scoped.map((r) => r.category))].sort(), [scoped])
  const results = useMemo(() => searchManifest(scoped, f.q).filter((r) => !f.category || r.category === f.category), [scoped, f.q, f.category])
  const set = (patch: Partial<LibraryFilters>) => setF((x) => ({ ...x, ...patch }))
  const filtered = Boolean(f.q || f.subject || f.type || f.category)

  const grouped = useMemo(() => {
    if (f.q) return null
    const m = new Map<string, ManifestRow[]>()
    for (const r of results) {
      const k = `${r.subject}::${r.category}`
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return [...m.entries()]
  }, [results, f.q])

  return (
    <div className="ref-page ref-library">
      <header className="ref-head">
        <p className="eyebrow">Reference</p>
        <h1 className="ref-title">Reference library</h1>
        <p className="ref-summary">Formulas, concepts, structures, processes and substances across the five subjects, each with conditions of use, a worked example and sources.</p>
      </header>
      {notice !== null && (
        <p className="ref-notice" role="status">
          There is no reference page at “{notice}”. Showing the whole library instead.
        </p>
      )}
      <div className="ref-controls">
        <label htmlFor={`${id}-q`} className="visually-hidden">
          Search the reference library
        </label>
        <div className="search">
          <Search className="search-icon" size={18} aria-hidden="true" />
          <input id={`${id}-q`} type="search" className="search-input" placeholder="Search names, symbols or formulas (e.g. “F = ma”, “Km”, “spine”)" value={f.q} onChange={(e) => set({ q: e.target.value })} />
          {f.q && (
            <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => set({ q: '' })}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="ref-filter-row">
          <div className="segmented" role="group" aria-label="Subject">
            <button type="button" className="segmented-option" aria-pressed={!f.subject} onClick={() => set({ subject: null, category: null })}>
              All subjects
            </button>
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" className="segmented-option" aria-pressed={f.subject === s.id} onClick={() => set({ subject: s.id, category: null })}>
                {s.name}
              </button>
            ))}
          </div>
          <label className="ref-select">
            <span className="param-label">Type</span>
            <select value={f.type ?? ''} onChange={(e) => set({ type: (e.target.value || null) as EntryType | null, category: null })}>
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTRY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="ref-select">
            <span className="param-label">Category</span>
            <select value={f.category ?? ''} onChange={(e) => set({ category: e.target.value || null })}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {f.category && !categories.includes(f.category) && <option value={f.category}>{f.category}</option>}
            </select>
          </label>
        </div>
      </div>

      {manifest.state === 'loading' && (
        <p className="muted small" role="status">
          Loading the library index…
        </p>
      )}
      {manifest.state === 'error' && (
        <div className="ref-state" role="alert">
          <p>The library index could not be loaded. Check your connection and try again.</p>
          <button type="button" className="tool-button bordered" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {manifest.state === 'ready' && (
        <>
          <p className="small muted" role="status" aria-live="polite">
            {results.length === 1 ? '1 entry' : `${results.length} entries`}
            {filtered ? ` match (of ${rows.length})` : ''}
          </p>
          {results.length === 0 ? (
            <div className="ref-state">
              <p>No entries match{f.q ? ` “${f.q}”` : ''} with these filters.</p>
              <p className="small muted">Try fewer words, a synonym (“spine” for vertebral column) or a plain formula (“v = u + at”).</p>
              {filtered && (
                <button type="button" className="tool-button bordered" onClick={() => setF({ q: '', subject: null, type: null, category: null })}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : grouped ? (
            grouped.map(([k, items]) => {
              const [subject, category] = k.split('::') as [SubjectId, string]
              return (
                <section key={k} className={`ref-group subject-${subject}`} aria-labelledby={`${id}-${k}`}>
                  <h2 className="ref-group-title" id={`${id}-${k}`}>
                    <SubjectIcon subject={subject} size={16} />
                    <span>{subjectName(subject)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{category}</span>
                    <span className="small muted">({items.length})</span>
                  </h2>
                  <ResultList rows={items} showSubject={false} />
                </section>
              )
            })
          ) : (
            <ResultList rows={results} showSubject />
          )}
        </>
      )}
    </div>
  )
}

function ResultList({ rows, showSubject }: { rows: readonly ManifestRow[]; showSubject: boolean }) {
  return (
    <ul className="ref-results">
      {rows.map((r) => (
        <li key={r.id} className={`ref-result subject-${r.subject}`}>
          <AppLink href={entryHref(r)} className="ref-result-link">
            <span className="ref-result-title">{r.title}</span>
            <span className="ref-result-summary">{r.summary}</span>
          </AppLink>
          <span className="ref-result-meta">
            {showSubject && <span className="ref-badge">{subjectName(r.subject)}</span>}
            <span className="ref-badge ref-badge-type">{r.kind ? FORMULA_KIND_LABELS[r.kind] : ENTRY_TYPE_LABELS[r.type]}</span>
            {r.interactive?.map((k) => (
              <span key={k} className="ref-badge ref-badge-interactive">
                {INTERACTIVE[k]}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  )
}
