/*
 * Descriptive statistics and the binomial distribution. Pure functions, unit tested.
 * Sources: OpenStax Introductory Statistics 2e §2.2 (histograms), §2.3 (quartiles, IQR, potential
 * outliers), §2.4 (box plots), §2.5 (mean, median), §2.7 (population and sample variance and
 * standard deviation), §4.3 (binomial distribution, μ = np, σ² = npq).
 */

import { mulberry32 } from '../lib/random'

export const MAX_VALUES = 1000
/** Values beyond ±1e9 are refused so squared deviations stay far from overflow and rounding stays small. */
export const MAX_MAGNITUDE = 1e9

export interface ParsedValues {
  values: number[]
  /** Tokens that are not plain numbers, with their 1-based position in the list. */
  invalid: { token: string; position: number }[]
  tooLarge: { token: string; position: number }[]
  /** More than MAX_VALUES numbers were entered (the rest are ignored). */
  truncated: boolean
}

/** Splits on commas, semicolons, spaces, tabs and new lines; accepts −, + and decimals (with "." ). */
export function parseValues(text: string): ParsedValues {
  const tokens = text.split(/[\s,;]+/).filter(Boolean)
  const out: ParsedValues = { values: [], invalid: [], tooLarge: [], truncated: false }
  tokens.forEach((raw, i) => {
    const t = raw.replace('−', '-')
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) {
      out.invalid.push({ token: raw, position: i + 1 })
      return
    }
    const v = Number(t)
    if (!Number.isFinite(v) || Math.abs(v) > MAX_MAGNITUDE) {
      out.tooLarge.push({ token: raw, position: i + 1 })
      return
    }
    if (out.values.length >= MAX_VALUES) {
      out.truncated = true
      return
    }
    out.values.push(v)
  })
  return out
}

const sum = (xs: readonly number[]) => {
  // Neumaier-compensated summation keeps the mean accurate for long lists of mixed magnitudes.
  let s = 0
  let c = 0
  for (const x of xs) {
    const t = s + x
    c += Math.abs(s) >= Math.abs(x) ? s - t + x : x - t + s
    s = t
  }
  return s + c
}

