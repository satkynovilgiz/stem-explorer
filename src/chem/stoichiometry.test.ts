import { describe, expect, it } from 'vitest'
import { REACTIONS, WEIGHTS, findReaction } from '../data/chemistry/reactions'
import { SOURCES } from '../data/sources'
import { checkBalance, chargeText, formatSig, limitingReactant, molarMass, moleRatio, parseFormula, percentYield } from './stoichiometry'

const split = (r: (typeof REACTIONS)[number], c: readonly number[]) => [c.slice(0, r.equation.reactants.length), c.slice(r.equation.reactants.length)] as const

describe('formula parsing', () => {
  it('counts atoms including parentheses and two-letter symbols', () => {
    expect(parseFormula('H2O')).toEqual({ H: 2, O: 1 })
    expect(parseFormula('Ca(NO3)2')).toEqual({ Ca: 1, N: 2, O: 6 })
    expect(parseFormula('Mg(OH)2')).toEqual({ Mg: 1, O: 2, H: 2 })
    expect(parseFormula('C8H18')).toEqual({ C: 8, H: 18 })
    expect(parseFormula('NaCl')).toEqual({ Na: 1, Cl: 1 })
  })
  it('rejects malformed formulas', () => {
    for (const bad of ['', 'h2o', 'H2O)', '(H2O', 'H0', '2H2']) expect(() => parseFormula(bad), bad).toThrow()
  })
})

describe('balance checks', () => {
  const water = findReaction('water-decomposition')!
  it('reports an unbalanced equation element by element', () => {
    const r = checkBalance(water.equation, [1], [1, 1])
    expect(r.balanced).toBe(false)
    expect(r.elements).toEqual([
      { element: 'H', left: 2, right: 2, balanced: true },
      { element: 'O', left: 1, right: 2, balanced: false },
    ])
  })
  it('accepts the balanced equation, and flags multiples as not in lowest terms', () => {
    expect(checkBalance(water.equation, [2], [2, 1])).toMatchObject({ balanced: true, lowestTerms: true })
    expect(checkBalance(water.equation, [4], [4, 2])).toMatchObject({ balanced: true, lowestTerms: false })
  })
  it('rejects zero, negative and fractional coefficients', () => {
    for (const c of [0, -1, 1.5, Number.NaN]) expect(checkBalance(water.equation, [c], [2, 1])).toMatchObject({ valid: false, balanced: false })
  })
  it('checks charge in ionic equations', () => {
    const net = findReaction('silver-chloride-precipitation')!.ionic!.net
    expect(checkBalance(net.equation, [1, 1], [1])).toMatchObject({ balanced: true, charge: { left: 0, right: 0, balanced: true } })
    const co2 = findReaction('carbon-dioxide-hydroxide')!.ionic!.net
    // With one OH⁻ the O and H counts and the charge are all off.
    expect(checkBalance(co2.equation, [1, 1], [1, 1])).toMatchObject({ balanced: false, charge: { left: -1, right: -2, balanced: false } })
    expect(checkBalance(co2.equation, [1, 2], [1, 1]).balanced).toBe(true)
  })
})

describe('the reaction library', () => {
  it('every equation, complete ionic and net ionic form conserves atoms and charge in lowest terms', () => {
    for (const r of REACTIONS) {
      const [a, b] = split(r, r.balanced)
      expect(checkBalance(r.equation, a, b), r.id).toMatchObject({ balanced: true, lowestTerms: true })
      for (const form of r.ionic ? [r.ionic.complete, r.ionic.net] : []) {
        const n = form.equation.reactants.length
        expect(checkBalance(form.equation, form.coefficients.slice(0, n), form.coefficients.slice(n)), `${r.id} ionic`).toMatchObject({ balanced: true })
      }
      expect(SOURCES[r.source], r.id).toBeTruthy()
    }
  })

  it('covers synthesis, decomposition, combustion, precipitation and acid–base examples, with molecular vs net ionic where given', () => {
    const types = new Set(REACTIONS.map((r) => r.type))
    for (const t of ['synthesis', 'decomposition', 'combustion', 'precipitation', 'acid-base']) expect(types.has(t as never), t).toBe(true)
    expect(REACTIONS.filter((r) => r.ionic).map((r) => r.id)).toEqual(['silver-chloride-precipitation', 'carbon-dioxide-hydroxide'])
  })

  it('balancing steps start from all 1s, change one coefficient (or scale all), and end balanced', () => {
    for (const r of REACTIONS) {
      expect(r.steps[0].coefficients.every((c) => c === 1), r.id).toBe(true)
      expect(r.steps.at(-1)!.coefficients, r.id).toEqual(r.balanced)
      for (let i = 1; i < r.steps.length; i++) {
        const prev = r.steps[i - 1].coefficients
        const cur = r.steps[i].coefficients
        const changed = cur.filter((c, k) => c !== prev[k]).length
        const scaled = cur.every((c, k) => c % prev[k] === 0)
        expect(changed === 1 || changed === 2 || scaled, `${r.id} step ${i}`).toBe(true)
      }
    }
  })
})

