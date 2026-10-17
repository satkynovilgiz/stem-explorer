import { canonicalize, type ShareState } from './explorations'
import { isQuotaError, type KeyValueStore } from './explorationStore'

/*
 * Unsaved note drafts. They are kept in this tab's sessionStorage, written as you type, so a reload
 * or leaving the explorer does not lose them. Drafts are separate from the notebook: nothing here
 * ever writes to the saved-notes key, and a draft only becomes a note through an explicit Save.
 *
 * A draft for a new note carries the exploration it was started in, so restoring a Water draft while
 * looking at Benzene still attaches it to Water unless you choose otherwise.
 */

export const DRAFT_VERSION = 1
const PREFIX = 'stem-explorer:note-draft:'
export const draftKey = (scope: string) => `${PREFIX}${scope}`

export interface NoteDraftRecord {
  title: string
  body: string
  /** New-note drafts only: the exploration the note will be attached to. */
  state: ShareState | null
}

export type DraftWriteResult = { ok: true } | { ok: false; reason: 'unavailable' | 'quota' | 'write-failed' }

export function sessionStore(): KeyValueStore | null {
  try {
    return window.sessionStorage ?? null
  } catch {
    return null
  }
}

/** Reads a draft; anything malformed is treated as no draft (and left in place). */
export function readDraft(store: KeyValueStore | null, scope: string): NoteDraftRecord | null {
  if (!store) return null
  let raw: string | null
  try {
    raw = store.getItem(draftKey(scope))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Record<string, unknown>
    if (typeof d.title !== 'string' || typeof d.body !== 'string') return null
    // Version 0 drafts (before snapshots) had no version field and no state.
    if (d.version !== undefined && d.version !== DRAFT_VERSION) return null
    const s = d.state as { subject?: unknown; params?: unknown } | null | undefined
    const state = s && typeof s.subject === 'string' && typeof s.params === 'object' && s.params ? canonicalize(s.subject, s.params as Record<string, string>) : null
    return { title: d.title, body: d.body, state }
  } catch {
    return null
  }
}

export function writeDraft(store: KeyValueStore | null, scope: string, draft: NoteDraftRecord): DraftWriteResult {
  if (!store) return { ok: false, reason: 'unavailable' }
  try {
    store.setItem(draftKey(scope), JSON.stringify({ version: DRAFT_VERSION, title: draft.title, body: draft.body, state: draft.state }))
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: isQuotaError(e) ? 'quota' : 'write-failed' }
  }
}

export function clearDraft(store: KeyValueStore | null, scope: string): void {
  try {
    store?.removeItem(draftKey(scope))
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

export function draftFailureText(reason: Exclude<DraftWriteResult, { ok: true }>['reason']): string {
  switch (reason) {
    case 'unavailable':
      return 'This draft can’t be kept if the page reloads: this browser is blocking session storage. Save the note to keep it.'
    case 'quota':
      return 'This draft can’t be kept if the page reloads: this browser reports its storage is full. Save the note to keep it.'
    case 'write-failed':
      return 'This draft can’t be kept if the page reloads: the browser refused to store it. Save the note to keep it.'
  }
}
