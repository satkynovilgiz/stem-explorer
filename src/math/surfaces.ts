/*
 * Fixed library of surfaces z = f(x, y). No expression parsing or eval: each surface is a
 * hand-written function with bounded parameters.
 *
 * Convention: x and y are the independent variables, z = f(x, y) is the height. These are abstract
 * mathematical coordinates without units. (Rendering maps them to Three.js axes in one place:
 * src/math/coordinates.ts.)
 */

export type SurfaceId = 'plane' | 'paraboloid' | 'saddle' | 'sine'
export type SliceAxis = 'x' | 'y'

export interface ParamDef {
  key: string
  /** Symbol shown in formulas and labels. */
  symbol: string
  label: string
  /** Short explanation of what the parameter does geometrically. */
  description: string
  min: number
  max: number
  step: number
  default: number
  decimals: number
  /** Query-string key (unique across all subjects). */
  urlKey: string
}

export type Params = Record<string, number>

export interface Domain {
  min: number
  max: number
}

/** Shape of a vertical cross-section, used for wording and tests. */
export type SliceKind = 'line' | 'parabola-up' | 'parabola-down' | 'sinusoid' | 'constant'

export interface SliceResult {
  kind: SliceKind
  /** One-variable formula in the remaining variable, with numbers substituted. */
  formula: string
  /** Evaluates the slice curve as a function of the free variable. */
  evaluate: (u: number) => number
}

export interface SurfaceDef {
  id: SurfaceId
  name: string
  /** General symbolic formula. */
  formula: string
  params: readonly ParamDef[]
  /** Square domain: x and y both range over [min, max]. */
  domain: Domain
  /** Mesh segments per side, chosen so the surface is sampled finely enough at every allowed setting. */
  segments: number
  evaluate: (p: Params, x: number, y: number) => number
  /** Formula with the parameters substituted. */
  substituted: (p: Params) => string
  /** Point substitution, e.g. "0.50·(1.00)² + 0.50·(−2.00)²". */
  substitution: (p: Params, x: number, y: number) => string
  slice: (p: Params, axis: SliceAxis, value: number) => SliceResult
  description: string
  meaning: readonly string[]
  sourceIds: readonly string[]
  limitations: readonly string[]
}

/* ---------- Number formatting for formulas ---------- */

export const MINUS = '−'
const EPS = 1e-9

/** Fixed-decimal number with a real minus sign. */
export function num(value: number, decimals = 2): string {
  const v = Math.abs(value) < 0.5 * 10 ** -decimals ? 0 : value
  const text = Math.abs(v).toFixed(decimals)
  return v < 0 ? `${MINUS}${text}` : text
}

/** Relative size below which a trig factor is treated as a floating-point residual of an exact zero. */
const ZERO_RESIDUAL = 1e-12

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const superscript = (n: number) =>
  `${n < 0 ? '⁻' : ''}${String(Math.abs(n)).split('').map((d) => SUPERSCRIPT[Number(d)]).join('')}`

/**
 * Display text for a computed value, never showing a non-zero value as 0:
 * - |v| ≥ 0.1: three decimals ("1.118", "−0.500");
 * - 0.001 ≤ |v| < 0.1: three significant figures ("0.00250");
 * - smaller: scientific notation with three significant figures ("1.25 × 10⁻⁴").
 * `approx` is true when the text is a rounded form of the value.
 */
export function formatCoefficient(value: number): { text: string; approx: boolean } {
  if (value === 0 || Object.is(value, -0)) return { text: '0', approx: false }
  const abs = Math.abs(value)
  const sign = value < 0 ? MINUS : ''
  if (abs < 0.001) {
    let exponent = Math.floor(Math.log10(abs))
    let m = (abs / 10 ** exponent).toFixed(2)
    // Rounding can carry the mantissa to 10.00 (e.g. 9.999 × 10⁻⁴); renormalise to 1.00 × 10⁻³.
    if (Number(m) >= 10) {
      exponent += 1
      m = (abs / 10 ** exponent).toFixed(2)
    }
    return { text: `${sign}${m} × 10${superscript(exponent)}`, approx: Number(m) * 10 ** exponent !== abs }
  }
  if (abs < 0.1) {
    const m = abs.toPrecision(3)
    return { text: `${sign}${m}`, approx: Number(m) !== abs }
  }
  const text = num(value, 3)
  return { text, approx: Number(value.toFixed(3)) !== value }
}

/** Value text for tables and readouts (same rules as formatCoefficient; callers add "≈" where they show rounded values). */
export function formatValue(value: number): string {
  return formatCoefficient(value).text
}

/** "(−2.00)" style for substitutions, so signs and powers stay unambiguous. */
const paren = (value: number, decimals = 2) => `(${num(value, decimals)})`

