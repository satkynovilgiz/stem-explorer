import { Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { GLOSSARY } from '../../data/glossary'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { normalize } from '../../lib/chemistry'
import { SourceLinks } from '../guide/SourceLinks'

/** Searchable glossary at #/glossary. `?term=<id>` highlights and scrolls to one entry. */
export function GlossaryPage() {
  const id = useId()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<SubjectId | 'all'>('all')
  const [focusTerm] = useState(() => new URLSearchParams(window.location.search).get('term'))

  const entries = useMemo(() => {
    const q = normalize(query)
    return GLOSSARY.filter(
      (g) => (subject === 'all' || g.subjects.includes(subject)) && (!q || normalize(g.term).includes(q) || normalize(g.definition).includes(q)),
    )
  }, [query, subject])

  useEffect(() => {
    if (focusTerm) document.getElementById(`term-${focusTerm}`)?.scrollIntoView({ block: 'center' })
  }, [focusTerm])

  return (
    <div className="glossary">
      <header className="glossary-head">
        <p className="eyebrow">Reference</p>
        <h1 className="home-title">Glossary</h1>
        <p className="home-lead">
          Every key term used in the explorers, defined once and linked to where you can see it. Definitions are paraphrased from
          the sources listed with them.
        </p>
      </header>
      <div className="glossary-controls">
        <label htmlFor={id} className="visually-hidden">
          Search the glossary
        </label>
        <div className="search">
          <Search className="search-icon" size={18} aria-hidden="true" />
          <input
            id={id}
            type="search"
            className="search-input"
            placeholder="Search terms or definitions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="segmented glossary-filter" role="group" aria-label="Filter by subject">
          {(['all', ...SUBJECTS.map((s) => s.id)] as const).map((s) => (
            <button key={s} type="button" className="segmented-option" aria-pressed={subject === s} onClick={() => setSubject(s)}>
              {s === 'all' ? 'All' : SUBJECTS.find((x) => x.id === s)!.name}
            </button>
          ))}
        </div>
        <p className="muted small" role="status">
          {entries.length} {entries.length === 1 ? 'term' : 'terms'}
        </p>
      </div>
      {entries.length === 0 ? (
        <p className="empty-state">No terms match. Try a shorter word or choose All subjects.</p>
      ) : (
        <dl className="glossary-list">
          {entries.map((g) => (
            <div key={g.id} id={`term-${g.id}`} className={`glossary-entry${g.id === focusTerm ? ' is-focused' : ''}`}>
              <dt>
                {g.term}
                {g.subjects.map((s) => (
                  <span key={s} className={`subject-chip is-${s}`}>
                    {SUBJECTS.find((x) => x.id === s)!.name}
                  </span>
                ))}
              </dt>
              <dd>
                <p>
                  {g.definition}
                  {g.kind === 'convention' && <span className="muted"> (Convention used in this app.)</span>}
                  {g.kind === 'unit' && <span className="muted"> (Unit definition.)</span>}
                  <SourceLinks ids={g.sourceIds} />
                </p>
                {g.links.length > 0 && (
                  <p className="glossary-links small">
                    See it in:{' '}
                    {g.links.map((l, i) => (
                      <span key={l.href}>
                        {i > 0 && ' · '}
                        <AppLink href={l.href}>{l.label}</AppLink>
                      </span>
                    ))}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
