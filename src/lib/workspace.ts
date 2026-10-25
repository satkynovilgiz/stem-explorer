import { useSyncExternalStore } from 'react'

/*
 * Layout preferences for explorer workspaces: which side panels are hidden and whether Focus mode
 * is on. They are a per-browser convenience, kept apart from scientific configurations: never in
 * links, saves or notes. Stored in localStorage; if storage is unavailable they last for the visit.
 */

export interface WorkspacePrefs {
  hideLeft: boolean
  hideRight: boolean
  /** Both panels hidden; either can be opened over the stage temporarily (peek). */
  focus: boolean
}

export const DEFAULT_WORKSPACE: WorkspacePrefs = { hideLeft: false, hideRight: false, focus: false }
const KEY = 'stem-explorer:workspace'
const EVENT = 'stem:workspace'

function read(): WorkspacePrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<WorkspacePrefs> | null
    if (!raw || typeof raw !== 'object') return DEFAULT_WORKSPACE
    return { hideLeft: raw.hideLeft === true, hideRight: raw.hideRight === true, focus: raw.focus === true }
  } catch {
    return DEFAULT_WORKSPACE
  }
}

let current = read()

export function getWorkspace(): WorkspacePrefs {
  return current
}

export function setWorkspace(patch: Partial<WorkspacePrefs>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Storage blocked or full: the preference still applies for this visit.
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read()
      onChange()
    }
  }
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useWorkspace(): WorkspacePrefs {
  return useSyncExternalStore(subscribe, getWorkspace, getWorkspace)
}

/** Whether a keyboard event comes from a place where the user is typing (shortcuts must not fire there). */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag !== 'INPUT') return false
  const type = (target as HTMLInputElement).type
  // Buttons, checkboxes, radios and sliders do not take text; every other input does.
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file'].includes(type)
}

export interface Shortcut {
  keys: string
  action: string
}

export const SHORTCUTS: readonly Shortcut[] = [
  { keys: '?', action: 'Show or hide this list of shortcuts' },
  { keys: '/', action: 'Open Search' },
  { keys: 't', action: 'Open the Topics drawer (in an explorer)' },
  { keys: 'f', action: 'Turn Focus mode on or off (in an explorer)' },
  { keys: '[', action: 'Hide or show the left panel (in an explorer)' },
  { keys: ']', action: 'Hide or show the right panel (in an explorer)' },
  { keys: 'Esc', action: 'Close a dialog or drawer, or leave presentation mode' },
]

/* ---------- Peek (a panel opened over the stage in Focus mode; never stored) ---------- */

export type Side = 'left' | 'right'
let peek: Side | null = null
const PEEK_EVENT = 'stem:workspace-peek'

export const getPeek = () => peek
export function setPeek(side: Side | null) {
  peek = side
  window.dispatchEvent(new Event(PEEK_EVENT))
}
export function usePeek(): Side | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(PEEK_EVENT, cb)
      return () => window.removeEventListener(PEEK_EVENT, cb)
    },
    getPeek,
    getPeek,
  )
}

/** If focus is inside a panel that is about to disappear, move it to that panel's toggle so keyboard users keep their place. */
function rescueFocus(side: Side) {
  const panel = document.querySelector(`.chem-side--${side}`)
  if (panel && document.activeElement && panel.contains(document.activeElement)) {
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-ws-toggle="${side}"]`)?.focus())
  }
}

/** Hide or show a side panel; in Focus mode, open or close it over the stage instead. */
export function toggleSide(side: Side) {
  const w = getWorkspace()
  if (w.focus) {
    if (getPeek() === side) rescueFocus(side)
    setPeek(getPeek() === side ? null : side)
    return
  }
  const key = side === 'left' ? 'hideLeft' : 'hideRight'
  if (!w[key]) rescueFocus(side)
  setWorkspace({ [key]: !w[key] })
}

export function toggleFocus() {
  const w = getWorkspace()
  if (!w.focus) {
    rescueFocus('left')
    rescueFocus('right')
  }
  setPeek(null)
  setWorkspace({ focus: !w.focus })
}

/** Restore the normal layout: both panels visible, Focus off. */
export function restoreLayout() {
  setPeek(null)
  setWorkspace({ ...DEFAULT_WORKSPACE })
}
