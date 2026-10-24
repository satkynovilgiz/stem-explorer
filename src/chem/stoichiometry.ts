/*
 * Reaction arithmetic: formula parsing, atom and charge balance, molar mass, mole ratios,
 * limiting reactant and yields. Pure functions with no content or UI; unit tested.
 */

export type Counts = Record<string, number>

export type PhysicalState = 's' | 'l' | 'g' | 'aq'

export interface Species {
  /** Formula with element symbols, digits and parentheses, e.g. "Ca(NO3)2". No charge here. */
  formula: string
  /** Ionic charge (e.g. +1 for Ag⁺, −2 for CO₃²⁻); 0 or omitted for neutral species. */
  charge?: number
  state?: PhysicalState
  name: string
}

export interface Equation {
  reactants: readonly Species[]
  products: readonly Species[]
}

/** Parses a formula into element counts. Throws on anything it does not understand. */
export function parseFormula(formula: string): Counts {
  let i = 0
  const number = () => {
    const m = /^\d+/.exec(formula.slice(i))
    if (!m) return 1
    i += m[0].length
    const n = Number(m[0])
    if (n < 1) throw new Error(`Invalid count in ${formula}`)
    return n
  }
  const group = (): Counts => {
    const counts: Counts = {}
    const add = (c: Counts, k: number) => {
      for (const [el, n] of Object.entries(c)) counts[el] = (counts[el] ?? 0) + n * k
    }
    while (i < formula.length && formula[i] !== ')') {
      if (formula[i] === '(') {
        i++
        const inner = group()
        if (formula[i] !== ')') throw new Error(`Unclosed parenthesis in ${formula}`)
        i++
        add(inner, number())
        continue
      }
      const m = /^[A-Z][a-z]?/.exec(formula.slice(i))
      if (!m) throw new Error(`Unexpected "${formula[i]}" in ${formula}`)
      i += m[0].length
      add({ [m[0]]: 1 }, number())
    }
    return counts
  }
  const counts = group()
  if (i !== formula.length || Object.keys(counts).length === 0) throw new Error(`Invalid formula ${formula}`)
  return counts
}

/** Coefficients must be whole numbers from 1 upward. */
export const isValidCoefficient = (n: number) => Number.isInteger(n) && n >= 1

/** Total atoms of each element on one side for the given coefficients. */
export function sideCounts(species: readonly Species[], coefficients: readonly number[]): Counts {
  const out: Counts = {}
  species.forEach((s, k) => {
    for (const [el, n] of Object.entries(parseFormula(s.formula))) out[el] = (out[el] ?? 0) + n * coefficients[k]
  })
  return out
}

export const sideCharge = (species: readonly Species[], coefficients: readonly number[]) => species.reduce((q, s, k) => q + (s.charge ?? 0) * coefficients[k], 0)

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

export interface BalanceReport {
  elements: { element: string; left: number; right: number; balanced: boolean }[]
  charge: { left: number; right: number; balanced: boolean }
  /** Every coefficient is a whole number ≥ 1. */
  valid: boolean
  /** Atoms (and charge) are conserved. */
  balanced: boolean
  /** The coefficients share no common factor (the usual convention). */
  lowestTerms: boolean
}

/** Element counts in order of first appearance, compared side by side, plus charge. */
export function checkBalance(eq: Equation, reactantCoefficients: readonly number[], productCoefficients: readonly number[]): BalanceReport {
  const all = [...reactantCoefficients, ...productCoefficients]
  const valid = all.length === eq.reactants.length + eq.products.length && all.every(isValidCoefficient)
  const left = valid ? sideCounts(eq.reactants, reactantCoefficients) : {}
  const right = valid ? sideCounts(eq.products, productCoefficients) : {}
  const order: string[] = []
  for (const s of [...eq.reactants, ...eq.products]) for (const el of Object.keys(parseFormula(s.formula))) if (!order.includes(el)) order.push(el)
  const elements = order.map((element) => ({ element, left: left[element] ?? 0, right: right[element] ?? 0, balanced: (left[element] ?? 0) === (right[element] ?? 0) }))
  const ql = valid ? sideCharge(eq.reactants, reactantCoefficients) : 0
  const qr = valid ? sideCharge(eq.products, productCoefficients) : 0
  const balanced = valid && elements.every((e) => e.balanced) && ql === qr
  return {
    elements,
    charge: { left: ql, right: qr, balanced: ql === qr },
    valid,
    balanced,
    lowestTerms: valid && all.reduce(gcd) === 1,
  }
}

