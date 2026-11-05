import '../../../styles/chemistry-home.css'
import { ArrowLeft, ArrowRight, Atom, BookOpen, Box, Calculator, Cloud, Droplet, FlaskConical, Grid3x3, Hexagon, Search, TestTubeDiagonal, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { STRUCTURE_KINDS } from '../../../data/chemistry/structureKinds'
import { MOLECULES } from '../../../data/chemistry/molecules'
import { subjectName } from '../../../lib/explorations'
import { normalize } from '../../../lib/chemistry'
import { searchAll } from '../../../lib/searchIndex'
import { resultTypeOf, type ResultType } from '../../../lib/resultType'
import { SearchSuggestions } from '../../search/SearchSuggestions'
import type { ManifestRow } from '../../../reference/types'
import { loadManifest } from '../../reference/useManifest'
import { Formula } from '../Formula'
import { baseItems, CHEM_GROUPS, referenceItems, ROLE_LABELS, type ChemItem, type ChemLabel, type ChemRole } from './chemIndex'
import { availableChapters, CONTENTS_LABELS } from './contents'
import { readHomeState, writeHomeState, type HomeState, type ResultFilter } from './homeState'
import { CHEM_QUESTIONS } from './questions'
import { ACTION_TEXT, searchTopics, type ActionKind, type SearchResult } from './topicSearch'
import { CHEM_DESTINATIONS, CHEM_SEARCH_EXAMPLES, type ChemDestinationId } from './chemDestinations'

const ICONS: Record<(typeof CHEM_GROUPS)[number]['icon'], ReactNode> = {
  atom: <Atom size={22} strokeWidth={1.75} aria-hidden="true" />,
  hexagon: <Hexagon size={22} strokeWidth={1.75} aria-hidden="true" />,
  flask: <FlaskConical size={22} strokeWidth={1.75} aria-hidden="true" />,
  drop: <Droplet size={22} strokeWidth={1.75} aria-hidden="true" />,
  beaker: <TestTubeDiagonal size={22} strokeWidth={1.75} aria-hidden="true" />,
  cloud: <Cloud size={22} strokeWidth={1.75} aria-hidden="true" />,
}
/** What opening a contents topic does, in words a student expects. */
const ACTION_LABELS = { learn: 'Read', calculate: 'Calculator', explore: 'Explore' } as const
const FILTER_TEXT: Record<ResultFilter, string> = { read: 'Explanations', calculate: 'Calculators', explore: 'Models' }
const ACTION_TO_FILTER: Record<ActionKind, ResultFilter> = { read: 'read', example: 'read', calculate: 'calculate', explore: 'explore' }
const ROLE_TO_FILTER: Record<ChemRole, ResultFilter> = { learn: 'read', calculate: 'calculate', explore: 'explore' }

export type ChemPage = 'overview' | 'contents' | 'library'

const matchesFilter = (r: SearchResult, f: ResultFilter | null) => !f || (r.kind === 'topic' ? r.topic.actions.some((a) => ACTION_TO_FILTER[a.kind] === f) : ROLE_TO_FILTER[r.item.role] === f)

/**
 * Chemistry's reference pages that share one search: the Overview (`csec=topics`), Topics
 * (`csec=contents`) and Molecules (`csec=library`). The query, scope, filter and open group live in
 * the address, so Back from a result restores them.
 */
export function ChemistryHome({ page = 'overview' }: { page?: ChemPage }) {
  const id = useId()
  const [st, setSt] = useState<HomeState>(readHomeState)
  const [rows, setRows] = useState<readonly ManifestRow[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reference entries join the index once the manifest has loaded (it is small and cached).
  useEffect(() => {
    let live = true
    loadManifest().then(
      (r) => live && setRows(r),
      () => undefined,
    )
    return () => {
      live = false
    }
  }, [])
  // Typing replaces the history entry, so Back from a result returns to the same results.
  useEffect(() => writeHomeState(st, 'replace'), [st])
  useEffect(() => {
    const onPop = () => setSt(readHomeState())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const items = useMemo(() => [...baseItems(), ...(rows ? referenceItems(rows) : [])], [rows])
  const q = st.q.trim()
  const set = (patch: Partial<HomeState>) => setSt((s) => ({ ...s, ...patch }))

  // The Molecules page filters its own list; the other pages search everything in Chemistry.
  const molecules = useMemo(() => {
    if (page !== 'library') return MOLECULES
    const nq = normalize(q)
    if (!nq) return MOLECULES
    return MOLECULES.filter((m) => [m.name, m.formula, ...(m.aliases ?? []), m.shapeSummary].some((t) => normalize(t).includes(nq)))
  }, [page, q])
  const results = useMemo(() => (q && page !== 'library' && st.scope === 'chemistry' ? searchTopics(items, q) : []), [items, q, page, st.scope])
  const shown = results.filter((r) => matchesFilter(r, st.label))
  const allResults = useMemo(() => (q && page !== 'library' && st.scope === 'all' ? searchAll(q).slice(0, 40) : []), [q, page, st.scope])
  const group = page === 'overview' && st.group ? CHEM_GROUPS.find((g) => g.id === st.group) : undefined

  const heading =
    page === 'library'
      ? { title: 'Molecules', lead: `${MOLECULES.length} molecules in 3D, from small gases to caffeine, aspirin and glucose. Search by name, formula or shape.`, placeholder: 'Search molecules by name or formula (e.g. H2O, caffeine)' }
      : page === 'contents'
        ? { title: 'Learn', lead: 'Every chemistry topic, by chapter. Each one explains the idea, shows a worked example and links to a tool or model.', placeholder: 'Search topics, formulas, molecules…' }
        : { title: 'What would you like to understand?', lead: 'Clear explanations, useful calculations, and interactive models.', placeholder: 'Search chemistry topics, formulas, molecules…' }

  return (
    <div className={`chem-home is-${page}`}>
      <header className="chem-home-head">
        <div className="chem-home-title-wrap">
          {page === 'overview' && <p className="chem-eyebrow">Chemistry</p>}
          <h1 className="chem-home-title">{heading.title}</h1>
          <p className="chem-home-lead">{heading.lead}</p>
        </div>
        {page === 'overview' && <WaterArt />}
      </header>

      <form
        className="chem-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          inputRef.current?.blur()
        }}
      >
        <label htmlFor={`${id}-q`} className="visually-hidden">
          {page === 'library' ? 'Search molecules' : 'Search chemistry topics, formulas, molecules'}
        </label>
        <div className="chem-search-box">
          <Search size={20} aria-hidden="true" className="chem-search-icon" />
          <input
            ref={inputRef}
            id={`${id}-q`}
            type="search"
            placeholder={heading.placeholder}
            autoComplete="off"
            spellCheck={false}
            value={st.q}
            onChange={(e) => set({ q: e.target.value, group: null })}
          />
          {st.q && (
            <button type="button" className="icon-button" aria-label="Clear search" onClick={() => (set({ q: '', label: null }), inputRef.current?.focus())}>
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button type="submit" className="chem-search-submit" aria-label="Search">
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
        {page === 'overview' && !st.q && (
          <p className="chem-examples">
            <span className="muted">Try:</span>
            {CHEM_SEARCH_EXAMPLES.map((example) => (
              <button key={example} type="button" className="home-try-chip" onClick={() => (set({ q: example, group: null }), inputRef.current?.focus())}>
                {example}
              </button>
            ))}
          </p>
        )}
        {page !== 'library' && q && st.scope === 'chemistry' && (
          <p className="chem-scope-link">
            <AppLink href={`?q=${encodeURIComponent(q)}#/search`} className="chem-text-link">
              Search all subjects for “{q}” <ArrowRight size={15} aria-hidden="true" />
            </AppLink>
          </p>
        )}
        {st.scope === 'all' && (
          // Links from before this page had one scope still open with every subject's results.
          <p className="chem-scope-link">
            <button type="button" className="chem-text-link chem-link-button" onClick={() => set({ scope: 'chemistry' })}>
              Search only Chemistry
            </button>
          </p>
        )}
      </form>

      {page === 'library' ? (
        <MoleculeSections list={molecules} q={q} onClear={() => set({ q: '' })} />
      ) : q ? (
        <section className="chem-results" aria-labelledby={`${id}-res`}>
          <h2 id={`${id}-res`} className="chem-h2">
            Results for “{q}”
          </h2>
          {st.scope === 'chemistry' && results.length > 0 && (
            <div className="chem-filter" role="group" aria-label="Show only">
              <button type="button" aria-pressed={!st.label} onClick={() => set({ label: null })}>
                All ({results.length})
              </button>
              {(Object.keys(FILTER_TEXT) as ResultFilter[]).map((f) => {
                const n = results.filter((r) => matchesFilter(r, f)).length
                return n ? (
                  <button key={f} type="button" aria-pressed={st.label === f} onClick={() => set({ label: f })}>
                    {FILTER_TEXT[f]} ({n})
                  </button>
                ) : null
              })}
            </div>
          )}
          <p className="visually-hidden" role="status" aria-live="polite">
            {st.scope === 'all' ? `${allResults.length} results in all subjects` : `${shown.length} chemistry results`}
          </p>
          {st.scope === 'chemistry' ? (
            shown.length ? (
              <ResultList results={shown.slice(0, 40)} />
            ) : (
              <Empty q={q} filtered={Boolean(st.label)} onClear={() => set({ q: '', label: null })} onAll={() => set({ scope: 'all', label: null })} onPick={(next) => set({ q: next, label: null })} />
            )
          ) : allResults.length ? (
            <ul className="chem-result-list">
              {allResults.map((r) => (
                <li key={r.id}>
                  <AppLink href={r.href} className="chem-result">
                    <span className="chem-result-top">
                      <span className="chem-result-title">{r.name}</span>
                      <span className="chem-badge">
                        {resultTypeOf(r)} · {subjectName(r.subject)}
                      </span>
                    </span>
                    <span className="chem-result-text">{r.description}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : (
            <Empty q={q} filtered={false} onClear={() => set({ q: '', label: null })} onPick={(next) => set({ q: next, label: null })} />
          )}
        </section>
      ) : group ? (
        <GroupPage group={group} items={items.filter((i) => i.group === group.id)} onBack={() => window.history.back()} />
      ) : page === 'contents' ? (
        <Contents items={items} />
      ) : (
        <Overview items={items} />
      )}

      <p className="chem-home-foot">
        <BookOpen size={18} aria-hidden="true" /> Explanations with sources, worked examples and clear definitions. Each molecule says whether its shape is experimental (NIST CCCBDB) or computed (PubChem3D).
      </p>
    </div>
  )
}

/* ---------- Overview ---------- */

const DESTINATION_ICONS: Record<ChemDestinationId, ReactNode> = {
  concepts: <BookOpen size={22} aria-hidden="true" />,
  calculate: <Calculator size={22} aria-hidden="true" />,
  explore: <Box size={22} aria-hidden="true" />,
  periodic: <Grid3x3 size={22} aria-hidden="true" />,
}

/** A small decorative water molecule beside the introduction. */
function WaterArt() {
  return (
    <svg className="chem-water-art" viewBox="0 0 120 90" aria-hidden="true" focusable="false">
      <line x1="60" y1="32" x2="30" y2="58" />
      <line x1="60" y1="32" x2="90" y2="58" />
      <circle cx="30" cy="60" r="13" className="is-h" />
      <circle cx="90" cy="60" r="13" className="is-h" />
      <circle cx="60" cy="32" r="21" className="is-o" />
    </svg>
  )
}

function Overview({ items }: { items: readonly ChemItem[] }) {
  return (
    <>
      <nav aria-label="Where to go">
        <ul className="chem-explore">
          {CHEM_DESTINATIONS.map((d) => (
            <li key={d.id}>
              <AppLink href={d.href} className="chem-explore-card">
                <span className="chem-explore-icon">{DESTINATION_ICONS[d.id]}</span>
                <span className="chem-explore-title">{d.title}</span>
                <span className="chem-explore-text">{d.text}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="chem-questions">
        <h2 id="chem-questions" className="chem-h2">
          Common questions
        </h2>
        <ul className="chem-questions">
          {CHEM_QUESTIONS.filter((x) => x.available(items)).map((x) => (
            <li key={x.question}>
              <AppLink href={x.href(items)} className="chem-question">
                <span>{x.question}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </AppLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

/* ---------- Topics (table of contents) ---------- */

function Contents({ items }: { items: readonly ChemItem[] }) {
  // Opened from a chapter on the Overview: bring that chapter into view.
  useEffect(() => {
    let id: string | null = null
    try {
      id = sessionStorage.getItem('chem-chapter')
      sessionStorage.removeItem('chem-chapter')
    } catch {
      return
    }
    if (id) document.getElementById(`chapter-${id}`)?.scrollIntoView({ block: 'start' })
  }, [])
  return (
    <section aria-labelledby="chem-contents">
      <h2 id="chem-contents" className="chem-h2">
        Contents
      </h2>
      <ol className="chem-toc">
        {availableChapters(items).map(({ chapter, items: list }, n) => (
          <li key={chapter.id} id={`chapter-${chapter.id}`} className="chem-chapter">
            <h3 className="chem-chapter-title">
              <span className="chem-chapter-num" aria-hidden="true">
                {n + 1}
              </span>
              {chapter.title}
            </h3>
            <p className="chem-chapter-blurb">{chapter.blurb}</p>
            <ul className="chem-chapter-topics">
              {list.map((item) => (
                <li key={item.id}>
                  <AppLink href={item.href} className="chem-topic-link">
                    <span className="chem-topic-title">{CONTENTS_LABELS[item.id] ?? item.title}</span>
                    <span className={`chem-action is-${item.role}`}>{ACTION_LABELS[item.role]}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- Molecules ---------- */

/** The Molecules page: measured structures first, then PubChem's computed ones, each explained. */
function MoleculeSections({ list, q, onClear }: { list: typeof MOLECULES; q: string; onClear: () => void }) {
  if (!list.length) return <MoleculeGrid list={list} q={q} onClear={onClear} />
  const measured = list.filter((m) => m.coordinates.kind === 'experimental')
  const computed = list.filter((m) => m.coordinates.kind === 'computed')
  return (
    <>
      {measured.length > 0 && (
        <section className="chem-section" aria-labelledby="mol-measured">
          <h2 id="mol-measured" className="chem-h2">
            {STRUCTURE_KINDS.experimental.heading} ({measured.length})
          </h2>
          <p className="chem-section-note">{STRUCTURE_KINDS.experimental.description}</p>
          <MoleculeGrid list={measured} q={q} onClear={onClear} />
        </section>
      )}
      {computed.length > 0 && (
        <section className="chem-section" aria-labelledby="mol-computed">
          <h2 id="mol-computed" className="chem-h2">
            Everyday and biological molecules ({computed.length})
          </h2>
          <p className="chem-section-note">{STRUCTURE_KINDS.computed.description}</p>
          <MoleculeGrid list={computed} q={q} onClear={onClear} />
        </section>
      )}
    </>
  )
}

function MoleculeGrid({ list, q, onClear }: { list: typeof MOLECULES; q: string; onClear: () => void }) {
  if (!list.length)
    return (
      <div className="chem-empty" role="status">
        <p>
          <strong>No molecule matches “{q}”.</strong>
        </p>
        <p>The library has {MOLECULES.length} molecules. Try a name (“caffeine”), a formula (“CO2”) or a shape (“bent”).</p>
        <div className="chem-empty-actions">
          <button type="button" className="chem-button" onClick={onClear}>
            Show all molecules
          </button>
        </div>
      </div>
    )
  return (
    <ul className="chem-molecules">
      {list.map((m) => (
        <li key={m.id}>
          <AppLink href={`?molecule=${m.id}&view=ball-and-stick#/chemistry`} className="chem-molecule-card">
            <span className="chem-molecule-formula">
              <Formula formula={m.formula} />
            </span>
            <span className="chem-molecule-name">{m.name.replace(/\s*\(.*\)$/, '')}</span>
            <span className="chem-molecule-shape">{m.shapeSummary}</span>
            {m.coordinates.kind === 'computed' && <span className="chem-molecule-kind">Computed</span>}
          </AppLink>
        </li>
      ))}
    </ul>
  )
}

/* ---------- Search results ---------- */

function ResultList({ results }: { results: readonly SearchResult[] }) {
  return (
    <ul className="chem-result-list">
      {results.map((r) =>
        r.kind === 'topic' ? (
          <li key={r.topic.id} className="chem-result is-topic">
            <span className="chem-result-top">
              <AppLink href={r.topic.actions[0].href} className="chem-result-title">
                {r.topic.title}
              </AppLink>
              <span className="chem-badge">Explanation</span>
            </span>
            <span className="chem-result-text">{r.topic.sentence}</span>
            <span className="chem-result-actions">
              {r.topic.actions.map((a) => (
                <AppLink key={a.kind} href={a.href} className={`chem-action-link is-${a.kind}`}>
                  {ACTION_TEXT[a.kind]}
                </AppLink>
              ))}
            </span>
          </li>
        ) : (
          <li key={r.item.id}>
            <AppLink href={r.item.href} className="chem-result">
              <span className="chem-result-top">
                <span className="chem-result-title">{r.item.title}</span>
                <span className={`chem-badge is-${r.item.label.toLowerCase()}`}>{CHEM_RESULT_TYPE[r.item.label]}</span>
              </span>
              <span className="chem-result-text">{r.item.sentence}</span>
              <span className="chem-result-role">{ROLE_LABELS[r.item.role]}</span>
            </AppLink>
          </li>
        ),
      )}
    </ul>
  )
}

const CHEM_RESULT_TYPE: Record<ChemLabel, ResultType> = { Topic: 'Explanation', Formula: 'Explanation', Molecule: 'Interactive model', Calculator: 'Calculator' }

function Empty({ q, filtered, onClear, onAll, onPick }: { q: string; filtered: boolean; onClear: () => void; onAll?: () => void; onPick: (q: string) => void }) {
  return (
    <div className="chem-empty" role="status">
      <p>
        <strong>Nothing matches “{q}”{filtered ? ' with this filter' : ''}.</strong>
      </p>
      <p>Try a topic (“mole”, “molarity”, “bond”), a formula (“H2O”) or a question (“how do I balance an equation”).</p>
      <SearchSuggestions query={q} onPick={onPick} />
      <div className="chem-empty-actions">
        <button type="button" className="chem-button" onClick={onClear}>
          Clear the search
        </button>
        {onAll && (
          <button type="button" className="tool-button bordered" onClick={onAll}>
            Search all subjects instead
          </button>
        )}
      </div>
    </div>
  )
}

const ROLE_ORDER: ChemRole[] = ['learn', 'explore', 'calculate']
const ROLE_HELP: Record<ChemRole, string> = {
  learn: 'Explanations and reference pages to read.',
  explore: 'Interactive models you can turn and change.',
  calculate: 'Tools that work out a number step by step.',
}

/** A group page (older `cg=` links): its content under Learn, Explore and Calculate. */
function GroupPage({ group, items, onBack }: { group: (typeof CHEM_GROUPS)[number]; items: ChemItem[]; onBack: () => void }) {
  const rest = items.filter((i) => !i.id.startsWith('element:'))
  return (
    <section className="chem-group-page" aria-labelledby="chem-group-title">
      <button type="button" className="chem-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <h2 id="chem-group-title" className="chem-group-page-title">
        {ICONS[group.icon]} {group.title}
      </h2>
      <p className="chem-home-lead">{group.blurb}</p>
      {ROLE_ORDER.map((role) => {
        const list = rest.filter((i) => i.role === role)
        if (!list.length) return null
        return (
          <section key={role} className="chem-role" aria-labelledby={`role-${role}`}>
            <h3 id={`role-${role}`} className="chem-role-title">
              {ROLE_LABELS[role]} <span className="chem-role-help">{ROLE_HELP[role]}</span>
            </h3>
            <ul className="chem-result-list">
              {list.map((i) => (
                <li key={i.id}>
                  <AppLink href={i.href} className="chem-result">
                    <span className="chem-result-title">{i.title}</span>
                    <span className="chem-result-text">{i.sentence}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </section>
  )
}
