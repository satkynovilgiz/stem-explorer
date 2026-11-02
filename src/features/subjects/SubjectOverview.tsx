import '../../styles/chemistry-home.css'
import { ArrowRight, BookOpen, Calculator, ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { SUBJECTS } from '../../data/subjects'
import { calculatorsOf } from '../../calc'
import { calculatorsHref } from '../../lib/overviewRoute'
import { KIND_BADGE, searchAll, type SearchItem } from '../../lib/searchIndex'
import { entryHref, ENTRY_TYPE_LABELS, type ManifestRow } from '../../reference/types'
import { searchManifest } from '../reference/search'
import { loadManifest } from '../reference/useManifest'
import { answerFor, moduleContents, OVERVIEW_LEADS, OVERVIEW_PLACEHOLDERS, OVERVIEW_QUESTIONS, overviewModules, type OverviewSubject } from './overview'

const SHOWN = 5

/** The query lives in the address (`sq`), so Back from a result returns to the same results. */
function useOverviewQuery(): [string, (q: string) => void] {
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get('sq') ?? '')
  const set = (next: string) => {
    setQ(next)
    const params = new URLSearchParams(window.location.search)
    if (next) params.set('sq', next)
    else params.delete('sq')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
  }
  return [q, set]
}

/**
 * A subject's overview: what it covers, a search of everything in it, the contents section by
 * section (each with direct links), common questions answered by real pages, and the subject's
 * reference-library entries. Every link is an existing deep link from the search index.
 */
