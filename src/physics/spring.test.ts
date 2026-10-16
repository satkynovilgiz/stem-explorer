import { describe, expect, it } from 'vitest'
import { advanceTime } from './projectile'
import { DEFAULT_SPRING, normalizeSpringParam, solveSpring, springAt, SPRING_SPECS } from './spring'

describe('spring–mass model', () => {
  it('gives the known period, frequency and angular frequency', () => {
    // m = 1 kg, k = 4 N/m: ω = 2 rad/s, T = π s, f = 1/π Hz.
    const s = solveSpring({ mass: 1, k: 4, x0: 0.1 })
    expect(s.omega).toBeCloseTo(2, 12)
    expect(s.period).toBeCloseTo(Math.PI, 12)
    expect(s.frequency).toBeCloseTo(1 / Math.PI, 12)
    expect(s.duration).toBeCloseTo(3 * Math.PI, 12)
  })

  it('period follows T = 2π√(m/k): ×4 mass doubles it, ×4 k halves it, amplitude has no effect', () => {
    const base = solveSpring({ mass: 1, k: 16, x0: 0.2 }).period
    expect(solveSpring({ mass: 4, k: 16, x0: 0.2 }).period).toBeCloseTo(2 * base, 12)
    expect(solveSpring({ mass: 1, k: 64, x0: 0.2 }).period).toBeCloseTo(base / 2, 12)
    expect(solveSpring({ mass: 1, k: 16, x0: 0.05 }).period).toBeCloseTo(base, 12)
  })

  it('starts at rest at x₀ and reaches the turning points and equilibrium on schedule', () => {
    const s = solveSpring({ mass: 1, k: 4, x0: 0.3 })
    const at0 = springAt(s, 0)
    expect([at0.x, at0.v]).toEqual([0.3, -0])
    expect(at0.force).toBeCloseTo(-1.2, 12) // F = −kx = −4·0.3
    expect(at0.a).toBeCloseTo(-1.2, 12) // a = F/m
    const quarter = springAt(s, s.period / 4)
    expect(quarter.x).toBeCloseTo(0, 12)
    expect(Math.abs(quarter.v)).toBeCloseTo(s.maxSpeed, 12) // fastest at equilibrium
    expect(quarter.v).toBeLessThan(0) // moving left, toward −x
    const half = springAt(s, s.period / 2)
    expect(half.x).toBeCloseTo(-0.3, 12)
    expect(half.v).toBeCloseTo(0, 12)
    expect(springAt(s, s.period).x).toBeCloseTo(0.3, 12)
  })

  it('conserves mechanical energy: K + U = ½kA² at every instant', () => {
    const s = solveSpring({ mass: 2.5, k: 37, x0: -0.42 })
    for (let i = 0; i <= 200; i++) {
      const p = springAt(s, (i / 200) * s.duration)
      expect(p.total).toBeCloseTo(s.energy, 10)
      expect(p.kinetic).toBeGreaterThanOrEqual(0)
      expect(p.potential).toBeGreaterThanOrEqual(0)
      expect(p.a).toBeCloseTo(p.force / s.params.mass, 10) // Newton's second law
    }
  })

  it('zero displacement stays at rest with zero energy (the period is still defined)', () => {
    const s = solveSpring({ mass: 1, k: 20, x0: 0 })
    expect(s.energy).toBe(0)
    expect(s.period).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 20), 12)
    const p = springAt(s, 1.234)
    expect([p.x, p.kinetic, p.potential]).toEqual([0, 0, 0])
    expect(Math.abs(p.v) + Math.abs(p.force)).toBe(0)
  })

  it('treats bad times safely and never runs past the window with playback', () => {
    const s = solveSpring(DEFAULT_SPRING)
    expect(springAt(s, Number.NaN).x).toBe(DEFAULT_SPRING.x0)
    expect(springAt(s, -5).x).toBe(DEFAULT_SPRING.x0)
    // The shared clock helper caps the frame step and the window; playback rate only scales time.
    expect(advanceTime(s.duration - 0.01, 1, 2, s.duration)).toBe(s.duration)
  })

  it('results depend only on t, not on how playback reached it', () => {
    const s = solveSpring({ mass: 0.8, k: 50, x0: 0.15 })
    let fast = 0
    let slow = 0
    for (let i = 0; i < 60; i++) fast = advanceTime(fast, 1 / 60, 2, s.duration)
    for (let i = 0; i < 240; i++) slow = advanceTime(slow, 1 / 60, 0.5, s.duration)
    expect(fast).toBeCloseTo(slow, 12)
    const [a, b] = [springAt(s, fast), springAt(s, slow)]
    for (const key of ['x', 'v', 'a', 'kinetic', 'potential'] as const) expect(a[key]).toBeCloseTo(b[key], 10)
  })

  it('normalizes inputs to their steps and bounds', () => {
    expect(normalizeSpringParam('mass', 0)).toBe(SPRING_SPECS.mass.min)
    expect(normalizeSpringParam('k', 1000)).toBe(200)
    expect(normalizeSpringParam('x0', 0.234)).toBe(0.23)
    expect(normalizeSpringParam('x0', -9)).toBe(-0.5)
    expect(normalizeSpringParam('mass', Number.NaN)).toBeNull()
  })
})
