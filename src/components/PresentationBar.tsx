import { Download, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SubjectId } from '../data/subjects'
import { CAMERA_NOT_RESTORED, describeView, exportNotes, modelLabel } from '../lib/presentation'
import { downloadBlob, ExportError, exportPng, findStageVisual, noVisualMessage } from '../lib/exportImage'

/** Today's date in the viewer's time zone, as YYYY-MM-DD. */
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Presentation mode: the explorer's stage fills the window and secondary panels are hidden
 * (CSS on `html.is-presenting`). Exit with the button or Esc. PNG export adds a caption.
 */
export function PresentationBar({ subject, onExit }: { subject: SubjectId; onExit: () => void }) {
  const exitRef = useRef<HTMLButtonElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('is-presenting')
    exitRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onExit()
    }
    window.addEventListener('keydown', onKey)
    // Layout changed size: let canvases and observers re-measure.
    window.dispatchEvent(new Event('resize'))
    return () => {
      root.classList.remove('is-presenting')
      window.removeEventListener('keydown', onKey)
      window.dispatchEvent(new Event('resize'))
    }
  }, [onExit])

  const exportImage = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const stage = document.querySelector('.chem-stage')
      const visual = stage && findStageVisual(stage)
      if (!visual) throw new ExportError(noVisualMessage(stage))
      const view = describeView(subject)
      const notes = exportNotes(subject)
      const notRestored = visual instanceof HTMLCanvasElement ? [CAMERA_NOT_RESTORED, ...notes.notRestored] : notes.notRestored
      const { blob, layout } = await exportPng(visual, { ...view, annotations: notes.annotations, notRestored, modelLabel: modelLabel(subject, window.location.search) })
      downloadBlob(blob, `stem-explorer-${subject}-${localDate()}.png`)
      const overlays = visual instanceof HTMLCanvasElement ? layout.annotations.length : 0
      setMessage({ kind: 'ok', text: `PNG exported${overlays ? `, including ${overlays} overlay${overlays === 1 ? '' : 's'} from the view (labels, values, legends)` : ''}. Check your downloads.` })
    } catch (e) {
      setMessage({ kind: 'error', text: `Export failed: ${e instanceof ExportError ? e.message : 'the browser could not create the image.'}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="present-bar" role="toolbar" aria-label="Presentation">
      <span className="present-title">{describeView(subject).title}</span>
      <span className="present-label small">{modelLabel(subject, window.location.search)}</span>
      <div className="present-actions">
        <button type="button" className="tool-button bordered" disabled={busy} onClick={exportImage}>
          <Download size={16} aria-hidden="true" />
          <span>{busy ? 'Exporting…' : 'Export PNG'}</span>
        </button>
        <button ref={exitRef} type="button" className="button" onClick={onExit}>
          <X size={16} aria-hidden="true" />
          <span>Exit presentation</span>
          <kbd className="present-kbd">Esc</kbd>
        </button>
      </div>
      <p className={`present-message small${message?.kind === 'error' ? ' status-error' : ''}`} role={message?.kind === 'error' ? 'alert' : 'status'}>
        {message?.text ?? ''}
      </p>
    </div>
  )
}
