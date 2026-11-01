import { ArrowLeft, ChevronRight, ListTree, Maximize2, Minimize2, PanelLeft, PanelRight, Presentation, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { locate, MODULES, type TopicModule } from '../data/topics'
import { SUBJECTS, type SubjectId } from '../data/subjects'
import { normalize } from '../lib/chemistry'
import { useLocationSearch } from '../lib/location'
import { moduleHref, rememberModuleState } from '../lib/moduleContext'
import { restoreLayout, toggleFocus, toggleSide, usePeek, useWorkspace } from '../lib/workspace'
import { AppLink } from './AppLink'
import { ChemHeaderSearch, ChemNav, SubjectHeaderSearch, SubjectNav } from './ChemNav'
import { overviewHref } from '../lib/overviewRoute'
import { SubjectIcon } from './SubjectIcon'

const subjectName = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!.name

/**
 * Local navigation inside a subject (the app has no global header): the way back Home, where you
 * are (Home › subject › module › topic) and a drawer of this subject's modules and topics. Other
 * subjects are reached from Home and from search. Each explorer's own toolbar holds its display
 * controls.
 */
export function SubjectBar({ subject, overview = false, onPresent }: { subject: SubjectId; overview?: boolean; onPresent?: () => void }) {
  const search = useLocationSearch()
  const { module, topic } = locate(subject, search)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    rememberModuleState(subject, search)
  }, [subject, search])
  // The "t" shortcut opens the drawer.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('stem:open-topics', onOpen)
    return () => window.removeEventListener('stem:open-topics', onOpen)
  }, [])
  const ws = useWorkspace()
  const peek = usePeek()
  const leftShown = ws.focus ? peek === 'left' : !ws.hideLeft
  const rightShown = ws.focus ? peek === 'right' : !ws.hideRight
  const changed = ws.focus || ws.hideLeft || ws.hideRight
  // Layout and presentation controls belong to model workspaces. Chemistry's topic page, reading
  // pages and calculators are single columns, so they have none.
  const CHEM_WORKSPACES = ['chemistry.molecules', 'chemistry.periodic', 'chemistry.atomic', 'chemistry.bonding']
  const hasPanels = !overview && (subject !== 'chemistry' || CHEM_WORKSPACES.includes(module.id))
  const isChemTopics = module.id === 'chemistry.topics'
  // The subject's own landing page: Chemistry's Overview, or another subject's #/<subject>/overview.
  const atOverview = subject === 'chemistry' ? isChemTopics : overview
  const name = subjectName(subject)
  // Chemistry's Elements, Atomic structure and Bonding workspaces have no left panel.
  const hasLeft = subject !== 'chemistry' || module.id === 'chemistry.molecules'

  const close = () => {
    setOpen(false)
    // After the modal dialog has closed (the page outside it is inert until then).
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const crumbs = (
    <nav aria-label="Breadcrumb" className="crumbs">
      <ol>
        <li>
          <a href="#/home" className="crumb-home">
            <ArrowLeft size={15} aria-hidden="true" />
            Home
          </a>
          <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />
        </li>
        {subject === 'chemistry' ? (
          // Chemistry: the subject name always leads back to its Overview; the tab row marks the destination.
          <li>
            <AppLink href="?csec=topics#/chemistry" className="crumb-subject is-chemistry" aria-current={isChemTopics ? 'page' : undefined}>
              <SubjectIcon subject={subject} size={14} />
              Chemistry
            </AppLink>
            {!isChemTopics && <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />}
          </li>
        ) : (
          // Other subjects: the subject name leads to its Overview.
          <li>
            <AppLink href={overviewHref(subject)} className={`crumb-subject is-${subject}`} aria-current={overview ? 'page' : undefined}>
              <SubjectIcon subject={subject} size={14} />
              {name}
            </AppLink>
            {!overview && <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />}
          </li>
        )}
        {!atOverview && (
          <li>
            <span className="crumb-module" aria-current={topic ? undefined : 'page'}>
              {module.name}
            </span>
            {topic && <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />}
          </li>
        )}
        {topic && !atOverview && (
          <li>
            <span className="crumb-topic" aria-current="page">
              {topic}
            </span>
          </li>
        )}
      </ol>
    </nav>
  )

  const layoutControls = hasPanels && (
    <div className="workspace-controls" role="group" aria-label="Workspace layout">
      {hasLeft && (
        <button
          type="button"
          className="tool-button bordered"
          data-ws-toggle="left"
          aria-pressed={leftShown}
          title="Left panel ( [ )"
          onClick={() => toggleSide('left')}
        >
          <PanelLeft size={15} aria-hidden="true" />
          <span>{ws.focus ? 'Controls' : 'Left panel'}</span>
        </button>
      )}
      <button
        type="button"
        className="tool-button bordered"
        data-ws-toggle="right"
        aria-pressed={rightShown}
        title="Right panel ( ] )"
        onClick={() => toggleSide('right')}
      >
        <PanelRight size={15} aria-hidden="true" />
        <span>{ws.focus ? 'Details' : 'Right panel'}</span>
      </button>
      <button type="button" className="tool-button bordered" aria-pressed={ws.focus} title="Focus mode ( f )" onClick={toggleFocus}>
        {ws.focus ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
        <span>Focus mode</span>
      </button>
      {changed && (
        <button type="button" className="tool-button bordered workspace-restore" onClick={restoreLayout}>
          <span>Show all panels</span>
        </button>
      )}
    </div>
  )
  const present = onPresent && hasPanels && (
    <button type="button" className="tool-button bordered present-toggle" onClick={onPresent}>
      <Presentation size={15} aria-hidden="true" />
      <span>Present</span>
    </button>
  )

  // Every subject has its own header: a thin breadcrumb row, then the brand (it opens the subject's
  // Overview), the destination tabs, a compact search (the Overview has its own large one) and, on
  // model pages, layout controls. Other subjects keep the drawer listing their modules and topics.
  return (
    <div className={`subject-bar chem-bar is-${subject}`}>
      <div className="chem-bar-top">{crumbs}</div>
      <div className="chem-bar-main">
        <AppLink href={overviewHref(subject)} className="chem-brand" aria-label={`${name} Explorer: Overview`}>
          <span className="chem-brand-mark">
            <SubjectIcon subject={subject} size={18} />
          </span>
          <span className="chem-brand-name">{name}</span>
        </AppLink>
        {subject === 'chemistry' ? <ChemNav moduleId={module.id} /> : <SubjectNav subject={subject} name={name} moduleId={module.id} overview={overview} />}
        <div className="chem-bar-actions">
          {!atOverview && (subject === 'chemistry' ? <ChemHeaderSearch /> : <SubjectHeaderSearch subject={subject} name={name} />)}
          {subject !== 'chemistry' && (
            <button ref={triggerRef} type="button" className="tool-button bordered topics-toggle" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
              <ListTree size={15} aria-hidden="true" />
              <span>All {name.toLowerCase()} topics</span>
            </button>
          )}
          {layoutControls}
          {present}
        </div>
      </div>
      {open && <TopicDrawer subject={subject} current={module} onClose={close} />}
    </div>
  )
}

function TopicDrawer({ subject, current, onClose }: { subject: SubjectId; current: TopicModule; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  // A press that started on the backdrop; the interaction that opened the drawer never closes it.
  const backdropPress = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    // Start in the filter (showModal would otherwise focus the close button).
    inputRef.current?.focus()
    return () => dialog.close()
  }, [])

  // The current subject first, then the others in the app's order.
  const groups = useMemo(() => {
    // Only this subject: other subjects are reached from Home and search.
    const order = [subject]
    const terms = normalize(query).split(/\s+/).filter(Boolean)
    const hit = (text: string) => terms.every((t) => normalize(text).includes(t))
    return order
      .map((id) => ({
        subject: id,
        modules: MODULES.filter((m) => m.subject === id)
          .map((m) => {
            const moduleHit = !terms.length || hit(`${subjectName(id)} ${m.name} ${m.summary}`)
            const topics = m.topics.filter((t) => moduleHit || hit(t.label))
            return moduleHit || topics.length ? { module: m, topics } : null
          })
          .filter((x) => x !== null),
      }))
      .filter((g) => g.modules.length)
  }, [query, subject])
  const count = groups.reduce((n, g) => n + g.modules.length, 0)

  return (
    <dialog
      ref={dialogRef}
      className="topic-drawer"
      aria-labelledby="topic-drawer-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onPointerDown={(e) => {
        backdropPress.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // Pressing and releasing on the backdrop (the dialog element itself, outside its content) closes it.
        if (backdropPress.current && e.target === e.currentTarget) onClose()
        backdropPress.current = false
      }}
    >
      <div className="topic-drawer-inner">
        <header className="topic-drawer-head">
          <h2 id="topic-drawer-title">{subjectName(subject)} topics</h2>
          <button type="button" className="icon-button" aria-label="Close topics" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <label className="topic-search">
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Filter modules and topics</span>
          <input
            type="search"
            placeholder={`Filter ${subjectName(subject).toLowerCase()} topics…`}
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="visually-hidden" role="status">
          {query ? `${count} module${count === 1 ? '' : 's'} match` : ''}
        </p>
        {groups.length === 0 ? (
          <p className="muted small topic-empty">
            No {subjectName(subject).toLowerCase()} topic matches “{query}”.{' '}
            <AppLink href={`?q=${encodeURIComponent(query)}#/search`}>Search all subjects for “{query}”</AppLink>.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.subject} className="topic-group" aria-labelledby={`topic-group-${g.subject}`}>
              <h3 id={`topic-group-${g.subject}`} className={`topic-group-title is-${g.subject}`}>
                <SubjectIcon subject={g.subject} size={15} />
                {subjectName(g.subject)}
              </h3>
              <ul className="topic-modules">
                {g.modules.map(({ module: m, topics }) => {
                  const target = moduleHref(m)
                  const here = m.id === current.id
                  return (
                    <li key={m.id} className={`topic-module${here ? ' is-current' : ''}`}>
                      <AppLink href={target.href} className="topic-module-link" aria-current={here ? 'page' : undefined} onClick={onClose}>
                        <span className="topic-module-name">{m.name}</span>
                        {here ? (
                          <span className="topic-badge">You are here</span>
                        ) : (
                          target.remembered && <span className="topic-badge is-muted">Where you left it</span>
                        )}
                      </AppLink>
                      <p className="topic-module-summary">{m.summary}</p>
                      {topics.length > 0 && (
                        <ul className="topic-list" aria-label={`${m.name} topics`}>
                          {topics.map((t) => (
                            <li key={t.href}>
                              <AppLink href={t.href} onClick={onClose}>
                                {t.label}
                              </AppLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </dialog>
  )
}
