import { defaultFnParams, FUNCTION_IDS, getFunction, type FunctionId } from '../math/functions'
import type { Mat2, Vec2 } from '../math/linear'

/*
 * Mathematics sections. Links without `msec` are surface links, so every older link opens as before.
 *   ?msec=functions&fn=sine&fA=2&fk=1&fx=1&ia=0&ib=3.14
 *   ?msec=vectors&vu=2,1&vv=-1,2&vk=1.5&vm=1,0,0,1
 */

export type MathSection = 'surfaces' | 'functions' | 'vectors'

export interface FunctionsState {
  fn: FunctionId
  params: Record<string, number>
  /** Inspected x. */
  x: number
  a: number
  b: number
}

export interface VectorsState {
  u: Vec2
  v: Vec2
  k: number
  m: Mat2
}

export const DEFAULT_FUNCTIONS: FunctionsState = { fn: 'sine', params: defaultFnParams(getFunction('sine')), x: 1, a: 0, b: 3 }
export const DEFAULT_VECTORS: VectorsState = { u: [2, 1], v: [-1, 2], k: 1.5, m: [1, 1, 0, 1] }

export const X_RANGE = { min: -10, max: 10 }
export const VEC_RANGE = { min: -5, max: 5 }
export const MAT_RANGE = { min: -3, max: 3 }
export const K_RANGE = { min: -3, max: 3 }

const num = (raw: string | null) => (raw !== null && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN)
const inRange = (v: number, r: { min: number; max: number }) => Number.isFinite(v) && v >= r.min && v <= r.max
const round = (v: number, d = 2) => Number(v.toFixed(d))

export function parseMathSection(search: string): { section: MathSection; invalid: string[] } {
  const raw = new URLSearchParams(search).get('msec')
  const section: MathSection = raw === 'functions' || raw === 'vectors' ? raw : 'surfaces'
  return { section, invalid: raw !== null && section !== raw ? ['msec'] : [] }
}

export function parseFunctionsState(search: string): { state: FunctionsState; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const rawFn = q.get('fn')
  const fn = rawFn && (FUNCTION_IDS as readonly string[]).includes(rawFn) ? (rawFn as FunctionId) : DEFAULT_FUNCTIONS.fn
  if (rawFn !== null && fn !== rawFn) invalid.push('fn')
  const def = getFunction(fn)
  const params = defaultFnParams(def)
  for (const s of def.params) {
    const raw = q.get(`f${s.key}`)
    if (raw === null) continue
    const v = num(raw)
    if (inRange(v, s)) params[s.key] = round(Math.round(v / s.step) * s.step, s.decimals)
    else invalid.push(`f${s.key}`)
  }
  const read = (key: string, fallback: number) => {
    const raw = q.get(key)
    if (raw === null) return fallback
    const v = num(raw)
    if (inRange(v, X_RANGE)) return round(v)
    invalid.push(key)
    return fallback
  }
  const domainOk = (x: number) => def.inDomain(params, x)
  let x = read('fx', fn === 'logarithmic' ? 1 : DEFAULT_FUNCTIONS.x)
  let a = read('ia', fn === 'logarithmic' ? 1 : DEFAULT_FUNCTIONS.a)
  let b = read('ib', DEFAULT_FUNCTIONS.b)
  // Values outside the function's domain (e.g. x ≤ 0 for ln) are rejected, not silently moved.
  if (!domainOk(x)) {
    invalid.push('fx')
    x = 1
  }
  if (!domainOk(a) || !domainOk(b)) {
    invalid.push('ia')
    a = 1
    b = 3
  }
  return { state: { fn, params, x, a, b }, invalid }
}

export function functionsEntries(s: FunctionsState): Record<string, string> {
  return {
    msec: 'functions',
    fn: s.fn,
    ...Object.fromEntries(Object.entries(s.params).map(([k, v]) => [`f${k}`, String(v)])),
    fx: String(s.x),
    ia: String(s.a),
    ib: String(s.b),
  }
}

function parseList(raw: string | null, n: number, range: { min: number; max: number }): number[] | null {
  if (raw === null) return null
  const parts = raw.split(',').map(num)
  return parts.length === n && parts.every((v) => inRange(v, range)) ? parts.map((v) => round(v)) : null
}

export function parseVectorsState(search: string): { state: VectorsState; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const state: VectorsState = { ...DEFAULT_VECTORS }
  const take = (key: string, n: number, range: { min: number; max: number }, apply: (v: number[]) => void) => {
    const raw = q.get(key)
    if (raw === null) return
    const v = parseList(raw, n, range)
    if (v) apply(v)
    else invalid.push(key)
  }
  take('vu', 2, VEC_RANGE, (v) => (state.u = [v[0], v[1]]))
  take('vv', 2, VEC_RANGE, (v) => (state.v = [v[0], v[1]]))
  take('vk', 1, K_RANGE, (v) => (state.k = v[0]))
  take('vm', 4, MAT_RANGE, (v) => (state.m = [v[0], v[1], v[2], v[3]]))
  return { state, invalid }
}

export const vectorsEntries = (s: VectorsState): Record<string, string> => ({ msec: 'vectors', vu: s.u.join(','), vv: s.v.join(','), vk: String(s.k), vm: s.m.join(',') })

export const MATH_SECTION_KEYS = ['msec', 'fn', 'fx', 'ia', 'ib', 'vu', 'vv', 'vk', 'vm', 'fm', 'fb', 'fa', 'fc', 'fA', 'fk'] as const

/** `search` with only this section's keys (surface keys are kept: the surfaces section owns them). */
export function withMathSection(search: string, entries: Record<string, string>): string {
  const q = new URLSearchParams(search)
  for (const k of MATH_SECTION_KEYS) q.delete(k)
  for (const [k, v] of Object.entries(entries)) q.set(k, v)
  return `?${q.toString()}`
}
