import { ExternalLink, NotebookPen, Pencil, Trash2, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { hrefFor, subjectName } from '../../lib/explorations'
import { browserStorage } from '../../lib/explorationStore'
import { deleteNote, restoreNote, updateNote, type Note } from '../../lib/notesStore'
import { storeFailureText } from '../../lib/storeMessages'
import { notifyNotesChange, useNotebook } from '../../lib/useNotebook'
import { NotebookBackupControls } from './NotebookBackupControls'
import { NoteEditor } from './NoteEditor'

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

type Toast = { text: string; undo?: { note: Note; index: number } } | null

function NoteCard({ note, onMessage }: { note: Note; onMessage: (t: Toast) => void }) {
  const [editing, setEditing] = useState(false)
  return (
    <li className={`note-card is-${note.subject}`}>
      {editing ? (
        <NoteEditor
          scope={`edit:${note.id}`}
          initial={{ title: note.title, body: note.body }}
          saveLabel="Save changes"
          onSave={(values) => {
            const r = updateNote(browserStorage(), note.id, values)
            if (!r.ok) {
              onMessage({ text: storeFailureText('note', r.reason) })
              return false
            }
            setEditing(false)
            onMessage({ text: `Saved “${r.value.title}”.` })
            notifyNotesChange()
            return true
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="note-head">
            <h2 className="note-title">{note.title}</h2>
            <span className={`subject-chip is-${note.subject}`}>{subjectName(note.subject)}</span>
          </div>
          <p className="note-meta muted small">
            Created {fmt(note.createdAt)}
            {note.updatedAt !== note.createdAt && <> · Updated {fmt(note.updatedAt)}</>}
          </p>
          {/* Plain text: React escapes it, and line breaks are kept by CSS (white-space: pre-wrap). */}
          {note.body ? <p className="note-body">{note.body}</p> : <p className="muted small">No observations written.</p>}
          <div className="share-row">
            <AppLink href={hrefFor(note)} className="button">
              <ExternalLink size={15} aria-hidden="true" />
              Reopen exploration
            </AppLink>
            <button type="button" className="tool-button bordered" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className="tool-button is-danger"
              onClick={() => {
                const r = deleteNote(browserStorage(), note.id)
                if (!r.ok) return onMessage({ text: storeFailureText('delete-note', r.reason) })
                onMessage({ text: `Deleted “${note.title}”.`, undo: r.value })
                notifyNotesChange()
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </li>
  )
}

export function NotebookPage() {
  const { notes, error } = useNotebook()
  const [filter, setFilter] = useState<SubjectId | 'all'>('all')
  const [toast, setToast] = useState<Toast>(null)
  const shown = filter === 'all' ? notes : notes.filter((n) => n.subject === filter)
  const count = (s: SubjectId) => notes.filter((n) => n.subject === s).length

  return (
    <div className={`glossary notebook${toast ? ' has-toast' : ''}`}>
      <header className="glossary-head">
        <p className="eyebrow">Your notes</p>
        <h1 className="home-title">Notebook</h1>
        <p className="home-lead">Observations you’ve written while exploring, each linked back to the exact view it was made in.</p>
        <p className="muted small">
          Notes live in this browser only. Clearing site data or browsing privately can remove them; export a backup to keep a
          copy.
        </p>
      </header>

      {error === 'unavailable' ? (
        <p className="empty-state">The notebook isn’t available because this browser is blocking local storage. The explorers still work.</p>
      ) : error === 'unreadable' ? (
        <p className="empty-state">
          The notebook stored on this browser is damaged and can’t be read. It has been left untouched, and new notes are paused so
          nothing is overwritten. Clearing this site’s data in your browser settings starts a fresh notebook.
        </p>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <p>
            <NotebookPen size={16} aria-hidden="true" /> No notes yet.
          </p>
          <p className="muted">
            In any explorer, use <strong>Add note</strong> next to Copy link to write down what you notice. The note keeps that
            view’s settings so you can reopen it.
          </p>
        </div>
      ) : (
        <>
          <div className="segmented glossary-filter" role="group" aria-label="Filter notes by subject">
            <button type="button" className="segmented-option" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All ({notes.length})
            </button>
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" className="segmented-option" aria-pressed={filter === s.id} onClick={() => setFilter(s.id)}>
                {s.name} ({count(s.id)})
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="empty-state">No notes for {subjectName(filter as SubjectId)} yet.</p>
          ) : (
            <ul className="note-list">
              {shown.map((n) => (
                <NoteCard key={n.id} note={n} onMessage={setToast} />
              ))}
            </ul>
          )}
        </>
      )}

      <section className="home-panel" aria-labelledby="notebook-backup-heading">
        <h2 id="notebook-backup-heading" className="home-h2">
          Back up your notebook
        </h2>
        <NotebookBackupControls notes={notes} disabled={error !== null} onMessage={(text) => setToast(text ? { text } : null)} />
      </section>

      <div className="home-toast" role="status">
        {toast && (
          <>
            <p className="library-status">{toast.text}</p>
            {toast.undo && (
              <button
                type="button"
                className="tool-button bordered"
                onClick={() => {
                  const r = restoreNote(browserStorage(), toast.undo!.note, toast.undo!.index)
                  setToast({ text: r.ok ? `Restored “${toast.undo!.note.title}”.` : storeFailureText('note', r.reason) })
                  notifyNotesChange()
                }}
              >
                <Undo2 size={15} aria-hidden="true" />
                <span>Undo</span>
              </button>
            )}
            <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setToast(null)}>
              <X size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