describe('molar mass (CIAAW 2024 abridged weights)', () => {
  it('matches hand sums', () => {
    expect(molarMass('H2O', WEIGHTS)).toBeCloseTo(2 * 1.008 + 15.999, 10)
    expect(molarMass('H2O', WEIGHTS).toFixed(2)).toBe('18.02')
    expect(molarMass('NH3', WEIGHTS).toFixed(2)).toBe('17.03')
    expect(molarMass('AgCl', WEIGHTS).toFixed(2)).toBe('143.32')
    expect(molarMass('CaCl2', WEIGHTS).toFixed(2)).toBe('110.98')
    expect(molarMass('C8H18', WEIGHTS).toFixed(2)).toBe('114.23')
  })
  it('every species in the library has the weights it needs', () => {
    for (const r of REACTIONS) for (const s of [...r.equation.reactants, ...r.equation.products]) expect(molarMass(s.formula, WEIGHTS), s.formula).toBeGreaterThan(0)
  })
})

describe('mole ratios, limiting reactant and yield', () => {
  it('converts moles through the coefficients', () => {
    expect(moleRatio(3, 3, 2)).toBe(2) // 3 mol H₂ → 2 mol NH₃
    expect(moleRatio(0, 1, 2)).toBe(0)
    expect(moleRatio(-1, 1, 2)).toBeNaN()
    expect(moleRatio(1, 0, 2)).toBeNaN()
  })

  it('finds the limiting reactant, theoretical products and leftovers', () => {
    // H₂ + Cl₂ → 2 HCl with 3 mol H₂ and 2 mol Cl₂: Cl₂ limits, 4 mol HCl, 1 mol H₂ left.
    expect(limitingReactant([1, 1], [2], [3, 2])).toEqual({ limiting: [1], extent: 2, products: [4], leftover: [1, 0] })
    // N₂ + 3 H₂ → 2 NH₃ with 1 mol N₂ and 2 mol H₂: H₂ limits (2/3 < 1).
    const r = limitingReactant([1, 3], [2], [1, 2])!
    expect(r.limiting).toEqual([1])
    expect(r.products[0]).toBeCloseTo(4 / 3, 12)
    expect(r.leftover[0]).toBeCloseTo(1 / 3, 12)
  })

  it('handles the boundary cases: exact stoichiometric amounts, zero, and invalid input', () => {
    expect(limitingReactant([1, 3], [2], [1, 3])!.limiting).toEqual([0, 1])
    // Floating-point amounts that are stoichiometric up to rounding still name both.
    expect(limitingReactant([1, 3], [2], [0.1, 0.30000000000000004])!.limiting).toEqual([0, 1])
    expect(limitingReactant([1, 1], [2], [0, 5])).toEqual({ limiting: [0], extent: 0, products: [0], leftover: [0, 5] })
    expect(limitingReactant([1, 1], [2], [-1, 5])).toBeNull()
    expect(limitingReactant([1, 1], [2], [Number.POSITIVE_INFINITY, 5])).toBeNull()
    expect(limitingReactant([1, 1], [2], [1])).toBeNull()
  })

  it('percent yield is actual over theoretical, and undefined for a zero theoretical yield', () => {
    expect(percentYield(3, 4)).toBe(75)
    expect(percentYield(0, 4)).toBe(0)
    expect(percentYield(1, 0)).toBeNull()
    expect(percentYield(-1, 4)).toBeNull()
    // Above 100 % is reported, not clipped: it signals a measurement or purity problem.
    expect(percentYield(5, 4)).toBe(125)
  })
})

describe('rounding and formatting', () => {
  it('rounds to significant figures', () => {
    expect(formatSig(18.01528)).toBe('18.0')
    expect(formatSig(0.0123456)).toBe('0.0123')
    expect(formatSig(1234.5)).toBe('1235')
    expect(formatSig(4 / 3)).toBe('1.33')
    expect(formatSig(0)).toBe('0')
    expect(formatSig(2.5e-7)).toBe('2.50 × 10⁻⁷')
    expect(formatSig(Number.NaN)).toBe('—')
  })
  it('writes charges as superscripts', () => {
    expect(chargeText(1)).toBe('⁺')
    expect(chargeText(-2)).toBe('²⁻')
    expect(chargeText(0)).toBe('')
  })
})
