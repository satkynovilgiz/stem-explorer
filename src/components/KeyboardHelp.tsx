import { Keyboard, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { SHORTCUTS } from '../lib/workspace'

/** The keyboard-shortcut list (opened with "?"). A modal dialog: Esc closes it and focus returns where it was. */
export function KeyboardHelp({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const before = document.activeElement as HTMLElement | null
    dialog.showModal()
    return () => {
      dialog.close()
      requestAnimationFrame(() => before?.focus?.())
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className="keyboard-help"
      aria-labelledby="keyboard-help-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <header className="topic-drawer-head">
        <h2 id="keyboard-help-title">
          <Keyboard size={18} aria-hidden="true" /> Keyboard shortcuts
        </h2>
        <button type="button" className="icon-button" aria-label="Close shortcuts" onClick={onClose} autoFocus>
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <table className="data-table">
        <caption className="visually-hidden">Keyboard shortcuts</caption>
        <tbody>
          {SHORTCUTS.map((s) => (
            <tr key={s.keys}>
              <th scope="row">
                <kbd>{s.keys}</kbd>
              </th>
              <td>{s.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        Shortcuts never fire while you type in a field, and not with Ctrl, ⌘ or Alt held. Tab and Shift+Tab move between controls; Enter and Space activate buttons; arrow keys
        move within the periodic table and sliders.
      </p>
    </dialog>
  )
}
