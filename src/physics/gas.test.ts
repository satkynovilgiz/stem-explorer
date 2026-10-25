import { describe, expect, it } from 'vitest'
import { boyle, DEFAULT_GAS, formatSig, gasInputProblem, GAS_SPECS, isotherm, kPaToAtm, kPaToTorr, normalizeGasParam } from './gas'

describe("Boyle's law", () => {
  it('halving the volume doubles the pressure, and doubling it halves the pressure (inverse cases)', () => {
    expect(boyle(100, 2, 1)!.p2).toBeCloseTo(200, 12)
    expect(boyle(100, 2, 4)!.p2).toBeCloseTo(50, 12)
    expect(boyle(100, 2, 1)!.change).toBe('compressed')
    expect(boyle(100, 2, 4)!.change).toBe('expanded')
    expect(boyle(100, 2, 2)).toMatchObject({ p2: 100, change: 'unchanged', ratio: 1 })
  })

  it('reproduces the textbook example (15.0 mL at 13.0 psi compressed to 7.5 mL gives 26 psi)', () => {
    // Units cancel in P₁V₁ = P₂V₂ as long as each quantity uses one unit throughout.
    expect(boyle(13.0, 15.0, 7.5)!.p2).toBeCloseTo(26, 10)
    // The check exercise solves for a volume instead (30.0 mL at 6.5 psi, then 11.0 psi): V₂ = P₁V₁/P₂, the same formula with roles swapped.
    expect(boyle(30.0, 6.5, 11.0)!.p2).toBeCloseTo(17.7, 1)
  })

  it('keeps P·V constant along the isotherm, and the graph passes through the readout point', () => {
    const r = boyle(DEFAULT_GAS.p1, DEFAULT_GAS.v1, DEFAULT_GAS.v2)!
    for (const [v, p] of isotherm(r.k)) expect(p * v).toBeCloseTo(r.k, 9)
    expect(r.k / DEFAULT_GAS.v2).toBe(r.p2)
    expect(r.k / DEFAULT_GAS.v1).toBeCloseTo(DEFAULT_GAS.p1, 12)
  })

  it('reports the amount of gas at the fixed temperature (n = PV/RT)', () => {
    // 101.325 kPa × 22.414 L at 273.15 K is about 1 mol; at 293.15 K the same P and V hold less.
    expect(boyle(101.325, 22.414, 1)!.moles).toBeCloseTo((101.325 * 22.414) / (8.314 * 293.15), 12)
    expect(boyle(100, 2, 1)!.moles).toBeCloseTo(boyle(200, 1, 5)!.moles, 12)
  })

  it('rejects zero, negative and non-finite inputs', () => {
    expect(boyle(0, 2, 1)).toBeNull()
    expect(boyle(100, 0, 1)).toBeNull()
    expect(boyle(100, 2, 0)).toBeNull()
    expect(boyle(-5, 2, 1)).toBeNull()
    expect(boyle(Number.NaN, 2, 1)).toBeNull()
    expect(boyle(100, Number.POSITIVE_INFINITY, 1)).toBeNull()
  })

  it('explains invalid typed input in physical terms, and accepts values in range', () => {
    expect(gasInputProblem('p1', 0)).toMatch(/Absolute pressure must be greater than zero/)
    expect(gasInputProblem('p1', -20)).toMatch(/gauge reading/)
    expect(gasInputProblem('v2', 0)).toMatch(/volume must be greater than zero/)
    expect(gasInputProblem('v1', 50)).toBe('Use 0.5–10 L; nothing was changed.')
    expect(gasInputProblem('v2', 1)).toBeNull()
    expect(normalizeGasParam('p1', 600)).toBeNull()
    expect(normalizeGasParam('v1', 2.345)).toBe(2.35)
    for (const s of Object.values(GAS_SPECS)) expect(s.min).toBeGreaterThan(0)
  })

  it('converts pressure units consistently', () => {
    expect(kPaToAtm(101.325)).toBe(1)
    expect(kPaToTorr(101.325)).toBe(760)
    expect(kPaToTorr(202.65)).toBeCloseTo(1520, 10)
  })

  it('formats to significant figures', () => {
    expect(formatSig(202.6)).toBe('202.6')
    expect(formatSig(0.0821)).toBe('0.08210')
    expect(formatSig(2026)).toBe('2026')
  })
})
