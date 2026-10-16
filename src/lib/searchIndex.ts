import { HEART_PARTS } from '../data/anatomy/heart'
import { ORGANELLES } from '../data/biology/organelles'
import { GLOSSARY } from '../data/glossary'
import { MOLECULES } from '../data/chemistry/molecules'
import { SUBJECTS, type SubjectId } from '../data/subjects'
import { SURFACES } from '../math/surfaces'
import { normalize } from './chemistry'
import { hrefFor } from './explorations'

/** One searchable item. Text comes from the existing subject data, not a copy of it. */
export interface SearchItem {
  id: string
  name: string
  subject: SubjectId
  /** Formula with digits, for display with subscripts (molecules only). */
  formula?: string
  description: string
  /** Relative in-app link. */
  href: string
  /** Extra terms that should match (aliases, formulas, tags). */
  terms: readonly string[]
}

const SUBJECT_BLURBS: Record<SubjectId, string> = {
  anatomy: 'A schematic 3D heart with a guided blood-flow tour.',
  chemistry: 'Molecules in 3D with distance and angle measurements, and the periodic table.',
  physics: 'An ideal projectile motion lab with graphs and comparisons.',
  mathematics: 'Surfaces z = f(x, y) with point inspection and cross-sections.',
  biology: 'An interactive generalized animal cell with organelles.',
}

export const SEARCH_INDEX: readonly SearchItem[] = [
  ...SUBJECTS.map((s) => ({
    id: `subject:${s.id}`,
    name: s.name,
    subject: s.id,
    description: SUBJECT_BLURBS[s.id],
    href: `#/${s.id}`,
    terms: [s.tagline],
  })),
  ...MOLECULES.map((m) => ({
    id: `molecule:${m.id}`,
    name: m.name,
    subject: 'chemistry' as const,
    formula: m.formula,
    description: m.summary,
    href: hrefFor({ subject: 'chemistry', params: { molecule: m.id, view: 'ball-and-stick' } }),
    terms: [m.formula, ...m.aliases, m.shapeSummary],
  })),
  ...ORGANELLES.map((o) => ({
    id: `organelle:${o.id}`,
    name: o.name,
    subject: 'biology' as const,
    description: o.summary,
    href: hrefFor({ subject: 'biology', params: { structure: o.id, cell: o.internal ? 'cutaway' : 'whole' } }),
    terms: [o.tag, o.instanceName ?? '', ...o.glossary.map((g) => g.term)],
  })),
  ...HEART_PARTS.map((p) => ({
    id: `heart:${p.id}`,
    name: p.name,
    subject: 'anatomy' as const,
    description: p.summary,
    href: hrefFor({ subject: 'anatomy', params: { part: p.id, heart: p.internal ? 'cutaway' : 'whole' } }),
    terms: [p.tag, p.kind, 'heart'],
  })),
  ...SURFACES.map((s) => ({
    id: `surface:${s.id}`,
    name: s.name,
    subject: 'mathematics' as const,
    description: `${s.formula}. ${s.description}`,
    href: `?surface=${s.id}#/mathematics`,
    terms: [s.formula],
  })),
  {
    id: 'experiment:projectile',
    name: 'Projectile motion lab',
    subject: 'physics',
    description: 'Launch a projectile, scrub through time, and compare two trajectories (no air resistance).',
    href: '#/physics',
    terms: ['projectile', 'trajectory', 'launch', 'gravity', 'parabola', 'range', 'velocity'],
  },
  // Glossary definitions, ranked after explorer content (see searchExplorations).
  ...GLOSSARY.map((g) => ({
    id: `term:${g.id}`,
    name: g.term,
    subject: g.subjects[0],
    description: `Glossary: ${g.definition}`,
    href: `?term=${g.id}#/glossary`,
    terms: [] as string[],
  })),
]

/**
 * Case-insensitive search over names and terms. Unicode subscripts match plain digits ("H₂O" and
 * "h2o"). Results are ranked: exact name, then name prefix, then name contains, then other terms.
 */
const isTerm = (item: SearchItem) => (item.id.startsWith('term:') ? 1 : 0)

export function searchExplorations(query: string, limit = 12): SearchItem[] {
  const q = normalize(query)
  if (!q) return []
  const scored: { item: SearchItem; score: number }[] = []
  for (const item of SEARCH_INDEX) {
    const name = normalize(item.name)
    const formula = item.formula ? normalize(item.formula) : ''
    let score = 0
    if (name === q || formula === q) score = 4
    else if (name.startsWith(q)) score = 3
    else if (name.includes(q) || formula.includes(q)) score = 2
    else if (item.terms.some((t) => normalize(t).includes(q))) score = 1
    if (score) scored.push({ item, score })
  }
  return scored
    // Explorations first, then glossary definitions; within each group by match quality, then name.
    .sort((a, b) => isTerm(a.item) - isTerm(b.item) || b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((s) => s.item)
}
