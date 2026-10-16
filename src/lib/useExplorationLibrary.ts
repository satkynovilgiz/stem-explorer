import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react'
import { canonicalKey, type ShareState } from './explorations'
import { browserStorage, loadList, MAX_RECENT, RECENT_KEY, recordVisit, SAVED_KEY, type Exploration } from './explorationStore'

/** Fired after this tab changes the library, so other components re-read it. */
export const LIBRARY_EVENT = 'stem-explorer:library-change'

export function notifyLibraryChange() {
  window.dispatchEvent(new Event(LIBRARY_EVENT))
}

export interface Library {
  /**
   * Why saved entries could not be read, if they could not: storage blocked ('unavailable') or the
   * stored list damaged ('unreadable'). Write failures (such as a full quota) do not affect this:
   * readable entries stay listed and openable.
   */
  savedError: 'unavailable' | 'unreadable' | null
  saved: Exploration[]
  recent: Exploration[]
}

/** Reads both lists. Side-effect free: refreshing never writes, so it can't trigger other tabs. */
export function readLibrary(): Library {
  const store = browserStorage()
  const saved = loadList(store, SAVED_KEY)
  const recent = loadList(store, RECENT_KEY)
  return {
    savedError: saved.ok ? null : saved.reason,
    saved: saved.ok ? saved.entries : [],
    recent: recent.ok ? recent.entries.slice(0, MAX_RECENT) : [],
  }
}

/** True for storage events that concern the library: its two keys, or clear() (key null) on localStorage. */
export function isLibraryStorageEvent(e: Pick<StorageEvent, 'key' | 'storageArea'>, local: Storage | null): boolean {
  if (e.key !== null && e.key !== SAVED_KEY && e.key !== RECENT_KEY) return false
  return !e.storageArea || e.storageArea === local
}

export function useExplorationLibrary(): Library & { refresh: () => void } {
  const [library, setLibrary] = useState<Library>(readLibrary)
  const refresh = useCallback(() => setLibrary(readLibrary()), [])
  useEffect(() => {
    // Changes made in other tabs. Only the library's keys matter; other keys and sessionStorage are ignored.
    const onStorage = (e: StorageEvent) => {
      if (isLibraryStorageEvent(e, browserStorage() as Storage | null)) refresh()
    }
    window.addEventListener(LIBRARY_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(LIBRARY_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])
  return { ...library, refresh }
}

/**
 * Records a meaningful visit: only after the share state has stayed the same for a moment, so
 * slider drags, animation and rapid clicks do not flood the history. It writes once per distinct
 * state shown in this tab, never in response to reads or events from other tabs.
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
