/*
 * Ideal DC circuits: an ideal voltage source (no internal resistance, so the terminal voltage equals
 * the emf), ideal wires (no resistance) and ohmic resistors of fixed positive resistance
 * (OpenStax University Physics Vol. 2 §9.4, 9.5, 10.1, 10.2). Only predefined arrangements; no
 * free-form circuit building. SI units: volts, ohms, amperes, watts.
 */

export type Arrangement = 'series-2' | 'series-3' | 'parallel-2' | 'parallel-3' | 'mixed'
export const ARRANGEMENTS: readonly Arrangement[] = ['series-2', 'series-3', 'parallel-2', 'parallel-3', 'mixed']
export const ARRANGEMENT_LABEL: Record<Arrangement, string> = {
  'series-2': 'Two resistors in series',
  'series-3': 'Three resistors in series',
  'parallel-2': 'Two resistors in parallel',
  'parallel-3': 'Three resistors in parallel',
  mixed: 'R₁ in series with (R₂ parallel to R₃)',
}
export const resistorCount = (a: Arrangement) => (a === 'series-2' || a === 'parallel-2' ? 2 : 3)

export type CircuitKey = 'emf' | 'r1' | 'r2' | 'r3'
export interface CircuitParams {
  arrangement: Arrangement
  emf: number
  r1: number
  r2: number
  r3: number
}

export const CIRCUIT_SPECS: Record<CircuitKey, { label: string; symbol: string; unit: string; min: number; max: number; step: number; default: number }> = {
  emf: { label: 'Source voltage', symbol: 'ε', unit: 'V', min: 0.5, max: 24, step: 0.5, default: 12 },
  r1: { label: 'Resistance R₁', symbol: 'R₁', unit: 'Ω', min: 1, max: 1000, step: 1, default: 100 },
  r2: { label: 'Resistance R₂', symbol: 'R₂', unit: 'Ω', min: 1, max: 1000, step: 1, default: 200 },
  r3: { label: 'Resistance R₃', symbol: 'R₃', unit: 'Ω', min: 1, max: 1000, step: 1, default: 300 },
}
export const CIRCUIT_KEYS: readonly CircuitKey[] = ['emf', 'r1', 'r2', 'r3']
export const DEFAULT_CIRCUIT: CircuitParams = { arrangement: 'series-2', emf: 12, r1: 100, r2: 200, r3: 300 }

export function isValidCircuitParam(key: CircuitKey, value: number): boolean {
  const s = CIRCUIT_SPECS[key]
  return Number.isFinite(value) && value >= s.min && value <= s.max && value > 0
}

/** Snaps to the input step inside the range; null for non-finite input. */
export function normalizeCircuitParam(key: CircuitKey, value: number): number | null {
  if (!Number.isFinite(value)) return null
  const s = CIRCUIT_SPECS[key]
  const stepped = Math.round(value / s.step) * s.step
  return Number(Math.min(s.max, Math.max(s.min, stepped)).toFixed(2))
}

export interface ResistorResult {
  id: 'r1' | 'r2' | 'r3'
  resistance: number
  current: number
  voltage: number
  power: number
}

export interface CircuitSolution {
  equivalent: number
  current: number
  resistors: ResistorResult[]
  /** Power supplied by the source, P = εI. */
  sourcePower: number
  /** Sum of the power dissipated in the resistors (equals sourcePower for an ideal circuit). */
  dissipated: number
}

const parallel = (...rs: number[]) => 1 / rs.reduce((a, r) => a + 1 / r, 0)
const res = (id: ResistorResult['id'], r: number, current: number): ResistorResult => ({ id, resistance: r, current, voltage: current * r, power: current * current * r })

export function solveCircuit(p: CircuitParams): CircuitSolution {
  const { emf, r1, r2, r3 } = p
  let equivalent: number
  let resistors: ResistorResult[]
  switch (p.arrangement) {
    case 'series-2':
    case 'series-3': {
      const rs = p.arrangement === 'series-2' ? [r1, r2] : [r1, r2, r3]
      equivalent = rs.reduce((a, r) => a + r, 0)
      const i = emf / equivalent
      resistors = rs.map((r, k) => res((['r1', 'r2', 'r3'] as const)[k], r, i))
      break
    }
    case 'parallel-2':
    case 'parallel-3': {
      const rs = p.arrangement === 'parallel-2' ? [r1, r2] : [r1, r2, r3]
      equivalent = parallel(...rs)
      // Each branch has the full source voltage across it.
      resistors = rs.map((r, k) => res((['r1', 'r2', 'r3'] as const)[k], r, emf / r))
      break
    }
    case 'mixed': {
      const r23 = parallel(r2, r3)
      equivalent = r1 + r23
      const i = emf / equivalent
      const v23 = i * r23
      resistors = [res('r1', r1, i), res('r2', r2, v23 / r2), res('r3', r3, v23 / r3)]
      break
    }
  }
  const current = emf / equivalent
  return { equivalent, current, resistors, sourcePower: emf * current, dissipated: resistors.reduce((a, r) => a + r.power, 0) }
}
