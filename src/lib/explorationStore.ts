import { canonicalize, canonicalKey, defaultTitle, type ShareState } from './explorations'

/*
 * A small exploration library kept in this browser's localStorage. No accounts, no server.
 * Entries store only a subject and validated query parameters; titles are plain text rendered
 * by React (never as HTML). Everything read back is re-validated, and anything malformed or from
 * an unknown schema version is dropped.
 */

export const SCHEMA_VERSION = 1
export const SAVED_KEY = 'stem-explorer:saved'
export const RECENT_KEY = 'stem-explorer:recent'
export const MAX_SAVED = 30
export const MAX_RECENT = 6
export const MAX_TITLE_LENGTH = 80

export interface Exploration extends ShareState {
  id: string
  version: number
  title: string
  /** ISO timestamps. */
  createdAt: string
  updatedAt: string
}

/**
 * Why an operation failed:
 * - unavailable: localStorage is blocked or missing (nothing can be read or written);
 * - unreadable: the stored list exists but is damaged, so it is never overwritten;
 * - quota: the browser reports its storage is full; nothing was changed;
 * - write-failed: the browser refused the write for another reason; nothing was changed.
 */
export type StoreFailure = 'unavailable' | 'unreadable' | 'quota' | 'write-failed' | 'limit' | 'duplicate' | 'invalid' | 'not-found'

export type StoreResult<T = void> = { ok: true; value: T } | { ok: false; reason: StoreFailure; existing?: Exploration }

/** A list as read from storage. `preserved` holds entries from newer schema versions, kept untouched on write. */
export type ListRead = { ok: true; entries: Exploration[]; preserved: unknown[] } | { ok: false; reason: 'unavailable' | 'unreadable' }

/** Storage-like object; injectable for tests. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * The browser's localStorage, or null when access is blocked. This only looks the object up: it
 * never writes (a probe write would fire storage events in every other open tab).
 */
export function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage ?? null
  } catch {
    return null
  }
}

export function cleanTitle(title: string, fallback: string): string {
  // Collapse whitespace, drop control characters, and cap the length.
  const printable = Array.from(title, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? ' ' : ch)).join('')
  const t = printable.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
  return t || fallback
}

function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

/** Validates one stored record; returns a canonical Exploration or null. */
export function parseEntry(raw: unknown): Exploration | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.version !== SCHEMA_VERSION) return null
  if (typeof r.id !== 'string' || !/^[a-z0-9-]{6,40}$/.test(r.id)) return null
  if (typeof r.title !== 'string' || !isIsoDate(r.createdAt) || !isIsoDate(r.updatedAt)) return null
  const state = canonicalize(String(r.subject), r.params as Record<string, unknown>)
  if (!state) return null
  return {
    ...state,
    id: r.id,
    version: SCHEMA_VERSION,
    title: cleanTitle(r.title, defaultTitle(state)),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function isNewerVersion(raw: unknown): boolean {
  const v = (raw as { version?: unknown } | null)?.version
  return typeof v === 'number' && Number.isInteger(v) && v > SCHEMA_VERSION
}

/** Reads a list without side effects. A failed read is reported, never turned into an empty list. */
export function loadList(store: KeyValueStore | null, key: string): ListRead {
  if (!store) return { ok: false, reason: 'unavailable' }
  let raw: string | null
  try {
    raw = store.getItem(key)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  if (raw === null) return { ok: true, entries: [], preserved: [] }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (!Array.isArray(parsed)) return { ok: false, reason: 'unreadable' }
  const seen = new Set<string>()
  const entries: Exploration[] = []
  const preserved: unknown[] = []
  for (const item of parsed) {
    const e = parseEntry(item)
    if (!e) {
      // Entries written by a newer version of the app are kept as they are; invalid ones are dropped.
      if (isNewerVersion(item)) preserved.push(item)
      continue
    }
    const k = canonicalKey(e)
    if (seen.has(k)) continue
    seen.add(k)
    entries.push(e)
  }
  return { ok: true, entries, preserved }
}

function writeList(store: KeyValueStore | null, key: string, list: readonly unknown[]): StoreResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    // Removing never needs extra space, so an emptied list still saves when storage is full.
    if (list.length === 0) store.removeItem(key)
    else store.setItem(key, JSON.stringify(list))
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'write-failed' }
  }
}

