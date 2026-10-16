import { BACKUP_FORMAT, MAX_BACKUP_BYTES } from './backup'
import { canonicalize, canonicalKey, type ShareState } from './explorations'
import type { KeyValueStore, StoreFailure } from './explorationStore'
import { cleanNoteBody, cleanNoteTitle, loadNotes, MAX_NOTES, newNoteId, NOTES_VERSION, writeNotes, type Note } from './notesStore'

/*
 * Notebook backups: their own versioned format, separate from saved-exploration backups (each
 * import recognises the other format and says where it belongs). Import is merge-only, previewed,
 * re-planned against current storage and written once, exactly like saved explorations.
 */

export const NOTEBOOK_FORMAT = 'stem-explorer.notebook'
export const NOTEBOOK_VERSION = 1

export interface NotebookFile {
  format: typeof NOTEBOOK_FORMAT
  version: typeof NOTEBOOK_VERSION
  exportedAt: string
  notes: { title: string; body: string; subject: string; params: Record<string, string>; createdAt: string; updatedAt: string }[]
}

export function buildNotebookBackup(notes: readonly Note[], now = new Date()): NotebookFile {
  return {
    format: NOTEBOOK_FORMAT,
    version: NOTEBOOK_VERSION,
    exportedAt: now.toISOString(),
    notes: notes.map((n) => ({ title: n.title, body: n.body, subject: n.subject, params: { ...n.params }, createdAt: n.createdAt, updatedAt: n.updatedAt })),
  }
}

export const notebookFileName = (now = new Date()) => `stem-explorer-notebook-${now.toISOString().slice(0, 10)}.json`

export type NotebookImportError =
  | { kind: 'too-large' }
  | { kind: 'not-json' }
  | { kind: 'wrong-format' }
  | { kind: 'saved-explorations-file' }
  | { kind: 'unsupported-version'; version: string }

export interface PlannedNote {
  position: number
  title: string
  body: string
  state: ShareState
  createdAt: string | null
  updatedAt: string | null
}

export interface NotebookPlan {
  toImport: PlannedNote[]
  duplicates: { position: number; title: string }[]
  invalid: { position: number; title: string | null; reason: string }[]
  overLimit: PlannedNote[]
}

const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v))
/** A note is a duplicate when its title, text and exploration all match an existing note. */
const noteKey = (title: string, body: string, state: ShareState) => JSON.stringify([title, body, canonicalKey(state)])

export function planNotebookImport(text: string, existing: readonly Note[], max = MAX_NOTES): { ok: true; plan: NotebookPlan } | { ok: false; error: NotebookImportError } {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) return { ok: false, error: { kind: 'too-large' } }
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: { kind: 'not-json' } }
  }
  const format = (data as { format?: unknown } | null)?.format
  if (format === BACKUP_FORMAT) return { ok: false, error: { kind: 'saved-explorations-file' } }
  if (typeof data !== 'object' || data === null || format !== NOTEBOOK_FORMAT) return { ok: false, error: { kind: 'wrong-format' } }
  const file = data as Record<string, unknown>
  if (file.version !== NOTEBOOK_VERSION) return { ok: false, error: { kind: 'unsupported-version', version: String(file.version).slice(0, 20) } }
  if (!Array.isArray(file.notes)) return { ok: false, error: { kind: 'wrong-format' } }

  const known = new Set(existing.map((n) => noteKey(n.title, n.body, n)))
  const plan: NotebookPlan = { toImport: [], duplicates: [], invalid: [], overLimit: [] }
  const capacity = Math.max(0, max - existing.length)
  file.notes.forEach((raw: unknown, i) => {
    const position = i + 1
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return void plan.invalid.push({ position, title: null, reason: 'not a note' })
    const r = raw as Record<string, unknown>
    const title = typeof r.title === 'string' ? cleanNoteTitle(r.title) : ''
    if (!title) return void plan.invalid.push({ position, title: null, reason: 'missing title' })
    if (typeof r.body !== 'string') return void plan.invalid.push({ position, title, reason: 'missing observations text' })
    const params = r.params
    if (typeof r.subject !== 'string' || typeof params !== 'object' || params === null || Object.values(params).some((v) => typeof v !== 'string')) {
      return void plan.invalid.push({ position, title, reason: 'missing subject or settings' })
    }
    const state = canonicalize(r.subject, params as Record<string, string>)
    if (!state) return void plan.invalid.push({ position, title, reason: 'unknown subject or unsupported settings' })
    const body = cleanNoteBody(r.body)
    const key = noteKey(title, body, state)
    if (known.has(key)) return void plan.duplicates.push({ position, title })
    known.add(key)
    const note = { position, title, body, state, createdAt: isIso(r.createdAt) ? r.createdAt : null, updatedAt: isIso(r.updatedAt) ? r.updatedAt : null }
    if (plan.toImport.length < capacity) plan.toImport.push(note)
    else plan.overLimit.push(note)
  })
  return { ok: true, plan }
}

export const notebookPlanSignature = (notes: readonly PlannedNote[]) =>
  JSON.stringify(notes.map((n) => [n.title, n.body, canonicalKey(n.state), n.createdAt, n.updatedAt]))

/** Re-reads, re-plans, checks the plan still matches what was confirmed, then writes once. */
export function applyNotebookImport(
  store: KeyValueStore | null,
  text: string,
  confirmed: readonly PlannedNote[],
  now = new Date(),
): { ok: true; value: { imported: number } } | { ok: false; reason: StoreFailure } | { ok: false; reason: 'changed'; plan: NotebookPlan } {
  const read = loadNotes(store)
  if (!read.ok) return { ok: false, reason: read.reason }
  const planned = planNotebookImport(text, read.notes)
  if (!planned.ok) return { ok: false, reason: 'invalid' }
  if (notebookPlanSignature(planned.plan.toImport) !== notebookPlanSignature(confirmed)) return { ok: false, reason: 'changed', plan: planned.plan }
  if (planned.plan.toImport.length === 0) return { ok: true, value: { imported: 0 } }
  const iso = now.toISOString()
  const added: Note[] = planned.plan.toImport.map((p) => ({
    ...p.state,
    id: newNoteId(now.getTime()),
    version: NOTES_VERSION,
    title: p.title,
    body: p.body,
    createdAt: p.createdAt ?? iso,
    updatedAt: p.updatedAt ?? iso,
  }))
  const r = writeNotes(store, [...read.notes, ...added], read.preserved)
  return r.ok ? { ok: true, value: { imported: added.length } } : r
}
