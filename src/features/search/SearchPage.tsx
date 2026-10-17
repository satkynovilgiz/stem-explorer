import { Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { RELATION_LABELS, relationsFor } from '../../data/related'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { formulaParts } from '../../lib/chemistry'
import { subjectName } from '../../lib/explorations'
import { findSearchItem, groupResults, nameShowsFormula, KIND_LABELS, SEARCH_INDEX, searchAll, type SearchItem, type SearchKind } from '../../lib/searchIndex'
import { isKind, KINDS, parseSearchUrl, searchUrl, type SearchUrl } from '../../lib/searchUrl'
import { SEARCH_EXAMPLES } from '../home/content'

/** Results shown per group before "Show all". */
const GROUP_PREVIEW = 8

function ResultFormula({ formula }: { formula: string }) {
  return (
    <span className="search-result-formula">
      {' '}
      ({formulaParts(formula).map((p, i) => (p.sub ? <sub key={i}>{p.text}</sub> : <span key={i}>{p.text}</span>))})
    </span>
  )
}

function RelatedLine({ item }: { item: SearchItem }) {
  const related = relationsFor([item.id])
  if (related.length === 0) return null
  return (
    <ul className="search-related small" aria-label={`Related to ${item.name} in other subjects`}>
      {related.map(({ relation, others }) => (
        <li key={relation.id}>
          <span className={`relation-kind is-${relation.kind}`}>{RELATION_LABELS[relation.kind]}:</span>{' '}
          {others
            .map(findSearchItem)
            .filter((o): o is SearchItem => Boolean(o))
            .map((o, i) => (
              <span key={o.id}>
                {i > 0 && ', '}
                <AppLink href={o.href}>{o.name}</AppLink>
              </span>
            ))}
        </li>
      ))}
    </ul>
  )
}

function ResultItem({ item }: { item: SearchItem }) {
  return (
    <li className="search-page-item">
      <AppLink href={item.href} className="search-result">
        <span className="search-result-head">
          <span className="search-result-name">
            {item.name}
            {item.formula && !nameShowsFormula(item) && <ResultFormula formula={item.formula} />}
          </span>
          <span className={`subject-chip is-${item.subject}`}>{subjectName(item.subject)}</span>
        </span>
        <span className="search-result-desc">{item.description}</span>
      </AppLink>
      <RelatedLine item={item} />
    </li>
  )
}

function KindGroup({ subject, kind, items }: { subject: SubjectId; kind: SearchKind; items: SearchItem[] }) {
  const [all, setAll] = useState(false)
  const shown = all ? items : items.slice(0, GROUP_PREVIEW)
  const id = `results-${subject}-${kind}`
  return (
    <section className="search-kind" aria-labelledby={id}>
      <h3 id={id} className="search-kind-title">
        {KIND_LABELS[kind]} <span className="muted">({items.length})</span>
      </h3>
      <ul className="search-results">
        {shown.map((item) => (
          <ResultItem key={item.id} item={item} />
        ))}
      </ul>
      {items.length > GROUP_PREVIEW && (
        <button type="button" className="tool-button bordered" aria-expanded={all} onClick={() => setAll((v) => !v)}>
          {all ? `Show the first ${GROUP_PREVIEW}` : `Show all ${items.length} ${KIND_LABELS[kind].toLowerCase()}`}
        </button>
      )}
    </section>
  )
}

/** Index size by kind, for the empty state (generated from the index, never typed by hand). */
function coverage() {
  const counts = new Map<SearchKind, number>()
  for (const item of SEARCH_INDEX) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
  return KINDS.filter((k) => counts.get(k)).map((k) => `${counts.get(k)} ${KIND_LABELS[k].toLowerCase()}`)
}

export function SearchPage() {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<SearchUrl>(() => parseSearchUrl(window.location.search))

  // Back/Forward to another search entry.
  useEffect(() => {
    const onPop = () => setState(parseSearchUrl(window.location.search))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Keep the address shareable without adding a history entry per keystroke.
  useEffect(() => {
    const search = searchUrl(state)
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [state])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const trimmed = state.q.trim()
  const results = useMemo(() => searchAll(state.q, { subject: state.subject, kind: state.kind }), [state])
  const unfiltered = useMemo(() => (state.subject || state.kind ? searchAll(state.q) : results), [state, results])
  const groups = groupResults(results)
  const filtered = Boolean(state.subject || state.kind)
  const set = (patch: Partial<SearchUrl>) => setState((s) => ({ ...s, ...patch }))

  const status = !trimmed
    ? ''
    : results.length
      ? `${results.length} result${results.length === 1 ? '' : 's'}${filtered ? ` with the filters (${unfiltered.length} in all)` : ''}`
      : filtered && unfiltered.length
        ? `No results with the filters; ${unfiltered.length} without them`
        : 'No results'

  return (
    <div className="search-page">
      <h1 className="page-title">Search</h1>
      <div className="search-page-controls" role="search">
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
            placeholder="Structures, elements, molecules, processes, labs, functions…"
            value={state.q}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-status`}
            onChange={(e) => set({ q: e.target.value })}
          />
          {state.q && (
            <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => set({ q: '' })}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="search-filters">
          <div className="segmented search-subjects" role="group" aria-label="Filter by subject">
            <button type="button" className="segmented-option" aria-pressed={!state.subject} onClick={() => set({ subject: null })}>
              All subjects
            </button>
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" className="segmented-option" aria-pressed={state.subject === s.id} onClick={() => set({ subject: state.subject === s.id ? null : s.id })}>
                {s.name}
              </button>
            ))}
          </div>
          <label className="search-kind-filter small">
            <span>Type</span>
            <select className="fn-select" value={state.kind ?? ''} onChange={(e) => set({ kind: isKind(e.target.value) ? e.target.value : null })}>
              <option value="">All types</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p id={`${id}-status`} className="search-status" role="status">
        {status}
      </p>

      {!trimmed && (
        <div className="empty-state">
          <p>Type a name, a synonym, a symbol or a formula.</p>
          <p className="muted">The index covers {coverage().join(', ')}.</p>
          <ul className="search-examples-list" aria-label="Examples">
            {[...SEARCH_EXAMPLES, 'Fe', 'windpipe', 'derivative'].map((q) => (
              <li key={q}>
                <button type="button" className="example-chip" onClick={() => set({ q })}>
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {trimmed && results.length === 0 && (
        <div className="empty-state">
          {filtered && unfiltered.length > 0 ? (
            <>
              <p>
                Nothing{state.kind ? ` of type “${KIND_LABELS[state.kind]}”` : ''}
                {state.subject ? ` in ${subjectName(state.subject)}` : ''} matches “{trimmed}”.
              </p>
              <button type="button" className="tool-button bordered" onClick={() => set({ subject: null, kind: null })}>
                Clear filters and show {unfiltered.length} result{unfiltered.length === 1 ? '' : 's'}
              </button>
            </>
          ) : (
            <>
              <p>Nothing matches “{trimmed}”.</p>
              <p className="muted">Check the spelling, try a shorter word, or a more common name (for example “windpipe” finds the trachea).</p>
            </>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.subject} className="search-subject" aria-labelledby={`results-${g.subject}`}>
          <h2 id={`results-${g.subject}`} className="search-subject-title">
            <span className={`subject-chip is-${g.subject}`}>{subjectName(g.subject)}</span>
            <span className="muted small">{g.kinds.reduce((n, k) => n + k.items.length, 0)}</span>
          </h2>
          {g.kinds.map((k) => (
            <KindGroup key={`${state.q}|${k.kind}`} subject={g.subject} kind={k.kind} items={k.items} />
          ))}
        </section>
      ))}
    </div>
  )
}
