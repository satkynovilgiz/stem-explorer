import { isSubjectId, type SubjectId } from '../data/subjects'
import { canonicalize, defaultTitle, hrefFor, type ShareState } from './explorations'
import { cleanTitle, cutText, isQuotaError, MAX_TITLE_LENGTH, newId, wellFormed, type KeyValueStore } from './explorationStore'

/*
 * Exploration collections, kept in this browser's localStorage. A collection is an ordered list of
 * explorer configurations (subject + validated parameters, copied in, so deleting a saved
 * exploration never breaks a collection), each with a short note. Versioned schema, stable ids,
 * and a revision number per collection so one tab never silently overwrites newer edits made in
 * another. Collections never appear in URLs.
 */

export const COLLECTIONS_KEY = 'stem-explorer:collections'
export const COLLECTIONS_VERSION = 1
export const MAX_COLLECTIONS = 20
export const MAX_ITEMS = 30
export const MAX_NOTE = 500
export const MAX_DESCRIPTION = 500
/** An item's settings: at most this many keys, and this many UTF-8 bytes as JSON. Every valid explorer link fits. */
export const MAX_PARAM_KEYS = 40
export const MAX_PARAMS_BYTES = 3000

export interface CollectionItem {
  id: string
  subject: SubjectId
  /** As stored; validated on read (see `itemState`). */
  params: Record<string, string>
  title: string
  /** An observation or question for this step (private text: never put in a link). */
  note: string
}

export interface Collection {
  id: string
  title: string
  description: string
  items: CollectionItem[]
  createdAt: string
  updatedAt: string
  /** Increases with every write; a write based on an older revision is refused. */
  revision: number
}

export type CollectionFailure = 'unavailable' | 'unreadable' | 'quota' | 'write-failed' | 'limit' | 'not-found' | 'item-not-found' | 'conflict' | 'invalid'
export type CollectionResult<T = void> = { ok: true; value: T } | { ok: false; reason: CollectionFailure }

/** Size in bytes when encoded as UTF-8: the one measure used for files on export, import and in the file picker. */
export const utf8Bytes = (text: string) => new TextEncoder().encode(text).length

/** Control characters (except line breaks) become spaces; trimmed. Cut to `max` only when given. */
const cleanText = (s: unknown, max?: number) => {
  if (typeof s !== 'string') return ''
  const t = wellFormed(Array.from(s, (ch) => (ch.charCodeAt(0) < 32 && ch !== '\n' ? ' ' : ch)).join('')).trim()
  return max === undefined ? t : cutText(t, max)
}

/** A title cleaned like `cleanTitle`, but never shortened (for checking an imported title's length). */
const fullTitle = (s: string) => wellFormed(Array.from(s, (ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? ' ' : ch)).join('')).replace(/\s+/g, ' ').trim()

const paramsFit = (params: Record<string, string>) => Object.keys(params).length <= MAX_PARAM_KEYS && utf8Bytes(JSON.stringify(params)) <= MAX_PARAMS_BYTES

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))

function parseItem(raw: unknown): CollectionItem | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !isSubjectId(String(r.subject)) || typeof r.params !== 'object' || r.params === null) return null
  const params = Object.fromEntries(Object.entries(r.params as Record<string, unknown>).filter(([, v]) => typeof v === 'string')) as Record<string, string>
  // Nothing is shortened on reading: stored notes are kept exactly (limits apply when writing and importing).
  return { id: r.id, subject: r.subject as SubjectId, params, title: cleanTitle(String(r.title ?? ''), 'Exploration'), note: cleanText(r.note) }
}

export function parseCollection(raw: unknown): Collection | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || !Array.isArray(r.items) || !isIso(r.createdAt) || !isIso(r.updatedAt)) return null
  const items = r.items.map(parseItem).filter((i): i is CollectionItem => i !== null)
  return {
    id: r.id,
    title: cleanTitle(r.title, 'Untitled collection'),
    description: cleanText(r.description),
    items,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    revision: Number.isInteger(r.revision) && (r.revision as number) >= 0 ? (r.revision as number) : 0,
  }
}

/** The item's configuration if it still validates; null means broken (kept, with recovery options). */
export function itemState(item: CollectionItem): ShareState | null {
  return canonicalize(item.subject, item.params)
}

export const itemHref = (item: CollectionItem) => {
  const s = itemState(item)
  return s ? hrefFor(s) : null
}

export type CollectionsRead = { ok: true; collections: Collection[] } | { ok: false; reason: 'unavailable' | 'unreadable' }

