import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { navigateTo } from '../../lib/hooks'
import { formulaParts } from '../../lib/chemistry'
import { subjectName } from '../../lib/explorations'
import { KIND_BADGE, nameShowsFormula, searchAll } from '../../lib/searchIndex'
import { ENTRY_TYPE_LABELS, entryHref, FORMULA_KIND_LABELS, type ManifestRow } from '../../reference/types'
import { searchManifest } from '../reference/search'
import { loadManifest } from '../reference/useManifest'
import { searchUrl } from '../../lib/searchUrl'

/** Plain input + result list (no custom autocomplete): Tab moves through results, Enter opens one. */
export function HomeSearch() {
  const id = useId()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const all = searchAll(query)
  const results = all.slice(0, 12)
  const trimmed = query.trim()
  // The reference index loads the first time someone types, not with the page.
  const [refRows, setRefRows] = useState<readonly ManifestRow[] | null>(null)
  const [refFailed, setRefFailed] = useState(false)
  useEffect(() => {
    if (!trimmed || refRows) return
    let live = true
    loadManifest().then(
      (rows) => live && setRefRows(rows),
      () => live && setRefFailed(true),
    )
    return () => {
      live = false
    }
  }, [trimmed, refRows])
  const refAll = trimmed && refRows ? searchManifest(refRows, trimmed) : []
  const refResults = refAll.slice(0, 5)

  return (
    <div className="home-search" role="search">
      <label htmlFor={id} className="visually-hidden">
        Search everything you can explore
      </label>
      <form
        className="search home-search-box"
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) navigateTo(`${searchUrl({ q: trimmed, subject: null, kind: null })}#/search`)
        }}
      >
        <Search className="search-icon" size={18} aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="What would you like to understand?"
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={`${id}-status`}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="home-search-submit" aria-label="Search all subjects">
          <Search size={18} aria-hidden="true" />
        </button>
      </form>
      <p id={`${id}-status`} className="search-status" role="status">
        {trimmed
          ? [all.length ? `${all.length} explorer result${all.length === 1 ? '' : 's'}${all.length > results.length ? `, showing the first ${results.length}` : ''}` : '', refAll.length ? `${refAll.length} reference ${refAll.length === 1 ? 'entry' : 'entries'}` : '']
              .filter(Boolean)
              .join('; ')
          : ''}
      </p>
      {trimmed && results.length > 0 && (
        <ul className="search-results" aria-label="Search results">
          {results.map((r) => (
            <li key={r.id}>
              <AppLink href={r.href} className="search-result">
                <span className="search-result-head">
                  <span className="search-result-name">
                    {r.name}
                    {r.formula && !nameShowsFormula(r) && (
                      <span className="search-result-formula">
                        {' '}
                        ({formulaParts(r.formula).map((p, i) => (p.sub ? <sub key={i}>{p.text}</sub> : <span key={i}>{p.text}</span>))})
                      </span>
                    )}
                  </span>
                  <span className="search-result-badges">
                    <span className="result-kind">{KIND_BADGE[r.kind]}</span>
                    <span className={`subject-chip is-${r.subject}`}>{subjectName(r.subject)}</span>
                  </span>
                </span>
                <span className="search-result-desc">{r.description}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
      {trimmed && refResults.length > 0 && (
        <>
          <h3 className="search-subhead">Reference entries</h3>
          <ul className="search-results" aria-label="Reference entries">
            {refResults.map((r) => (
              <li key={r.id}>
                <AppLink href={entryHref(r)} className="search-result">
                  <span className="search-result-head">
                    <span className="search-result-name">{r.title}</span>
                    <span className="search-result-badges">
                      <span className="result-kind is-reference">Reference · {r.kind ? FORMULA_KIND_LABELS[r.kind] : ENTRY_TYPE_LABELS[r.type]}</span>
                      <span className={`subject-chip is-${r.subject}`}>{subjectName(r.subject)}</span>
                    </span>
                  </span>
                  <span className="search-result-desc">{r.summary}</span>
                </AppLink>
              </li>
            ))}
          </ul>
          <AppLink href={`?rq=${encodeURIComponent(trimmed)}#/reference`} className="search-all-link">
            See all {refAll.length} reference {refAll.length === 1 ? 'entry' : 'entries'} for “{trimmed}”
          </AppLink>
        </>
      )}
      {trimmed && refFailed && <p className="muted small">Reference entries could not be loaded; explorer results are still shown.</p>}
      {trimmed && all.length > 0 && (
        <AppLink href={`${searchUrl({ q: trimmed, subject: null, kind: null })}#/search`} className="search-all-link">
          See all {all.length} result{all.length === 1 ? '' : 's'}, grouped by subject with filters
        </AppLink>
      )}
      {trimmed && results.length === 0 && refResults.length === 0 && (
        <div className="empty-state">
          <p>Nothing matches “{trimmed}”.</p>
          <p className="muted">
            Search covers body structures, elements, molecules, cell structures, biology processes, physics labs, functions,
            surfaces, vector tools, the glossary and the reference library. Try “benzene”, “ribosome”, “femur”, “Fe” or “derivative”.
          </p>
        </div>
      )}
    </div>
  )
}
