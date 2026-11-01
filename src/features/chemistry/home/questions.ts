import type { ChemItem } from './chemIndex'

/**
 * Questions students actually ask, each linked to the place that answers it. A question is shown
 * only when its answer exists: the explanation when there is one, otherwise the working tool.
 */
export interface ChemQuestion {
  question: string
  /** Preferred destinations, best first (item ids). */
  targets: string[]
  available: (items: readonly ChemItem[]) => boolean
  href: (items: readonly ChemItem[]) => string
}

const q = (question: string, targets: string[]): ChemQuestion => ({
  question,
  targets,
  available: (items) => targets.some((t) => items.some((i) => i.id === t)),
  href: (items) => targets.map((t) => items.find((i) => i.id === t)).find(Boolean)!.href,
})

export const CHEM_QUESTIONS: readonly ChemQuestion[] = [
  q('How do I calculate molarity?', ['ref:molarity', 'calc:molarity']),
  q('How do I balance an equation?', ['ref:balancing-equations', 'calc:balance']),
  q('Why is water bent?', ['ref:water', 'molecule:water']),
  q('What is a mole?', ['ref:the-mole']),
  q('How do I calculate a dilution?', ['ref:dilution', 'calc:dilution']),
]