/** Joins coefficient·term pieces into "a·x + b" with proper signs, dropping zero terms. */
export function linearCombination(terms: readonly [number, string][], decimals = 2): string {
  const kept = terms.filter(([c]) => Math.abs(c) >= 0.5 * 10 ** -decimals)
  if (kept.length === 0) return '0'
  return kept
    .map(([c, t], i) => {
      const body = t ? `${num(Math.abs(c), decimals)}·${t}` : num(Math.abs(c), decimals)
      if (i === 0) return c < 0 ? `${MINUS}${body}` : body
      return c < 0 ? ` ${MINUS} ${body}` : ` + ${body}`
    })
    .join('')
}

/* ---------- Surfaces ---------- */

const PLANE: SurfaceDef = {
  id: 'plane',
  name: 'Plane',
  formula: 'z = a·x + b·y + c',
  params: [
    { key: 'a', symbol: 'a', label: 'Slope in x', description: 'How much z rises for each unit step in x.', min: -2, max: 2, step: 0.05, default: 0.5, decimals: 2, urlKey: 'a' },
    { key: 'b', symbol: 'b', label: 'Slope in y', description: 'How much z rises for each unit step in y.', min: -2, max: 2, step: 0.05, default: -0.25, decimals: 2, urlKey: 'b' },
    { key: 'c', symbol: 'c', label: 'Height at origin', description: 'The value of z where x = 0 and y = 0 (the z-intercept).', min: -3, max: 3, step: 0.1, default: 1, decimals: 1, urlKey: 'c' },
  ],
  domain: { min: -3, max: 3 },
  segments: 24,
  evaluate: (p, x, y) => p.a * x + p.b * y + p.c,
  substituted: (p) => `z = ${linearCombination([[p.a, 'x'], [p.b, 'y'], [p.c, '']])}`,
  substitution: (p, x, y) => `${num(p.a)}·${paren(x)} + ${num(p.b)}·${paren(y)} + ${num(p.c, 1)}`,
  slice: (p, axis, v) => {
    // x = v: z = b·y + (a·v + c); y = v: z = a·x + (b·v + c). Always a straight line (or constant).
    const slope = axis === 'x' ? p.b : p.a
    const intercept = (axis === 'x' ? p.a : p.b) * v + p.c
    const u = axis === 'x' ? 'y' : 'x'
    return {
      kind: Math.abs(slope) < EPS ? 'constant' : 'line',
      formula: `z = ${linearCombination([[slope, u], [intercept, '']])}`,
      evaluate: (w) => slope * w + intercept,
    }
  },
  description: 'A flat, tilted sheet. Every step in x changes z by a, and every step in y changes z by b.',
  meaning: [
    'a and b are the slopes of the plane in the x and y directions; c lifts the whole plane up or down.',
    'Every vertical cross-section is a straight line, because z changes at a constant rate along any line in the xy-plane.',
    'With a = b = 0 the plane is horizontal at height c.',
  ],
  sourceIds: ['calc3-4-1'],
  limitations: ['Only the square −3 ≤ x, y ≤ 3 is drawn; the plane itself continues forever.'],
}

const PARABOLOID: SurfaceDef = {
  id: 'paraboloid',
  name: 'Elliptic paraboloid',
  formula: 'z = a·x² + b·y²',
  params: [
    { key: 'a', symbol: 'a', label: 'Curvature in x', description: 'Larger a makes the bowl steeper along x. Kept positive so the surface opens upward.', min: 0.1, max: 1.5, step: 0.05, default: 0.5, decimals: 2, urlKey: 'a' },
    { key: 'b', symbol: 'b', label: 'Curvature in y', description: 'Larger b makes the bowl steeper along y. Kept positive so the surface opens upward.', min: 0.1, max: 1.5, step: 0.05, default: 0.5, decimals: 2, urlKey: 'b' },
  ],
  domain: { min: -2, max: 2 },
  segments: 64,
  evaluate: (p, x, y) => p.a * x * x + p.b * y * y,
  substituted: (p) => `z = ${num(p.a)}·x² + ${num(p.b)}·y²`,
  substitution: (p, x, y) => `${num(p.a)}·${paren(x)}² + ${num(p.b)}·${paren(y)}²`,
  slice: (p, axis, v) => {
    // x = v: z = b·y² + a·v²; y = v: z = a·x² + b·v². Upward parabolas.
    const k = axis === 'x' ? p.b : p.a
    const shift = (axis === 'x' ? p.a : p.b) * v * v
    const u = axis === 'x' ? 'y' : 'x'
    return {
      kind: 'parabola-up',
      formula: `z = ${linearCombination([[k, `${u}²`], [shift, '']])}`,
      evaluate: (w) => k * w * w + shift,
    }
  },
  description: 'A bowl with its lowest point at the origin. When a = b the bowl is circular; otherwise it is stretched.',
  meaning: [
    'z is never negative, and z = 0 only at the origin, so the origin is the minimum.',
    'Vertical cross-sections (x = constant or y = constant) are parabolas that open upward.',
    'Horizontal cross-sections z = constant > 0 are ellipses, which is where the name comes from.',
  ],
  sourceIds: ['calc3-2-6', 'calc3-4-1'],
  limitations: ['Only −2 ≤ x, y ≤ 2 is drawn; the bowl keeps rising without bound.'],
}

