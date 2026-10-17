import { describe, expect, it } from 'vitest'
import { DEFAULT_CIRCUIT, isValidCircuitParam, normalizeCircuitParam, solveCircuit, type CircuitParams } from './circuit'
import { DEFAULT_WAVE, deriveWave, displacement, isValidWaveParam, mediumVelocity, normalizeWaveParam } from './wave'

const c = (p: Partial<CircuitParams>) => solveCircuit({ ...DEFAULT_CIRCUIT, ...p })

describe('ideal DC circuits: analytic reference cases', () => {
  it('series: R_eq is the sum, the current is the same everywhere, voltages add to ε', () => {
    const s = c({ arrangement: 'series-2', emf: 12, r1: 100, r2: 200 })
    expect(s.equivalent).toBe(300)
    expect(s.current).toBeCloseTo(0.04, 12)
    expect(s.resistors.map((r) => r.current)).toEqual([s.current, s.current])
    expect(s.resistors.map((r) => r.voltage)).toEqual([4, 8].map((v) => expect.closeTo(v, 12)))
    expect(s.resistors.reduce((a, r) => a + r.voltage, 0)).toBeCloseTo(12, 12)
  })

  it('parallel: each branch has the full voltage, currents add, 1/R_eq = Σ 1/R', () => {
    const p = c({ arrangement: 'parallel-2', emf: 10, r1: 100, r2: 100 })
    expect(p.equivalent).toBeCloseTo(50, 12)
    expect(p.current).toBeCloseTo(0.2, 12)
    for (const r of p.resistors) expect(r.voltage).toBeCloseTo(10, 12)
    expect(p.resistors.reduce((a, r) => a + r.current, 0)).toBeCloseTo(p.current, 12)
    const p3 = c({ arrangement: 'parallel-3', emf: 6, r1: 2, r2: 3, r3: 6 })
    expect(p3.equivalent).toBeCloseTo(1, 12)
  })

  it('mixed: R1 + (R2 ∥ R3), and the source power equals the power dissipated', () => {
    const m = c({ arrangement: 'mixed', emf: 12, r1: 100, r2: 200, r3: 200 })
    expect(m.equivalent).toBeCloseTo(200, 12)
    expect(m.current).toBeCloseTo(0.06, 12)
    expect(m.resistors[1].current + m.resistors[2].current).toBeCloseTo(m.current, 12)
    expect(m.resistors[1].voltage).toBeCloseTo(m.resistors[2].voltage, 12)
    for (const a of ['series-3', 'parallel-3', 'mixed'] as const) {
      const s = c({ arrangement: a, emf: 9, r1: 47, r2: 330, r3: 1000 })
      expect(s.dissipated).toBeCloseTo(s.sourcePower, 10)
      for (const r of s.resistors) expect(r.power).toBeCloseTo(r.voltage * r.current, 12)
    }
  })

  it('boundary inputs: resistance must be positive and in range; voltage is bounded', () => {
    expect(isValidCircuitParam('r1', 0)).toBe(false)
    expect(isValidCircuitParam('r1', -5)).toBe(false)
    expect(isValidCircuitParam('r1', 1)).toBe(true)
    expect(isValidCircuitParam('emf', 25)).toBe(false)
    expect(isValidCircuitParam('emf', Number.NaN)).toBe(false)
    expect(normalizeCircuitParam('emf', 30)).toBe(24)
    expect(normalizeCircuitParam('r2', 0)).toBe(1)
    expect(normalizeCircuitParam('emf', 7.3)).toBe(7.5)
    const extreme = c({ arrangement: 'parallel-3', emf: 24, r1: 1, r2: 1, r3: 1 })
    expect(Number.isFinite(extreme.current)).toBe(true)
    expect(extreme.current).toBeCloseTo(72, 10)
  })
})

describe('travelling wave', () => {
  it('speed is derived, never independent: v = fλ, with k = 2π/λ, ω = 2πf, T = 1/f', () => {
    const d = deriveWave({ ...DEFAULT_WAVE, frequency: 2, wavelength: 1.5 })
    expect(d.speed).toBe(3)
    expect(d.period).toBe(0.5)
    expect(d.waveNumber).toBeCloseTo((2 * Math.PI) / 1.5, 12)
    expect(d.angularFrequency).toBeCloseTo(4 * Math.PI, 12)
  })

  it('reference values of y = A sin(kx − ωt)', () => {
    const p = { ...DEFAULT_WAVE, amplitude: 0.3, wavelength: 2, frequency: 0.5 }
    expect(displacement(p, 0, 0)).toBeCloseTo(0, 12)
    expect(displacement(p, 0.5, 0)).toBeCloseTo(0.3, 12) // a quarter wavelength
    expect(displacement(p, 1, 0)).toBeCloseTo(0, 12)
    // After one period every point is back where it started; after T/2 it is inverted.
    expect(displacement(p, 0.37, 2)).toBeCloseTo(displacement(p, 0.37, 0), 12)
    expect(displacement(p, 0.37, 1)).toBeCloseTo(-displacement(p, 0.37, 0), 12)
    // The pattern moves +x at v: the shape at t, shifted by vt, equals the shape at 0.
    const v = deriveWave(p).speed
    expect(displacement(p, 1.1 + v * 0.7, 0.7)).toBeCloseTo(displacement(p, 1.1, 0), 12)
  })

  it('the medium moves only transversely, at most Aω, and is fastest crossing equilibrium', () => {
    const p = { ...DEFAULT_WAVE, amplitude: 0.2, frequency: 1, wavelength: 2 }
    const vmax = p.amplitude * deriveWave(p).angularFrequency
    expect(Math.abs(mediumVelocity(p, 0, 0))).toBeCloseTo(vmax, 12)
    expect(mediumVelocity(p, 0.5, 0)).toBeCloseTo(0, 12)
    for (let t = 0; t < 2; t += 0.137) expect(Math.abs(mediumVelocity(p, 1.3, t))).toBeLessThanOrEqual(vmax + 1e-12)
  })

  it('boundary inputs are bounded and snapped', () => {
    expect(isValidWaveParam('frequency', 0)).toBe(false)
    expect(isValidWaveParam('wavelength', 10)).toBe(false)
    expect(normalizeWaveParam('amplitude', 2)).toBe(0.5)
    expect(normalizeWaveParam('frequency', 0.123)).toBe(0.1)
    expect(normalizeWaveParam('probe', Number.POSITIVE_INFINITY)).toBeNull()
  })
})
