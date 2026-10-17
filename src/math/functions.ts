/*
 * A fixed library of 2D functions with bounded parameters, each with its exact derivative and an
 * exact antiderivative (OpenStax Calculus Vol. 1 §1.2, 1.3, 1.5, 3.3, 3.5, 3.9, 5.3). Signed
 * definite integrals come from the antiderivative, F(b) − F(a). The geometric (total) area needs
 * |f|, so it is computed numerically and labelled as an estimate.
 */

export type FunctionId = 'linear' | 'quadratic' | 'cubic' | 'sine' | 'cosine' | 'exponential' | 'logarithmic'

export interface FnParamSpec {
  key: string
  symbol: string
  label: string
  min: number
  max: number
  step: number
  default: number
  decimals: number
}

export interface FunctionDef {
  id: FunctionId
  name: string
  formula: string
  derivativeFormula: string
  params: readonly FnParamSpec[]
  /** Where the function is defined; x outside it has no value. */
  domainText: string
  inDomain: (p: Record<string, number>, x: number) => boolean
  f: (p: Record<string, number>, x: number) => number
  df: (p: Record<string, number>, x: number) => number
  /** An antiderivative F with F' = f on the domain. */
  F: (p: Record<string, number>, x: number) => number
  sources: readonly string[]
}

const spec = (key: string, symbol: string, label: string, min: number, max: number, step: number, def: number, decimals = 2): FnParamSpec => ({ key, symbol, label, min, max, step, default: def, decimals })
const all = () => true

export const FUNCTIONS: readonly FunctionDef[] = [
  {
    id: 'linear',
    name: 'Linear',
    formula: 'f(x) = m·x + b',
    derivativeFormula: "f′(x) = m",
    params: [spec('m', 'm', 'Slope', -3, 3, 0.1, 1, 1), spec('b', 'b', 'Intercept', -5, 5, 0.1, 0, 1)],
    domainText: 'All real numbers',
    inDomain: all,
    f: (p, x) => p.m * x + p.b,
    df: (p) => p.m,
    F: (p, x) => (p.m * x * x) / 2 + p.b * x,
    sources: ['calc1-1-2', 'calc1-3-3'],
  },
  {
    id: 'quadratic',
    name: 'Quadratic',
    formula: 'f(x) = a·x² + b·x + c',
    derivativeFormula: 'f′(x) = 2a·x + b',
    params: [spec('a', 'a', 'Coefficient a', -2, 2, 0.1, 0.5, 1), spec('b', 'b', 'Coefficient b', -4, 4, 0.1, 0, 1), spec('c', 'c', 'Constant c', -5, 5, 0.1, -2, 1)],
    domainText: 'All real numbers',
    inDomain: all,
    f: (p, x) => p.a * x * x + p.b * x + p.c,
    df: (p, x) => 2 * p.a * x + p.b,
    F: (p, x) => (p.a * x ** 3) / 3 + (p.b * x * x) / 2 + p.c * x,
    sources: ['calc1-1-2', 'calc1-3-3'],
  },
  {
    id: 'cubic',
    name: 'Cubic',
    formula: 'f(x) = a·x³ + b·x',
    derivativeFormula: 'f′(x) = 3a·x² + b',
    params: [spec('a', 'a', 'Coefficient a', -1, 1, 0.05, 0.2), spec('b', 'b', 'Coefficient b', -4, 4, 0.1, -1, 1)],
    domainText: 'All real numbers',
    inDomain: all,
    f: (p, x) => p.a * x ** 3 + p.b * x,
    df: (p, x) => 3 * p.a * x * x + p.b,
    F: (p, x) => (p.a * x ** 4) / 4 + (p.b * x * x) / 2,
    sources: ['calc1-1-2', 'calc1-3-3'],
  },
  {
    id: 'sine',
    name: 'Sine',
    formula: 'f(x) = A·sin(k·x)',
    derivativeFormula: 'f′(x) = A·k·cos(k·x)',
    params: [spec('A', 'A', 'Amplitude', -3, 3, 0.1, 2, 1), spec('k', 'k', 'Angular frequency', 0.1, 3, 0.1, 1, 1)],
    domainText: 'All real numbers (x in radians)',
    inDomain: all,
    f: (p, x) => p.A * Math.sin(p.k * x),
    df: (p, x) => p.A * p.k * Math.cos(p.k * x),
    F: (p, x) => (-p.A / p.k) * Math.cos(p.k * x),
    sources: ['calc1-1-3', 'calc1-3-5'],
  },
  {
    id: 'cosine',
    name: 'Cosine',
    formula: 'f(x) = A·cos(k·x)',
    derivativeFormula: 'f′(x) = −A·k·sin(k·x)',
    params: [spec('A', 'A', 'Amplitude', -3, 3, 0.1, 2, 1), spec('k', 'k', 'Angular frequency', 0.1, 3, 0.1, 1, 1)],
    domainText: 'All real numbers (x in radians)',
    inDomain: all,
    f: (p, x) => p.A * Math.cos(p.k * x),
    df: (p, x) => -p.A * p.k * Math.sin(p.k * x),
    F: (p, x) => (p.A / p.k) * Math.sin(p.k * x),
    sources: ['calc1-1-3', 'calc1-3-5'],
  },
  {
    id: 'exponential',
    name: 'Exponential',
    formula: 'f(x) = A·eᵏˣ',
    derivativeFormula: 'f′(x) = A·k·eᵏˣ',
    params: [spec('A', 'A', 'Coefficient A', -3, 3, 0.1, 1, 1), spec('k', 'k', 'Rate k', -1.5, 1.5, 0.05, 0.5)],
    domainText: 'All real numbers',
    inDomain: all,
    f: (p, x) => p.A * Math.exp(p.k * x),
    df: (p, x) => p.A * p.k * Math.exp(p.k * x),
    // For k = 0 the function is the constant A.
    F: (p, x) => (p.k === 0 ? p.A * x : (p.A / p.k) * Math.exp(p.k * x)),
    sources: ['calc1-1-5', 'calc1-3-9'],
  },
  {
    id: 'logarithmic',
    name: 'Logarithmic',
    formula: 'f(x) = A·ln(x)',
    derivativeFormula: 'f′(x) = A / x',
    params: [spec('A', 'A', 'Coefficient A', -3, 3, 0.1, 1, 1)],
    domainText: 'x > 0 only: ln(x) is undefined for x ≤ 0',
    inDomain: (_p, x) => x > 0,
    f: (p, x) => p.A * Math.log(x),
    df: (p, x) => p.A / x,
    F: (p, x) => p.A * (x * Math.log(x) - x),
    sources: ['calc1-1-5', 'calc1-3-9'],
  },
]

