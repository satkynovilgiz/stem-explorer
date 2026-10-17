import { Search, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { formulaParts } from '../../lib/chemistry'
import { subjectName } from '../../lib/explorations'
import { searchExplorations } from '../../lib/searchIndex'
import { SEARCH_EXAMPLES as EXAMPLES } from './content'

/** Plain input + result list (no custom autocomplete): Tab moves through results, Enter opens one. */
export function HomeSearch() {
  const id = useId()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const results = searchExplorations(query)
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
        {trimmed ? (results.length ? `${results.length} result${results.length === 1 ? '' : 's'}` : '') : ''}
      </p>
      {trimmed && results.length > 0 && (
        <ul className="search-results" aria-label="Search results">
          {results.map((r) => (
            <li key={r.id}>
              <AppLink href={r.href} className="search-result">
                <span className="search-result-head">
                  <span className="search-result-name">
                    {r.name}
                    {r.formula && (
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
      {trimmed && results.length === 0 && (
        <div className="empty-state">
          <p>Nothing matches “{trimmed}”.</p>
          <p className="muted">
            Search covers subjects, molecules (names or formulas), cell structures, heart structures, surfaces and the projectile
            lab. Try “benzene”, “ribosome”, “aorta” or “plane”.
          </p>
        </div>
      )}
    </div>
  )
}
