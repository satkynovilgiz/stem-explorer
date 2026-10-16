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

export type StoreResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: 'unavailable' | 'quota' | 'limit' | 'duplicate' | 'invalid' | 'not-found'; existing?: Exploration }

/** Storage-like object; injectable for tests. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function browserStorage(): KeyValueStore | null {
  try {
    const s = window.localStorage
    const probe = '__stem-explorer-probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
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

function readList(store: KeyValueStore | null, key: string): Exploration[] {
  if (!store) return []
  try {
    const raw = store.getItem(key)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    const out: Exploration[] = []
    for (const item of parsed) {
      const e = parseEntry(item)
      if (!e) continue
      const k = canonicalKey(e)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(e)
    }
    return out
  } catch {
    // Malformed JSON or a storage access error: behave as if empty.
    return []
  }
}

function writeList(store: KeyValueStore | null, key: string, list: Exploration[]): StoreResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    store.setItem(key, JSON.stringify(list))
    return { ok: true, value: undefined }
  } catch (e) {
    const name = (e as { name?: string })?.name ?? ''
    return { ok: false, reason: /quota/i.test(name) || /quota/i.test(String(e)) ? 'quota' : 'unavailable' }
  }
}

let counter = 0
export function newId(now: number = Date.now()): string {
  counter = (counter + 1) % 1e6
  return `${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function readSaved(store: KeyValueStore | null): Exploration[] {
  return readList(store, SAVED_KEY)
}

export function readRecent(store: KeyValueStore | null): Exploration[] {
  return readList(store, RECENT_KEY).slice(0, MAX_RECENT)
}

/** Saves a state. The same canonical state is never stored twice: the caller gets the existing entry. */
export function saveExploration(store: KeyValueStore | null, state: ShareState, title: string, now = new Date()): StoreResult<Exploration> {
  if (!store) return { ok: false, reason: 'unavailable' }
  const canonical = canonicalize(state.subject, state.params)
  if (!canonical) return { ok: false, reason: 'invalid' }
  const list = readSaved(store)
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
  const result = writeList(store, SAVED_KEY, [entry, ...list])
  return result.ok ? { ok: true, value: entry } : result
}

export function renameExploration(store: KeyValueStore | null, id: string, title: string, now = new Date()): StoreResult<Exploration> {
  const list = readSaved(store)
  const index = list.findIndex((e) => e.id === id)
  if (index < 0) return { ok: false, reason: store ? 'not-found' : 'unavailable' }
  const updated = { ...list[index], title: cleanTitle(title, list[index].title), updatedAt: now.toISOString() }
  const next = [...list]
  next[index] = updated
  const result = writeList(store, SAVED_KEY, next)
  return result.ok ? { ok: true, value: updated } : result
}

export function removeExploration(store: KeyValueStore | null, id: string): StoreResult {
  const list = readSaved(store)
  if (!list.some((e) => e.id === id)) return { ok: false, reason: store ? 'not-found' : 'unavailable' }
  return writeList(store, SAVED_KEY, list.filter((e) => e.id !== id))
}

/** Records a visit: the newest first, deduplicated by canonical state, at most MAX_RECENT entries. */
export function recordVisit(store: KeyValueStore | null, state: ShareState, now = new Date()): StoreResult {
  const canonical = canonicalize(state.subject, state.params)
  if (!canonical) return { ok: false, reason: 'invalid' }
  if (!store) return { ok: false, reason: 'unavailable' }
  const key = canonicalKey(canonical)
  const iso = now.toISOString()
  const previous = readList(store, RECENT_KEY).filter((e) => canonicalKey(e) !== key)
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
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
