import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { canonicalKey, type ShareState } from './explorations'
import { browserStorage, readRecent, readSaved, recordVisit, type Exploration } from './explorationStore'

/** Fired after this tab changes the library, so other components re-read it. */
export const LIBRARY_EVENT = 'stem-explorer:library-change'

export function notifyLibraryChange() {
  window.dispatchEvent(new Event(LIBRARY_EVENT))
}

export interface Library {
  /** False when localStorage is blocked or unavailable; the app keeps working without it. */
  available: boolean
  saved: Exploration[]
  recent: Exploration[]
}

function read(): Library {
  const store = browserStorage()
  return { available: !!store, saved: readSaved(store), recent: readRecent(store) }
}

export function useExplorationLibrary(): Library & { refresh: () => void } {
  const [library, setLibrary] = useState<Library>(read)
  const refresh = useCallback(() => setLibrary(read()), [])
  useEffect(() => {
    window.addEventListener(LIBRARY_EVENT, refresh)
    // Changes made in other tabs.
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(LIBRARY_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])
  return { ...library, refresh }
}

/**
 * Records a meaningful visit: only after the share state has stayed the same for a moment, so
 * slider drags, animation and rapid clicks do not flood the history.
 */
export function useRecordVisit(state: ShareState, delay = 1500) {
  // `key` is the state's identity; the effect restarts only when the shareable state really changes.
  const key = useMemo(() => canonicalKey(state), [state])
  const record = useEffectEvent(() => {
    if (recordVisit(browserStorage(), state).ok) notifyLibraryChange()
  })
  useEffect(() => {
    const id = window.setTimeout(record, delay)
    return () => window.clearTimeout(id)
  }, [key, delay])
}