/** Molar mass in g/mol from atomic weights (g/mol per element symbol). Throws for a missing element. */
export function molarMass(formula: string, weights: Readonly<Record<string, number>>): number {
  let m = 0
  for (const [el, n] of Object.entries(parseFormula(formula))) {
    const w = weights[el]
    if (w === undefined) throw new Error(`No atomic weight for ${el}`)
    m += w * n
  }
  return m
}

/** A finite, non-negative amount; anything else is rejected rather than coerced. */
export const isValidAmount = (x: number) => Number.isFinite(x) && x >= 0

/** Moles of `to` that correspond to `moles` of `from`, using the coefficients (ν_to / ν_from). */
export function moleRatio(moles: number, fromCoefficient: number, toCoefficient: number): number {
  if (!isValidAmount(moles) || !isValidCoefficient(fromCoefficient) || !isValidCoefficient(toCoefficient)) return NaN
  return (moles * toCoefficient) / fromCoefficient
}

export interface LimitingResult {
  /** Indexes of the reactant(s) that run out first; several when amounts are exactly stoichiometric. */
  limiting: number[]
  /** Reaction extent ξ (mol): how many "times" the equation as written proceeds. */
  extent: number
  /** Theoretical moles of each product. */
  products: number[]
  /** Moles of each reactant left over (0 for the limiting reactant). */
  leftover: number[]
}

/**
 * Limiting reactant for given reactant amounts (mol). The extent is the smallest nᵢ/νᵢ; every
 * product forms νⱼ·ξ. Ratios within a relative 1e-9 of the minimum count as limiting too, so an
 * exactly stoichiometric mixture names all reactants. Returns null for invalid input.
 */
export function limitingReactant(reactantCoefficients: readonly number[], productCoefficients: readonly number[], moles: readonly number[]): LimitingResult | null {
  if (moles.length !== reactantCoefficients.length || !moles.every(isValidAmount)) return null
  if (![...reactantCoefficients, ...productCoefficients].every(isValidCoefficient)) return null
  const ratios = moles.map((n, i) => n / reactantCoefficients[i])
  const extent = Math.min(...ratios)
  const tol = Math.max(1e-300, Math.abs(extent) * 1e-9)
  const limiting = ratios.flatMap((r, i) => (r - extent <= tol ? [i] : []))
  return {
    limiting,
    extent,
    products: productCoefficients.map((v) => v * extent),
    // Rounding residue on the limiting reactant is reported as exactly zero.
    leftover: moles.map((n, i) => (limiting.includes(i) ? 0 : Math.max(0, n - reactantCoefficients[i] * extent))),
  }
}

/** Percent yield = actual / theoretical × 100. Null when the theoretical yield is zero or input is invalid. */
export function percentYield(actual: number, theoretical: number): number | null {
  if (!isValidAmount(actual) || !isValidAmount(theoretical) || theoretical === 0) return null
  return (actual / theoretical) * 100
}

/** Rounds to `sig` significant figures and formats without exponent for everyday magnitudes. */
export function formatSig(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const abs = Math.abs(x)
  if (abs >= 1e6 || abs < 1e-4) {
    const [m, e] = x.toExponential(sig - 1).split('e')
    return `${m} × 10${superscript(Number(e))}`
  }
  const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(abs)))
  return Number(x.toFixed(digits)).toFixed(digits)
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const superscript = (n: number) => String(n).replace(/[-0-9]/g, (c) => SUP[c])

/** "2+" / "−" style charge text (Unicode superscripts). */
export function chargeText(charge: number | undefined): string {
  if (!charge) return ''
  const n = Math.abs(charge)
  return `${n === 1 ? '' : superscript(n)}${charge > 0 ? '⁺' : '⁻'}`
}
