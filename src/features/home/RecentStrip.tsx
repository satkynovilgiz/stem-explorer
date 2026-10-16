import { Clock } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
import { hrefFor, subjectName } from '../../lib/explorations'
import { browserStorage, clearRecent, type Exploration } from '../../lib/explorationStore'
import { storeFailureText } from '../../lib/storeMessages'
import { notifyLibraryChange } from '../../lib/useExplorationLibrary'

/** Compact "Continue exploring" row built from real recent visits; Home hides it when there are none. */
export function RecentStrip({ recent, onMessage }: { recent: Exploration[]; onMessage: (text: string) => void }) {
  return (
    <section className="home-panel recent-strip" aria-labelledby="recent-heading">
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
            onMessage(r.ok ? 'History cleared.' : storeFailureText('clear', r.reason))
            notifyLibraryChange()
          }}
        >
          Clear history
        </button>
      </div>
      <ul className="recent-list">
        {recent.map((e) => (
          <li key={e.id}>
            <AppLink href={hrefFor(e)} className={`recent-item is-${e.subject}`}>
              <span className="recent-subject">{subjectName(e.subject)}</span>
              <span className="recent-title">{e.title}</span>
            </AppLink>
          </li>
        ))}
      </ul>
      <p className="muted small">Your last {recent.length === 1 ? 'visit' : `${recent.length} visits`}, kept on this browser.</p>
    </section>
  )
}
