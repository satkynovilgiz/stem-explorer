import { Bookmark, Check, Clock, Pencil, Trash2, X } from 'lucide-react'
import { useId, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { hrefFor, subjectName } from '../../lib/explorations'
import { browserStorage, clearRecent, MAX_SAVED, MAX_TITLE_LENGTH, removeExploration, renameExploration, type Exploration } from '../../lib/explorationStore'
import { BackupControls } from './BackupControls'
import { storeFailureText } from '../../lib/storeMessages'
import { notifyLibraryChange, useExplorationLibrary } from '../../lib/useExplorationLibrary'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function SavedItem({ entry, onMessage }: { entry: Exploration; onMessage: (text: string) => void }) {
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(entry.title)

  const rename = () => {
    const r = renameExploration(browserStorage(), entry.id, name)
    if (r.ok) {
      onMessage(`Renamed to “${r.value.title}”.`)
      setEditing(false)
      notifyLibraryChange()
    } else onMessage(storeFailureText('rename', r.reason))
  }

  return (
    <li className="library-item">
      {editing ? (
        <form
          className="library-rename"
          onSubmit={(e) => {
            e.preventDefault()
            rename()
          }}
        >
          <label htmlFor={id} className="visually-hidden">
            New name for {entry.title}
          </label>
          <input id={id} className="search-input" value={name} maxLength={MAX_TITLE_LENGTH} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit" className="icon-button" aria-label="Save name">
            <Check size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label="Cancel renaming" onClick={() => setEditing(false)}>
            <X size={16} aria-hidden="true" />
          </button>
        </form>
      ) : (
        <>
          <AppLink href={hrefFor(entry)} className="library-link">
            <span className="library-title">{entry.title}</span>
            <span className="library-meta">
              <span className={`subject-chip is-${entry.subject}`}>{subjectName(entry.subject)}</span> Saved {formatDate(entry.createdAt)}
            </span>
          </AppLink>
          <div className="library-actions">
            <button
              type="button"
              className="icon-button"
              aria-label={`Rename ${entry.title}`}
              onClick={() => {
                setName(entry.title)
                setEditing(true)
              }}
            >
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ${entry.title}`}
              onClick={() => {
                const r = removeExploration(browserStorage(), entry.id)
                onMessage(r.ok ? `Removed “${entry.title}”.` : storeFailureText('remove', r.reason))
                // Re-read either way, so the list shows what is really stored.
                notifyLibraryChange()
              }}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </li>
  )
}

/** Saved explorations (always shown, with an empty state) and recent ones (only when there are some). */
export function LibrarySections() {
  const { savedError, saved, recent } = useExplorationLibrary()
  const [message, setMessage] = useState('')

  return (
    <div className="library-grid">
      <p className="library-status" role="status">
        {message}
      </p>
      {recent.length > 0 && (
        <section className="home-panel" aria-labelledby="recent-heading">
          <div className="home-panel-head">
            <h2 id="recent-heading" className="home-h2">
              <Clock size={18} aria-hidden="true" /> Continue exploring
            </h2>
            <button
              type="button"
              className="tool-button bordered"
              onClick={() => {
                const r = clearRecent(browserStorage())
                // Announce success only once the entries are really gone; on failure they stay listed.
                setMessage(r.ok ? 'History cleared.' : storeFailureText('clear', r.reason))
                notifyLibraryChange()
              }}
            >
              Clear history
            </button>
          </div>
          <ul className="library-list">
            {recent.map((e) => (
              <li key={e.id} className="library-item">
                <AppLink href={hrefFor(e)} className="library-link">
                  <span className="library-title">{e.title}</span>
                  <span className="library-meta">
                    <span className={`subject-chip is-${e.subject}`}>{subjectName(e.subject)}</span>
                  </span>
                </AppLink>
              </li>
            ))}
          </ul>
          <p className="muted small">Recent visits, kept on this browser.</p>
        </section>
      )}

      <section className="home-panel" aria-labelledby="saved-heading">
        <div className="home-panel-head">
          <h2 id="saved-heading" className="home-h2">
            <Bookmark size={18} aria-hidden="true" /> Saved explorations
          </h2>
          {saved.length > 0 && (
            <span className="muted small">
              {saved.length} of {MAX_SAVED}
            </span>
          )}
        </div>
        {savedError === 'unavailable' ? (
          <p className="empty-state">
            Saving isn’t available because this browser is blocking local storage. All explorers still work; use Copy link to keep
            a place.
          </p>
        ) : savedError === 'unreadable' ? (
          <p className="empty-state">
            The saved list on this browser is damaged and can’t be read. It has been left untouched, and new saves are paused so
            nothing is overwritten. Clearing this site’s data in your browser settings starts a fresh list.
          </p>
        ) : saved.length === 0 ? (
          <p className="empty-state">
            Nothing saved yet. In any explorer, use <strong>Save exploration</strong> next to Copy link to keep a view here.
          </p>
        ) : (
          <ul className="library-list">
            {saved.map((e) => (
              <SavedItem key={e.id} entry={e} onMessage={setMessage} />
            ))}
          </ul>
        )}
        <p className="muted small">Saved on this browser. Clearing site data removes these entries.</p>
        <BackupControls saved={saved} disabled={savedError !== null} onMessage={setMessage} />
      </section>
    </div>
  )
}