const SADDLE: SurfaceDef = {
  id: 'saddle',
  name: 'Saddle (hyperbolic paraboloid)',
  formula: 'z = a·x² − b·y²',
  params: [
    { key: 'a', symbol: 'a', label: 'Upward curvature in x', description: 'Along the x direction the surface curves up; larger a curves it more. Kept positive.', min: 0.1, max: 1.5, step: 0.05, default: 0.5, decimals: 2, urlKey: 'a' },
    { key: 'b', symbol: 'b', label: 'Downward curvature in y', description: 'Along the y direction the surface curves down; larger b curves it more. Kept positive.', min: 0.1, max: 1.5, step: 0.05, default: 0.5, decimals: 2, urlKey: 'b' },
  ],
  domain: { min: -2, max: 2 },
  segments: 64,
  evaluate: (p, x, y) => p.a * x * x - p.b * y * y,
  substituted: (p) => `z = ${num(p.a)}·x² ${MINUS} ${num(p.b)}·y²`,
  substitution: (p, x, y) => `${num(p.a)}·${paren(x)}² ${MINUS} ${num(p.b)}·${paren(y)}²`,
  slice: (p, axis, v) => {
    // x = v: z = −b·y² + a·v² (opens down); y = v: z = a·x² − b·v² (opens up).
    if (axis === 'x') {
      const shift = p.a * v * v
      return {
        kind: 'parabola-down',
        formula: `z = ${linearCombination([[-p.b, 'y²'], [shift, '']])}`,
        evaluate: (w) => -p.b * w * w + shift,
      }
    }
    const shift = -p.b * v * v
    return {
      kind: 'parabola-up',
      formula: `z = ${linearCombination([[p.a, 'x²'], [shift, '']])}`,
      evaluate: (w) => p.a * w * w + shift,
    }
  },
  description: 'Curves up along x and down along y, like a saddle or a mountain pass.',
  meaning: [
    'The origin is a saddle point: it is a minimum along the x direction and a maximum along the y direction.',
    'Slices y = constant are parabolas opening upward; slices x = constant are parabolas opening downward.',
    'Horizontal cross-sections z = constant ≠ 0 are hyperbolas, which gives the name hyperbolic paraboloid.',
  ],
  sourceIds: ['calc3-2-6'],
  limitations: ['Only −2 ≤ x, y ≤ 2 is drawn; the surface continues without bound in every direction.'],
}

