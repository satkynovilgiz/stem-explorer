import { describe, expect, it } from 'vitest'
import { convertVolume, fromLitres, sig, solveDilution, solveMolarity, toLitres, toMol } from './solutions'

const ok = <T,>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason)
  return r.value
}

describe('volume and amount units', () => {
  it('converts between L, mL, dm³ and cm³', () => {
    expect(toLitres(355, 'mL')).toBeCloseTo(0.355, 15)
    expect(toLitres(2, 'dm3')).toBe(2)
    expect(toLitres(250, 'cm3')).toBeCloseTo(0.25, 15)
    expect(fromLitres(0.041, 'mL')).toBeCloseTo(41, 12)
    expect(convertVolume(1, 'L', 'cm3')).toBeCloseTo(1000, 12)
    expect(convertVolume(500, 'cm3', 'mL')).toBeCloseTo(500, 12)
    expect(toMol(250, 'mmol')).toBeCloseTo(0.25, 15)
  })
})

describe('molarity (OpenStax Chemistry 2e §3.3 worked examples)', () => {
  it('Example 3.14: 0.133 mol in 355 mL of solution is 0.375 M', () => {
    expect(sig(ok(solveMolarity({ solveFor: 'molarity', amount: 0.133, volume: toLitres(355, 'mL'), molarity: 0 })).molarity)).toBe('0.375')
  })
  it('check exercise: 0.01 mol in 200 mL is 0.05 M', () => {
    expect(ok(solveMolarity({ solveFor: 'molarity', amount: 0.01, volume: 0.2, molarity: 0 })).molarity).toBeCloseTo(0.05, 12)
  })
  it('solves for amount and for volume (Example 3.18 in moles: 1.259 mol at 0.839 M needs 1.50 L)', () => {
    expect(ok(solveMolarity({ solveFor: 'amount', amount: 0, volume: 0.25, molarity: 5.3 })).amount).toBeCloseTo(1.325, 12)
    expect(sig(ok(solveMolarity({ solveFor: 'volume', amount: 75.6 / 60.052, volume: 0, molarity: 0.839 })).volume)).toBe('1.5')
  })
  it('rejects zero, negative and impossible requests with a reason', () => {
    const r = solveMolarity({ solveFor: 'molarity', amount: 0.1, volume: 0, molarity: 0 })
    expect(r).toMatchObject({ ok: false })
    expect(!r.ok && r.reason).toMatch(/volume of solution must be greater than zero/)
    expect(solveMolarity({ solveFor: 'molarity', amount: -1, volume: 1, molarity: 0 })).toMatchObject({ ok: false, reason: expect.stringMatching(/can't be negative/) })
    expect(solveMolarity({ solveFor: 'molarity', amount: 50, volume: 0.1, molarity: 0 })).toMatchObject({ ok: false, reason: expect.stringMatching(/above the 20 M limit/) })
    // The value being solved for is ignored, even if it is invalid.
    expect(solveMolarity({ solveFor: 'molarity', amount: 1, volume: 2, molarity: Number.NaN }).ok).toBe(true)
  })
})

describe('dilution C₁V₁ = C₂V₂ (OpenStax Chemistry 2e §3.3 worked examples)', () => {
  it('Example 3.19: 0.850 L of 5.00 M diluted to 1.80 L gives 2.36 M', () => {
    const r = ok(solveDilution({ solveFor: 'c2', c1: 5.0, v1: 0.85, c2: 0, v2: 1.8 }))
    expect(sig(r.c2)).toBe('2.36')
    expect(r.amount).toBeCloseTo(4.25, 12)
  })
  it('check exercise: 25.0 mL of 2.04 M diluted to 500.0 mL gives 0.102 M', () => {
    expect(sig(ok(solveDilution({ solveFor: 'c2', c1: 2.04, v1: 0.025, c2: 0, v2: 0.5 })).c2)).toBe('0.102')
  })
  it('Example 3.20: 11 mL of 0.45 M diluted to 0.12 M has a final volume of 0.041 L', () => {
    expect(sig(ok(solveDilution({ solveFor: 'v2', c1: 0.45, v1: 0.011, c2: 0.12, v2: 0 })).v2, 2)).toBe('0.041')
  })
  it('Example 3.21: 5.00 L of 0.100 M from 1.59 M stock needs 0.314 L of stock', () => {
    expect(sig(ok(solveDilution({ solveFor: 'v1', c1: 1.59, v1: 0, c2: 0.1, v2: 5 })).v1)).toBe('0.314')
  })
  it('C₁V₁ equals C₂V₂ for every solve-for choice, and the dilution factor matches', () => {
    for (const solveFor of ['c1', 'v1', 'c2', 'v2'] as const) {
      const r = ok(solveDilution({ solveFor, c1: 2, v1: 0.1, c2: 0.5, v2: 0.4 }))
      expect(r.c1 * r.v1).toBeCloseTo(r.c2 * r.v2, 12)
      expect(r.factor).toBeCloseTo(r.c1 / r.c2, 12)
    }
  })
  it('a final volume equal to the stock volume means no dilution', () => {
    expect(ok(solveDilution({ solveFor: 'c2', c1: 1, v1: 0.2, c2: 0, v2: 0.2 })).c2).toBe(1)
  })
  it('refuses requests no dilution can satisfy, with an explanation', () => {
    expect(solveDilution({ solveFor: 'v2', c1: 0.5, v1: 0.1, c2: 1, v2: 0 })).toMatchObject({ ok: false, reason: expect.stringMatching(/only lower the concentration/) })
    expect(solveDilution({ solveFor: 'c2', c1: 1, v1: 0.5, c2: 0, v2: 0.2 })).toMatchObject({ ok: false })
    expect(solveDilution({ solveFor: 'c1', c1: 0, v1: 0.5, c2: 1, v2: 0.2 })).toMatchObject({ ok: false, reason: expect.stringMatching(/more concentrated than the stock/) })
    expect(solveDilution({ solveFor: 'c2', c1: 1, v1: 0, c2: 0, v2: 1 })).toMatchObject({ ok: false, reason: expect.stringMatching(/must be greater than zero/) })
  })
})