export function SubjectOverview({ subject }: { subject: OverviewSubject }) {
  const id = useId()
  const name = SUBJECTS.find((s) => s.id === subject)!.name
  const [q, setQ] = useOverviewQuery()
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = q.trim()
  const [refRows, setRefRows] = useState<readonly ManifestRow[] | null>(null)
  useEffect(() => {
    let live = true
    loadManifest().then(
      (rows) => live && setRefRows(rows.filter((r) => r.subject === subject)),
      () => live && setRefRows([]),
    )
    return () => {
      live = false
    }
  }, [subject])

  const results = useMemo(() => (trimmed ? searchAll(trimmed, { subject }).filter((i) => i.kind !== 'subject') : []), [trimmed, subject])
  const refResults = trimmed && refRows ? searchManifest(refRows, trimmed) : []
  const questions = OVERVIEW_QUESTIONS[subject].map((x) => ({ ...x, answer: answerFor(subject, x.search) })).filter((x) => x.answer)

  return (
    <div className={`chem-home subj-home is-${subject}`}>
      <header className="chem-home-head">
        <div className="chem-home-title-wrap">
          <p className={`subj-eyebrow is-${subject}`}>
            <SubjectIcon subject={subject} size={16} /> {name}
          </p>
          <h1 className="chem-home-title">Explore {name.toLowerCase()}</h1>
          <p className="chem-home-lead">{OVERVIEW_LEADS[subject]}</p>
        </div>
      </header>

      <form className="chem-search" role="search" onSubmit={(e) => (e.preventDefault(), inputRef.current?.blur())}>
        <label htmlFor={`${id}-q`} className="visually-hidden">
          Search {name.toLowerCase()}
        </label>
        <div className="chem-search-box">
          <Search size={20} aria-hidden="true" className="chem-search-icon" />
          <input
            ref={inputRef}
            id={`${id}-q`}
            type="search"
            placeholder={OVERVIEW_PLACEHOLDERS[subject]}
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button type="button" className="icon-button" aria-label="Clear search" onClick={() => (setQ(''), inputRef.current?.focus())}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {trimmed ? (
        <section aria-labelledby={`${id}-res`}>
          <h2 id={`${id}-res`} className="chem-h2">
            Results for “{trimmed}”
          </h2>
          <p className="visually-hidden" role="status">
            {results.length + refResults.length} results
          </p>
          {results.length + refResults.length === 0 ? (
            <div className="chem-empty">
              <p>
                <strong>Nothing in {name} matches “{trimmed}”.</strong> Try a shorter word, or{' '}
                <a href={`?q=${encodeURIComponent(trimmed)}#/search`}>search all subjects</a>.
              </p>
            </div>
          ) : (
            <ul className="chem-result-list">
              {refResults.map((r) => (
                <li key={r.id}>
                  <a href={entryHref(r)} className="chem-result">
                    <span className="chem-result-title">{r.title}</span>
                    <span className="chem-result-text">{r.summary}</span>
                    <span className="chem-badge">Reference · {ENTRY_TYPE_LABELS[r.type]}</span>
                  </a>
                </li>
              ))}
              {results.slice(0, 30).map((i) => (
                <li key={i.id}>
                  <ResultLink item={i} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby={`${id}-contents`}>
            <h2 id={`${id}-contents`} className="chem-h2">
              Contents
            </h2>
            <ol className="subj-toc">
              {overviewModules(subject).map((m, n) => {
                const items = moduleContents(m).filter((i) => i.href !== m.href)
                const curated = m.topics.length ? m.topics.map((t) => ({ name: t.label, href: t.href })) : items.map((i) => ({ name: i.name, href: i.href }))
                return (
                  <li key={m.id} className="subj-chapter">
                    <AppLink href={m.href} className="subj-chapter-head">
                      <span className="subj-chapter-num">{n + 1}</span>
                      <span className="subj-chapter-text">
                        <span className="subj-chapter-title">{m.name}</span>
                        <span className="subj-chapter-summary">{m.summary}</span>
                      </span>
                      <ChevronRight size={18} aria-hidden="true" className="subj-chapter-chevron" />
                    </AppLink>
                    {curated.length > 0 && (
                      <ul className="subj-topics">
                        {curated.slice(0, SHOWN).map((t) => (
                          <li key={t.href}>
                            <AppLink href={t.href}>{t.name}</AppLink>
                          </li>
                        ))}
                        {items.length > SHOWN && (
                          <li className="subj-more">
                            <AppLink href={m.href}>
                              See all in {m.name} <ArrowRight size={14} aria-hidden="true" />
                            </AppLink>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>

          {questions.length > 0 && (
            <section aria-labelledby={`${id}-questions`}>
              <h2 id={`${id}-questions`} className="chem-h2">
                Common questions
              </h2>
              <ul className="chem-questions">
                {questions.map((x) => (
                  <li key={x.q}>
                    <AppLink href={x.answer!.href} className="chem-question">
                      <span>{x.q}</span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </AppLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby={`${id}-calc`}>
            <div className="chem-section-head">
              <h2 id={`${id}-calc`} className="chem-h2">
                Calculators
              </h2>
              <AppLink href={calculatorsHref(subject)} className="chem-text-link">
                All calculators <ArrowRight size={15} aria-hidden="true" />
              </AppLink>
            </div>
            <ul className="chem-tool-list">
              {calculatorsOf(subject).map((c) => (
                <li key={c.id}>
                  <AppLink href={calculatorsHref(subject, c.id)} className="chem-tool-link">
                    <Calculator size={18} aria-hidden="true" />
                    <span>{c.title}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          </section>

          {refRows && refRows.length > 0 && (
            <section aria-labelledby={`${id}-ref`}>
              <h2 id={`${id}-ref`} className="chem-h2">
                From the reference library
              </h2>
              <ul className="chem-result-list">
                {refRows.map((r) => (
                  <li key={r.id}>
                    <a href={entryHref(r)} className="chem-result">
                      <span className="chem-result-title">{r.title}</span>
                      <span className="chem-result-text">{r.summary}</span>
                      <span className="chem-badge">{ENTRY_TYPE_LABELS[r.type]}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="chem-home-foot">
            <BookOpen size={16} aria-hidden="true" /> Every explanation lists its sources. Terms are defined in the <a href="#/glossary">glossary</a>; the{' '}
            <a href="#/reference">reference library</a> has formulas and worked examples.
          </p>
        </>
      )}
    </div>
  )
}

function ResultLink({ item }: { item: SearchItem }) {
  return (
    <AppLink href={item.href} className="chem-result">
      <span className="chem-result-title">{item.name}</span>
      <span className="chem-result-text">{item.description}</span>
      <span className="chem-badge">{KIND_BADGE[item.kind]}</span>
    </AppLink>
  )
}
