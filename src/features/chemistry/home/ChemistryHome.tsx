import '../../../styles/chemistry-home.css'
import { ArrowLeft, ArrowRight, Atom, BookOpen, ChevronRight, Cloud, Droplet, FlaskConical, Hexagon, Search, TestTubeDiagonal, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { subjectName } from '../../../lib/explorations'
import { searchAll, KIND_BADGE } from '../../../lib/searchIndex'
import type { ManifestRow } from '../../../reference/types'
import { loadManifest } from '../../reference/useManifest'
import { baseItems, CHEM_GROUPS, referenceItems, ROLE_LABELS, searchChem, type ChemGroupId, type ChemItem, type ChemLabel, type ChemRole } from './chemIndex'
import { CHEM_QUESTIONS } from './questions'
import { readHomeState, writeHomeState, type HomeState } from './homeState'

const ICONS: Record<(typeof CHEM_GROUPS)[number]['icon'], ReactNode> = {
  atom: <Atom size={34} strokeWidth={1.5} aria-hidden="true" />,
  hexagon: <Hexagon size={34} strokeWidth={1.5} aria-hidden="true" />,
  flask: <FlaskConical size={34} strokeWidth={1.5} aria-hidden="true" />,
  drop: <Droplet size={34} strokeWidth={1.5} aria-hidden="true" />,
  beaker: <TestTubeDiagonal size={34} strokeWidth={1.5} aria-hidden="true" />,
  cloud: <Cloud size={34} strokeWidth={1.5} aria-hidden="true" />,
}
const LABELS: ChemLabel[] = ['Topic', 'Formula', 'Molecule', 'Calculator']
const img = (name: string) => `${import.meta.env.BASE_URL}img/design/${name}.webp`

/**
 * The Chemistry home page (`?csec=topics#/chemistry`): "What are you working on?". A search over
 * all of Chemistry (with an explicit switch to search every subject), the topic groups that have
 * real content, common student questions, and two starting points. The query, scope, label filter
 * and open group live in the address, so returning from a result restores them.
 */
export function ChemistryHome() {
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
  // Typing replaces the history entry; opening a group adds one (so Back closes it).
  useEffect(() => writeHomeState(st, 'replace'), [st])

  const items = useMemo(() => [...baseItems(), ...(rows ? referenceItems(rows) : [])], [rows])
  const groups = CHEM_GROUPS.filter((g) => items.some((i) => i.group === g.id))
  const q = st.q.trim()
  const results = useMemo(() => (q && st.scope === 'chemistry' ? searchChem(items, q) : []), [items, q, st.scope])
  const shown = st.label ? results.filter((r) => r.label === st.label) : results
  const allResults = useMemo(() => (q && st.scope === 'all' ? searchAll(q).slice(0, 40) : []), [q, st.scope])
  const group = st.group ? groups.find((g) => g.id === st.group) : undefined

  const set = (patch: Partial<HomeState>) => setSt((s) => ({ ...s, ...patch }))
  const openGroup = (g: ChemGroupId | null) => {
    writeHomeState({ ...st, group: g, q: '', label: null }, 'push')
    setSt((s) => ({ ...s, group: g, q: '', label: null }))
    window.scrollTo({ top: 0 })
  }
  // Back/Forward between the overview and a group page.
  useEffect(() => {
    const onPop = () => setSt(readHomeState())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div className="chem-home">
      <header className="chem-home-head">
        <div className="chem-home-title-wrap">
          <h1 className="chem-home-title">Chemistry</h1>
          <p className="chem-home-lead">Clear explanations. Useful examples. Models you can explore.</p>
        </div>
        <img className="chem-home-art" src={img('chemistry-header')} alt="" />
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
          Search chemistry topics, formulas, molecules
        </label>
        <div className="chem-search-box">
          <Search size={20} aria-hidden="true" className="chem-search-icon" />
          <input
            ref={inputRef}
            id={`${id}-q`}
            type="search"
            placeholder="Search chemistry topics, formulas, molecules…"
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
        <fieldset className="chem-scope">
          <legend className="visually-hidden">Search in</legend>
          <label>
            <input type="radio" name={`${id}-scope`} checked={st.scope === 'chemistry'} onChange={() => set({ scope: 'chemistry' })} /> Chemistry
          </label>
          <label>
            <input type="radio" name={`${id}-scope`} checked={st.scope === 'all'} onChange={() => set({ scope: 'all', label: null })} /> All subjects
          </label>
        </fieldset>
      </form>

      {q ? (
        <section className="chem-results" aria-labelledby={`${id}-res`}>
          <h2 id={`${id}-res`} className="chem-h2">
            Results for “{q}”
          </h2>
          {st.scope === 'chemistry' && results.length > 0 && (
            <div className="chem-filter" role="group" aria-label="Show only">
              <button type="button" aria-pressed={!st.label} onClick={() => set({ label: null })}>
                All ({results.length})
              </button>
              {LABELS.map((l) => {
                const n = results.filter((r) => r.label === l).length
                return n ? (
                  <button key={l} type="button" aria-pressed={st.label === l} onClick={() => set({ label: l })}>
                    {l} ({n})
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
              <ResultList items={shown.slice(0, 40)} />
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
      ) : (
        <>
          <section aria-labelledby={`${id}-groups`}>
            <h2 id={`${id}-groups`} className="chem-h2">
              What are you working on?
            </h2>
            <ul className="chem-groups">
              {groups.map((g) => (
                <li key={g.id}>
                  <button type="button" className="chem-group" onClick={() => openGroup(g.id)}>
                    <span className="chem-group-icon">{ICONS[g.icon]}</span>
                    <span className="chem-group-text">
                      <span className="chem-group-title">{g.title}</span>
                      <span className="chem-group-blurb">{g.blurb}</span>
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="chem-group-chevron" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby={`${id}-questions`}>
            <h2 id={`${id}-questions`} className="chem-h2">
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

          <AppLink href="?csec=solutions&st=molarity#/chemistry" className="chem-feature">
            <span className="chem-feature-text">
              <span className="chem-eyebrow">Start with the basics</span>
              <span className="chem-feature-title">Understand molarity</span>
              <span className="chem-feature-lead">Molarity tells you how much solute is in one litre of solution.</span>
              <span className="chem-button">
                See a worked example <ArrowRight size={16} aria-hidden="true" />
              </span>
            </span>
            <img src={img('molarity-beaker')} alt="" className="chem-feature-img" />
          </AppLink>

          <section aria-labelledby={`${id}-molecule`}>
            <h2 id={`${id}-molecule`} className="chem-h2">
              Explore a molecule
            </h2>
            <AppLink href="?molecule=water&view=ball-and-stick#/chemistry" className="chem-molecule">
              <img src={img('water-molecule')} alt="" className="chem-molecule-img" />
              <span>
                <span className="chem-molecule-title">Why is water bent?</span>
                <span className="chem-molecule-text">Explore the 3D model to see how the structure leads to water’s unique properties.</span>
                <span className="chem-link">
                  Open the 3D model <ArrowRight size={16} aria-hidden="true" />
                </span>
              </span>
            </AppLink>
          </section>
        </>
      )}

      <p className="chem-home-foot">
        <BookOpen size={18} aria-hidden="true" /> Explanations with sources, examples, and clear definitions.
      </p>
    </div>
  )
}

function ResultList({ items }: { items: readonly ChemItem[] }) {
  return (
    <ul className="chem-result-list">
      {items.map((r) => (
        <li key={r.id}>
          <AppLink href={r.href} className="chem-result">
            <span className="chem-result-top">
              <span className="chem-result-title">{r.title}</span>
              <span className={`chem-badge is-${r.label.toLowerCase()}`}>{r.label}</span>
            </span>
            <span className="chem-result-text">{r.sentence}</span>
            <span className="chem-result-role">{ROLE_LABELS[r.role]}</span>
          </AppLink>
        </li>
      ))}
    </ul>
  )
}

function Empty({ q, filtered, onClear, onAll }: { q: string; filtered: boolean; onClear: () => void; onAll?: () => void }) {
  return (
    <div className="chem-empty" role="status">
      <p>
        <strong>Nothing matches “{q}”{filtered ? ' with this filter' : ''}.</strong>
      </p>
      <p>Try a simpler word (“mole”, “bond”), a formula (“H2O”) or a question (“how do I calculate molarity”).</p>
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

function GroupPage({ group, items, onBack }: { group: (typeof CHEM_GROUPS)[number]; items: ChemItem[]; onBack: () => void }) {
  // Elements are many and are all in the periodic table: list a few, then point to the table.
  const elements = items.filter((i) => i.id.startsWith('element:'))
  const rest = items.filter((i) => !i.id.startsWith('element:'))
  return (
    <section className="chem-group-page" aria-labelledby="chem-group-title">
      <button type="button" className="chem-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" /> Chemistry topics
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
            <ResultList items={list} />
          </section>
        )
      })}
      {elements.length > 0 && (
        <p className="chem-role-help">
          All {elements.length} elements are in the <AppLink href="?csec=periodic#/chemistry">periodic table</AppLink>; search for one by name or symbol (“Fe”).
        </p>
      )}
    </section>
  )
}
