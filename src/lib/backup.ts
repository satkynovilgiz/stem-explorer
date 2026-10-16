import { canonicalize, canonicalKey, defaultTitle, type ShareState } from './explorations'
import {
  cleanTitle,
  loadList,
  MAX_SAVED,
  newId,
  SAVED_KEY,
  SCHEMA_VERSION,
  writeSaved,
  type Exploration,
  type KeyValueStore,
  type StoreResult,
} from './explorationStore'

/*
 * Backup files for saved explorations: plain JSON, saved entries only (never recent history).
 * Entries carry a title and a subject with its parameters, so they work on any deployment; no
 * origins or URLs are written, and any URL-like fields in an imported file are ignored.
 */

export const BACKUP_FORMAT = 'stem-explorer.saved-explorations'
export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 1_000_000

export interface BackupEntry {
  title: string
  subject: string
  params: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: typeof BACKUP_VERSION
  exportedAt: string
  entries: BackupEntry[]
}

export function buildBackup(saved: readonly Exploration[], now = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    entries: saved.map((e) => ({ title: e.title, subject: e.subject, params: { ...e.params }, createdAt: e.createdAt, updatedAt: e.updatedAt })),
  }
}

export function backupFileName(now = new Date()): string {
  return `stem-explorer-saved-${now.toISOString().slice(0, 10)}.json`
}

export type BackupError =
  | { kind: 'too-large' }
  | { kind: 'not-json' }
  | { kind: 'wrong-format' }
  | { kind: 'unsupported-version'; version: string }

export interface PlannedEntry {
  /** 1-based position in the file, for messages. */
  position: number
  title: string
  state: ShareState
  createdAt: string
}

export interface ImportPlan {
  /** Exactly the entries that "Import N explorations" will add, in file order. */
  toImport: PlannedEntry[]
  /** Already saved on this browser (or repeated earlier in the file); the existing title is kept. */
  duplicates: { position: number; title: string; existingTitle: string }[]
  invalid: { position: number; title: string | null; reason: string }[]
  /** Valid and new, but beyond the saved-item limit. */
  overLimit: PlannedEntry[]
}

export type PlanResult = { ok: true; plan: ImportPlan } | { ok: false; error: BackupError }

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

function isIso(v: unknown): v is string {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v))
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'string')
}

/**
 * Validates a backup's text against the current saved list without changing anything. Every entry
 * goes through the same canonical validation as URLs and stored entries.
 */
export function planImport(text: string, existing: readonly Exploration[], now = new Date(), max = MAX_SAVED): PlanResult {
  if (byteLength(text) > MAX_BACKUP_BYTES) return { ok: false, error: { kind: 'too-large' } }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'not-json' } }
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== BACKUP_FORMAT) {
    return { ok: false, error: { kind: 'wrong-format' } }
  }
  const file = data as Record<string, unknown>
  if (file.version !== BACKUP_VERSION) {
    return { ok: false, error: { kind: 'unsupported-version', version: String(file.version).slice(0, 20) } }
  }
  if (!Array.isArray(file.entries)) return { ok: false, error: { kind: 'wrong-format' } }

  const known = new Map(existing.map((e) => [canonicalKey(e), e.title]))
  const plan: ImportPlan = { toImport: [], duplicates: [], invalid: [], overLimit: [] }
  const capacity = Math.max(0, max - existing.length)

  file.entries.forEach((raw: unknown, i) => {
    const position = i + 1
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      plan.invalid.push({ position, title: null, reason: 'not an entry' })
      return
    }
    const r = raw as Record<string, unknown>
    const rawTitle = typeof r.title === 'string' ? cleanTitle(r.title, '') || null : null
    if (typeof r.subject !== 'string' || !isStringRecord(r.params)) {
      plan.invalid.push({ position, title: rawTitle, reason: 'missing subject or settings' })
      return
    }
    const state = canonicalize(r.subject, r.params)
    if (!state) {
      plan.invalid.push({ position, title: rawTitle, reason: 'unknown subject or unsupported settings' })
      return
    }
    const title = rawTitle ?? defaultTitle(state)
    const key = canonicalKey(state)
    const existingTitle = known.get(key)
    if (existingTitle !== undefined) {
      plan.duplicates.push({ position, title, existingTitle })
      return
    }
    known.set(key, title)
    const entry = { position, title, state, createdAt: isIso(r.createdAt) ? r.createdAt : now.toISOString() }
    if (plan.toImport.length < capacity) plan.toImport.push(entry)
    else plan.overLimit.push(entry)
  })
  return { ok: true, plan }
}

/**
 * Applies an import: re-reads the saved list, re-plans against it (another tab may have changed
 * it since the preview), builds the complete merged list and writes it once. Existing entries and
 * their titles are kept; imported entries get fresh local IDs. If the plan no longer matches what
 * the user confirmed, nothing is written.
 */
export function applyImport(
  store: KeyValueStore | null,
  text: string,
  confirmedCount: number,
  now = new Date(),
): StoreResult<{ imported: number }> | { ok: false; reason: 'changed' } {
  const read = loadList(store, SAVED_KEY)
  if (!read.ok) return { ok: false, reason: read.reason }
  const planned = planImport(text, read.entries, now)
  if (!planned.ok) return { ok: false, reason: 'invalid' }
  const { toImport } = planned.plan
  if (toImport.length !== confirmedCount) return { ok: false, reason: 'changed' }
  if (toImport.length === 0) return { ok: true, value: { imported: 0 } }
  const iso = now.toISOString()
  const added: Exploration[] = toImport.map((p) => ({
    ...p.state,
    id: newId(now.getTime()),
    version: SCHEMA_VERSION,
    title: p.title,
    createdAt: p.createdAt,
    updatedAt: iso,
  }))
  const result = writeSaved(store, [...read.entries, ...added], read.preserved)
  return result.ok ? { ok: true, value: { imported: added.length } } : result
}