export function readCollections(store: KeyValueStore | null): CollectionsRead {
  if (!store) return { ok: false, reason: 'unavailable' }
  let text: string | null
  try {
    text = store.getItem(COLLECTIONS_KEY)
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
  if (text === null) return { ok: true, collections: [] }
  try {
    const data = JSON.parse(text) as { version?: unknown; collections?: unknown }
    if (data.version !== COLLECTIONS_VERSION || !Array.isArray(data.collections)) return { ok: false, reason: 'unreadable' }
    return { ok: true, collections: data.collections.map(parseCollection).filter((c): c is Collection => c !== null) }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}

function write(store: KeyValueStore, collections: readonly Collection[]): CollectionResult {
  try {
    store.setItem(COLLECTIONS_KEY, JSON.stringify({ version: COLLECTIONS_VERSION, collections }))
    return { ok: true, value: undefined }
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'write-failed' }
  }
}

/** Reads, applies `change`, writes. Damaged data is never overwritten; nothing is written on failure. */
function transact<T>(store: KeyValueStore | null, change: (list: Collection[]) => CollectionResult<{ list: Collection[]; value: T }>): CollectionResult<T> {
  const read = readCollections(store)
  if (!read.ok) return read
  const r = change(read.collections)
  if (!r.ok) return r
  const w = write(store!, r.value.list)
  return w.ok ? { ok: true, value: r.value.value } : w
}

export function createCollection(store: KeyValueStore | null, title: string, description = '', now = new Date()): CollectionResult<Collection> {
  return transact(store, (list) => {
    if (list.length >= MAX_COLLECTIONS) return { ok: false, reason: 'limit' }
    const c: Collection = { id: newId(now.getTime()), title: cleanTitle(title, 'Untitled collection'), description: cleanText(description, MAX_DESCRIPTION), items: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), revision: 1 }
    return { ok: true, value: { list: [...list, c], value: c } }
  })
}

/**
 * Updates one collection if it is still at `expectedRevision`. A newer revision means another tab
 * changed it: the write is refused ('conflict') so its edits are never overwritten.
 */
