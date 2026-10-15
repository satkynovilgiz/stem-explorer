import { ELEMENTS } from '../data/chemistry/elements'
import type { Atom, ElementInfo, Molecule } from '../data/chemistry/types'

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

export function bondedNeighbors(molecule: Molecule, atomId: string): { atom: Atom; order: number }[] {
  return molecule.bonds.flatMap((b) => {
    const [a, c] = b.atoms
    const otherId = a === atomId ? c : c === atomId ? a : null
    const atom = otherId ? molecule.atoms.find((x) => x.id === otherId) : undefined
    return atom ? [{ atom, order: b.order }] : []
  })
}

export function bondOrderName(order: number): string {
  return order === 1 ? 'single' : order === 2 ? 'double' : 'triple'
}
