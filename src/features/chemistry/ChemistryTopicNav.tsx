import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ChemistrySection } from '../../lib/urlState'
import { CHEMISTRY_TOPICS } from './topics'

const KEY = 'stem-explorer:chem-topics-open'
const readOpen = () => {
  try {
    return localStorage.getItem(KEY) !== 'false'
  } catch {
    return true
  }
}

/**
 * The desktop topic sidebar: local to Chemistry, collapsible, and remembered on this browser.
 * On phones the subject bar's topic drawer does this job instead.
 */
export function ChemistryTopicNav({ section, onSection }: { section: ChemistrySection; onSection: (s: ChemistrySection) => void }) {
  const [open, setOpen] = useState(readOpen)
  const toggle = () => {
    setOpen((v) => {
      try {
        localStorage.setItem(KEY, String(!v))
      } catch {
        // Not remembered when storage is unavailable; the sidebar still works.
      }
      return !v
    })
  }
  const current = CHEMISTRY_TOPICS.find((t) => t.id === section)!
  return (
    <nav className="topic-nav" aria-label="Chemistry topics">
      <button type="button" className="topic-nav-toggle" aria-expanded={open} aria-controls="chem-topic-list" aria-label={open ? 'Hide the topic list' : `Show the topic list (now: ${current.label})`} onClick={toggle}>
        <span>
          <span className="topic-nav-title">Chemistry topics</span>
          {!open && <span className="topic-nav-current"> · {current.label}</span>}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={open ? 'is-flipped' : ''} />
      </button>
      {open && (
        <div id="chem-topic-list" className="topic-nav-list" role="group" aria-label="Chemistry section">
          {CHEMISTRY_TOPICS.map((t) => (
            <button key={t.id} type="button" className="topic-nav-item" aria-pressed={section === t.id} aria-label={t.label} aria-describedby={`chem-topic-${t.id}`} onClick={() => onSection(t.id)}>
              <span className="topic-nav-label">{t.label}</span>
              <span className="topic-nav-blurb" id={`chem-topic-${t.id}`}>
                {t.blurb}
              </span>
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
