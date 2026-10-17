import { Download, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { subjectName } from '../../lib/explorations'
import { browserStorage } from '../../lib/explorationStore'
import {
  applyNotebookImport,
  notebookFileName,
  notebookFileText,
  planNotebookImport,
  type NotebookImportError,
  type NotebookPlan,
} from '../../lib/notebookBackup'
import { MAX_NOTEBOOK_BACKUP_BYTES, MAX_NOTES, type Note } from '../../lib/notesStore'
import { storeFailureText } from '../../lib/storeMessages'
import { notifyNotesChange } from '../../lib/useNotebook'

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function errorText(e: NotebookImportError): string {
  switch (e.kind) {
    case 'too-large':
      return `That file is larger than ${MAX_NOTEBOOK_BACKUP_BYTES / 1_000_000} MB, so it was not read. A full notebook export is well under this size.`
    case 'not-json':
      return 'That file is not valid JSON. Choose a notebook backup exported from STEM Explorer.'
    case 'wrong-format':
      return 'That file is not a STEM Explorer notebook backup.'
    case 'saved-explorations-file':
      return 'That is a saved-explorations backup. Import it under Saved explorations on Home instead; nothing was imported here.'
    case 'unsupported-version':
      return `That notebook backup uses format version ${e.version}, which this version can’t read. Nothing was imported.`
  }
}

/** Export and merge-only import for the notebook, with a preview and a single write. */
export function NotebookBackupControls({ notes, disabled, onMessage }: { notes: Note[]; disabled: boolean; onMessage: (text: string) => void }) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ name: string; text: string; plan: NotebookPlan } | null>(null)

  const exportFile = () => {
    const url = URL.createObjectURL(new Blob([notebookFileText(notes)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = notebookFileName()
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    onMessage(`Exported ${plural(notes.length, 'note')}.`)
  }

  const choose = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setPending(null)
    if (file.size > MAX_NOTEBOOK_BACKUP_BYTES) return onMessage(errorText({ kind: 'too-large' }))
    const text = await file.text().catch(() => null)
    if (text === null) return onMessage('That file could not be read.')
    const r = planNotebookImport(text, notes)
    if (!r.ok) return onMessage(errorText(r.error))
    onMessage('')
    setPending({ name: file.name, text, plan: r.plan })
  }

  const confirm = () => {
    if (!pending) return
    const r = applyNotebookImport(browserStorage(), pending.text, pending.plan.toImport)
    if (r.ok) {
      onMessage(`Imported ${plural(r.value.imported, 'note')}.`)
      setPending(null)
      notifyNotesChange()
    } else if (r.reason === 'changed' && 'plan' in r) {
      notifyNotesChange()
      setPending({ ...pending, plan: r.plan })
      onMessage('Your notebook changed since the preview (perhaps in another tab). Nothing was imported. Review the updated preview and confirm again.')
    } else {
      onMessage(storeFailureText('import', r.reason))
    }
  }

  const plan = pending?.plan
  const n = plan?.toImport.length ?? 0
  return (
    <div className="backup">
      <div className="share-row">
        <button type="button" className="tool-button bordered" onClick={exportFile} disabled={disabled || notes.length === 0}>
          <Download size={15} aria-hidden="true" />
          <span>Export notebook</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        <button type="button" className="tool-button bordered" onClick={() => fileRef.current?.click()} disabled={disabled}>
          <Upload size={15} aria-hidden="true" />
          <span>Import notebook</span>
        </button>
      </div>
      <p className="muted small">
        A notebook backup (format “stem-explorer.notebook”, version 1) contains your note titles, observations and each note’s
        explorer settings. It is separate from saved-exploration backups. Importing adds notes and never replaces existing ones.
      </p>
      {pending && plan && (
        <section className="import-preview" aria-labelledby={`${id}-preview`}>
          <h3 id={`${id}-preview`} className="import-title">
            Import from “{pending.name}”
          </h3>
          {n > 0 ? (
            <>
              <p className="small">{n === 1 ? 'This note will be added:' : `These ${n} notes will be added:`}</p>
              <ul className="import-list">
                {plan.toImport.map((p) => (
                  <li key={p.position}>
                    <span className={`subject-chip is-${p.state.subject}`}>{subjectName(p.state.subject)}</span> {p.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="small">Nothing new to import.</p>
          )}
          {plan.duplicates.length > 0 && <p className="small muted">{plural(plan.duplicates.length, 'duplicate')} skipped (identical notes already in your notebook).</p>}
          {plan.invalid.length > 0 && (
            <details>
              <summary className="small">{plural(plan.invalid.length, 'invalid note')} skipped</summary>
              <ul className="import-list muted">
                {plan.invalid.map((d) => (
                  <li key={d.position}>
                    Note {d.position}
                    {d.title ? ` (“${d.title}”)` : ''}: {d.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {plan.overLimit.length > 0 && <p className="small muted">{plural(plan.overLimit.length, 'note')} skipped: over the {MAX_NOTES}-note limit.</p>}
          <div className="share-row">
            {n > 0 && (
              <button type="button" className="button" onClick={confirm}>
                Import {plural(n, 'note')}
              </button>
            )}
            <button type="button" className="tool-button bordered" onClick={() => setPending(null)}>
              {n > 0 ? 'Cancel' : 'Close'}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
