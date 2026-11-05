import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isSubjectId, type SubjectId } from '../../data/subjects'
import { usePrefersReducedMotion, type Route } from '../../lib/hooks'

/** How long the intro runs (ms); matches the animations in subject-intro.css. */
const INTRO_MS = 1500
const KEY = 'stem-explorer:intro-seen'

/** Used when sessionStorage is unavailable: once per page load is then the best available. */
const memory = new Set<string>()

function readSeen(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}

/** Records a visit to the subject in this browser session; true if it is the first. */
function markSeen(subject: SubjectId): boolean {
  const seen = readSeen()
  if (seen.includes(subject) || memory.has(subject)) return false
  memory.add(subject)
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...seen, subject]))
  } catch {
    // Storage is blocked or full; `memory` still prevents a repeat until the page reloads.
  }
  return true
}

/**
 * The subject whose small intro should play now. Every visit counts as seen, including one through
 * a direct link or a reload (which never play). So Back and Forward cannot play it either: they can
 * only return to a subject already visited in this session. Navigating during the intro ends it,
 * because the header it lives in remounts.
 */
export function useSubjectIntro(route: Route, generation: number): SubjectId | null {
  const [intro, setIntro] = useState<SubjectId | null>(null)
  const pageLoad = useRef(true)
  // Before paint, so the header never shows its plain icon first. A later navigation inside the
  // subject (a new generation) finds it already seen, which ends a running intro.
  useLayoutEffect(() => {
    const first = isSubjectId(route) && markSeen(route)
    setIntro(first && !pageLoad.current ? (route as SubjectId) : null)
    pageLoad.current = false
  }, [route, generation])
  useEffect(() => {
    if (!intro) return
    const timer = setTimeout(() => setIntro(null), INTRO_MS)
    return () => clearTimeout(timer)
  }, [intro])
  return usePrefersReducedMotion() ? null : intro
}