export const FUNCTION_IDS = FUNCTIONS.map((f) => f.id)
export const getFunction = (id: FunctionId) => FUNCTIONS.find((f) => f.id === id)!
export const defaultFnParams = (fn: FunctionDef) => Object.fromEntries(fn.params.map((s) => [s.key, s.default])) as Record<string, number>

/**
 * Polyline segments for plotting on [x0, x1]. A segment ends where the function is undefined or
 * leaves the visible band (|y| beyond `yLimit`), so the curve is never joined across a gap.
 */
export function plotSegments(fn: FunctionDef, p: Record<string, number>, x0: number, x1: number, n: number, yLimit: number): [number, number][][] {
  const out: [number, number][][] = []
  let current: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n
    const y = fn.inDomain(p, x) ? fn.f(p, x) : Number.NaN
    if (!Number.isFinite(y) || Math.abs(y) > yLimit) {
      if (current.length > 1) out.push(current)
      current = []
      continue
    }
    current.push([x, y])
  }
  if (current.length > 1) out.push(current)
  return out
}

export interface IntegralResult {
  ok: true
  signed: number
  /** ∫|f| dx, estimated numerically. */
  totalArea: number
  areaMethod: string
}
export type IntegralOutcome = IntegralResult | { ok: false; reason: string }

/** Signed integral from the antiderivative (exact); total area by composite Simpson's rule on |f|. */
export function integrate(fn: FunctionDef, p: Record<string, number>, a: number, b: number, n = 2000): IntegralOutcome {
  const [lo, hi] = a <= b ? [a, b] : [b, a]
  if (!fn.inDomain(p, lo) || !fn.inDomain(p, hi)) return { ok: false, reason: `The interval must lie inside the domain (${fn.domainText}).` }
  const signed = fn.F(p, b) - fn.F(p, a)
  const m = n % 2 === 0 ? n : n + 1
  const h = (hi - lo) / m
  let s = Math.abs(fn.f(p, lo)) + Math.abs(fn.f(p, hi))
  for (let i = 1; i < m; i++) s += (i % 2 ? 4 : 2) * Math.abs(fn.f(p, lo + i * h))
  return { ok: true, signed, totalArea: (s * h) / 3, areaMethod: `Simpson’s rule with ${m} subintervals on |f| (a numerical estimate)` }
}

/** Slope of the secant through (x, f(x)) and (x + h, f(x + h)); approaches f′(x) as h → 0. */
export function secantSlope(fn: FunctionDef, p: Record<string, number>, x: number, h: number): number | null {
  if (h === 0 || !fn.inDomain(p, x) || !fn.inDomain(p, x + h)) return null
  return (fn.f(p, x + h) - fn.f(p, x)) / h
}
