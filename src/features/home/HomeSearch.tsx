import { Search, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { formulaParts } from '../../lib/chemistry'
import { subjectName } from '../../lib/explorations'
import { nameShowsFormula, searchAll } from '../../lib/searchIndex'
import { searchUrl } from '../../lib/searchUrl'
import { SEARCH_EXAMPLES as EXAMPLES } from './content'

/** Plain input + result list (no custom autocomplete): Tab moves through results, Enter opens one. */
export function HomeSearch() {
  const id = useId()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const all = searchAll(query)
  const results = all.slice(0, 12)
  const trimmed = query.trim()

  return (
    <div className="home-search" role="search">
      <label htmlFor={id} className="home-search-label">
        Search everything you can explore
      </label>
      <div className="search home-search-box">
        <Search className="search-icon" size={18} aria-hidden="true" />
        <input
          id={id}
          ref={inputRef}
          type="search"
          className="search-input"
          placeholder="Search structures, molecules, labs, surfaces…"
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
      </div>
      {!trimmed && (
        <div className="search-examples">
          <span className="muted small" id={`${id}-examples`}>
            Examples:
          </span>
          <ul aria-labelledby={`${id}-examples`}>
            {EXAMPLES.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  className="example-chip"
                  onClick={() => {
                    setQuery(q)
                    inputRef.current?.focus()
                  }}
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p id={`${id}-status`} className="search-status" role="status">
        {trimmed ? (all.length ? `${all.length} result${all.length === 1 ? '' : 's'}${all.length > results.length ? `, showing the first ${results.length}` : ''}` : '') : ''}
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
                  <span className={`subject-chip is-${r.subject}`}>{subjectName(r.subject)}</span>
                </span>
                <span className="search-result-desc">{r.description}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
      {trimmed && all.length > 0 && (
        <AppLink href={`${searchUrl({ q: trimmed, subject: null, kind: null })}#/search`} className="search-all-link">
          See all {all.length} result{all.length === 1 ? '' : 's'}, grouped by subject with filters
        </AppLink>
      )}
      {trimmed && results.length === 0 && (
        <div className="empty-state">
          <p>Nothing matches “{trimmed}”.</p>
          <p className="muted">
            Search covers body structures, elements, molecules, cell structures, biology processes, physics labs, functions,
            surfaces, vector tools and the glossary. Try “benzene”, “ribosome”, “femur”, “Fe” or “derivative”.
          </p>
        </div>
      )}
    </div>
  )
}
