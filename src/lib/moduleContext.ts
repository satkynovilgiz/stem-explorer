import { locate, type TopicModule } from '../data/topics'
import type { SubjectId } from '../data/subjects'
import { canonicalize, hrefFor } from './explorations'

/*
 * The last state seen in each module during this browser session, so returning to a module
 * (from the topic drawer) reopens where you were rather than its default. Session storage only;
 * stored values are re-validated before use.
 */

const KEY = 'stem-explorer.module-context'

function read(): Record<string, string> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as unknown
    return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function rememberModuleState(subject: SubjectId, search: string) {
  const state = canonicalize(subject, Object.fromEntries(new URLSearchParams(search)))
  if (!state) return
  const { module } = locate(subject, search)
  const all = read()
  const href = hrefFor(state)
  if (all[module.id] === href) return
  all[module.id] = href
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Storage full or blocked: the drawer falls back to each module's default.
  }
}

/** Where a module link should go: the remembered state if it is still valid and in that module, else the default. */
export function moduleHref(module: TopicModule): { href: string; remembered: boolean } {
  const stored = read()[module.id]
  if (typeof stored === 'string') {
    const [search, subject] = stored.split('#/')
    const state = subject === module.subject ? canonicalize(subject, Object.fromEntries(new URLSearchParams(search))) : null
    if (state && module.matches(search)) return { href: hrefFor(state), remembered: true }
  }
  return { href: module.href, remembered: false }
}
