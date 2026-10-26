import { describe, expect, it } from 'vitest'
import { clampTime, defaultParams, DEFAULT_MOTION, fmt, G, getMotion, MIN_DT, MOTION_INVESTIGATIONS, MOTIONS, paramsProblem, samples, secant } from './motion'

const numeric = (f: (t: number) => number, t: number, h = 1e-5) => (f(t + h) - f(t - h)) / (2 * h)

describe('analytical derivatives', () => {
  it('match known values', () => {
    const cv = getMotion('constant-velocity')
    expect(cv.v({ x0: 1, v: -2 }, 7)).toBe(-2)
    expect(cv.a({ x0: 1, v: -2 }, 7)).toBe(0)
    const ca = getMotion('constant-acceleration')
    const q = { x0: 0, v0: -2, a: 1 }
    expect(ca.s(q, 3)).toBeCloseTo(-1.5, 12) // −6 + 4.5
    expect(ca.v(q, 3)).toBeCloseTo(1, 12)
    expect(ca.v(q, 2)).toBeCloseTo(0, 12) // turns around at t = 2 s
    const th = getMotion('vertical-throw')
    const tq = { y0: 1, v0: G }
    expect(th.v(tq, 1)).toBeCloseTo(0, 12) // highest point at t = v0/g
    expect(th.a(tq, 1)).toBe(-G)
    expect(th.s(tq, 1)).toBeCloseTo(1 + G / 2, 12)
    const os = getMotion('oscillation')
    const oq = { A: 1, w: 2 }
    expect(os.v(oq, 0)).toBeCloseTo(0, 12) // released from maximum displacement
    expect(os.a(oq, 0)).toBeCloseTo(-4, 12)
    expect(os.v(oq, Math.PI / 4)).toBeCloseTo(-2, 12) // through equilibrium at maximum speed
  })

  it('agree with numerical differentiation for every motion, at many times', () => {
    for (const m of MOTIONS) {
      const q = defaultParams(m)
      const end = m.tEnd(q)
      for (let i = 1; i < 10; i++) {
        const t = (end * i) / 10
        expect(m.v(q, t), `${m.id} v at ${t}`).toBeCloseTo(numeric((x) => m.s(q, x), t), 5)
        expect(m.a(q, t), `${m.id} a at ${t}`).toBeCloseTo(numeric((x) => m.v(q, x), t), 5)
      }
    }
  })

  it('oscillation: a = −ω²·x everywhere', () => {
    const m = getMotion('oscillation')
    const q = { A: 1.3, w: 2.2 }
    for (const t of [0, 0.4, 1.7, 5, 9.9]) expect(m.a(q, t)).toBeCloseTo(-q.w * q.w * m.s(q, t), 12)
  })
})

describe('secants', () => {
  it('secant slopes approach the tangent slope as Δt shrinks, within the stable range', () => {
    for (const m of MOTIONS) {
      const q = defaultParams(m)
      const t = m.tEnd(q) / 3
      const errs = [1, 0.1, 0.01, MIN_DT].map((dt) => {
        const s = secant(m, q, t, dt)
        if (!s.ok) throw new Error(s.reason)
        return Math.abs(s.slope - m.v(q, t))
      })
      for (let i = 1; i < errs.length; i++) expect(errs[i], m.id).toBeLessThanOrEqual(errs[i - 1] + 1e-12)
      expect(errs.at(-1)!, m.id).toBeLessThan(0.02)
    }
  })

  it('for a parabola the gap is exactly ½·a·Δt', () => {
    const m = getMotion('constant-acceleration')
    const q = { x0: 0, v0: -2, a: 1 }
    for (const dt of [1, 0.5, -0.25]) {
      const s = secant(m, q, 3, dt)
      expect(s.ok && s.slope - m.v(q, 3)).toBeCloseTo(0.5 * q.a * dt, 10)
    }
  })

  it('refuses Δt = 0, tiny Δt and points outside the motion, without NaN or Infinity', () => {
    const m = getMotion('constant-velocity')
    const q = defaultParams(m)
    for (const dt of [0, 1e-12, Number.NaN, Infinity, 6]) {
      const s = secant(m, q, 1, dt)
      expect(s.ok).toBe(false)
      expect(s.ok ? '' : s.reason).not.toMatch(/NaN|Infinity/)
    }
    expect(secant(m, q, 9.5, 1)).toMatchObject({ ok: false, reason: expect.stringContaining('or a negative one') })
    expect(secant(m, q, 0, -0.5)).toMatchObject({ ok: false })
    expect(secant(m, q, 10, -1).ok).toBe(true)
  })
})

