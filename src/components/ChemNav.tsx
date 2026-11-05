import { Atom, BookOpen, Calculator, Compass, Grid3x3, Hexagon, Link2, Search } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { navigateTo } from '../lib/hooks'
import { modulesOf } from '../data/topics'
import type { SubjectId } from '../data/subjects'
import { calculatorsHref, overviewHref } from '../lib/overviewRoute'
import { AppLink } from './AppLink'

/*
 * Chemistry's sections: six things a student already has words for, each with a short hint. Every page
 * belongs to one, except the Overview and the directory of models at csec=visual.
 */
const MENU = [
  { label: 'Learn', hint: 'Short explanations with worked examples', icon: BookOpen, href: '?csec=contents#/chemistry', modules: ['chemistry.contents', 'chemistry.learn'] },
  { label: 'Calculators', hint: 'Work out a number, step by step', icon: Calculator, href: '?csec=tools#/chemistry', modules: ['chemistry.tools', 'chemistry.solutions', 'chemistry.reactions'] },
  { label: 'Molecules', hint: 'See molecules in 3D and measure them', icon: Hexagon, href: '?csec=library#/chemistry', modules: ['chemistry.library', 'chemistry.molecules'] },
  { label: 'Atoms', hint: 'See what is inside an atom', icon: Atom, href: '?csec=atomic&el=6#/chemistry', modules: ['chemistry.atomic'] },
  { label: 'Bonds', hint: 'How atoms join together', icon: Link2, href: '?csec=bonding#/chemistry', modules: ['chemistry.bonding'] },
  { label: 'Periodic table', hint: 'Find any element', icon: Grid3x3, href: '?csec=periodic#/chemistry', modules: ['chemistry.periodic'] },
] as const

/** A slim strip that stays on the left of every Chemistry page: nothing to open, nothing hidden. */
export function ChemRail({ moduleId }: { moduleId: string }) {
  return (
    <nav className="chem-rail" aria-label="Chemistry">
      <ul>
        {MENU.map((m) => {
          const Icon = m.icon
          return (
            <li key={m.label}>
              <AppLink href={m.href} className="chem-rail-link" title={m.hint} aria-current={(m.modules as readonly string[]).includes(moduleId) ? 'page' : undefined}>
                <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                {m.label}
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