export function updateCollection(store: KeyValueStore | null, id: string, expectedRevision: number, mutate: (c: Collection) => Collection | null, now = new Date()): CollectionResult<Collection> {
  return transact(store, (list) => {
    const i = list.findIndex((c) => c.id === id)
    if (i < 0) return { ok: false, reason: 'not-found' }
    if (list[i].revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    const next = mutate(structuredClone(list[i]))
    if (!next) return { ok: false, reason: 'invalid' }
    // A collection over the limit (from an older version) can still shrink; it can never grow.
    if (next.items.length > MAX_ITEMS && next.items.length > list[i].items.length) return { ok: false, reason: 'limit' }
    const saved = { ...next, title: cleanTitle(next.title, 'Untitled collection'), description: cleanText(next.description, MAX_DESCRIPTION), updatedAt: now.toISOString(), revision: list[i].revision + 1 }
    const copy = [...list]
    copy[i] = saved
    return { ok: true, value: { list: copy, value: saved } }
  })
}

/* ---------- Drafts (editing that may overlap with other tabs) ---------- */

/**
 * A title-and-description draft. `base` is the saved version when editing began (its revision and
 * text). The draft is never moved onto a newer revision by itself: if the title or description
 * saved since then differs from `base`, saving is refused as a conflict and the person chooses.
 */
export interface DetailsDraft {
  title: string
  description: string
  base: { revision: number; title: string; description: string }
}

/** An item-note draft, with the note and collection revision as they were when editing began. */
export interface NoteDraft {
  note: string
  base: { revision: number; note: string }
}

export const startDetailsDraft = (c: Collection): DetailsDraft => ({ title: c.title, description: c.description, base: { revision: c.revision, title: c.title, description: c.description } })
export const startNoteDraft = (c: Collection, item: CollectionItem): NoteDraft => ({ note: item.note, base: { revision: c.revision, note: item.note } })

/** True when the saved title or description has changed since the draft began (another tab saved over it). */
export const detailsConflict = (c: Collection, d: DetailsDraft) => c.revision !== d.base.revision && (c.title !== d.base.title || c.description !== d.base.description)
/** True when the saved note has changed since the draft began. */
export const noteConflict = (c: Collection, item: CollectionItem, d: NoteDraft) => c.revision !== d.base.revision && item.note !== d.base.note

/**
 * Saves a details draft. Other changes made meanwhile (items, notes) are kept: only the title and
 * description are written. With `replace`, the person has seen the conflict and chosen the draft.
 */
export function saveDetailsDraft(store: KeyValueStore | null, id: string, d: DetailsDraft, replace = false, now = new Date()): CollectionResult<Collection> {
  const read = readCollections(store)
  if (!read.ok) return read
  const c = read.collections.find((x) => x.id === id)
  if (!c) return { ok: false, reason: 'not-found' }
  if (!replace && detailsConflict(c, d)) return { ok: false, reason: 'conflict' }
  return updateCollection(store, id, c.revision, (x) => ({ ...x, title: d.title, description: d.description }), now)
}

/** Saves a note draft; refused as a conflict if that note was changed since the draft began (unless `replace`). */
export function saveNoteDraft(store: KeyValueStore | null, id: string, itemId: string, d: NoteDraft, replace = false, now = new Date()): CollectionResult<Collection> {
  const read = readCollections(store)
  if (!read.ok) return read
  const c = read.collections.find((x) => x.id === id)
  if (!c) return { ok: false, reason: 'not-found' }
  const item = c.items.find((x) => x.id === itemId)
  if (!item) return { ok: false, reason: 'item-not-found' }
  if (!replace && noteConflict(c, item, d)) return { ok: false, reason: 'conflict' }
  return updateCollection(store, id, c.revision, (x) => setItemNote(x, itemId, d.note), now)
}

export function deleteCollection(store: KeyValueStore | null, id: string, expectedRevision: number): CollectionResult {
  return transact(store, (list) => {
    const c = list.find((x) => x.id === id)
    if (!c) return { ok: false, reason: 'not-found' }
    if (c.revision !== expectedRevision) return { ok: false, reason: 'conflict' }
    return { ok: true, value: { list: list.filter((x) => x.id !== id), value: undefined } }
  })
}

/** A copy with new ids (collection and items) and "(copy)" in the title. */
export function duplicateCollection(store: KeyValueStore | null, id: string, now = new Date()): CollectionResult<Collection> {
  return transact(store, (list) => {
    const c = list.find((x) => x.id === id)
    if (!c) return { ok: false, reason: 'not-found' }
    if (list.length >= MAX_COLLECTIONS) return { ok: false, reason: 'limit' }
    const copy: Collection = {
      ...structuredClone(c),
      id: newId(now.getTime()),
      title: cleanTitle(`${c.title} (copy)`, 'Untitled collection'),
      items: c.items.map((it, k) => ({ ...it, id: newId(now.getTime() + k + 1) })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      revision: 1,
    }
    return { ok: true, value: { list: [...list, copy], value: copy } }
  })
}

/** Adds a whole collection (used for "Copy to my collections" from the curated library). */
export function addCollection(store: KeyValueStore | null, draft: { title: string; description: string; items: Omit<CollectionItem, 'id'>[] }, now = new Date()): CollectionResult<Collection> {
  return transact(store, (list) => {
    if (list.length >= MAX_COLLECTIONS) return { ok: false, reason: 'limit' }
    const c: Collection = {
      id: newId(now.getTime()),
      title: cleanTitle(draft.title, 'Untitled collection'),
      description: cleanText(draft.description, MAX_DESCRIPTION),
      items: draft.items.slice(0, MAX_ITEMS).map((it, k) => ({ ...it, id: newId(now.getTime() + k + 1), note: cleanText(it.note, MAX_NOTE) })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      revision: 1,
    }
    return { ok: true, value: { list: [...list, c], value: c } }
  })
}

/* ---------- Item helpers (pure; used inside updateCollection) ---------- */

export function newItem(state: ShareState, note = '', title?: string, now = Date.now()): CollectionItem {
  return { id: newId(now), subject: state.subject, params: { ...state.params }, title: cleanTitle(title ?? defaultTitle(state), 'Exploration'), note: cleanText(note, MAX_NOTE) }
}

export function moveItem(c: Collection, itemId: string, delta: -1 | 1): Collection | null {
  const i = c.items.findIndex((x) => x.id === itemId)
  const j = i + delta
  if (i < 0 || j < 0 || j >= c.items.length) return null
  const items = [...c.items]
  ;[items[i], items[j]] = [items[j], items[i]]
  return { ...c, items }
}

export function duplicateItem(c: Collection, itemId: string, now = Date.now()): Collection | null {
  const i = c.items.findIndex((x) => x.id === itemId)
  if (i < 0) return null
  const items = [...c.items]
  items.splice(i + 1, 0, { ...c.items[i], id: newId(now) })
  return { ...c, items }
}

export function removeItem(c: Collection, itemId: string): Collection | null {
  return c.items.some((x) => x.id === itemId) ? { ...c, items: c.items.filter((x) => x.id !== itemId) } : null
}

export function setItemNote(c: Collection, itemId: string, note: string): Collection | null {
  return c.items.some((x) => x.id === itemId) ? { ...c, items: c.items.map((x) => (x.id === itemId ? { ...x, note: cleanText(note, MAX_NOTE) } : x)) } : null
}

/* ---------- Export and import ---------- */

export const COLLECTIONS_FORMAT = 'stem-explorer.collections'
/**
 * Largest collection file read, in UTF-8 bytes. The limits above keep every export below it: the
 * largest possible export (20 × 30 items, every note, title and setting at its limit, in 3-byte
 * characters) is about 3.3 MB; see the test that builds it.
 */
export const MAX_IMPORT_BYTES = 5_000_000

export interface CollectionsFile {
  format: typeof COLLECTIONS_FORMAT
  version: 1
  exportedAt: string
  collections: { id: string; title: string; description: string; items: { subject: string; params: Record<string, string>; title: string; note: string }[] }[]
}

export function buildCollectionsFile(collections: readonly Collection[], now = new Date()): CollectionsFile {
  return {
    format: COLLECTIONS_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    collections: collections.map((c) => ({ id: c.id, title: c.title, description: c.description, items: c.items.map(({ subject, params, title, note }) => ({ subject, params, title, note })) })),
  }
}

/** The file as written by Export (2-space indented JSON), or 'too-large' if it could not be imported again. */
export function collectionsFileText(collections: readonly Collection[], now = new Date()): { ok: true; text: string; bytes: number } | { ok: false; error: 'too-large'; bytes: number } {
  const text = JSON.stringify(buildCollectionsFile(collections, now), null, 2)
  const bytes = utf8Bytes(text)
  return bytes <= MAX_IMPORT_BYTES ? { ok: true, text, bytes } : { ok: false, error: 'too-large', bytes }
}

export interface ImportCandidate {
  title: string
  description: string
  items: Omit<CollectionItem, 'id'>[]
  /** Items whose settings no longer validate (kept, marked broken). */
  brokenItems: number
  /** Entries in the file's item list that are not items at all; they are listed in the preview and skipped. */
  unreadableItems: number
  /** Same id as an existing collection, or the same title with the same items in the same order. */
  duplicateOf: string | null
  /** Why this collection can't be imported without losing text (nothing is ever shortened); empty if it can. */
  problems: string[]
}

export type ImportPlan = { ok: true; candidates: ImportCandidate[]; skippedInvalid: number } | { ok: false; error: 'too-large' | 'not-json' | 'wrong-format' | 'unsupported-version' | 'empty' }

const signature = (title: string, items: readonly { subject: string; params: Record<string, string> }[]) =>
  JSON.stringify([title.trim().toLowerCase(), items.map((i) => [i.subject, Object.entries(i.params).sort()])])

/** Reads a collections file and plans the import against existing collections. Nothing is written. */
export function planCollectionsImport(text: string, existing: readonly Collection[]): ImportPlan {
  if (utf8Bytes(text) > MAX_IMPORT_BYTES) return { ok: false, error: 'too-large' }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'not-json' }
  }
  const d = data as Partial<CollectionsFile>
  if (typeof d !== 'object' || d === null || d.format !== COLLECTIONS_FORMAT) return { ok: false, error: 'wrong-format' }
  if (d.version !== 1) return { ok: false, error: 'unsupported-version' }
  if (!Array.isArray(d.collections) || d.collections.length === 0) return { ok: false, error: 'empty' }
  const existingSig = new Map(existing.map((c) => [signature(c.title, c.items), c.title]))
  const existingIds = new Map(existing.map((c) => [c.id, c.title]))
  let skippedInvalid = 0
  const candidates: ImportCandidate[] = []
  for (const raw of d.collections) {
    if (typeof raw !== 'object' || raw === null || typeof raw.title !== 'string' || !Array.isArray(raw.items)) {
      skippedInvalid++
      continue
    }
    const parsed = raw.items.map((it) => parseItem({ ...(typeof it === 'object' ? it : {}), id: 'x' }))
    const items = parsed.filter((it): it is CollectionItem => it !== null).map(({ id: _id, ...rest }) => rest)
    const rawTitles = raw.items.map((it) => (typeof it === 'object' && it !== null && typeof it.title === 'string' ? fullTitle(it.title) : ''))
    const title = cleanTitle(wellFormed(raw.title), 'Untitled collection')
    const description = cleanText(raw.description)
    const problems: string[] = []
    if (fullTitle(raw.title).length > MAX_TITLE_LENGTH) problems.push(`its title is longer than ${MAX_TITLE_LENGTH} characters`)
    if (description.length > MAX_DESCRIPTION) problems.push(`its description is longer than ${MAX_DESCRIPTION} characters`)
    if (items.length > MAX_ITEMS) problems.push(`it has ${items.length} items (the limit is ${MAX_ITEMS})`)
    const longNotes = items.filter((it) => it.note.length > MAX_NOTE).length
    if (longNotes) problems.push(`${longNotes === 1 ? '1 note is' : `${longNotes} notes are`} longer than ${MAX_NOTE} characters`)
    const longTitles = rawTitles.filter((t) => t.length > MAX_TITLE_LENGTH).length
    if (longTitles) problems.push(`${longTitles === 1 ? '1 item name is' : `${longTitles} item names are`} longer than ${MAX_TITLE_LENGTH} characters`)
    const bigParams = items.filter((it) => !paramsFit(it.params)).length
    if (bigParams) problems.push(`${bigParams === 1 ? '1 item has' : `${bigParams} items have`} settings larger than this version accepts`)
    candidates.push({
      title,
      description,
      items,
      brokenItems: items.filter((it) => canonicalize(it.subject, it.params) === null).length,
      unreadableItems: parsed.length - items.length,
      duplicateOf: (typeof raw.id === 'string' && existingIds.get(raw.id)) || existingSig.get(signature(title, items)) || null,
      problems,
    })
  }
  return { ok: true, candidates, skippedInvalid }
}

/**
 * Adds the planned collections that are not duplicates (or all, as copies, when `includeDuplicates`).
 * Always adds new collections with new ids; never replaces or merges into existing ones.
 */
export function applyCollectionsImport(store: KeyValueStore | null, candidates: readonly ImportCandidate[], includeDuplicates: boolean, now = new Date()): CollectionResult<{ added: number; skipped: number; refused: number }> {
  return transact(store, (list) => {
    const chosen = candidates.filter((c) => c.problems.length === 0 && (includeDuplicates || !c.duplicateOf))
    if (list.length + chosen.length > MAX_COLLECTIONS) return { ok: false, reason: 'limit' }
    const added = chosen.map((c, k): Collection => ({
      id: newId(now.getTime() + k * 100),
      title: c.duplicateOf ? cleanTitle(`${c.title} (imported)`, 'Untitled collection') : c.title,
      description: c.description,
      items: c.items.map((it, j) => ({ ...it, id: newId(now.getTime() + k * 100 + j + 1) })),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      revision: 1,
    }))
    return { ok: true, value: { list: [...list, ...added], value: { added: added.length, skipped: candidates.filter((c) => c.problems.length === 0 && c.duplicateOf && !includeDuplicates).length, refused: candidates.filter((c) => c.problems.length > 0).length } } }
  })
}

export const COLLECTION_MESSAGES: Record<CollectionFailure, string> = {
  unavailable: 'This browser is blocking storage, so collections cannot be saved.',
  unreadable: 'The stored collections could not be read. They have been left untouched; nothing was changed.',
  quota: 'Browser storage is full, so nothing was changed. Remove something (for example an unused collection) and try again.',
  'write-failed': 'The browser refused to save, so nothing was changed.',
  limit: `The limit is ${MAX_COLLECTIONS} collections of up to ${MAX_ITEMS} items each; nothing was changed.`,
  'not-found': 'That collection no longer exists (it may have been deleted in another tab).',
  'item-not-found': 'That item is no longer in the collection (it may have been removed in another tab).',
  conflict: 'This collection was changed in another tab. Your edit was not saved, so those changes are kept; the latest version is now shown.',
  invalid: 'That change could not be made.',
}

/**
 * The exploration a pasted STEM Explorer link opens ("…?a=1#/physics", with or without the site
 * address), or null if it is not a valid exploration link. Only the subject and its parameters are
 * kept; nothing else in the link is read.
 */
export function stateFromLink(text: string): ShareState | null {
  const s = text.trim()
  const at = s.indexOf('#/')
  if (at < 0) return null
  const subject = s.slice(at + 2).split(/[/?#]/)[0]
  const q = s.slice(0, at).indexOf('?')
  const query = q < 0 ? '' : s.slice(0, at).slice(q + 1)
  return isSubjectId(subject) ? canonicalize(subject, Object.fromEntries(new URLSearchParams(query))) : null
}
