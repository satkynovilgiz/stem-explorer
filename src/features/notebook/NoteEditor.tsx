import { Check } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { MAX_NOTE_BODY, MAX_NOTE_TITLE } from '../../lib/notesStore'

/** Where an unsaved draft is kept for this browser session if the editor closes without saving. */
const draftKey = (scope: string) => `stem-explorer:note-draft:${scope}`

export interface DraftValues {
  title: string
  body: string
}

function readDraft(scope: string): DraftValues | null {
  try {
    const raw = window.sessionStorage.getItem(draftKey(scope))
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<DraftValues>
    return typeof d.title === 'string' && typeof d.body === 'string' ? { title: d.title, body: d.body } : null
  } catch {
    return null
  }
}

function writeDraft(scope: string, d: DraftValues | null) {
  try {
    if (d) window.sessionStorage.setItem(draftKey(scope), JSON.stringify(d))
    else window.sessionStorage.removeItem(draftKey(scope))
  } catch {
    // Session storage blocked: the draft simply isn't kept.
  }
}

/**
 * Title + plain-text observations with an explicit Save. Unsaved changes are never lost silently:
 * Cancel asks first, and if the editor disappears (e.g. you open another subject) the draft is kept
 * for this session and offered back next time. No browser dialogs are used.
 */
export function NoteEditor({
  scope,
  initial,
  saveLabel,
  onSave,
  onCancel,
}: {
  /** Identifies the draft, e.g. "new:chemistry" or "edit:<note id>". */
  scope: string
  initial: DraftValues
  saveLabel: string
  /** Returns true when the note was persisted (the editor then closes). */
  onSave: (values: DraftValues) => boolean
  onCancel: () => void
}) {
  const id = useId()
  const [pending] = useState(() => readDraft(scope))
  const [values, setValues] = useState(initial)
  const [offerRestore, setOfferRestore] = useState(!!pending)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dirty = values.title !== initial.title || values.body !== initial.body
  const latest = useRef({ values, dirty, saved: false })
  useEffect(() => {
    latest.current = { ...latest.current, values, dirty }
  })
  // Keep an unsaved draft if the editor goes away without Save or an explicit discard.
  useEffect(
    () => () => {
      if (latest.current.dirty && !latest.current.saved) writeDraft(scope, latest.current.values)
    },
    [scope],
  )

  const cancel = () => {
    if (dirty && !confirmDiscard) return setConfirmDiscard(true)
    latest.current.saved = true
    writeDraft(scope, null)
    onCancel()
  }

  return (
    <form
      className="note-editor"
      onSubmit={(e) => {
        e.preventDefault()
        if (onSave(values)) {
          latest.current.saved = true
          writeDraft(scope, null)
        }
      }}
    >
      {offerRestore && pending && (
        <div className="note-restore" role="status">
          <span>You have an unsaved note from earlier in this session.</span>
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              setValues(pending)
              setOfferRestore(false)
            }}
          >
            Restore it
          </button>
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              writeDraft(scope, null)
              setOfferRestore(false)
            }}
          >
            Discard it
          </button>
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
        onChange={(e) => setValues({ ...values, title: e.target.value })}
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
        onChange={(e) => setValues({ ...values, body: e.target.value })}
      />
      <p className="muted small">
        {dirty ? 'Unsaved changes. ' : ''}
        {values.body.length} / {MAX_NOTE_BODY} characters
      </p>
      {confirmDiscard ? (
        <div className="share-row" role="group" aria-label="Discard unsaved changes?">
          <span className="small">Discard your unsaved changes?</span>
          <button type="button" className="tool-button is-danger" onClick={cancel}>
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