describe('time boundaries and landing', () => {
  it('a vertical throw ends exactly at landing; time is clamped to the motion', () => {
    const m = getMotion('vertical-throw')
    const q = { y0: 1, v0: G }
    const end = m.tEnd(q)
    expect(m.s(q, end)).toBeCloseTo(0, 10)
    expect(m.v(q, end)).toBeLessThan(0) // moving down when it lands
    expect(clampTime(m, q, 99)).toBe(end)
    expect(clampTime(m, q, -1)).toBe(0)
    expect(clampTime(m, q, Number.NaN)).toBe(0)
    // Dropped from rest: falls for √(2h/g).
    expect(m.tEnd({ y0: 4.905, v0: 0 })).toBeCloseTo(1, 10)
    const pts = samples(m, q, 's')
    expect(Math.min(...pts.map(([, y]) => y))).toBeGreaterThanOrEqual(-1e-9)
  })

  it('covers zero and negative velocity', () => {
    const m = getMotion('constant-acceleration')
    const q = { x0: 0, v0: -2, a: 1 }
    expect(m.v(q, 0)).toBe(-2)
    expect(m.v(q, 2)).toBe(0)
    expect(m.v(q, 4)).toBe(2)
  })

  it('rejects out-of-range parameters and a throw with nothing to show', () => {
    expect(paramsProblem(getMotion('vertical-throw'), { y0: 0, v0: 0 })).toMatch(/does not move/)
    expect(paramsProblem(getMotion('oscillation'), { A: 5, w: 1 })).toMatch(/Amplitude/)
    expect(paramsProblem(getMotion('oscillation'), { A: 1, w: Number.NaN })).toMatch(/Angular frequency/)
    for (const m of MOTIONS) expect(paramsProblem(m, defaultParams(m))).toBeNull()
  })

  it('formats without -0, NaN or Infinity', () => {
    expect(fmt(-0)).toBe('0')
    expect(fmt(-4.44e-16)).toBe('0')
    expect(fmt(0.0005)).toBe('0.0005')
    expect(fmt(Number.NaN)).toBe('—')
    expect(fmt(1 / 3)).toBe('0.333')
  })
})

describe('investigations', () => {
  const run = (id: string) => {
    const inv = MOTION_INVESTIGATIONS.find((i) => i.id === id)!
    return inv.explain({ ...inv.state, view: DEFAULT_MOTION.view })
  }
  it('explain with computed values', () => {
    expect(run('constant-velocity')).toContain('average velocity 1.5 m/s equals instantaneous velocity 1.5 m/s')
    expect(run('constant-acceleration')).toContain('here 0.5 m/s')
    expect(run('top')).toContain('v = 0 m/s')
    expect(run('top')).toContain('a = −9.81 m/s²')
    expect(run('oscillation')).toContain('a = −ω²·x')
  })
  it('every investigation starts inside its motion’s domain with a valid secant', () => {
    for (const inv of MOTION_INVESTIGATIONS) {
      const m = getMotion(inv.state.motion)
      expect(paramsProblem(m, inv.state.params), inv.id).toBeNull()
      expect(secant(m, inv.state.params, inv.state.t, inv.state.dt).ok, inv.id).toBe(true)
    }
  })
})
