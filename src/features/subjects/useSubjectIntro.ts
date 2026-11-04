import { useEffect, useState } from 'react'
import { isSubjectId, type SubjectId } from '../../data/subjects'
import { usePrefersReducedMotion, type Route } from '../../lib/hooks'

/** How long the intro stays on screen (ms); matches the fade-out in subject-intro.css. */
const INTRO_MS = 1700

/**
 * The subject to play an intro for. It plays when a subject is opened from somewhere else in the
 * app, not when the page itself loads on a subject (a reload or a shared link) and not when moving
 * between tabs inside a subject.
 */
export function useSubjectIntro(route: Route): SubjectId | null {
  const [previous, setPrevious] = useState(route)
  const [intro, setIntro] = useState<SubjectId | null>(null)
  // Adjusting state while rendering (not in an effect) when the route changes.
  if (route !== previous) {
    setPrevious(route)
    setIntro(isSubjectId(route) ? route : null)
  }
  useEffect(() => {
    if (!intro) return
    const timer = setTimeout(() => setIntro(null), INTRO_MS)
    return () => clearTimeout(timer)
  }, [intro])
  return usePrefersReducedMotion() ? null : intro
}
