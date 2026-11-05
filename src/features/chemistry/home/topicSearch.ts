import { normalize } from '../../../lib/chemistry'
import { contentWords, squash, words } from '../../../lib/queryMatch'
import { learnHref } from '../../reference/route'
import type { ChemItem } from './chemIndex'

/*
 * Topic-based Chemistry search. The five beginner journeys are topics: one result each, with
 * distinct actions (read the explanation, see the worked example, use the calculator, explore the
 * model) instead of near-duplicate cards. Everything else is a single item.
 *
 * Matching is deterministic and word-based: words are compared whole after removing plural
 * endings, so "mole"/"moles" match each other but never "molecule"; question words ("what", "how",
 * "do", "I") are ignored; a phrase from a topic's list ("how much water") found in the query scores
 * by its length; formulas and element symbols match exactly (H2O = H₂O).
 */

export type ActionKind = 'read' | 'example' | 'calculate' | 'explore'
export const ACTION_TEXT: Record<ActionKind, string> = { read: 'Read explanation', example: 'See worked example', calculate: 'Use calculator', explore: 'Explore model' }

export interface ChemTopic {
  id: string
  title: string
  sentence: string
  /** Items folded into this topic (they are not listed separately). */
  members: string[]
  actions: { kind: ActionKind; href: string }[]
  /** Words and phrases students use for this topic. */
  terms: string[]
  /** Exact identifiers (formulas). */
  ids?: string[]
}

export const TOPICS: readonly ChemTopic[] = [
  {
    id: 'topic:mole',
    title: 'The mole',
    sentence: 'Chemistry’s counting unit: one mole is 6.022 × 10²³ particles.',
    members: ['ref:the-mole', 'calc:stoichiometry'],
    actions: [
      { kind: 'read', href: learnHref('the-mole') },
      { kind: 'example', href: learnHref('the-mole', 'example') },
      { kind: 'calculate', href: '?csec=tools&calc=molar-mass&cv=formula:H2O,mass:5#/chemistry' },
    ],
    terms: ['mole', 'moles', 'mol', 'what is a mole', 'avogadro', 'avogadro number', 'avogadro constant', 'amount of substance', 'mole ratio', 'stoichiometry'],
  },
  {
    id: 'topic:molarity',
    title: 'Molarity',
    sentence: 'How much solute is in one litre of solution, in mol/L.',
    members: ['ref:molarity', 'calc:molarity'],
    actions: [
      { kind: 'read', href: learnHref('molarity') },
      { kind: 'example', href: learnHref('molarity', 'example') },
      { kind: 'calculate', href: '?csec=solutions&st=molarity#/chemistry' },
    ],
    terms: ['molarity', 'concentration', 'molar concentration', 'mol/l', 'mol per litre', 'calculate molarity', 'solute', 'solution'],
    ids: ['M = n/V'],
  },
  {
    id: 'topic:dilution',
    title: 'Dilution',
    sentence: 'Adding solvent lowers the concentration; the moles of solute stay the same.',
    members: ['ref:dilution', 'calc:dilution'],
    actions: [
      { kind: 'read', href: learnHref('dilution') },
      { kind: 'example', href: learnHref('dilution', 'example') },
      { kind: 'calculate', href: '?csec=solutions&st=dilution#/chemistry' },
    ],
    terms: ['dilution', 'dilute', 'diluting', 'dilute a solution', 'stock solution', 'how much water', 'add water', 'water to add', 'lower the concentration', 'make a solution weaker'],
    ids: ['C1V1 = C2V2', 'M1V1 = M2V2'],
  },
  {
    id: 'topic:balancing',
    title: 'Balancing chemical equations',
    sentence: 'Choose coefficients so every element has the same number of atoms on both sides.',
    members: ['ref:balancing-equations', 'calc:balance'],
    actions: [
      { kind: 'read', href: learnHref('balancing-equations') },
      { kind: 'example', href: learnHref('balancing-equations', 'example') },
      { kind: 'calculate', href: '?csec=reactions&rx=methane-combustion#/chemistry' },
    ],
    terms: ['balance', 'balancing', 'balance an equation', 'chemical equation', 'equation', 'coefficient', 'coefficients', 'conservation of mass'],
  },
  {
    id: 'topic:water',
    title: 'Why is water bent?',
    sentence: 'Two bonds and two lone pairs on oxygen give water its bent shape (about 104.5°).',
    members: ['ref:water', 'molecule:water'],
    actions: [
      { kind: 'read', href: learnHref('water') },
      { kind: 'example', href: learnHref('water', 'example') },
      { kind: 'explore', href: '?molecule=water&view=ball-and-stick&mtool=angle#/chemistry' },
    ],
    terms: ['water', 'why is water bent', 'bent', 'water shape', 'water molecule', 'lone pair', 'polar'],
    ids: ['H2O'],
  },
]

/** Score of one candidate for a query (0 = no match). */
function score(c: { title: string; terms: readonly string[]; ids?: readonly string[] }, q: string): number {
  const nq = normalize(q.trim())
  const sq = squash(q)
  if (!nq) return 0
  // Exact identifiers (formulas, symbols) and exact titles first.
  if ((c.ids ?? []).some((id) => squash(id) === sq)) return 100
  if (normalize(c.title) === nq || normalize(c.title).replace(/\s*\(.*\)$/, '') === nq) return 90
  const qWords = contentWords(q)
  if (qWords.length === 0) return 0
  const qSet = new Set(qWords)
  let best = 0
  for (const text of [c.title, ...c.terms]) {
    const t = contentWords(text)
    if (t.length === 0) continue
    // A whole term phrase found in the query, word for word: longer phrases are more specific.
    const all = words(text)
    const phrase = ` ${words(q).join(' ')} `.includes(` ${all.join(' ')} `)
    if (phrase) best = Math.max(best, 40 + 5 * all.length)
    // Otherwise, how much of the query this text covers (whole stemmed words only).
    const covered = t.filter((w) => qSet.has(w)).length
    if (covered) best = Math.max(best, (20 * covered) / Math.max(qWords.length, t.length) + (text === c.title ? 5 : 0))
  }
  return best
}

export type SearchResult = { kind: 'topic'; topic: ChemTopic; score: number } | { kind: 'item'; item: ChemItem; score: number }

/** Topics and remaining items for a query, best first (deterministic: ties break by title). */
export function searchTopics(items: readonly ChemItem[], query: string): SearchResult[] {
  const folded = new Set(TOPICS.flatMap((t) => t.members))
  const out: SearchResult[] = []
  for (const topic of TOPICS) {
    const s = score(topic, query)
    if (s > 0) out.push({ kind: 'topic', topic, score: s + 2 })
  }
  for (const item of items) {
    if (folded.has(item.id)) continue
    const s = score({ title: item.title, terms: item.terms, ids: item.ids }, query)
    // Elements rank after everything else that matches equally well.
    if (s > 0) out.push({ kind: 'item', item, score: s - (item.id.startsWith('element:') ? 1 : 0) })
  }
  const title = (r: SearchResult) => (r.kind === 'topic' ? r.topic.title : r.item.title)
  return out.sort((a, b) => b.score - a.score || title(a).localeCompare(title(b)))
}

export const resultId = (r: SearchResult) => (r.kind === 'topic' ? r.topic.id : r.item.id)
