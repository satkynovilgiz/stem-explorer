import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { canonicalKey, defaultTitle, hrefFor, type ShareState } from '../../lib/explorations'
import { clearDraft, draftFailureText, readDraft, sessionStore, writeDraft, type DraftWriteResult } from '../../lib/noteDrafts'
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from '../../lib/notesStore'

export interface DraftValues {
  title: string
  body: string
}

/**
 * Title + plain-text observations with an explicit Save. Unsaved changes are written to this tab's
 * session storage as you type, so a reload or leaving the explorer keeps them; they are offered back
 * the next time this editor opens. Cancel asks before discarding. No browser dialogs are used.
 *
 * For a new note, `current` is the exploration on screen. The note is attached to the exploration
 * the draft was started in, which is shown, and never silently swapped for the one on screen.
 */
export function NoteEditor({
  scope,
  initial,
  current = null,
  saveLabel,
  onSave,
  onCancel,
}: {
  /** Identifies the draft, e.g. "new:chemistry" or "edit:<note id>". */
  scope: string
  initial: DraftValues
  /** New notes only: the exploration currently on screen. */
  current?: ShareState | null
  saveLabel: string
  /** Returns true when the note was persisted (the editor then closes). */
  onSave: (values: DraftValues, attachTo: ShareState | null) => boolean
  onCancel: () => void
}) {
  const id = useId()
  const [pending] = useState(() => readDraft(sessionStore(), scope))
  const [offerRestore, setOfferRestore] = useState(!!pending)
  const [values, setValues] = useState(initial)
  const [attachTo, setAttachTo] = useState(current)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [draftResult, setDraftResult] = useState<DraftWriteResult>({ ok: true })
  const dirty = values.title !== initial.title || values.body !== initial.body

  // Every edit is written to the draft straight away (one small sessionStorage write), so a reload
  // at any moment keeps it. Returning to the original text removes the draft.
  const update = (next: DraftValues, nextAttach = attachTo) => {
    setValues(next)
    setAttachTo(nextAttach)
    const store = sessionStore()
    if (next.title === initial.title && next.body === initial.body) {
      clearDraft(store, scope)
      setDraftResult({ ok: true })
    } else {
      setDraftResult(writeDraft(store, scope, { ...next, state: nextAttach }))
    }
  }

  const discard = () => {
    clearDraft(sessionStore(), scope)
    onCancel()
  }
  const cancel = () => (dirty && !confirmDiscard ? setConfirmDiscard(true) : discard())

  if (offerRestore && pending) {
    return (
      <div className="note-restore" role="group" aria-label="Unsaved note draft">
        <p className="small">
          You have an unsaved note draft{pending.title ? <> “{pending.title}”</> : null} in this tab
          {pending.state ? <>, started in <strong>{defaultTitle(pending.state)}</strong></> : null}.
        </p>
        <div className="share-row">
          <button
            type="button"
            className="button"
            onClick={() => {
              setValues({ title: pending.title, body: pending.body })
              if (pending.state) setAttachTo(pending.state)
              setOfferRestore(false)
            }}
          >
            Restore draft
          </button>
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              clearDraft(sessionStore(), scope)
              setOfferRestore(false)
            }}
          >
            Discard draft
          </button>
        </div>
      </div>
    )
  }

  const elsewhere = attachTo && current && canonicalKey(attachTo) !== canonicalKey(current)
  return (
    <form
      className="note-editor"
      onSubmit={(e) => {
        e.preventDefault()
        if (onSave(values, attachTo)) clearDraft(sessionStore(), scope)
      }}
    >
      {attachTo && (
        <div className={`note-attach${elsewhere ? ' is-elsewhere' : ''}`}>
          <p className="small">
            <span className="muted">Attached to:</span> <strong>{defaultTitle(attachTo)}</strong>
          </p>
          {elsewhere && current && (
            <>
              <p className="small">This draft was started in a different view from the one on screen. Saving attaches it to the view above.</p>
              <div className="share-row">
                <AppLink href={hrefFor(attachTo)} className="relation-link">
                  Open that view
                </AppLink>
                <button type="button" className="relation-link" onClick={() => update(values, current)}>
                  Attach to {defaultTitle(current)} instead
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <label htmlFor={`${id}-title`} className="param-label">
        Title
      </label>
      <input
        id={`${id}-title`}
        className="search-input save-input"
        value={values.title}
        maxLength={MAX_NOTE_TITLE}
        required
        onChange={(e) => update({ ...values, title: e.target.value })}
      />
      <label htmlFor={`${id}-body`} className="param-label">
        Observations
      </label>
      <textarea
        id={`${id}-body`}
        className="note-body-input"
        value={values.body}
        maxLength={MAX_NOTE_BODY}
        rows={5}
        placeholder="What did you notice?"
        onChange={(e) => update({ ...values, body: e.target.value })}
      />
      <p className="muted small note-draft-status">
        {dirty ? (draftResult.ok ? 'Unsaved changes, kept as a draft in this tab. ' : 'Unsaved changes. ') : ''}
        {values.body.length} / {MAX_NOTE_BODY} characters
      </p>
      {dirty && !draftResult.ok && (
        <p className="small status-error" role="alert">
          {draftFailureText(draftResult.reason)}
        </p>
      )}
      {confirmDiscard ? (
        <div className="share-row" role="group" aria-label="Discard unsaved changes?">
          <span className="small">Discard your unsaved changes?</span>
          <button type="button" className="tool-button is-danger" onClick={discard}>
            Discard
          </button>
          <button type="button" className="tool-button bordered" onClick={() => setConfirmDiscard(false)}>
            Keep editing
          </button>
        </div>
      ) : (
        <div className="share-row">
          <button type="submit" className="button" disabled={!values.title.trim()}>
            <Check size={16} aria-hidden="true" />
            {saveLabel}
          </button>
          <button type="button" className="tool-button bordered" onClick={cancel}>
            Cancel
          </button>
        </div>
      )}
    </form>
  )
}
