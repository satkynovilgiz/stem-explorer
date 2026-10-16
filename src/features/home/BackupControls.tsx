import { Download, Upload } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { applyImport, backupFileName, buildBackup, MAX_BACKUP_BYTES, planImport, type BackupError, type ImportPlan } from '../../lib/backup'
import { subjectName } from '../../lib/explorations'
import { browserStorage, MAX_SAVED, type Exploration } from '../../lib/explorationStore'
import { storeFailureText } from '../../lib/storeMessages'
import { notifyLibraryChange } from '../../lib/useExplorationLibrary'

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`

function errorText(error: BackupError): string {
  switch (error.kind) {
    case 'too-large':
      return 'That file is larger than 1 MB, so it was not read. Backups from STEM Explorer are much smaller.'
    case 'not-json':
      return 'That file is not valid JSON. Choose a backup exported from STEM Explorer.'
    case 'wrong-format':
      return 'That file is not a STEM Explorer saved-explorations backup.'
    case 'unsupported-version':
      return `That backup uses format version ${error.version}, which this version of STEM Explorer can’t read. Nothing was imported.`
  }
}

interface Pending {
  fileName: string
  text: string
  plan: ImportPlan
}

/** Export and import of saved explorations. Import is merge-only and shows a preview before writing. */
export function BackupControls({ saved, disabled, onMessage }: { saved: Exploration[]; disabled: boolean; onMessage: (text: string) => void }) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(buildBackup(saved), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName()
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    onMessage(`Exported ${plural(saved.length, 'saved exploration')}.`)
  }

  const chooseFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setPending(null)
    if (file.size > MAX_BACKUP_BYTES) return onMessage(errorText({ kind: 'too-large' }))
    let text: string
    try {
      text = await file.text()
    } catch {
      return onMessage('That file could not be read.')
    }
    const result = planImport(text, saved)
    if (!result.ok) return onMessage(errorText(result.error))
    onMessage('')
    setPending({ fileName: file.name, text, plan: result.plan })
  }

  const confirm = () => {
    if (!pending) return
    const result = applyImport(browserStorage(), pending.text, pending.plan.toImport)
    if (result.ok) {
      onMessage(`Imported ${plural(result.value.imported, 'exploration')}.`)
      setPending(null)
      notifyLibraryChange()
    } else if (result.reason === 'changed') {
      // Another tab changed the list since the preview: nothing was written. Show the plan computed
      // from the current list, which needs its own confirmation.
      notifyLibraryChange()
      setPending({ ...pending, plan: result.plan })
      onMessage('Saved explorations changed since the preview (perhaps in another tab). Nothing was imported. Review the updated preview and confirm again.')
    } else {
      onMessage(storeFailureText('import', result.reason))
    }
  }

  const plan = pending?.plan
  const n = plan?.toImport.length ?? 0

  return (
    <div className="backup">
      <div className="share-row">
        <button type="button" className="tool-button bordered" onClick={exportBackup} disabled={disabled || saved.length === 0}>
          <Download size={15} aria-hidden="true" />
          <span>Export</span>
        </button>
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void chooseFile(e.target.files?.[0])}
        />
        <button type="button" className="tool-button bordered" onClick={() => fileRef.current?.click()} disabled={disabled}>
          <Upload size={15} aria-hidden="true" />
          <span>Import</span>
        </button>
      </div>
      <p className="muted small">
        A backup is a JSON file with your saved titles and explorer settings. It doesn’t include recent history. Importing adds new
        entries and never replaces existing ones.
      </p>

      {pending && plan && (
        <section className="import-preview" aria-labelledby={`${id}-preview`}>
          <h3 id={`${id}-preview`} className="import-title">
            Import from “{pending.fileName}”
          </h3>
          {n > 0 ? (
            <>
              <p className="small">{n === 1 ? 'This exploration will be added:' : `These ${n} explorations will be added:`}</p>
              <ul className="import-list">
                {plan.toImport.map((e) => (
                  <li key={e.position}>
                    <span className={`subject-chip is-${e.state.subject}`}>{subjectName(e.state.subject)}</span> {e.title}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="small">Nothing new to import.</p>
          )}
          {plan.duplicates.length > 0 && (
            <details>
              <summary className="small">{plural(plan.duplicates.length, 'duplicate')} skipped (already saved)</summary>
              <ul className="import-list muted">
                {plan.duplicates.map((d) => (
                  <li key={d.position}>
                    {d.title} — same as “{d.existingTitle}”
                  </li>
                ))}
              </ul>
            </details>
          )}
          {plan.invalid.length > 0 && (
            <details>
              <summary className="small">{plural(plan.invalid.length, 'invalid entry', 'invalid entries')} skipped</summary>
              <ul className="import-list muted">
                {plan.invalid.map((d) => (
                  <li key={d.position}>
                    Entry {d.position}
                    {d.title ? ` (“${d.title}”)` : ''}: {d.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {plan.overLimit.length > 0 && (
            <details open>
              <summary className="small">
                {plural(plan.overLimit.length, 'entry', 'entries')} skipped: over the {MAX_SAVED}-item limit
              </summary>
              <ul className="import-list muted">
                {plan.overLimit.map((d) => (
                  <li key={d.position}>{d.title}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="share-row">
            {n > 0 && (
              <button type="button" className="button" onClick={confirm}>
                Import {plural(n, 'exploration')}
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
