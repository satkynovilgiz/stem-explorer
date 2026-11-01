import '../../../styles/chemistry-home.css'
import { ArrowLeft, ArrowRight, Atom, BookOpen, Box, Calculator, Cloud, Droplet, FlaskConical, Grid3x3, Hexagon, Search, TestTubeDiagonal, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { ELEMENTS } from '../../../data/chemistry/periodicTable'
import { MOLECULES } from '../../../data/chemistry/molecules'
import { subjectName } from '../../../lib/explorations'
import { normalize } from '../../../lib/chemistry'
import { KIND_BADGE, searchAll } from '../../../lib/searchIndex'
import type { ManifestRow } from '../../../reference/types'
import { loadManifest } from '../../reference/useManifest'
import { Formula } from '../Formula'
import { baseItems, CHEM_GROUPS, referenceItems, ROLE_LABELS, type ChemItem, type ChemRole } from './chemIndex'
import { availableChapters, CONTENTS_LABELS } from './contents'
import { readHomeState, writeHomeState, type HomeState, type ResultFilter } from './homeState'
import { CHEM_QUESTIONS } from './questions'
import { ACTION_TEXT, searchTopics, type ActionKind, type SearchResult } from './topicSearch'
import { TOOLS } from './destinations'

const ICONS: Record<(typeof CHEM_GROUPS)[number]['icon'], ReactNode> = {
  atom: <Atom size={22} strokeWidth={1.75} aria-hidden="true" />,
  hexagon: <Hexagon size={22} strokeWidth={1.75} aria-hidden="true" />,
  flask: <FlaskConical size={22} strokeWidth={1.75} aria-hidden="true" />,
  drop: <Droplet size={22} strokeWidth={1.75} aria-hidden="true" />,
  beaker: <TestTubeDiagonal size={22} strokeWidth={1.75} aria-hidden="true" />,
  cloud: <Cloud size={22} strokeWidth={1.75} aria-hidden="true" />,
}
const img = (name: string) => `${import.meta.env.BASE_URL}img/design/${name}.webp`
/** What opening a contents topic does, in words a student expects. */
const ACTION_LABELS = { learn: 'Read', calculate: 'Calculator', explore: 'Explore' } as const
const FILTER_TEXT: Record<ResultFilter, string> = { read: 'Explanations', calculate: 'Calculators', explore: 'Models' }
const ACTION_TO_FILTER: Record<ActionKind, ResultFilter> = { read: 'read', example: 'read', calculate: 'calculate', explore: 'explore' }
const ROLE_TO_FILTER: Record<ChemRole, ResultFilter> = { learn: 'read', calculate: 'calculate', explore: 'explore' }
/** Molecules shown on the Overview (all 12 are on the Molecules page). */
const FEATURED_MOLECULES = ['water', 'carbon-dioxide', 'methane', 'ammonia', 'ethanol', 'benzene']

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
      ? { title: 'Molecules', lead: 'Real molecules in 3D, from experimental structures. Search by name, formula or shape.', placeholder: 'Search molecules by name or formula (e.g. H2O, ethanol)' }
      : page === 'contents'
        ? { title: 'Topics', lead: 'Every chemistry topic, by chapter. Each one explains the idea, shows a worked example and links to a tool or model.', placeholder: 'Search topics, formulas, molecules…' }
        : { title: 'Explore the world of chemistry.', lead: 'Discover elements, understand molecules, and visualize the structures and reactions that shape our world.', placeholder: 'Search chemistry topics, formulas, molecules…' }

  return (
    <div className={`chem-home is-${page}`}>
      <header className="chem-home-head">
        <div className="chem-home-title-wrap">
          <h1 className="chem-home-title">{heading.title}</h1>
          <p className="chem-home-lead">{heading.lead}</p>
        </div>
        {page === 'overview' && <img className="chem-home-art" src={img('chemistry-header')} alt="" />}
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
        {page !== 'library' && (
          <fieldset className="chem-scope">
            <legend className="visually-hidden">Search in</legend>
            <label>
              <input type="radio" name={`${id}-scope`} checked={st.scope === 'chemistry'} onChange={() => set({ scope: 'chemistry' })} /> Chemistry
            </label>
            <label>
              <input type="radio" name={`${id}-scope`} checked={st.scope === 'all'} onChange={() => set({ scope: 'all', label: null })} /> All subjects
            </label>
          </fieldset>
        )}
      </form>

      {page === 'library' ? (
        <MoleculeGrid list={molecules} q={q} onClear={() => set({ q: '' })} />
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
              <Empty q={q} filtered={Boolean(st.label)} onClear={() => set({ q: '', label: null })} onAll={() => set({ scope: 'all', label: null })} />
            )
          ) : allResults.length ? (
            <ul className="chem-result-list">
              {allResults.map((r) => (
                <li key={r.id}>
                  <AppLink href={r.href} className="chem-result">
                    <span className="chem-result-top">
                      <span className="chem-result-title">{r.name}</span>
                      <span className="chem-badge">
                        {KIND_BADGE[r.kind]} · {subjectName(r.subject)}
                      </span>
                    </span>
                    <span className="chem-result-text">{r.description}</span>
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : (
            <Empty q={q} filtered={false} onClear={() => set({ q: '', label: null })} />
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
        <BookOpen size={18} aria-hidden="true" /> Explanations with sources, worked examples and clear definitions. Molecule geometries come from NIST measurements.
      </p>
    </div>
  )
}

/* ---------- Overview ---------- */

const EXPLORE: { title: string; text: string; href: string; icon: ReactNode }[] = [
  { title: 'Elements', text: 'All 118 elements in the periodic table, with atomic structure.', href: '?csec=periodic#/chemistry', icon: <Grid3x3 size={22} aria-hidden="true" /> },
  { title: 'Molecules', text: '12 molecules in 3D: measure bond lengths and angles.', href: '?csec=library#/chemistry', icon: <Hexagon size={22} aria-hidden="true" /> },
  { title: 'Topics', text: 'Short explanations with worked examples, by chapter.', href: '?csec=contents#/chemistry', icon: <BookOpen size={22} aria-hidden="true" /> },
  { title: 'Visualizations', text: 'Interactive models of atoms, bonds, molecules and gases.', href: '?csec=visual#/chemistry', icon: <Box size={22} aria-hidden="true" /> },
]

function Overview({ items }: { items: readonly ChemItem[] }) {
  return (
    <>
      <section aria-labelledby="chem-explore">
        <h2 id="chem-explore" className="chem-h2">
          Explore chemistry
        </h2>
        <ul className="chem-explore">
          {EXPLORE.map((e) => (
            <li key={e.title}>
              <AppLink href={e.href} className="chem-explore-card">
                <span className="chem-explore-icon">{e.icon}</span>
                <span className="chem-explore-title">{e.title}</span>
                <span className="chem-explore-text">{e.text}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="chem-ptable">
        <div className="chem-section-head">
          <h2 id="chem-ptable" className="chem-h2">
            Periodic table
          </h2>
          <AppLink href="?csec=periodic#/chemistry" className="chem-text-link">
            Open the periodic table <ArrowRight size={15} aria-hidden="true" />
          </AppLink>
        </div>
        <PeriodicPreview />
      </section>

      <section aria-labelledby="chem-featured">
        <div className="chem-section-head">
          <h2 id="chem-featured" className="chem-h2">
            Featured molecules
          </h2>
          <AppLink href="?csec=library#/chemistry" className="chem-text-link">
            All molecules <ArrowRight size={15} aria-hidden="true" />
          </AppLink>
        </div>
        <MoleculeGrid list={MOLECULES.filter((m) => FEATURED_MOLECULES.includes(m.id))} q="" onClear={() => undefined} />
      </section>

      <section aria-labelledby="chem-browse">
        <div className="chem-section-head">
          <h2 id="chem-browse" className="chem-h2">
            Browse topics
          </h2>
          <AppLink href="?csec=contents#/chemistry" className="chem-text-link">
            All topics <ArrowRight size={15} aria-hidden="true" />
          </AppLink>
        </div>
        <ul className="chem-browse">
          {availableChapters(items).map(({ chapter, items: list }) => (
            <li key={chapter.id}>
              <AppLink href={`?csec=contents#/chemistry`} className="chem-browse-link" onClick={() => sessionStorageSet('chem-chapter', chapter.id)}>
                <span className="chem-browse-icon">{ICONS[CHEM_GROUPS.find((g) => g.id === chapter.id)!.icon]}</span>
                <span>
                  <span className="chem-browse-title">{chapter.title}</span>
                  <span className="chem-browse-count">
                    {list.length} {list.length === 1 ? 'topic' : 'topics'}
                  </span>
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="chem-tools">
        <div className="chem-section-head">
          <h2 id="chem-tools" className="chem-h2">
            Tools
          </h2>
          <AppLink href="?csec=tools#/chemistry" className="chem-text-link">
            All tools <ArrowRight size={15} aria-hidden="true" />
          </AppLink>
        </div>
        <ul className="chem-tool-list">
          {TOOLS.map((t) => (
            <li key={t.href}>
              <AppLink href={t.href} className="chem-tool-link">
                <Calculator size={18} aria-hidden="true" />
                <span>{t.title}</span>
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

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

/** Remembers which chapter the reader picked on the Overview, so Topics can scroll to it. */
const sessionStorageSet = (k: string, v: string) => {
  try {
    sessionStorage.setItem(k, v)
  } catch {
    // Not remembered when storage is unavailable; Topics still opens at the top.
  }
}

/** A compact periodic table: every element in its place, coloured by category, each a link. */
function PeriodicPreview() {
  return (
    <div className="ptable-mini-wrap">
      <ol className="ptable-mini" aria-label="Periodic table preview: 118 elements">
        {ELEMENTS.filter((e) => e.group !== null).map((e) => (
          <li key={e.number} style={{ gridColumn: e.group!, gridRow: e.period }}>
            <AppLink href={`?csec=periodic&el=${e.number}#/chemistry`} className={`ptable-mini-cell cat-${e.category.toLowerCase().replace(/\s+/g, '-')}`} aria-label={`${e.name}, ${e.symbol}, atomic number ${e.number}`} title={`${e.number} ${e.name}`}>
              {e.symbol}
            </AppLink>
          </li>
        ))}
      </ol>
      <p className="small muted">Lanthanoids and actinoids are shown in the full periodic table.</p>
    </div>
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

function MoleculeGrid({ list, q, onClear }: { list: typeof MOLECULES; q: string; onClear: () => void }) {
  if (!list.length)
    return (
      <div className="chem-empty" role="status">
        <p>
          <strong>No molecule matches “{q}”.</strong>
        </p>
        <p>The library has 12 molecules. Try a name (“ethanol”), a formula (“CO2”) or a shape (“bent”).</p>
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
              <span className="chem-badge">Topic</span>
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
                <span className={`chem-badge is-${r.item.label.toLowerCase()}`}>{r.item.label}</span>
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

function Empty({ q, filtered, onClear, onAll }: { q: string; filtered: boolean; onClear: () => void; onAll?: () => void }) {
  return (
    <div className="chem-empty" role="status">
      <p>
        <strong>Nothing matches “{q}”{filtered ? ' with this filter' : ''}.</strong>
      </p>
      <p>Try a topic (“mole”, “molarity”, “bond”), a formula (“H2O”) or a question (“how do I balance an equation”).</p>
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
