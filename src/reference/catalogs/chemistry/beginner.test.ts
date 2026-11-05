import { describe, expect, it } from 'vitest'
import { MOLECULES } from '../../../data/chemistry/molecules'
import { solveDilution, solveMolarity } from '../../../chem/solutions'
import { checkBalance, molarMass, parseFormula, sideCounts } from '../../../chem/stoichiometry'
import { BASICS } from './basics'

/*
 * The numbers in the five beginner explanations, recalculated by the app's own chemistry functions
 * rather than copied from the text. This shows the arithmetic agrees with itself. It does not show
 * that the science is right: that rests on the sources listed in docs/content-audit.md.
 */

const WEIGHTS = { H: 1.008, O: 15.999, C: 12.011 }
const NA = 6.02214076e23
const entry = (id: string) => BASICS.find((e) => e.id === id)!
const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }) => {
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

describe('the mole', () => {
  const M = molarMass('H2O', WEIGHTS)
  const moles = 5 / M

  it('5 g of water is about 0.278 mol: less than one mole, not more', () => {
    expect(M).toBeCloseTo(18.015, 3)
    expect(moles).toBeCloseTo(0.2775, 3)
    expect(moles).toBeLessThan(1)
  })

  it('that amount is about 1.7 × 10²³ molecules, as the explanation says', () => {
    expect((moles * NA) / 1e23).toBeCloseTo(1.67, 2)
    expect(entry('the-mole').simple).toContain('1.7 × 10²³')
  })

  it('counts atoms per molecule as the common mistake says: 2 H and 3 atoms in total', () => {
    const c = parseFormula('H2O')
    expect(c.H).toBe(2)
    expect(c.H + c.O).toBe(3)
  })
})

describe('molarity', () => {
  it('0.250 mol in 500 mL (0.500 L) is 0.500 mol/L, and dividing by 500 instead gives the 0.0005 of the mistake', () => {
    expect(ok(solveMolarity({ solveFor: 'molarity', amount: 0.25, volume: 0.5, molarity: 0 })).molarity).toBeCloseTo(0.5, 10)
    expect(0.25 / 500).toBeCloseTo(0.0005, 10)
  })

  it('250 mL of 0.100 M holds 0.0250 mol', () => {
    expect(ok(solveMolarity({ solveFor: 'amount', amount: 0, volume: 0.25, molarity: 0.1 })).amount).toBeCloseTo(0.025, 10)
  })

  it('a zero volume is refused rather than dividing by zero', () => {
    expect(solveMolarity({ solveFor: 'molarity', amount: 1, volume: 0, molarity: 0 }).ok).toBe(false)
  })
})

describe('dilution', () => {
  it('250 mL of 0.100 M from 2.00 M stock takes 12.5 mL, in about 237.5 mL of water', () => {
    const r = ok(solveDilution({ solveFor: 'v1', c1: 2, v1: 0, c2: 0.1, v2: 0.25 }))
    expect(r.v1 * 1000).toBeCloseTo(12.5, 8)
    expect(250 - r.v1 * 1000).toBeCloseTo(237.5, 8)
  })

  it('keeps the moles of solute the same before and after', () => {
    const r = ok(solveDilution({ solveFor: 'v1', c1: 2, v1: 0, c2: 0.1, v2: 0.25 }))
    expect(r.c1 * r.v1).toBeCloseTo(r.c2 * r.v2, 10)
  })

  it('refuses a "dilution" that would raise the concentration', () => {
    expect(solveDilution({ solveFor: 'v1', c1: 0.1, v1: 0, c2: 2, v2: 0.25 }).ok).toBe(false)
  })
})

describe('balancing equations', () => {
  const species = (formula: string) => ({ formula, name: formula })
  const eq = { reactants: [species('CH4'), species('O2')], products: [species('CO2'), species('H2O')] }

  it('CH₄ + 2 O₂ → CO₂ + 2 H₂O has equal atoms of every element', () => {
    expect(sideCounts(eq.reactants, [1, 2])).toEqual(sideCounts(eq.products, [1, 2]))
    expect(sideCounts(eq.reactants, [1, 2])).toEqual({ C: 1, H: 4, O: 4 })
    expect(checkBalance(eq, [1, 2], [1, 2]).balanced).toBe(true)
  })

  it('the unbalanced form does not balance', () => {
    expect(checkBalance(eq, [1, 1], [1, 1]).balanced).toBe(false)
  })

  it('changing a subscript (H₂O → H₂O₂) gives a different substance with different counts', () => {
    expect(parseFormula('H2O2')).not.toEqual(parseFormula('H2O'))
  })
})

describe('water’s bent shape', () => {
  const water = MOLECULES.find((m) => m.id === 'water')!
  const at = (id: string) => water.atoms.find((a) => a.id === id)!.position
  const sub = (a: readonly number[], b: readonly number[]) => a.map((x, i) => x - b[i])
  const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0)
  const u = sub(at('H1'), at('O1'))
  const v = sub(at('H2'), at('O1'))
  const angle = (Math.acos(dot(u, v) / Math.sqrt(dot(u, u) * dot(v, v))) * 180) / Math.PI

  it('the model’s coordinates give the reported bond length and an angle of about 104.5°, not 180° or 109.5°', () => {
    expect(angle).toBeCloseTo(104.48, 1)
    expect(Math.sqrt(dot(u, u))).toBeCloseTo(0.958, 2)
    expect(water.parameters.find((p) => p.label === 'H–O–H angle')!.value).toBeCloseTo(angle, 1)
    expect(Math.abs(angle - 109.5)).toBeGreaterThan(4)
  })

  it('is labelled experimental, as its coordinates come from NIST CCCBDB', () => {
    expect(water.coordinates.kind).toBe('experimental')
  })
})

describe('structure labels', () => {
  it('every molecule is labelled by the kind of its source: experimental with CCCBDB, computed with PubChem3D', () => {
    for (const m of MOLECULES) expect(m.coordinates.sourceId).toBe(m.coordinates.kind === 'computed' ? 'pubchem3d' : 'cccbdb')
  })
})
