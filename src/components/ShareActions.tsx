import { Bookmark, Check, ListPlus, NotebookPen } from 'lucide-react'
import { useId, useState } from 'react'
import type { SubjectId } from '../data/subjects'
import { canonicalize, defaultTitle, subjectName, type ShareState } from '../lib/explorations'
import { browserStorage, MAX_TITLE_LENGTH, renameExploration, saveExploration, type Exploration } from '../lib/explorationStore'
import { storeFailureText } from '../lib/storeMessages'
import { shareUrl } from '../lib/urlState'
import { notifyLibraryChange } from '../lib/useExplorationLibrary'
import { addNote } from '../lib/notesStore'
import { readDraft, sessionStore } from '../lib/noteDrafts'
import { notifyNotesChange } from '../lib/useNotebook'
import { NoteEditor, type DraftValues } from '../features/notebook/NoteEditor'
import { AppLink } from './AppLink'
import { AddToCollection } from './AddToCollection'
import { CopyLinkButton } from './CopyLinkButton'

interface Props {
  subject: SubjectId
  /** The canonical share parameters — the same values Copy link uses. */
  params: Record<string, string>
  /** What the link restores, for the Copy link message. */
  restores: string
}

type Message =
  | { kind: 'saved'; title: string }
  | { kind: 'duplicate'; existing: Exploration }
  | { kind: 'renamed'; title: string }
  | { kind: 'error'; text: string }
  | { kind: 'note'; title: string }
  | { kind: 'collection'; title: string }


/** Copy link + Save exploration, both built from one canonical share state. */
export function ShareActions({ subject, params, restores }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [collectOpen, setCollectOpen] = useState(false)
  const state = canonicalize(subject, params)
  const suggested = state ? defaultTitle(state) : ''
  const draftScope = `new:${subject}`
  // Re-read on each render while the editor is closed, so a draft left by a reload is mentioned.
  const waitingDraft = !noteOpen ? readDraft(sessionStore(), draftScope) : null

  const save = () => {
    if (!state) return setMessage({ kind: 'error', text: storeFailureText('save', 'invalid') })
    const result = saveExploration(browserStorage(), state, name || suggested)
    if (result.ok) {
      setMessage({ kind: 'saved', title: result.value.title })
      setOpen(false)
      notifyLibraryChange()
    } else if (result.reason === 'duplicate' && result.existing) {
      setMessage({ kind: 'duplicate', existing: result.existing })
    } else {
      setMessage({ kind: 'error', text: storeFailureText('save', result.reason) })
    }
  }

  const renameExisting = (existing: Exploration) => {
    const result = renameExploration(browserStorage(), existing.id, name || suggested)
    if (result.ok) {
      setMessage({ kind: 'renamed', title: result.value.title })
      setOpen(false)
      notifyLibraryChange()
    } else {
      setMessage({ kind: 'error', text: storeFailureText('rename', result.reason) })
    }
  }

  const addToNotebook = (values: DraftValues, attachTo: ShareState | null): boolean => {
    const target = attachTo ?? state
    if (!target) return false
    const result = addNote(browserStorage(), target, values)
    if (result.ok) {
      setNoteOpen(false)
      setMessage({ kind: 'note', title: result.value.title })
      notifyNotesChange()
      return true
    }
    setMessage({ kind: 'error', text: storeFailureText('note', result.reason) })
    return false
  }

  return (
    <div className="share-actions">
      <div className="share-row">
        <CopyLinkButton restores={restores} getUrl={() => shareUrl(window.location, subject, params)} />
        <button
          type="button"
          className="tool-button bordered"
          aria-expanded={noteOpen}
          onClick={() => {
            setNoteOpen((o) => !o)
            setOpen(false)
            setCollectOpen(false)
            setMessage(null)
          }}
        >
          <NotebookPen size={16} aria-hidden="true" />
          <span>Add note</span>
        </button>
        <button
          type="button"
          className="tool-button bordered"
          aria-expanded={open}
          aria-controls={`${id}-form`}
          onClick={() => {
            setOpen((o) => !o)
            setNoteOpen(false)
            setCollectOpen(false)
            setName(suggested)
            setMessage(null)
          }}
        >
          <Bookmark size={16} aria-hidden="true" />
          <span>Save exploration</span>
        </button>
        <button
          type="button"
          className="tool-button bordered"
          aria-expanded={collectOpen}
          onClick={() => {
            setCollectOpen((o) => !o)
            setOpen(false)
            setNoteOpen(false)
            setMessage(null)
          }}
        >
          <ListPlus size={16} aria-hidden="true" />
          <span>Add to collection</span>
        </button>
      </div>
      {collectOpen && state && (
        <AddToCollection
          state={state}
          suggestedTitle={suggested}
          onDone={(title) => {
            setCollectOpen(false)
            setMessage({ kind: 'collection', title })
          }}
          onError={(text) => setMessage({ kind: 'error', text })}
          onCancel={() => setCollectOpen(false)}
        />
      )}
      {open && (
        <form
          id={`${id}-form`}
          className="save-form"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label htmlFor={`${id}-name`} className="param-label">
            Name
          </label>
          <input
            id={`${id}-name`}
            className="search-input save-input"
            value={name}
            maxLength={MAX_TITLE_LENGTH}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="share-row">
            <button type="submit" className="button">
              <Check size={16} aria-hidden="true" />
              Save
            </button>
            <button type="button" className="tool-button bordered" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          <p className="muted small">Saved on this browser.</p>
        </form>
      )}
      {noteOpen && state && (
        <div className="save-form">
          <NoteEditor
            scope={draftScope}
            initial={{ title: suggested, body: '' }}
            current={state}
            saveLabel="Save note"
            onSave={addToNotebook}
            onCancel={() => setNoteOpen(false)}
          />
          <p className="muted small">The note keeps this view’s settings and lives in this browser only.</p>
        </div>
      )}
      {waitingDraft && !message && (
        <p className="muted small note-waiting">
          You have an unsaved {subjectName(subject)} note draft in this tab{waitingDraft.title ? <> (“{waitingDraft.title}”)</> : null}. Choose{' '}
          <strong>Add note</strong> to restore or discard it.
        </p>
      )}
      <p className={`save-status${message?.kind === 'error' ? ' status-error' : message?.kind === 'saved' || message?.kind === 'renamed' || message?.kind === 'note' || message?.kind === 'collection' ? ' status-success' : ''}`} role="status">
        {message?.kind === 'saved' && <>Saved on this browser as “{message.title}”. Find it on the Home page.</>}
        {message?.kind === 'renamed' && <>Saved entry renamed to “{message.title}”.</>}
        {message?.kind === 'error' && message.text}
        {message?.kind === 'note' && (
          <>
            Note “{message.title}” saved. <AppLink href="#/notebook">Open the notebook</AppLink>
          </>
        )}
        {message?.kind === 'collection' && (
          <>
            Added to “{message.title}”. <AppLink href="#/collections">Open collections</AppLink>
          </>
        )}
        {message?.kind === 'duplicate' && (
          <>
            Already saved as “{message.existing.title}”.{' '}
            {open && (
              <button type="button" className="relation-link" onClick={() => renameExisting(message.existing)}>
                Rename it to “{name || suggested}”
              </button>
            )}
          </>
        )}
      </p>
    </div>
  )
}