const SINE: SurfaceDef = {
  id: 'sine',
  name: 'Sinusoidal surface',
  formula: 'z = A·sin(k·x)·cos(k·y)',
  params: [
    { key: 'A', symbol: 'A', label: 'Amplitude', description: 'Height of the bumps. z always stays between −|A| and |A|. Negative A flips peaks and dips.', min: -2, max: 2, step: 0.05, default: 1, decimals: 2, urlKey: 'amp' },
    { key: 'k', symbol: 'k', label: 'Spatial angular frequency', description: 'How quickly the waves repeat across the surface, in radians per unit of x or y: one full wave spans 2π/k units. This is not a frequency in time (not hertz).', min: 0, max: 3, step: 0.05, default: 1, decimals: 2, urlKey: 'k' },
  ],
  domain: { min: -Math.PI, max: Math.PI },
  // k ≤ 3 gives a wavelength ≥ 2π/3 ≈ 2.09, so 120 segments over 2π give ≥ 40 samples per wave.
  segments: 120,
  evaluate: (p, x, y) => p.A * Math.sin(p.k * x) * Math.cos(p.k * y),
  substituted: (p) => `z = ${num(p.A)}·sin(${num(p.k)}·x)·cos(${num(p.k)}·y)`,
  substitution: (p, x, y) => `${num(p.A)}·sin(${num(p.k)}·${paren(x)})·cos(${num(p.k)}·${paren(y)})`,
  slice: (p, axis, v) => {
    // x = v: z = [A·sin(k·v)]·cos(k·y); y = v: z = [A·cos(k·v)]·sin(k·x).
    const amplitude = axis === 'x' ? p.A * Math.sin(p.k * v) : p.A * Math.cos(p.k * v)
    const u = axis === 'x' ? 'y' : 'x'
    const fn = axis === 'x' ? 'cos' : 'sin'
    // Classification is mathematical, not based on display rounding: the slice is identically zero only
    // when A = 0, k = 0, or the trig factor is an exact zero that floating point leaves as a residual
    // (e.g. sin(π) ≈ 1.2e-16). A tiny but genuine amplitude such as 1.25e-4 stays a sinusoid.
    const isZero = p.A === 0 || p.k === 0 || Math.abs(amplitude) <= ZERO_RESIDUAL * Math.abs(p.A)
    const exactAmplitude = isZero ? 0 : amplitude
    const evaluate = (w: number) => exactAmplitude * (axis === 'x' ? Math.cos(p.k * w) : Math.sin(p.k * w))
    if (isZero) return { kind: 'constant', formula: 'z = 0', evaluate }
    const coef = formatCoefficient(amplitude)
    return { kind: 'sinusoid', formula: `z ${coef.approx ? '≈' : '='} ${coef.text}·${fn}(${num(p.k)}·${u})`, evaluate }
  },
  description: 'A grid of bumps and dips made by multiplying a sine wave in x with a cosine wave in y.',
  meaning: [
    'Sine and cosine take their arguments in radians.',
    'Each slice is a sine or cosine wave whose amplitude depends on where you slice: at x = constant the wave in y has amplitude A·sin(k·x).',
    'Where sin(k·x) = 0 the whole slice is flat (z = 0); these lines separate the bumps.',
    'With k = 0 or A = 0 the surface is the flat plane z = 0.',
  ],
  sourceIds: ['calc3-4-1'],
  limitations: ['Only −π ≤ x, y ≤ π is drawn; the pattern repeats forever.'],
}

export const SURFACES: readonly SurfaceDef[] = [PLANE, PARABOLOID, SADDLE, SINE]
export const SURFACE_IDS = SURFACES.map((s) => s.id)
export const DEFAULT_SURFACE: SurfaceId = 'paraboloid'

export function getSurface(id: SurfaceId): SurfaceDef {
  return SURFACES.find((s) => s.id === id)!
}

export function isSurfaceId(value: string): value is SurfaceId {
  return (SURFACE_IDS as string[]).includes(value)
}

export function defaultParams(surface: SurfaceDef): Params {
  return Object.fromEntries(surface.params.map((p) => [p.key, p.default]))
}

/** True when `value` is finite and inside the parameter's range. */
export function isValidParamValue(def: ParamDef, value: number): boolean {
  return Number.isFinite(value) && value >= def.min && value <= def.max
}

/** Clamps a finite value into range and rounds to the step; null for non-finite input. */
export function normalizeParamValue(def: ParamDef, value: number): number | null {
  if (!Number.isFinite(value)) return null
  const clamped = Math.min(def.max, Math.max(def.min, value))
  const stepped = Math.round(clamped / def.step) * def.step
  return Number(Math.min(def.max, Math.max(def.min, stepped)).toFixed(def.decimals))
}

/** Clamps a coordinate to the surface's domain; reports whether it had to be changed. */
export function clampToDomain(surface: SurfaceDef, value: number): { value: number; clamped: boolean } {
  const { min, max } = surface.domain
  const v = Math.min(max, Math.max(min, value))
  return { value: v, clamped: v !== value }
}

/** Minimum and maximum height over the domain, sampled on the mesh grid. */
export function heightRange(surface: SurfaceDef, p: Params, segments = surface.segments): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  const { min: lo, max: hi } = surface.domain
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j <= segments; j++) {
      const z = surface.evaluate(p, lo + ((hi - lo) * i) / segments, lo + ((hi - lo) * j) / segments)
      if (z < min) min = z
      if (z > max) max = z
    }
  }
  // `+ 0` turns −0 (e.g. 0·sin of a negative angle) into 0 so legends never show "−0".
  return { min: min + 0, max: max + 0 }
}

export const MATH_SOURCES: Record<string, { label: string; url: string; usedFor: string }> = {
  'calc3-4-1': {
    label: 'OpenStax Calculus Volume 3 — 4.1 Functions of Several Variables',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-1-functions-of-several-variables',
    usedFor: 'Graphs z = f(x, y) as surfaces, vertical traces, examples with a plane, a paraboloid and sin x cos y',
  },
  'calc3-2-6': {
    label: 'OpenStax Calculus Volume 3 — 2.6 Quadric Surfaces',
    url: 'https://openstax.org/books/calculus-volume-3/pages/2-6-quadric-surfaces',
    usedFor: 'Traces of surfaces; elliptic and hyperbolic paraboloids',
  },
}
