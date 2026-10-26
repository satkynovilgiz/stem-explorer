/*
 * Derivatives and motion: a fixed library of one-dimensional motions with exact derivatives.
 * Position s(t), velocity v(t) = s′(t) and acceleration a(t) = v′(t) = s″(t) (OpenStax Calculus
 * Vol. 1 §3.4; University Physics Vol. 1 §3.2–3.3). The secant slope over [t, t + Δt] is the
 * average velocity; as Δt → 0 it approaches the tangent slope, the instantaneous velocity
 * (Calculus §3.1).
 *
 * Nothing here evaluates text: every motion is a fixed function with fixed parameters.
 */

export type MotionId = 'constant-velocity' | 'constant-acceleration' | 'vertical-throw' | 'oscillation'

export interface MotionParam {
  key: string
  /** Query key in links. */
  url: string
  symbol: string
  label: string
  unit: string
  min: number
  max: number
  step: number
  default: number
}

export type Params = Record<string, number>

export interface MotionDef {
  id: MotionId
  name: string
  /** The shape of s(t), for the mathematics explanation. */
  family: 'Linear' | 'Quadratic' | 'Sinusoidal'
  axis: 'horizontal' | 'vertical'
  /** x for motion along a line, y for height. */
  symbol: 'x' | 'y'
  params: readonly MotionParam[]
  position: string
  velocity: string
  acceleration: string
  /** Which way is positive, and what the sign of a means. */
  direction: string
  s: (p: Params, t: number) => number
  v: (p: Params, t: number) => number
  a: (p: Params, t: number) => number
  /** End of the motion's time domain, s (the landing time for a throw). */
  tEnd: (p: Params) => number
  /** Substituted equations at t, for the readouts. */
  sub: (p: Params, t: number) => { s: string; v: string; a: string }
  sources: readonly string[]
}

/** g used by the vertical throw, m/s² (OpenStax University Physics §3.5). */
export const G = 9.81
export const T_MAX = 10
/** |Δt| is kept at or above this, where the difference quotient is still far from rounding error. */
export const MIN_DT = 0.001
export const MAX_DT = 5

const p = (key: string, url: string, symbol: string, label: string, unit: string, min: number, max: number, step: number, def: number): MotionParam => ({ key, url, symbol, label, unit, min, max, step, default: def })

/**
 * Three significant figures, never "-0", never NaN or Infinity in the output. Values within 1e-9 of
 * zero are rounding residue (e.g. the height at the computed landing time) and show as 0.
 */
export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—'
  if (Math.abs(v) < 1e-9) return '0'
  const r = Number(v.toPrecision(digits))
  return Object.is(r, -0) || r === 0 ? '0' : r.toString()
}
/** A value in an expression, bracketed when negative. */
const n = (v: number) => (v < 0 ? `(${fmt(v)})` : fmt(v))

