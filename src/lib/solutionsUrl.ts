import { isAmountUnit, isVolumeUnit, LIMITS, type AmountUnit, type DilutionSolveFor, type MolaritySolveFor, type VolumeUnit } from '../chem/solutions'

/*
 * Links for the solutions calculator (chemistry, `csec=solutions`). Only the chosen tool's inputs
 * are written, and never the quantity being solved for:
 *   ?csec=solutions&st=molarity&sms=molarity&smn=0.133&smnu=mol&smv=355&smvu=mL
 *   ?csec=solutions&st=dilution&sds=c2&sc1=5&sv1=0.85&sv1u=L&sv2=1.8&sv2u=L
 * Values are the numbers typed, in the units chosen; each must be positive and within range.
 */

export type SolutionsTool = 'molarity' | 'dilution'

export interface MolarityForm {
  solveFor: MolaritySolveFor
  amount: number
  amountUnit: AmountUnit
  volume: number
  volumeUnit: VolumeUnit
  molarity: number
}

export interface DilutionForm {
  solveFor: DilutionSolveFor
  c1: number
  v1: number
  v1Unit: VolumeUnit
  c2: number
  v2: number
  v2Unit: VolumeUnit
}

export interface SolutionsState {
  tool: SolutionsTool
  molarity: MolarityForm
  dilution: DilutionForm
}

/** Defaults are OpenStax Chemistry 2e Examples 3.14 (molarity) and 3.19 (dilution). */
export const DEFAULT_SOLUTIONS: SolutionsState = {
  tool: 'molarity',
  molarity: { solveFor: 'molarity', amount: 0.133, amountUnit: 'mol', volume: 355, volumeUnit: 'mL', molarity: 1 },
  dilution: { solveFor: 'c2', c1: 5, v1: 0.85, v1Unit: 'L', c2: 1, v2: 1.8, v2Unit: 'L' },
}

export const SOLUTIONS_URL_KEYS = ['st', 'sms', 'smn', 'smnu', 'smv', 'smvu', 'smm', 'sds', 'sc1', 'sv1', 'sv1u', 'sc2', 'sv2', 'sv2u'] as const

const num = (raw: string) => (/^(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN)
/** A stored value: positive and at most `max` (in the unit it was typed in, so the bound is generous). */
const okValue = (v: number, max: number) => Number.isFinite(v) && v > 0 && v <= max

export function parseSolutionsState(search: string): { state: SolutionsState; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const state: SolutionsState = { tool: DEFAULT_SOLUTIONS.tool, molarity: { ...DEFAULT_SOLUTIONS.molarity }, dilution: { ...DEFAULT_SOLUTIONS.dilution } }
  const st = q.get('st')
  if (st === 'molarity' || st === 'dilution') state.tool = st
  else if (st !== null) invalid.push('st')

  const read = (key: string, max: number, set: (v: number) => void) => {
    const raw = q.get(key)
    if (raw === null) return
    const v = num(raw)
    if (okValue(v, max)) set(v)
    else invalid.push(key)
  }
  const unit = <U extends string>(key: string, test: (u: string) => u is U, set: (u: U) => void) => {
    const raw = q.get(key)
    if (raw === null) return
    if (test(raw)) set(raw)
    else invalid.push(key)
  }
  const m = state.molarity
  const sms = q.get('sms')
  if (sms === 'molarity' || sms === 'amount' || sms === 'volume') m.solveFor = sms
  else if (sms !== null) invalid.push('sms')
  read('smn', LIMITS.amountMol * 1000, (v) => (m.amount = v))
  unit('smnu', isAmountUnit, (u) => (m.amountUnit = u))
  read('smv', LIMITS.volumeL * 1000, (v) => (m.volume = v))
  unit('smvu', isVolumeUnit, (u) => (m.volumeUnit = u))
  read('smm', LIMITS.molarity, (v) => (m.molarity = v))

  const d = state.dilution
  const sds = q.get('sds')
  if (sds === 'c1' || sds === 'v1' || sds === 'c2' || sds === 'v2') d.solveFor = sds
  else if (sds !== null) invalid.push('sds')
  read('sc1', LIMITS.molarity, (v) => (d.c1 = v))
  read('sv1', LIMITS.volumeL * 1000, (v) => (d.v1 = v))
  unit('sv1u', isVolumeUnit, (u) => (d.v1Unit = u))
  read('sc2', LIMITS.molarity, (v) => (d.c2 = v))
  read('sv2', LIMITS.volumeL * 1000, (v) => (d.v2 = v))
  unit('sv2u', isVolumeUnit, (u) => (d.v2Unit = u))
  return { state, invalid }
}

export function solutionsEntries(s: SolutionsState): Record<string, string> {
  if (s.tool === 'molarity') {
    const m = s.molarity
    return {
      st: 'molarity',
      sms: m.solveFor,
      ...(m.solveFor !== 'amount' ? { smn: String(m.amount), smnu: m.amountUnit } : {}),
      ...(m.solveFor !== 'volume' ? { smv: String(m.volume), smvu: m.volumeUnit } : {}),
      ...(m.solveFor !== 'molarity' ? { smm: String(m.molarity) } : {}),
    }
  }
  const d = s.dilution
  return {
    st: 'dilution',
    sds: d.solveFor,
    ...(d.solveFor !== 'c1' ? { sc1: String(d.c1) } : {}),
    ...(d.solveFor !== 'v1' ? { sv1: String(d.v1), sv1u: d.v1Unit } : {}),
    ...(d.solveFor !== 'c2' ? { sc2: String(d.c2) } : {}),
    ...(d.solveFor !== 'v2' ? { sv2: String(d.v2), sv2u: d.v2Unit } : {}),
  }
}

/** `search` with the solutions keys replaced by `entries` (or removed, for other sections). */
export function withSolutionsParams(search: string, entries: Record<string, string> | null): string {
  const q = new URLSearchParams(search)
  for (const k of SOLUTIONS_URL_KEYS) q.delete(k)
  for (const [k, v] of Object.entries(entries ?? {})) q.set(k, v)
  return `?${q.toString()}`
}
