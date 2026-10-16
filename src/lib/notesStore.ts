import { canonicalize, type ShareState } from './explorations'
import { isQuotaError, type KeyValueStore, type StoreFailure } from './explorationStore'

/*
 * The exploration notebook: plain-text notes, each tied to a snapshot of one explorer's shareable
 * settings, kept in this browser's localStorage. Same rules as saved explorations: reads never
 * write, a damaged list is never overwritten, entries from newer versions are preserved, and every
 * write failure is reported. Notes never contain activity progress, animation time or tour state —
 * only the canonical share parameters.
 */

export const NOTES_KEY = 'stem-explorer:notes'
export const NOTES_VERSION = 1
export const MAX_NOTES = 100
export const MAX_NOTE_TITLE = 80
export const MAX_NOTE_BODY = 5000

export interface Note extends ShareState {
  id: string
  version: number
  title: string
  /** Plain text; rendered as text (never as HTML), line breaks preserved. */
  body: string
  createdAt: string
  updatedAt: string
}

export type NotesRead = { ok: true; notes: Note[]; preserved: unknown[] } | { ok: false; reason: 'unavailable' | 'unreadable' }
export type NoteResult<T = void> = { ok: true; value: T } | { ok: false; reason: StoreFailure }

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/** Titles: one line, control characters removed, capped. Bodies: control characters except newlines and tabs removed, capped. */
export function cleanNoteTitle(title: string): string {
  return Array.from(title, (c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NOTE_TITLE)
}

export function cleanNoteBody(body: string): string {
  return Array.from(body.replace(/\r\n?/g, '\n'), (c) => {
    const code = c.charCodeAt(0)
    return (code < 32 && c !== '\n' && c !== '\t') || code === 127 ? '' : c
  })
    .join('')
    .slice(0, MAX_NOTE_BODY)
}

export function parseNote(raw: unknown): Note | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.version !== NOTES_VERSION) return null
  if (typeof r.id !== 'string' || !/^[a-z0-9-]{6,40}$/.test(r.id)) return null
  if (typeof r.title !== 'string' || typeof r.body !== 'string' || !isIso(r.createdAt) || !isIso(r.updatedAt)) return null
  const state = canonicalize(String(r.subject), r.params as Record<string, unknown>)
  if (!state) return null
  const title = cleanNoteTitle(r.title)
  if (!title) return null
  return { ...state, id: r.id, version: NOTES_VERSION, title, body: cleanNoteBody(r.body), createdAt: r.createdAt, updatedAt: r.updatedAt }
}

export function loadNotes(store: KeyValueStore | null): NotesRead {
  if (!store) return { ok: false, reason: 'unavailable' }
  let raw: string | null
  try {
    raw = store.getItem(NOTES_KEY)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  if (raw === null) return { ok: true, notes: [], preserved: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (!Array.isArray(parsed)) return { ok: false, reason: 'unreadable' }
  const notes: Note[] = []
  const preserved: unknown[] = []
  const ids = new Set<string>()
  for (const item of parsed) {
    const n = parseNote(item)
    if (n && !ids.has(n.id)) {
      ids.add(n.id)
      notes.push(n)
    } else if (!n) {
      const v = (item as { version?: unknown } | null)?.version
      if (typeof v === 'number' && v > NOTES_VERSION) preserved.push(item)
    }
  }
  return { ok: true, notes, preserved }
}

export function writeNotes(store: KeyValueStore | null, notes: readonly Note[], preserved: readonly unknown[]): NoteResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    const all = [...notes, ...preserved]
    if (all.length === 0) store.removeItem(NOTES_KEY)
    else store.setItem(NOTES_KEY, JSON.stringify(all))
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'write-failed' }
  }
}

let counter = 0
export function newNoteId(now = Date.now()): string {
  counter = (counter + 1) % 1e6
  return `n${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export interface NoteDraft {
  title: string
  body: string
}

/** Creates a note for a share state (newest first). An empty title is refused. */
export function addNote(store: KeyValueStore | null, state: ShareState, draft: NoteDraft, now = new Date()): NoteResult<Note> {
  const read = loadNotes(store)
  if (!read.ok) return { ok: false, reason: read.reason }
  const canonical = canonicalize(state.subject, state.params)
  const title = cleanNoteTitle(draft.title)
  if (!canonical || !title) return { ok: false, reason: 'invalid' }
  if (read.notes.length >= MAX_NOTES) return { ok: false, reason: 'limit' }
  const iso = now.toISOString()
  const note: Note = { ...canonical, id: newNoteId(now.getTime()), version: NOTES_VERSION, title, body: cleanNoteBody(draft.body), createdAt: iso, updatedAt: iso }
  const r = writeNotes(store, [note, ...read.notes], read.preserved)
  return r.ok ? { ok: true, value: note } : r
}

export function updateNote(store: KeyValueStore | null, id: string, draft: NoteDraft, now = new Date()): NoteResult<Note> {
  const read = loadNotes(store)
  if (!read.ok) return { ok: false, reason: read.reason }
  const index = read.notes.findIndex((n) => n.id === id)
  if (index < 0) return { ok: false, reason: 'not-found' }
  const title = cleanNoteTitle(draft.title)
  if (!title) return { ok: false, reason: 'invalid' }
  const updated = { ...read.notes[index], title, body: cleanNoteBody(draft.body), updatedAt: now.toISOString() }
  const next = [...read.notes]
  next[index] = updated
  const r = writeNotes(store, next, read.preserved)
  return r.ok ? { ok: true, value: updated } : r
}

/** Deletes a note and returns it with its position, so the caller can offer Undo. */
export function deleteNote(store: KeyValueStore | null, id: string): NoteResult<{ note: Note; index: number }> {
  const read = loadNotes(store)
  if (!read.ok) return { ok: false, reason: read.reason }
  const index = read.notes.findIndex((n) => n.id === id)
  if (index < 0) return { ok: false, reason: 'not-found' }
  const r = writeNotes(store, read.notes.filter((n) => n.id !== id), read.preserved)
  return r.ok ? { ok: true, value: { note: read.notes[index], index } } : r
}

/** Undo for deleteNote: puts the note back where it was (unless it already exists again). */
export function restoreNote(store: KeyValueStore | null, note: Note, index: number): NoteResult {
  const read = loadNotes(store)
  if (!read.ok) return { ok: false, reason: read.reason }
  if (read.notes.some((n) => n.id === note.id)) return { ok: true, value: undefined }
  if (read.notes.length >= MAX_NOTES) return { ok: false, reason: 'limit' }
  const next = [...read.notes]
  next.splice(Math.min(Math.max(0, index), next.length), 0, note)
  return writeNotes(store, next, read.preserved)
}