export const MOTIONS: readonly MotionDef[] = [
  {
    id: 'constant-velocity',
    name: 'Constant velocity',
    family: 'Linear',
    axis: 'horizontal',
    symbol: 'x',
    params: [p('x0', 'mx0', 'x₀', 'Starting position', 'm', -5, 5, 0.1, -2), p('v', 'mv', 'v', 'Velocity', 'm/s', -3, 3, 0.1, 1.5)],
    position: 'x(t) = x₀ + v·t',
    velocity: 'v(t) = x′(t) = v',
    acceleration: 'a(t) = v′(t) = 0',
    direction: 'Positive x is to the right. A negative velocity means moving to the left.',
    s: (q, t) => q.x0 + q.v * t,
    v: (q) => q.v,
    a: () => 0,
    tEnd: () => T_MAX,
    sub: (q, t) => ({
      s: `x(${fmt(t)}) = ${n(q.x0)} + ${n(q.v)} × ${fmt(t)} = ${fmt(q.x0 + q.v * t)} m`,
      v: `v(${fmt(t)}) = ${fmt(q.v)} m/s (the same at every t)`,
      a: `a(${fmt(t)}) = 0 m/s² (the derivative of a constant is zero)`,
    }),
    sources: ['calc1-3-4', 'up-3-2'],
  },
  {
    id: 'constant-acceleration',
    name: 'Constant acceleration',
    family: 'Quadratic',
    axis: 'horizontal',
    symbol: 'x',
    params: [p('x0', 'mx0', 'x₀', 'Starting position', 'm', -5, 5, 0.1, 0), p('v0', 'mv0', 'v₀', 'Starting velocity', 'm/s', -5, 5, 0.1, -2), p('a', 'ma', 'a', 'Acceleration', 'm/s²', -2, 2, 0.1, 1)],
    position: 'x(t) = x₀ + v₀·t + ½·a·t²',
    velocity: 'v(t) = x′(t) = v₀ + a·t',
    acceleration: 'a(t) = v′(t) = a',
    direction: 'Positive x is to the right. Acceleration and velocity can have opposite signs: then the object slows down.',
    s: (q, t) => q.x0 + q.v0 * t + 0.5 * q.a * t * t,
    v: (q, t) => q.v0 + q.a * t,
    a: (q) => q.a,
    tEnd: () => T_MAX,
    sub: (q, t) => ({
      s: `x(${fmt(t)}) = ${n(q.x0)} + ${n(q.v0)} × ${fmt(t)} + ½ × ${n(q.a)} × ${fmt(t)}² = ${fmt(q.x0 + q.v0 * t + 0.5 * q.a * t * t)} m`,
      v: `v(${fmt(t)}) = ${n(q.v0)} + ${n(q.a)} × ${fmt(t)} = ${fmt(q.v0 + q.a * t)} m/s`,
      a: `a(${fmt(t)}) = ${fmt(q.a)} m/s² (constant)`,
    }),
    sources: ['calc1-3-4', 'up-3-3'],
  },
  {
    id: 'vertical-throw',
    name: 'Vertical throw',
    family: 'Quadratic',
    axis: 'vertical',
    symbol: 'y',
    params: [p('y0', 'my0', 'y₀', 'Starting height', 'm', 0, 20, 0.1, 1), p('v0', 'mv0', 'v₀', 'Launch velocity (upward)', 'm/s', 0, 20, 0.1, 9.81)],
    position: 'y(t) = y₀ + v₀·t − ½·g·t²',
    velocity: 'v(t) = y′(t) = v₀ − g·t',
    acceleration: 'a(t) = v′(t) = −g',
    direction: `Up is positive, so the acceleration due to gravity is a = −g = −${G} m/s² the whole time, on the way up, at the top and on the way down. Air resistance is ignored. The motion stops when the ball reaches the ground (y = 0).`,
    s: (q, t) => q.y0 + q.v0 * t - 0.5 * G * t * t,
    v: (q, t) => q.v0 - G * t,
    a: () => -G,
    tEnd: (q) => (q.v0 + Math.sqrt(q.v0 * q.v0 + 2 * G * q.y0)) / G,
    sub: (q, t) => ({
      s: `y(${fmt(t)}) = ${fmt(q.y0)} + ${fmt(q.v0)} × ${fmt(t)} − ½ × ${G} × ${fmt(t)}² = ${fmt(q.y0 + q.v0 * t - 0.5 * G * t * t)} m`,
      v: `v(${fmt(t)}) = ${fmt(q.v0)} − ${G} × ${fmt(t)} = ${fmt(q.v0 - G * t)} m/s`,
      a: `a(${fmt(t)}) = −${G} m/s² (gravity, downward)`,
    }),
    sources: ['up-3-5', 'calc1-3-4'],
  },
  {
    id: 'oscillation',
    name: 'Oscillation',
    family: 'Sinusoidal',
    axis: 'horizontal',
    symbol: 'x',
    params: [p('A', 'mA', 'A', 'Amplitude', 'm', 0.1, 2, 0.1, 1), p('w', 'mw', 'ω', 'Angular frequency', 'rad/s', 0.5, 3, 0.1, 2)],
    position: 'x(t) = A·cos(ω·t)',
    velocity: 'v(t) = x′(t) = −A·ω·sin(ω·t)',
    acceleration: 'a(t) = v′(t) = −A·ω²·cos(ω·t) = −ω²·x(t)',
    direction: 'Positive x is to the right of the equilibrium position. The acceleration always points back toward equilibrium: it has the opposite sign to x.',
    s: (q, t) => q.A * Math.cos(q.w * t),
    v: (q, t) => -q.A * q.w * Math.sin(q.w * t),
    a: (q, t) => -q.A * q.w * q.w * Math.cos(q.w * t),
    tEnd: () => T_MAX,
    sub: (q, t) => ({
      s: `x(${fmt(t)}) = ${fmt(q.A)} × cos(${fmt(q.w)} × ${fmt(t)}) = ${fmt(q.A * Math.cos(q.w * t))} m`,
      v: `v(${fmt(t)}) = −${fmt(q.A)} × ${fmt(q.w)} × sin(${fmt(q.w)} × ${fmt(t)}) = ${fmt(-q.A * q.w * Math.sin(q.w * t))} m/s`,
      a: `a(${fmt(t)}) = −${fmt(q.A)} × ${fmt(q.w)}² × cos(${fmt(q.w)} × ${fmt(t)}) = ${fmt(-q.A * q.w * q.w * Math.cos(q.w * t))} m/s²`,
    }),
    sources: ['up-15-1', 'calc1-3-4'],
  },
]

