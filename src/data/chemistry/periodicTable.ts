import { MOLECULES } from './molecules'
import { ELEMENT_ROWS } from './periodicTable.data'
import type { Molecule } from './types'

/** PubChem's GroupBlock categories (the classification used for the category filter). */
export const CATEGORIES = [
  'Alkali metal',
  'Alkaline earth metal',
  'Transition metal',
  'Post-transition metal',
  'Metalloid',
  'Nonmetal',
  'Halogen',
  'Noble gas',
  'Lanthanide',
  'Actinide',
] as const
export type Category = (typeof CATEGORIES)[number]
export type Block = 's' | 'p' | 'd' | 'f'

export interface ElementInfo {
  number: number
  symbol: string
  name: string
  category: Category
  period: number
  /** Group 1–18, or null for the lanthanoid and actinoid rows. */
  group: number | null
  /** 'main' for the 18-column body; the two f rows are drawn separately below it. */
  row: 'main' | 'lanthanoids' | 'actinoids'
  /** Column in the grid (1–18); f-row elements use 3–17 so they sit under the body. */
  column: number
  block: Block
}

const PERIOD_STARTS = [1, 3, 11, 19, 37, 55, 87] as const

export function periodOf(z: number): number {
  let p = 1
  for (let i = 0; i < PERIOD_STARTS.length; i++) if (z >= PERIOD_STARTS[i]) p = i + 1
  return p
}

/**
 * Position from the atomic number, following the common IUPAC-style layout: group 3 of periods 6
 * and 7 holds placeholders, and La–Lu and Ac–Lr are drawn as two separate rows.
 */
export function positionOf(z: number): Pick<ElementInfo, 'period' | 'group' | 'row' | 'column'> {
  const period = periodOf(z)
  if (z >= 57 && z <= 71) return { period, group: null, row: 'lanthanoids', column: 3 + (z - 57) }
  if (z >= 89 && z <= 103) return { period, group: null, row: 'actinoids', column: 3 + (z - 89) }
  let group: number
  const start = PERIOD_STARTS[period - 1]
  const i = z - start
  if (period === 1) group = z === 1 ? 1 : 18
  else if (period <= 3) group = i < 2 ? i + 1 : i + 11
  else if (period <= 5) group = i + 1
  else group = i < 2 ? i + 1 : z - (period === 6 ? 86 : 118) + 18
  return { period, group, row: 'main', column: group }
}

/** Block from position. Helium is s-block (1s²) although it is shown in group 18. */
export function blockOf(z: number): Block {
  const { group, row } = positionOf(z)
  if (row !== 'main') return 'f'
  if (z === 2 || group! <= 2) return 's'
  if (group! <= 12) return 'd'
  return 'p'
}

export const ELEMENTS: readonly ElementInfo[] = ELEMENT_ROWS.map(([number, symbol, name, category]) => ({
  number,
  symbol,
  name,
  category: category as Category,
  ...positionOf(number),
  block: blockOf(number),
}))

export function findElement(key: string | number): ElementInfo | undefined {
  if (typeof key === 'number') return ELEMENTS[key - 1]
  const k = key.trim().toLowerCase()
  return ELEMENTS.find((e) => e.symbol.toLowerCase() === k)
}

/** Matches an atomic number exactly, a symbol exactly (listed first), or the start of a name (case-insensitive). */
export function searchElements(query: string): ElementInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...ELEMENTS]
  if (/^\d+$/.test(q)) return ELEMENTS.filter((e) => e.number === Number(q))
  const bySymbol = ELEMENTS.filter((e) => e.symbol.toLowerCase() === q)
  return [...bySymbol, ...ELEMENTS.filter((e) => !bySymbol.includes(e) && e.name.toLowerCase().startsWith(q))]
}

/** Molecules in the app that contain the element (by symbol). */
export function moleculesWith(symbol: string): Molecule[] {
  return MOLECULES.filter((m) => m.atoms.some((a) => a.element === symbol))
}

export const BLOCK_NOTES: Record<Block, string> = {
  s: 's block: groups 1–2, plus helium',
  p: 'p block: groups 13–18 (except helium)',
  d: 'd block: groups 3–12',
  f: 'f block: the lanthanoid and actinoid rows (La–Lu, Ac–Lr)',
}
