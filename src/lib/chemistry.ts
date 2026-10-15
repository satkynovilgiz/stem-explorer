import { ELEMENTS } from '../data/chemistry/elements'
import type { Atom, BondOrder, ElementInfo, Molecule } from '../data/chemistry/types'

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

/** Lowercase and turn subscript digits into ASCII so "H₂O" matches "h2o". */
export function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[₀-₉]/g, (d) => String(SUBSCRIPT_DIGITS.indexOf(d)))
    .replace(/\s+/g, ' ')
}

export function searchMolecules(molecules: readonly Molecule[], query: string): Molecule[] {
  const q = normalize(query)
  if (!q) return [...molecules]
  return molecules.filter((m) =>
    [m.name, m.formula, ...m.aliases].some((term) => normalize(term).includes(q)),
  )
}

/** Splits "CO2" into ["CO", "2"]-style chunks for subscript rendering. */
export function formulaParts(formula: string): { text: string; sub: boolean }[] {
  return (formula.match(/\d+|\D+/g) ?? []).map((text) => ({ text, sub: /^\d/.test(text) }))
}

export function formulaLabel(formula: string): string {
  return formula.replace(/\d/g, (d) => SUBSCRIPT_DIGITS[Number(d)])
}

export interface CompositionRow {
  element: ElementInfo
  count: number
}

/** Element counts in the order they appear in the formula. */
export function composition(molecule: Molecule): CompositionRow[] {
  const order = molecule.formula.match(/[A-Z][a-z]?/g) ?? []
  return order.map((symbol) => {
    const element = ELEMENTS[symbol as keyof typeof ELEMENTS]
    return {
      element,
      count: molecule.atoms.filter((a) => a.element === element.symbol).length,
    }
  })
}

/** Atom counts implied by a formula string such as "C2H6O". */
export function formulaCounts(formula: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [, symbol, n] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    counts[symbol] = (counts[symbol] ?? 0) + (n ? Number(n) : 1)
  }
  return counts
}

export function bondedNeighbors(molecule: Molecule, atomId: string): { atom: Atom; order: BondOrder }[] {
  return molecule.bonds.flatMap((b) => {
    const [a, c] = b.atoms
    const otherId = a === atomId ? c : c === atomId ? a : null
    const atom = otherId ? molecule.atoms.find((x) => x.id === otherId) : undefined
    return atom ? [{ atom, order: b.order }] : []
  })
}

export function bondOrderName(order: BondOrder): string {
  switch (order) {
    case 1:
      return 'single'
    case 2:
      return 'double'
    case 3:
      return 'triple'
    case 'aromatic':
      return 'aromatic'
  }
}

/** Centroid of the source coordinates, used only to center the model on screen. */
export function centroid(molecule: Molecule): [number, number, number] {
  const n = molecule.atoms.length
  const c: [number, number, number] = [0, 0, 0]
  for (const { position } of molecule.atoms) for (let i = 0; i < 3; i++) c[i] += position[i] / n
  return c
}