export const MOTION_IDS = MOTIONS.map((m) => m.id)
export const getMotion = (id: MotionId) => MOTIONS.find((m) => m.id === id)!
export const defaultParams = (m: MotionDef): Params => Object.fromEntries(m.params.map((q) => [q.key, q.default]))

/** Why a parameter set can't be used, or null. (A throw from the ground at rest has no motion.) */
export function paramsProblem(m: MotionDef, q: Params): string | null {
  for (const s of m.params) {
    const v = q[s.key]
    if (!Number.isFinite(v) || v < s.min || v > s.max) return `${s.label} must be from ${s.min} to ${s.max} ${s.unit}.`
  }
  if (m.id === 'vertical-throw' && q.y0 === 0 && q.v0 === 0) return 'A ball at rest on the ground does not move: give it a starting height or an upward velocity.'
  return null
}

/** Clamps a time into the motion's domain [0, tEnd]. */
export const clampTime = (m: MotionDef, q: Params, t: number) => Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), m.tEnd(q))

export type Secant = { ok: true; t2: number; s1: number; s2: number; slope: number } | { ok: false; reason: string }

/**
 * Average velocity over [t, t + Δt]: (s(t + Δt) − s(t)) / Δt. Refused, with a reason, for Δt = 0,
 * |Δt| below MIN_DT, or t + Δt outside the motion; so it never returns NaN or Infinity.
 */
export function secant(m: MotionDef, q: Params, t: number, dt: number): Secant {
  if (!Number.isFinite(dt) || dt === 0) return { ok: false, reason: 'Δt must not be zero: the average velocity divides by Δt.' }
  if (Math.abs(dt) < MIN_DT) return { ok: false, reason: `Use |Δt| of at least ${MIN_DT} s. Smaller steps lose precision to rounding without showing anything new.` }
  if (Math.abs(dt) > MAX_DT) return { ok: false, reason: `Use |Δt| of at most ${MAX_DT} s.` }
  const end = m.tEnd(q)
  const t2 = t + dt
  if (t2 < 0 || t2 > end + 1e-12)
    return { ok: false, reason: `t + Δt = ${fmt(t2)} s is outside the motion (0 to ${fmt(end)} s). Use a smaller Δt${t2 > end ? ' or a negative one' : ''}.` }
  const s1 = m.s(q, t)
  const s2 = m.s(q, Math.min(t2, end))
  return { ok: true, t2, s1, s2, slope: (s2 - s1) / dt }
}

