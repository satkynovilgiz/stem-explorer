import { useCallback, useEffect, useState } from 'react'
import { COLLECTIONS_KEY, readCollections, type CollectionsRead } from './collectionsStore'
import { browserStorage } from './explorationStore'

/** Fired after this tab changes collections, so other components re-read them. */
export const COLLECTIONS_EVENT = 'stem-explorer:collections-change'

export function notifyCollectionsChange() {
  window.dispatchEvent(new Event(COLLECTIONS_EVENT))
}

/** The stored collections, re-read when this tab or another tab changes them. Reading never writes. */
export function useCollections(): CollectionsRead & { refresh: () => void } {
  const [data, setData] = useState<CollectionsRead>(() => readCollections(browserStorage()))
  const refresh = useCallback(() => setData(readCollections(browserStorage())), [])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === COLLECTIONS_KEY) refresh()
    }
    window.addEventListener(COLLECTIONS_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(COLLECTIONS_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])
  return { ...data, refresh }
}
