/*
 * Boyle's law: a fixed amount of an ideal gas at constant temperature, P₁V₁ = P₂V₂ (OpenStax
 * Chemistry 2e §9.2). The user sets the starting state (P₁, V₁) and a new volume V₂; the new
 * pressure P₂ = P₁V₁ / V₂ is the one dependent variable. Pressures are absolute, in kPa
 * (1 atm = 101.325 kPa = 760 torr, §9.1); volumes in litres. Temperature is fixed at 293.15 K and
 * only used to report the amount of gas, n = PV / RT with R = 8.314 kPa·L/(mol·K) (§9.2).
 *
 * Why absolute: a gauge reading is pressure relative to the atmosphere and can be zero or negative
 * (University Physics Vol. 1 §14.2), so it cannot be inversely proportional to volume.
 */

export type GasKey = 'p1' | 'v1' | 'v2'
export type GasParams = Record<GasKey, number>

export const GAS_SPECS: Record<GasKey, { label: string; symbol: string; unit: string; min: number; max: number; step: number; decimals: number }> = {
  p1: { label: 'Starting pressure (absolute)', symbol: 'P₁', unit: 'kPa', min: 10, max: 500, step: 0.1, decimals: 1 },
  v1: { label: 'Starting volume', symbol: 'V₁', unit: 'L', min: 0.5, max: 10, step: 0.05, decimals: 2 },
  v2: { label: 'New volume', symbol: 'V₂', unit: 'L', min: 0.25, max: 20, step: 0.05, decimals: 2 },
}
export const GAS_KEYS: readonly GasKey[] = ['p1', 'v1', 'v2']
export const DEFAULT_GAS: GasParams = { p1: 101.3, v1: 2, v2: 1 }

/** Fixed temperature (K) and gas constant (kPa·L/(mol·K)). */
export const GAS_TEMPERATURE = 293.15
export const R_KPA_L = 8.314
export const KPA_PER_ATM = 101.325
export const TORR_PER_ATM = 760

export const kPaToAtm = (kPa: number) => kPa / KPA_PER_ATM
export const kPaToTorr = (kPa: number) => (kPa / KPA_PER_ATM) * TORR_PER_ATM
/** Litres to cubic metres and millilitres. */
export const litresToM3 = (L: number) => L / 1000
export const litresToMl = (L: number) => L * 1000

export function isValidGasParam(key: GasKey, v: number): boolean {
  const s = GAS_SPECS[key]
  return Number.isFinite(v) && v >= s.min && v <= s.max
}

export function normalizeGasParam(key: GasKey, v: number): number | null {
  return isValidGasParam(key, v) ? Number(v.toFixed(GAS_SPECS[key].decimals)) : null
}

/**
 * Why a typed value can't be used, in plain words, or null if it can. Zero and negative values are
 * explained physically, not just as "out of range".
 */
export function gasInputProblem(key: GasKey, v: number): string | null {
  const s = GAS_SPECS[key]
  if (!Number.isFinite(v)) return 'Enter a number.'
  if (v <= 0)
    return key === 'p1'
      ? 'Absolute pressure must be greater than zero: zero would mean no gas pushing at all, and a negative absolute pressure does not exist. (A negative gauge reading means below atmospheric, not below zero.)'
      : 'A volume must be greater than zero: the gas has to occupy some space.'
  if (v < s.min || v > s.max) return `Use ${s.min}–${s.max} ${s.unit}; nothing was changed.`
  return null
}

export interface BoyleResult {
  /** New pressure, kPa (absolute). */
  p2: number
  /** P₁V₁ = P₂V₂, kPa·L (numerically joules). */
  k: number
  /** Amount of gas at the fixed temperature, mol. */
  moles: number
  /** P₂ / P₁ = V₁ / V₂. */
  ratio: number
  change: 'compressed' | 'expanded' | 'unchanged'
}

/** P₂ = P₁V₁ / V₂; null for non-positive or non-finite inputs. */
export function boyle(p1: number, v1: number, v2: number): BoyleResult | null {
  if (![p1, v1, v2].every((x) => Number.isFinite(x) && x > 0)) return null
  const k = p1 * v1
  const p2 = k / v2
  return { p2, k, moles: k / (R_KPA_L * GAS_TEMPERATURE), ratio: p2 / p1, change: v2 < v1 ? 'compressed' : v2 > v1 ? 'expanded' : 'unchanged' }
}

/** Points (V, P) on the isotherm P = k / V, for V in [vMin, vMax]. */
export function isotherm(k: number, vMin = GAS_SPECS.v2.min, vMax = GAS_SPECS.v2.max, n = 200): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const v = vMin + ((vMax - vMin) * i) / (n - 1)
    return [v, k / v]
  })
}

/** Significant-figure display used by the lab's readouts, so the graph labels and readouts agree. */
export function formatSig(v: number, sig = 4): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  const d = Math.max(0, sig - 1 - Math.floor(Math.log10(Math.abs(v))))
  return v.toFixed(Math.min(d, 6))
}
