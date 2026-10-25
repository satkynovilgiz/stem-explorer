/*
 * Solution concentration (OpenStax Chemistry 2e §3.3): molarity M = moles of solute ÷ litres of
 * solution, and dilution C₁V₁ = C₂V₂, which holds because adding solvent does not change the
 * amount of solute (n₁ = n₂). Volumes here are always volumes of solution, never of solvent.
 * Volume units (§1.4): 1 L = 1 dm³, 1 mL = 1 cm³ = 1/1000 L. Pure functions, unit tested.
 */

export type VolumeUnit = 'L' | 'mL' | 'dm3' | 'cm3'
export type AmountUnit = 'mol' | 'mmol'

export const VOLUME_UNITS: readonly { id: VolumeUnit; label: string; litres: number }[] = [
  { id: 'L', label: 'L', litres: 1 },
  { id: 'mL', label: 'mL', litres: 0.001 },
  { id: 'dm3', label: 'dm³', litres: 1 },
  { id: 'cm3', label: 'cm³', litres: 0.001 },
]
export const AMOUNT_UNITS: readonly { id: AmountUnit; label: string; mol: number }[] = [
  { id: 'mol', label: 'mol', mol: 1 },
  { id: 'mmol', label: 'mmol', mol: 0.001 },
]

export const isVolumeUnit = (u: string): u is VolumeUnit => VOLUME_UNITS.some((x) => x.id === u)
export const isAmountUnit = (u: string): u is AmountUnit => AMOUNT_UNITS.some((x) => x.id === u)
export const volumeLabel = (u: VolumeUnit) => VOLUME_UNITS.find((x) => x.id === u)!.label

export const toLitres = (v: number, unit: VolumeUnit) => v * VOLUME_UNITS.find((x) => x.id === unit)!.litres
export const fromLitres = (L: number, unit: VolumeUnit) => L / VOLUME_UNITS.find((x) => x.id === unit)!.litres
export const toMol = (n: number, unit: AmountUnit) => n * AMOUNT_UNITS.find((x) => x.id === unit)!.mol
export const convertVolume = (v: number, from: VolumeUnit, to: VolumeUnit) => fromLitres(toLitres(v, from), to)

/** Upper limits that keep inputs to a sensible classroom range (not chemical limits). */
export const LIMITS = { amountMol: 100, volumeL: 100, molarity: 20 }

export type Problem = { ok: false; reason: string }
export type Solved<T> = { ok: true; value: T } | Problem

const bad = (reason: string): Problem => ({ ok: false, reason })

function checkPositive(name: string, v: number, max: number, unit: string): Problem | null {
  if (!Number.isFinite(v)) return bad(`Enter a number for the ${name}.`)
  if (v < 0) return bad(`The ${name} can't be negative.`)
  if (v === 0) return bad(name.includes('volume') ? `The ${name} must be greater than zero: a solution has to occupy some volume, and dividing by zero is undefined.` : `The ${name} must be greater than zero.`)
  if (v > max) return bad(`Keep the ${name} at or below ${max} ${unit} in this calculator.`)
  return null
}

/* ---------- Molarity ---------- */

export type MolaritySolveFor = 'molarity' | 'amount' | 'volume'

export interface MolarityInput {
  solveFor: MolaritySolveFor
  /** mol */
  amount: number
  /** L of solution */
  volume: number
  /** mol/L */
  molarity: number
}

export interface MolarityResult {
  amount: number
  volume: number
  molarity: number
}

