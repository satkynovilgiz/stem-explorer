import { Atom, BookOpen, Calculator, Compass, Grid3x3, Orbit, Search } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { navigateTo } from '../lib/hooks'
import { modulesOf } from '../data/topics'
import type { SubjectId } from '../data/subjects'
import { calculatorsHref, overviewHref } from '../lib/overviewRoute'
import { AppLink } from './AppLink'

/*
 * Chemistry's six destinations, as the tab row of Chemistry's own header (there is no global
 * header). Every Chemistry page belongs to one, so the current place is always marked: a
 * calculator is under Tools, an explanation under Topics, the atomic-structure model under
 * Visualizations.
 */
const TABS = [
  { id: 'overview', label: 'Overview', icon: Compass, href: '?csec=topics#/chemistry', modules: ['chemistry.topics'] },
  { id: 'elements', label: 'Elements', icon: Grid3x3, href: '?csec=periodic#/chemistry', modules: ['chemistry.periodic'] },
  { id: 'molecules', label: 'Molecules', icon: Atom, href: '?csec=library#/chemistry', modules: ['chemistry.library', 'chemistry.molecules'] },
  { id: 'topics', label: 'Topics', icon: BookOpen, href: '?csec=contents#/chemistry', modules: ['chemistry.contents', 'chemistry.learn'] },
  { id: 'visual', label: 'Visualizations', icon: Orbit, href: '?csec=visual#/chemistry', modules: ['chemistry.visual', 'chemistry.atomic', 'chemistry.bonding'] },
  { id: 'tools', label: 'Tools', icon: Calculator, href: '?csec=tools#/chemistry', modules: ['chemistry.tools', 'chemistry.solutions', 'chemistry.reactions'] },
] as const

export function ChemNav({ moduleId }: { moduleId: string }) {
  const listRef = useRef<HTMLUListElement>(null)
  // On narrow screens the row scrolls sideways: keep the current tab in view (without scrolling the page).
  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !current || list.scrollWidth <= list.clientWidth) return
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2
  }, [moduleId])

  return (
    <nav className="chem-nav" aria-label="Chemistry">
      <ul ref={listRef}>
        {TABS.map((t) => {
          const here = (t.modules as readonly string[]).includes(moduleId)
          const Icon = t.icon
          return (
            <li key={t.id}>
              <AppLink href={t.href} className="chem-nav-link" aria-current={here ? 'page' : undefined}>
                <Icon size={16} aria-hidden="true" />
                {t.label}
              </AppLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** A compact search in Chemistry's header: it opens the Overview's results for the query. */
export function ChemHeaderSearch() {
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    navigateTo(query ? `?csec=topics&cq=${encodeURIComponent(query)}#/chemistry` : '?csec=topics#/chemistry')
    setQ('')
  }
  return (
    <form className="chem-bar-search" role="search" aria-label="Search chemistry" onSubmit={submit}>
      <Search size={15} aria-hidden="true" className="chem-bar-search-icon" />
      <label htmlFor="chem-bar-q" className="visually-hidden">
        Search chemistry
      </label>
      <input id="chem-bar-q" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
    </form>
  )
}

/** Other subjects' tabs: their Overview, each section (module) in the app's order, then Calculators. */
export function SubjectNav({ subject, name, moduleId, overview, calculators = false }: { subject: SubjectId; name: string; moduleId: string; overview: boolean; calculators?: boolean }) {
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const list = listRef.current
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!list || !current || list.scrollWidth <= list.clientWidth) return
    list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2
  }, [moduleId, overview, calculators])
  const tabs = [
    { id: 'overview', label: 'Overview', href: overviewHref(subject), here: overview },
    ...modulesOf(subject).map((m) => ({ id: m.id, label: m.name, href: m.href, here: !overview && !calculators && m.id === moduleId })),
    { id: 'calculators', label: 'Calculators', href: calculatorsHref(subject), here: calculators },
  ]
  return (
    <nav className="chem-nav" aria-label={name}>
      <ul ref={listRef}>
        {tabs.map((t) => (
          <li key={t.id}>
            <AppLink href={t.href} className="chem-nav-link" aria-current={t.here ? 'page' : undefined}>
              {t.id === 'overview' && <Compass size={16} aria-hidden="true" />}
              {t.id === 'calculators' && <Calculator size={16} aria-hidden="true" />}
              {t.label}
            </AppLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Other subjects' header search: opens the subject Overview's results for the query. */
export function SubjectHeaderSearch({ subject, name }: { subject: SubjectId; name: string }) {
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    navigateTo(query ? `?sq=${encodeURIComponent(query)}${overviewHref(subject)}` : overviewHref(subject))
    setQ('')
  }
  return (
    <form className="chem-bar-search" role="search" aria-label={`Search ${name.toLowerCase()}`} onSubmit={submit}>
      <Search size={15} aria-hidden="true" className="chem-bar-search-icon" />
      <label htmlFor="subject-bar-q" className="visually-hidden">
        Search {name.toLowerCase()}
      </label>
      <input id="subject-bar-q" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
    </form>
  )
}