/** Median of an already sorted list (mean of the two middle values when the count is even). */
export function medianSorted(sorted: readonly number[]): number {
  const n = sorted.length
  if (n === 0) return Number.NaN
  const mid = Math.floor(n / 2)
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Quartiles by the median-of-halves method (§2.3): Q2 is the median, Q1 the median of the lower
 * half and Q3 the median of the upper half. With an odd count the median itself is left out of
 * both halves. With a single value, Q1 = Q2 = Q3. Other conventions can give different values.
 */
export function quartiles(sorted: readonly number[]): { q1: number; q2: number; q3: number } {
  const n = sorted.length
  if (n === 0) return { q1: Number.NaN, q2: Number.NaN, q3: Number.NaN }
  if (n === 1) return { q1: sorted[0], q2: sorted[0], q3: sorted[0] }
  const half = Math.floor(n / 2)
  return { q1: medianSorted(sorted.slice(0, half)), q2: medianSorted(sorted), q3: medianSorted(sorted.slice(n - half)) }
}

export interface Summary {
  n: number
  sorted: number[]
  mean: number
  median: number
  min: number
  max: number
  range: number
  q1: number
  q3: number
  iqr: number
  /** Population variance σ² = Σ(x − μ)² / N and standard deviation σ. */
  populationVariance: number
  populationSd: number
  /** Sample variance s² = Σ(x − x̄)² / (n − 1) and s; null for a single value (undefined). */
  sampleVariance: number | null
  sampleSd: number | null
  /** Values more than 1.5 × IQR below Q1 or above Q3 (potential outliers, §2.3). */
  potentialOutliers: number[]
}

/** Summary statistics; null for an empty list. Deviations are taken from the mean (two-pass), which is numerically stable. */
export function summarize(values: readonly number[]): Summary | null {
  const n = values.length
  if (n === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mean = sum(sorted) / n
  const ss = sum(sorted.map((x) => (x - mean) ** 2))
  const { q1, q2, q3 } = quartiles(sorted)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  return {
    n,
    sorted,
    mean,
    median: q2,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    q1,
    q3,
    iqr,
    populationVariance: ss / n,
    populationSd: Math.sqrt(ss / n),
    sampleVariance: n > 1 ? ss / (n - 1) : null,
    sampleSd: n > 1 ? Math.sqrt(ss / (n - 1)) : null,
    potentialOutliers: sorted.filter((x) => x < lo || x > hi),
  }
}

export interface Histogram {
  start: number
  width: number
  counts: number[]
  /** Bin edges, length counts.length + 1. */
  edges: number[]
}

export const MAX_BINS = 30

/**
 * Equal-width bins from the minimum to the maximum. Each bin includes its left edge and excludes
 * its right edge, except the last, which includes the maximum. When every value is the same, one
 * bin of width 1 is centred on it.
 */
export function histogram(values: readonly number[], bins: number): Histogram | null {
  if (values.length === 0 || !Number.isInteger(bins) || bins < 1 || bins > MAX_BINS) return null
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 0.5
    max += 0.5
    bins = 1
  }
  const width = (max - min) / bins
  const counts = new Array<number>(bins).fill(0)
  for (const x of values) counts[Math.min(bins - 1, Math.floor((x - min) / width))]++
  return { start: min, width, counts, edges: Array.from({ length: bins + 1 }, (_, i) => (i === bins ? max : min + i * width)) }
}

/** A starting number of bins: about √n, kept within 5–15 as many textbooks suggest (§2.2). */
export const suggestedBins = (n: number) => Math.min(15, Math.max(5, Math.round(Math.sqrt(n))))

/* ---------- Binomial distribution ---------- */

export const MAX_TRIALS = 500
export const MAX_REPETITIONS = 10000

const logFactorials: number[] = [0]
function logFactorial(k: number): number {
  for (let i = logFactorials.length; i <= k; i++) logFactorials.push(logFactorials[i - 1] + Math.log(i))
  return logFactorials[k]
}

export const isValidTrials = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_TRIALS
export const isValidProbability = (p: number) => Number.isFinite(p) && p >= 0 && p <= 1

/**
 * Exact P(X = k) for k = 0 … n, X ~ Binomial(n, p). Computed in log space so large n does not
 * overflow or underflow the binomial coefficient; p = 0 and p = 1 are handled exactly.
 */
export function binomialPmf(n: number, p: number): number[] | null {
  if (!isValidTrials(n) || !isValidProbability(p)) return null
  if (p === 0) return Array.from({ length: n + 1 }, (_, k) => (k === 0 ? 1 : 0))
  if (p === 1) return Array.from({ length: n + 1 }, (_, k) => (k === n ? 1 : 0))
  const lp = Math.log(p)
  const lq = Math.log1p(-p)
  const lnF = logFactorial(n)
  return Array.from({ length: n + 1 }, (_, k) => Math.exp(lnF - logFactorial(k) - logFactorial(n - k) + k * lp + (n - k) * lq))
}

export function binomialMoments(n: number, p: number) {
  const q = 1 - p
  return { mean: n * p, variance: n * p * q, sd: Math.sqrt(n * p * q) }
}

/**
 * Repeats a binomial experiment `repetitions` times with a seeded generator (each trial a success
 * when the next number is below p) and counts how often each k occurred. Independent of the
 * exact distribution above.
 */
export function simulateBinomial(n: number, p: number, repetitions: number, seed: number): number[] | null {
  if (!isValidTrials(n) || !isValidProbability(p) || !Number.isInteger(repetitions) || repetitions < 1 || repetitions > MAX_REPETITIONS) return null
  const rand = mulberry32(seed)
  const counts = new Array<number>(n + 1).fill(0)
  for (let r = 0; r < repetitions; r++) {
    let k = 0
    for (let t = 0; t < n; t++) if (rand() < p) k++
    counts[k]++
  }
  return counts
}

/** Formats a number for tables: up to 4 significant figures, without exponent for everyday sizes. */
export function fmtStat(x: number | null): string {
  if (x === null || !Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const a = Math.abs(x)
  if (a >= 1e6 || a < 1e-4) return x.toExponential(3)
  return Number(x.toPrecision(4)).toString()
}