/** Solves M = n / V for whichever quantity is asked; all inputs in mol, L (of solution) and mol/L. */
export function solveMolarity(i: MolarityInput): Solved<MolarityResult> {
  const checks = {
    amount: () => checkPositive('amount of solute', i.amount, LIMITS.amountMol, 'mol'),
    volume: () => checkPositive('volume of solution', i.volume, LIMITS.volumeL, 'L'),
    molarity: () => checkPositive('molarity', i.molarity, LIMITS.molarity, 'M'),
  }
  for (const k of ['amount', 'volume', 'molarity'] as const) {
    if (k === i.solveFor) continue
    const p = checks[k]()
    if (p) return p
  }
  if (i.solveFor === 'molarity') {
    const molarity = i.amount / i.volume
    if (molarity > LIMITS.molarity) return bad(`That would be ${molarity.toPrecision(3)} M, above the ${LIMITS.molarity} M limit of this calculator; real solutes also have a maximum solubility.`)
    return { ok: true, value: { amount: i.amount, volume: i.volume, molarity } }
  }
  if (i.solveFor === 'amount') return { ok: true, value: { amount: i.molarity * i.volume, volume: i.volume, molarity: i.molarity } }
  const volume = i.amount / i.molarity
  if (volume > LIMITS.volumeL) return bad(`That would need ${volume.toPrecision(3)} L of solution, above the ${LIMITS.volumeL} L limit of this calculator.`)
  return { ok: true, value: { amount: i.amount, volume, molarity: i.molarity } }
}

/* ---------- Dilution ---------- */

export type DilutionSolveFor = 'c1' | 'v1' | 'c2' | 'v2'

export interface DilutionInput {
  solveFor: DilutionSolveFor
  /** mol/L */
  c1: number
  /** L of the stock solution taken */
  v1: number
  /** mol/L */
  c2: number
  /** L of the final (diluted) solution */
  v2: number
}

export interface DilutionResult {
  c1: number
  v1: number
  c2: number
  v2: number
  /** n = C₁V₁ = C₂V₂, mol (unchanged by dilution). */
  amount: number
  /** V₂ / V₁ = C₁ / C₂. */
  factor: number
}

/**
 * Solves C₁V₁ = C₂V₂. Assumptions (stated in the app): only solvent is added; the amount of solute
 * is unchanged; V₂ is the total volume of the final solution. Requests that a dilution cannot
 * satisfy (a final concentration above the stock, a final volume below the volume taken) are refused.
 */
export function solveDilution(i: DilutionInput): Solved<DilutionResult> {
  const checks = {
    c1: () => checkPositive('stock concentration C₁', i.c1, LIMITS.molarity, 'M'),
    v1: () => checkPositive('stock volume V₁', i.v1, LIMITS.volumeL, 'L'),
    c2: () => checkPositive('final concentration C₂', i.c2, LIMITS.molarity, 'M'),
    v2: () => checkPositive('final volume V₂', i.v2, LIMITS.volumeL, 'L'),
  }
  for (const k of ['c1', 'v1', 'c2', 'v2'] as const) {
    if (k === i.solveFor) continue
    const p = checks[k]()
    if (p) return p
  }
  let { c1, v1, c2, v2 } = i
  if (i.solveFor === 'c2') c2 = (c1 * v1) / v2
  else if (i.solveFor === 'v2') v2 = (c1 * v1) / c2
  else if (i.solveFor === 'c1') c1 = (c2 * v2) / v1
  else v1 = (c2 * v2) / c1

  const eps = 1e-12
  if (c2 > c1 * (1 + eps))
    return bad(
      i.solveFor === 'c1' || i.solveFor === 'v1'
        ? 'Those values describe a final solution more concentrated than the stock. Adding solvent can only lower the concentration, so no dilution gives that.'
        : 'Diluting can only lower the concentration: the final concentration can’t be higher than the stock, and the final volume can’t be smaller than the volume of stock taken.',
    )
  if (v2 < v1 * (1 - eps)) return bad('The final volume can’t be smaller than the volume of stock taken: dilution only adds solvent.')
  if (c1 > LIMITS.molarity || v1 > LIMITS.volumeL || v2 > LIMITS.volumeL) return bad('The answer falls outside the ranges this calculator accepts (up to 20 M and 100 L).')
  return { ok: true, value: { c1, v1, c2, v2, amount: c1 * v1, factor: v2 / v1 } }
}

/** Significant-figure formatting shared by the readouts and the worked steps. */
export function sig(v: number, n = 3): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return '0'
  return Number(v.toPrecision(n)).toString()
}