/** Samples of a quantity over the motion, for drawing. */
export function samples(m: MotionDef, q: Params, which: 's' | 'v' | 'a', count = 200): [number, number][] {
  const end = m.tEnd(q)
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = (end * i) / count
    return [t, m[which](q, t)]
  })
}

export type MathView = 'math' | 'phys'

export interface MotionState {
  motion: MotionId
  params: Params
  t: number
  dt: number
  view: MathView
}

export const DEFAULT_MOTION: MotionState = { motion: 'constant-acceleration', params: defaultParams(getMotion('constant-acceleration')), t: 1, dt: 1, view: 'phys' }

/* ---------- Investigations ---------- */

export interface MotionInvestigation {
  id: 'constant-velocity' | 'constant-acceleration' | 'top' | 'oscillation'
  title: string
  state: Omit<MotionState, 'view'>
  question: string
  explain: (st: MotionState) => string
}

export const MOTION_INVESTIGATIONS: readonly MotionInvestigation[] = [
  {
    id: 'constant-velocity',
    title: 'Constant velocity',
    state: { motion: 'constant-velocity', params: { x0: -2, v: 1.5 }, t: 2, dt: 1 },
    question: 'Position is a straight line in time. What are its slope and the acceleration?',
    explain: (st) => {
      const m = getMotion('constant-velocity')
      const sc = secant(m, st.params, st.t, st.dt)
      return `The position graph is a straight line, so every secant has the same slope as the tangent: average velocity ${sc.ok ? fmt(sc.slope) : '—'} m/s equals instantaneous velocity ${fmt(m.v(st.params, st.t))} m/s for any Δt. The velocity never changes, so the acceleration is 0 m/s².`
    },
  },
  {
    id: 'constant-acceleration',
    title: 'Constant acceleration',
    state: { motion: 'constant-acceleration', params: { x0: 0, v0: -2, a: 1 }, t: 3, dt: 1 },
    question: 'Position is a parabola. How close is the average velocity to the instantaneous velocity?',
    explain: (st) => {
      const m = getMotion('constant-acceleration')
      const sc = secant(m, st.params, st.t, st.dt)
      return `For a parabola the secant slope differs from the tangent slope by exactly ½·a·Δt: here ${sc.ok ? fmt(sc.slope - m.v(st.params, st.t)) : '—'} m/s. Halve Δt and the gap halves. The velocity graph is a straight line with slope a = ${fmt(st.params.a)} m/s².`
    },
  },
  {
    id: 'top',
    title: 'Top of a vertical throw',
    state: { motion: 'vertical-throw', params: { y0: 1, v0: 9.81 }, t: 1, dt: 0.5 },
    question: 'At the highest point, what are the velocity and the acceleration?',
    explain: (st) => {
      const m = getMotion('vertical-throw')
      return `At t = ${fmt(st.t)} s the ball is at its highest point: v = ${fmt(m.v(st.params, st.t))} m/s, so the tangent to the height graph is horizontal. The acceleration is still a = −${G} m/s²: the velocity is changing from positive (up) to negative (down) at that instant.`
    },
  },
  {
    id: 'oscillation',
    title: 'Oscillation',
    state: { motion: 'oscillation', params: { A: 1, w: 2 }, t: 0.785, dt: 0.1 },
    question: 'How do the position, velocity and acceleration of an oscillation relate?',
    explain: (st) => {
      const m = getMotion('oscillation')
      const x = m.s(st.params, st.t)
      return `Near t = ${fmt(st.t)} s the object passes through equilibrium (x ≈ ${fmt(x)} m) at its fastest (v = ${fmt(m.v(st.params, st.t))} m/s), and the acceleration is about ${fmt(m.a(st.params, st.t))} m/s². Everywhere, a = −ω²·x: the acceleration points back toward equilibrium, and it is largest where the velocity is zero, at the turning points.`
    },
  },
]
