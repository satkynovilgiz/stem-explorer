import { useSyncExternalStore } from 'react'
import { DEFAULT_SUBJECT, isSubjectId, type SubjectId } from '../data/subjects'

/**
 * Back/Forward between entries whose query strings differ (each explorer keeps its own
 * parameters in the query) fires only `popstate`, not `hashchange`, so listen to both.
 */
function subscribeHash(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  window.addEventListener('popstate', onChange)
  return () => {
    window.removeEventListener('hashchange', onChange)
    window.removeEventListener('popstate', onChange)
  }
}

/** Current subject from the URL hash, e.g. "#/physics". */
export function useHashSubject(): SubjectId {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash)
  const id = hash.replace(/^#\/?/, '').split('/')[0]
  return isSubjectId(id) ? id : DEFAULT_SUBJECT
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
