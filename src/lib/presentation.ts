import type { SubjectId } from '../data/subjects'
import { canonicalize, defaultTitle, hrefFor, subjectName } from './explorations'

/** What kind of picture each view is, printed on every export. */
export function modelLabel(subject: SubjectId, search: string): string {
  const q = new URLSearchParams(search)
  switch (subject) {
    case 'anatomy':
      return 'Schematic model: simplified shapes placed to show position and relationships, not to scale. One typical arrangement; bodies vary.'
    case 'biology':
      return q.get('bsec') ? 'Schematic diagram: simplified and not to scale.' : 'Schematic, generalized cell: not to scale, and no real cell looks exactly like this.'
    case 'chemistry':
      return q.get('csec') ? 'Schematic diagram: simplified and not to scale.' : 'Molecular model: atom positions from the cited geometry; colours and atom sizes are conventions.'
    case 'physics':
      return 'Idealised model: see the assumptions listed in the app.'
    case 'mathematics':
      return 'Computed from exact formulas; the drawing is sampled at a finite resolution.'
  }
}

/** The current view as a title, a settings line and a link that reopens it. */
export function describeView(subject: SubjectId) {
  const params = Object.fromEntries(new URLSearchParams(window.location.search))
  const state = canonicalize(subject, params) ?? { subject, params: {} }
  const entries = Object.entries(state.params)
  return {
    title: `${defaultTitle(state)} · ${subjectName(subject)}`,
    settings: entries.length ? `Settings: ${entries.map(([k, v]) => `${k} = ${v}`).join(', ')}` : 'Settings: defaults',
    link: new URL(hrefFor(state), window.location.origin + window.location.pathname).toString(),
  }
}

