import type { SubjectId } from '../../data/subjects'

/*
 * A one-shot, in-memory request from Home to open a subject's activity introduction. It is never
 * written to the URL or storage, so share links and saved explorations stay free of activity state.
 */
let pending: SubjectId | null = null

export function requestActivity(subject: SubjectId) {
  pending = subject
}

/** True if Home asked for this subject's activity. Cleared after the current task, so a remount in
 * development (StrictMode) sees the same answer, but a later visit does not. */
export function consumeActivityRequest(subject: SubjectId): boolean {
  if (pending !== subject) return false
  window.setTimeout(() => {
    if (pending === subject) pending = null
  }, 0)
  return true
}
