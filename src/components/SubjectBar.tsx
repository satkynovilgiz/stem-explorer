import { ChevronRight, ListTree, Maximize2, Minimize2, PanelLeft, PanelRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { locate, MODULES, type TopicModule } from '../data/topics'
import { SUBJECTS, type SubjectId } from '../data/subjects'
import { normalize } from '../lib/chemistry'
import { useLocationSearch } from '../lib/location'
import { moduleHref, rememberModuleState } from '../lib/moduleContext'
import { restoreLayout, toggleFocus, toggleSide, usePeek, useWorkspace } from '../lib/workspace'
import { AppLink } from './AppLink'
import { SubjectIcon } from './SubjectIcon'

const subjectName = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!.name

/**
 * Where you are (Home › subject › module › topic) and a searchable drawer of every module and
 * curated topic. This is navigation; each explorer's own toolbar holds its display controls.
 */
export function SubjectBar({ subject }: { subject: SubjectId }) {
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

  const close = () => {
    setOpen(false)
    // After the modal dialog has closed (the page outside it is inert until then).
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <div className="subject-bar">
      <nav aria-label="Breadcrumb" className="crumbs">
        <ol>
          <li>
            <a href="#/home">Home</a>
            <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />
          </li>
          <li>
            <span className={`crumb-subject is-${subject}`}>
              <SubjectIcon subject={subject} size={14} />
              {subjectName(subject)}
            </span>
            <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />
          </li>
          <li>
            <span className="crumb-module" aria-current={topic ? undefined : 'page'}>
              {module.name}
            </span>
            {topic && <ChevronRight size={14} aria-hidden="true" className="crumb-sep" />}
          </li>
          {topic && (
            <li>
              <span className="crumb-topic" aria-current="page">
                {topic}
              </span>
            </li>
          )}
        </ol>
      </nav>
      <div className="workspace-controls" role="group" aria-label="Workspace layout">
        <button type="button" className="tool-button bordered" data-ws-toggle="left" aria-pressed={leftShown} title="Left panel ( [ )" onClick={() => toggleSide('left')}>
          <PanelLeft size={15} aria-hidden="true" />
          <span>{ws.focus ? 'Controls' : 'Left panel'}</span>
        </button>
        <button type="button" className="tool-button bordered" data-ws-toggle="right" aria-pressed={rightShown} title="Right panel ( ] )" onClick={() => toggleSide('right')}>
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
      <button ref={triggerRef} type="button" className="tool-button bordered topics-toggle" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <ListTree size={15} aria-hidden="true" />
        <span>Topics</span>
      </button>
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
    const order = [subject, ...SUBJECTS.map((s) => s.id).filter((id) => id !== subject)]
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
          <h2 id="topic-drawer-title">Modules and topics</h2>
          <button type="button" className="icon-button" aria-label="Close topics" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <label className="topic-search">
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Filter modules and topics</span>
          <input type="search" placeholder="Filter modules and topics…" ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <p className="visually-hidden" role="status">
          {query ? `${count} module${count === 1 ? '' : 's'} match` : ''}
        </p>
        {groups.length === 0 ? (
          <p className="muted small topic-empty">
            No module or topic matches “{query}”. Search covers every structure and term: <AppLink href={`?q=${encodeURIComponent(query)}#/search`}>search for “{query}”</AppLink>.
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
                        {here ? <span className="topic-badge">You are here</span> : target.remembered && <span className="topic-badge is-muted">Where you left it</span>}
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
