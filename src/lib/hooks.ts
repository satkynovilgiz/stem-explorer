import { useSyncExternalStore } from 'react'
import { isSubjectId, type SubjectId } from '../data/subjects'

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

export type Route = 'home' | SubjectId

/** Route from a hash such as "#/physics". Anything unrecognized (including no hash) is Home. */
export function routeFromHash(hash: string): Route {
  const id = hash.replace(/^#\/?/, '').split('/')[0]
  return isSubjectId(id) ? id : 'home'
}

/** Current route from the URL hash; Home when there is no recognized subject. */
export function useRoute(): Route {
  return routeFromHash(useSyncExternalStore(subscribeHash, () => window.location.hash))
}

/**
 * In-app navigation to a relative "?query#/route" link without reloading the page. It adds a
 * history entry (so Back works) and notifies the router the same way Back/Forward does.
 * Only relative links starting with "?" or "#" are accepted.
 */
export function navigateTo(relative: string): void {
  if (!/^[?#]/.test(relative)) return
  window.history.pushState(null, '', `${window.location.pathname}${relative}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
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
