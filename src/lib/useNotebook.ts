import { useCallback, useEffect, useState } from 'react'
import { browserStorage } from './explorationStore'
import { loadNotes, NOTES_KEY, type Note } from './notesStore'

export const NOTES_EVENT = 'stem-explorer:notes-change'
export const notifyNotesChange = () => window.dispatchEvent(new Event(NOTES_EVENT))

export interface Notebook {
  notes: Note[]
  error: 'unavailable' | 'unreadable' | null
}

const read = (): Notebook => {
  const r = loadNotes(browserStorage())
  return r.ok ? { notes: r.notes, error: null } : { notes: [], error: r.reason }
}

/** Notes, kept in sync with this tab's changes and other tabs (notes key or clear() only). */
export function useNotebook(): Notebook & { refresh: () => void } {
  const [book, setBook] = useState<Notebook>(read)
  const refresh = useCallback(() => setBook(read()), [])
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== NOTES_KEY) return
      const local = browserStorage() as Storage | null
      if (e.storageArea && e.storageArea !== local) return
      refresh()
    }
    window.addEventListener(NOTES_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(NOTES_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])
  return { ...book, refresh }
}
