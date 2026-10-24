import { useSyncExternalStore } from 'react'

/*
 * Explorers keep their state in the query string with history.replaceState, which fires no event.
 * The breadcrumb and the module memory need to follow it, so pushState and replaceState are
 * wrapped once to announce changes (after the current task, so no component updates while another
 * renders).
 */

const EVENT = 'stem:locationchange'
let installed = false

export function installLocationEvents() {
  if (installed) return
  installed = true
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method].bind(window.history)
    window.history[method] = (...args: Parameters<History['pushState']>) => {
      original(...args)
      queueMicrotask(() => window.dispatchEvent(new Event(EVENT)))
    }
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
  }
}

/** The current query string, kept up to date through push, replace, Back and Forward. */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search)
}

/**
 * Makes the next replaceState a new history entry: pushes a copy of the current address, which
 * the explorer's own URL sync then replaces. Used when switching modules, so Back returns.
 */
export function pushHistoryEntry() {
  window.history.pushState(window.history.state, '', window.location.href)
}

/** Counts real navigations (Back, Forward, in-app links), so a view can remount and re-read its URL. */
let generation = 0
window.addEventListener('popstate', () => {
  generation++
})
export function useNavigationGeneration(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('popstate', onChange)
      return () => window.removeEventListener('popstate', onChange)
    },
    () => generation,
  )
}
