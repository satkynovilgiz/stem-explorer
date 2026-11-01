import type { ChemGroupId, ChemLabel } from './chemIndex'

/*
 * Chemistry home state in the address: `cq` query, `cs=all` to search every subject, `cf` label
 * filter, `cg` open group. Kept in the URL so Back from a result returns to the same results.
 */
export interface HomeState {
  q: string
  scope: 'chemistry' | 'all'
  label: ChemLabel | null
  group: ChemGroupId | null
}

export const HOME_KEYS = ['cq', 'cs', 'cf', 'cg'] as const
const LABELS: readonly ChemLabel[] = ['Topic', 'Formula', 'Molecule', 'Calculator']
const GROUPS: readonly ChemGroupId[] = ['atoms', 'bonds', 'moles', 'solutions', 'acids', 'gases']

export function parseHomeState(search: string): HomeState {
  const p = new URLSearchParams(search)
  const label = p.get('cf')
  const group = p.get('cg')
  return {
    q: (p.get('cq') ?? '').slice(0, 120),
    scope: p.get('cs') === 'all' ? 'all' : 'chemistry',
    label: label && (LABELS as readonly string[]).includes(label) ? (label as ChemLabel) : null,
    group: group && (GROUPS as readonly string[]).includes(group) ? (group as ChemGroupId) : null,
  }
}

export const readHomeState = () => parseHomeState(window.location.search)

export function homeSearch(search: string, st: HomeState): string {
  const q = new URLSearchParams(search)
  for (const k of HOME_KEYS) q.delete(k)
  if (st.q) q.set('cq', st.q)
  if (st.scope === 'all') q.set('cs', 'all')
  if (st.label) q.set('cf', st.label)
  if (st.group) q.set('cg', st.group)
  return `?${q.toString()}`
}

export function writeHomeState(st: HomeState, mode: 'replace' | 'push') {
  const search = homeSearch(window.location.search, st)
  if (search === window.location.search) return
  const url = `${window.location.pathname}${search}${window.location.hash}`
  if (mode === 'push') window.history.pushState(window.history.state, '', url)
  else window.history.replaceState(window.history.state, '', url)
}
