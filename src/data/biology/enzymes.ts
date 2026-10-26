/*
 * Enzyme kinetics with the Michaelis–Menten equation, v = Vmax·[S] / (Km + [S]).
 *
 * v is the initial reaction rate, Vmax the rate the enzyme approaches when it is saturated with
 * substrate, and Km the substrate concentration at which v = Vmax / 2. The equation follows from
 * E + S ⇌ ES → E + P with a steady state of ES, initial rates (the reverse reaction ignored) and
 * far more substrate than enzyme (LibreTexts, Principles of Biochemistry 7.2).
 *
 * The parameter values in this lab are illustrative, not measurements of a real enzyme. Temperature
 * and pH are not modelled: they change Vmax and Km in ways no single formula captures, so the lab
 * describes them in words instead of applying invented factors.
 */

export interface KineticParams {
  /** µM/s (micromoles per litre per second). */
  vmax: number
  /** mM; must be greater than zero. */
  km: number
}

export interface EnzymeState {
  /** Substrate concentration, mM. */
  s: number
  a: KineticParams
  /** A second parameter set to compare with, or null. */
  b: KineticParams | null
}

/** Input bounds (illustrative units: [S] and Km in mM, Vmax and v in µM/s). */
export const ENZYME_LIMITS = {
  s: { min: 0, max: 100 },
  vmax: { min: 0.1, max: 1000 },
  km: { min: 0.01, max: 100 },
} as const

export const DEFAULT_ENZYME: EnzymeState = { s: 2, a: { vmax: 10, km: 2 }, b: null }
/** The second set offered when comparison is turned on: same Vmax, larger Km. */
export const DEFAULT_COMPARE: KineticParams = { vmax: 10, km: 8 }

/**
 * Initial rate in µM/s. Returns NaN for inputs outside the model (Km ≤ 0, negative [S] or Vmax,
 * or anything non-finite), so callers must validate first; never Infinity.
 */
export function rate(s: number, { vmax, km }: KineticParams): number {
  if (!Number.isFinite(s) || !Number.isFinite(vmax) || !Number.isFinite(km) || s < 0 || vmax < 0 || km <= 0) return Number.NaN
  return (vmax * s) / (km + s)
}

/** v as a fraction of Vmax: [S] / (Km + [S]). */
export const fractionOfVmax = (s: number, km: number) => (km > 0 && s >= 0 ? s / (km + s) : Number.NaN)

/** The [S] at which v reaches a given fraction f of Vmax (0 ≤ f < 1): [S] = f·Km / (1 − f). */
export function substrateFor(fraction: number, km: number): number {
  if (!(fraction >= 0 && fraction < 1) || !(km > 0)) return Number.NaN
  return (fraction * km) / (1 - fraction)
}

export type FieldError = { field: 's' | 'vmax' | 'km'; message: string }

/** Why a typed value can't be used, in words, or null if it is valid. */
export function checkValue(field: 's' | 'vmax' | 'km', raw: string): string | null {
  const t = raw.trim()
  if (t === '') return 'Enter a number.'
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return 'That is not a number.'
  const v = Number(t)
  const { min, max } = ENZYME_LIMITS[field]
  if (field === 'km' && v <= 0) return 'Km must be greater than zero: it is the substrate concentration that gives half the maximum rate.'
  if (field === 'vmax' && v <= 0) return 'Vmax must be greater than zero.'
  if (field === 's' && v < 0) return 'A concentration can’t be negative.'
  if (v < min || v > max) return `Use a value from ${min} to ${max}.`
  return null
}

export const validParams = (p: KineticParams) => checkValue('vmax', String(p.vmax)) === null && checkValue('km', String(p.km)) === null
export const validState = (st: EnzymeState) => checkValue('s', String(st.s)) === null && validParams(st.a) && (st.b === null || validParams(st.b))

/** Points of v against [S] from 0 to sMax for drawing. */
export function curve(p: KineticParams, sMax: number, n = 120): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = (sMax * i) / n
    return [s, rate(s, p)]
  })
}

/** A "nice" axis maximum at or above v (1, 2, 2.5, 5 × 10^k). */
export function niceMax(v: number): number {
  if (!(v > 0)) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p
  return 10 * p
}

/** The graph's [S] range: shows the current point and at least four times the larger Km. */
export const sRange = (st: EnzymeState) => niceMax(Math.max(st.s * 1.15, 4 * st.a.km, st.b ? 4 * st.b.km : 0))

export interface Investigation {
  id: 'low' | 'half' | 'saturation'
  title: string
  question: string
  /** The [S] to set, as a multiple of Km of set A. */
  sOverKm: number
  explain: (st: EnzymeState) => string
}

const pct = (x: number) => `${Math.round(x * 1000) / 10}%`

export const INVESTIGATIONS: readonly Investigation[] = [
  {
    id: 'low',
    title: 'Low substrate concentration',
    question: 'When [S] is much smaller than Km, how does the rate respond to more substrate?',
    sOverKm: 0.1,
    explain: (st) => {
      const v1 = rate(st.s, st.a)
      const v2 = rate(2 * st.s, st.a)
      return `At [S] = Km / 10, v is ${pct(v1 / st.a.vmax)} of Vmax. Doubling [S] multiplies v by ${(v2 / v1).toFixed(2)}, close to 2: here the rate is nearly proportional to [S], because most enzyme molecules are free.`
    },
  },
  {
    id: 'half',
    title: 'Half-maximal rate',
    question: 'What is the rate when [S] equals Km?',
    sOverKm: 1,
    explain: (st) => `With [S] = Km the equation becomes v = Vmax·Km / (Km + Km) = Vmax / 2, so v = ${fmt(rate(st.s, st.a))} µM/s, exactly half of Vmax = ${fmt(st.a.vmax)} µM/s. This is how Km is defined: the substrate concentration at half the maximum rate.`,
  },
  {
    id: 'saturation',
    title: 'Saturation',
    question: 'When [S] is far above Km, what limits the rate?',
    sOverKm: 20,
    explain: (st) => {
      const v1 = rate(st.s, st.a)
      const v2 = rate(2 * st.s, st.a)
      return `At [S] = 20 × Km, v is ${pct(v1 / st.a.vmax)} of Vmax. Doubling [S] raises v by only ${pct(v2 / v1 - 1)}: nearly every enzyme molecule is already occupied, so v approaches Vmax but never exceeds it.`
    },
  },
]

/** Three significant figures, without trailing zeros. */
export function fmt(v: number): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  return Number(v.toPrecision(3)).toString()
}

/* ---------- Conceptual catalytic cycle (not a simulation) ---------- */

export interface CycleStep {
  id: 'free' | 'bound' | 'reaction' | 'released'
  title: string
  text: string
}

export const CYCLE: readonly CycleStep[] = [
  { id: 'free', title: 'Enzyme and substrate', text: 'The substrate is the reactant the enzyme binds. The enzyme’s active site is the region where it binds.' },
  {
    id: 'bound',
    title: 'Enzyme–substrate complex',
    text: 'The substrate binds the active site, forming an enzyme–substrate complex. In the induced-fit view, the enzyme changes shape slightly as it binds.',
  },
  {
    id: 'reaction',
    title: 'Reaction at the active site',
    text: 'Within the complex the reaction happens by a pathway with a lower activation energy than without the enzyme. The enzyme does not change the reaction’s ΔG.',
  },
  { id: 'released', title: 'Products released', text: 'The products are released and the enzyme returns to its original state, unchanged, ready to bind another substrate.' },
]
