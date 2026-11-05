import type { SubjectId } from '../data/subjects'

/*
 * Calculators for every subject share one shape: typed inputs (kept as text, so a half-typed
 * number is never "corrected" under the student's fingers), a pure compute function that returns
 * the answers and each worked step, the assumptions, and the sources for the relation used.
 */

/** Every input as typed, by field id. */
export type Values = Readonly<Record<string, string>>

interface FieldBase {
  id: string
  label: string
  /** The value shown when the calculator opens: a worked example. */
  initial: string
  /** Shown only when this returns true (e.g. the inputs of the chosen "solve for"). */
  showIf?: (v: Values) => boolean
}
export type Field =
  | (FieldBase & { kind: 'number'; unit?: string; optional?: boolean })
  | (FieldBase & { kind: 'text'; hint?: string })
  | (FieldBase & { kind: 'choice'; options: readonly { value: string; label: string }[] })

export interface Answer {
  label: string
  value: string
}
export type Outcome = { ok: true; answers: readonly Answer[]; steps: readonly string[]; note?: string } | { ok: false; reason: string; field?: string }

export interface Calculator {
  id: string
  subject: SubjectId
  title: string
  /** What it calculates, in one sentence. */
  summary: string
  /** The relation used, as plain text. */
  formula: string
  fields: readonly Field[]
  compute: (v: Values) => Outcome
  /** What the calculation assumes or leaves out. */
  assumptions: string
  sourceIds: readonly string[]
  /** Where the app models the same idea. */
  related?: { label: string; href: string }
  /** Words students search for (the title and summary are searched too). */
  keywords: readonly string[]
}

class InputProblem extends Error {
  field?: string
}

/** Stops the calculation with a message for the student. */
export function problem(reason: string, field?: string): never {
  const e = new InputProblem(reason)
  e.field = field
  throw e
}

/** Runs a calculation; an input problem becomes a message instead of an answer. */
export function solve(fn: () => { answers: Answer[]; steps: string[]; note?: string }): Outcome {
  try {
    return { ok: true, ...fn() }
  } catch (e) {
    if (e instanceof InputProblem) return { ok: false, reason: e.message, ...(e.field ? { field: e.field } : {}) }
    throw e
  }
}

/** A complete number: "2", "-0.5", ".5", "6.02e23" or "6.02E-23" (a typographic minus is accepted). */
export function parseNumber(text: string): number {
  const t = text.trim().replace(/[−–]/g, '-')
  return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t) ? Number(t) : Number.NaN
}

export const isBlank = (v: Values, id: string) => (v[id] ?? '').trim() === ''

/** Reads a field as a number, or stops with a message saying what is wrong with it. */
export function read(v: Values, id: string, label: string, rule: 'positive' | 'nonNegative' | 'any' | 'nonZero' = 'positive'): number {
  const n = parseNumber(v[id] ?? '')
  if (!Number.isFinite(n)) problem(isBlank(v, id) ? `Enter ${label}.` : `${capital(label)} is not a number: use digits, a decimal point and, for powers of ten, e (6.02e23).`, id)
  if (rule === 'positive' && n <= 0) problem(`${capital(label)} must be greater than zero.`, id)
  if (rule === 'nonNegative' && n < 0) problem(`${capital(label)} cannot be negative.`, id)
  if (rule === 'nonZero' && n === 0) problem(`${capital(label)} cannot be zero.`, id)
  return n
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }

/**
 * Rounded to `sig` significant figures without padding (2, not 2.000: inputs are exact as typed),
 * with a true minus sign and × 10ⁿ for very large or very small values.
 */
export function fmt(x: number, sig = 4): string {
  if (!Number.isFinite(x)) return '—'
  const r = Number(x.toPrecision(sig))
  if (r === 0) return '0'
  const abs = Math.abs(r)
  let text: string
  if (abs >= 1e6 || abs < 1e-4) {
    const [m, e] = r.toExponential(sig - 1).split('e')
    text = `${m.replace(/\.?0+$/, '')} × 10${String(Number(e)).replace(/[-0-9]/g, (c) => SUP[c])}`
  } else text = String(r)
  return text.replace(/^-/, '−')
}