export function isQuotaError(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name ?? ''
  return /quota/i.test(name) || /quota/i.test(String(e))
}

let counter = 0
export function newId(now: number = Date.now()): string {
  counter = (counter + 1) % 1e6
  return `${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Saved entries, or [] when they cannot be read (use loadList to tell the difference). */
export function readSaved(store: KeyValueStore | null): Exploration[] {
  const read = loadList(store, SAVED_KEY)
  return read.ok ? read.entries : []
}

export function readRecent(store: KeyValueStore | null): Exploration[] {
  const read = loadList(store, RECENT_KEY)
  return read.ok ? read.entries.slice(0, MAX_RECENT) : []
}

/** Writes saved entries, keeping entries from newer schema versions that this version cannot read. */
export function writeSaved(store: KeyValueStore | null, entries: readonly Exploration[], preserved: readonly unknown[]): StoreResult {
  return writeList(store, SAVED_KEY, [...entries, ...preserved])
}

/** Saves a state. The same canonical state is never stored twice: the caller gets the existing entry. */
export function saveExploration(store: KeyValueStore | null, state: ShareState, title: string, now = new Date()): StoreResult<Exploration> {
  if (!store) return { ok: false, reason: 'unavailable' }
  const canonical = canonicalize(state.subject, state.params)
  if (!canonical) return { ok: false, reason: 'invalid' }
  const read = loadList(store, SAVED_KEY)
  if (!read.ok) return { ok: false, reason: read.reason }
  const list = read.entries
  const key = canonicalKey(canonical)
  const existing = list.find((e) => canonicalKey(e) === key)
  if (existing) return { ok: false, reason: 'duplicate', existing }
  if (list.length >= MAX_SAVED) return { ok: false, reason: 'limit' }
  const iso = now.toISOString()
  const entry: Exploration = {
    ...canonical,
    id: newId(now.getTime()),
    version: SCHEMA_VERSION,
    title: cleanTitle(title, defaultTitle(canonical)),
    createdAt: iso,
    updatedAt: iso,
  }
  const result = writeSaved(store, [entry, ...list], read.preserved)
  return result.ok ? { ok: true, value: entry } : result
}

export function renameExploration(store: KeyValueStore | null, id: string, title: string, now = new Date()): StoreResult<Exploration> {
  const read = loadList(store, SAVED_KEY)
  if (!read.ok) return { ok: false, reason: read.reason }
  const list = read.entries
  const index = list.findIndex((e) => e.id === id)
  if (index < 0) return { ok: false, reason: 'not-found' }
  const updated = { ...list[index], title: cleanTitle(title, list[index].title), updatedAt: now.toISOString() }
  const next = [...list]
  next[index] = updated
  const result = writeSaved(store, next, read.preserved)
  return result.ok ? { ok: true, value: updated } : result
}

export function removeExploration(store: KeyValueStore | null, id: string): StoreResult {
  const read = loadList(store, SAVED_KEY)
  if (!read.ok) return { ok: false, reason: read.reason }
  if (!read.entries.some((e) => e.id === id)) return { ok: false, reason: 'not-found' }
  return writeSaved(store, read.entries.filter((e) => e.id !== id), read.preserved)
}

/** Records a visit: the newest first, deduplicated by canonical state, at most MAX_RECENT entries. */
export function recordVisit(store: KeyValueStore | null, state: ShareState, now = new Date()): StoreResult {
  const canonical = canonicalize(state.subject, state.params)
  if (!canonical) return { ok: false, reason: 'invalid' }
  if (!store) return { ok: false, reason: 'unavailable' }
  const key = canonicalKey(canonical)
  const iso = now.toISOString()
  const read = loadList(store, RECENT_KEY)
  if (!read.ok && read.reason === 'unavailable') return read
  // History is disposable: a damaged recent list is replaced rather than blocking new visits.
  const previous = read.ok ? read.entries.filter((e) => canonicalKey(e) !== key) : []
  const entry: Exploration = {
    ...canonical,
    id: newId(now.getTime()),
    version: SCHEMA_VERSION,
    title: defaultTitle(canonical),
    createdAt: iso,
    updatedAt: iso,
  }
  return writeList(store, RECENT_KEY, [entry, ...previous].slice(0, MAX_RECENT))
}

export function clearRecent(store: KeyValueStore | null): StoreResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    store.removeItem(RECENT_KEY)
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'write-failed' }
  }
}
