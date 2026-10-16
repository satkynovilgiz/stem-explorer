import type { ParamSpec } from './projectile'

/*
 * Ideal horizontal spring–mass oscillator (OpenStax University Physics Vol. 1, §15.1–15.2):
 * a block on a frictionless surface, no damping, displacement x measured from equilibrium with +x to
 * the right. The block starts at rest (v₀ = 0) at x₀, so x(t) = x₀·cos(ωt) with ω = √(k/m).
 * Everything is evaluated analytically from the time t; there is no numerical integration, so the
 * playback speed and frame rate cannot change any result.
 */

export interface SpringParams {
  /** Mass m (kg), positive. */
  mass: number
  /** Spring constant k (N/m), positive. */
  k: number
  /** Initial displacement x₀ (m) from equilibrium; positive = stretched (block to the right). */
  x0: number
}

export type SpringKey = keyof SpringParams

export const SPRING_SPECS: Record<SpringKey, ParamSpec> = {
  mass: { label: 'Mass', symbol: 'm', unit: 'kg', min: 0.1, max: 10, step: 0.1, default: 1, decimals: 1 },
  k: { label: 'Spring constant', symbol: 'k', unit: 'N/m', min: 1, max: 200, step: 1, default: 20, decimals: 0 },
  x0: { label: 'Initial displacement', symbol: 'x₀', unit: 'm', min: -0.5, max: 0.5, step: 0.01, default: 0.2, decimals: 2 },
}

export const SPRING_KEYS: readonly SpringKey[] = ['mass', 'k', 'x0']

export const DEFAULT_SPRING: SpringParams = { mass: 1, k: 20, x0: 0.2 }

/** How many periods the time window (scrubber and graph) covers. */
export const PERIODS_SHOWN = 3

export interface SpringSolution {
  params: SpringParams
  /** Angular frequency ω = √(k/m) (rad/s). */
  omega: number
  /** Period T = 2π√(m/k) (s); independent of the amplitude. */
  period: number
  /** Frequency f = 1/T (Hz). */
  frequency: number
  /** Amplitude A = |x₀| (m). */
  amplitude: number
  /** Total mechanical energy E = ½kA² (J), constant. */
  energy: number
  /** Largest speed, Aω (m/s), reached at equilibrium. */
  maxSpeed: number
  /** Length of the recorded window (s): PERIODS_SHOWN periods. */
  duration: number
}

export function isValidSpringParam(key: SpringKey, value: number): boolean {
  const s = SPRING_SPECS[key]
  return Number.isFinite(value) && value >= s.min && value <= s.max
}

/** Snaps a value to its input step and range; null for non-numbers. */
export function normalizeSpringParam(key: SpringKey, value: number): number | null {
  if (!Number.isFinite(value)) return null
  const s = SPRING_SPECS[key]
  const clamped = Math.min(s.max, Math.max(s.min, value))
  return Number((Math.round(clamped / s.step) * s.step).toFixed(s.decimals))
}

export function solveSpring(params: SpringParams): SpringSolution {
  const omega = Math.sqrt(params.k / params.mass)
  const period = (2 * Math.PI) / omega
  const amplitude = Math.abs(params.x0)
  return {
    params,
    omega,
    period,
    frequency: 1 / period,
    amplitude,
    energy: 0.5 * params.k * amplitude ** 2,
    maxSpeed: amplitude * omega,
    duration: PERIODS_SHOWN * period,
  }
}

export interface SpringInstant {
  t: number
  /** Position from equilibrium (m). */
  x: number
  /** Velocity (m/s), positive to the right. */
  v: number
  /** Acceleration (m/s²). */
  a: number
  /** Restoring force F = −kx (N). */
  force: number
  /** Kinetic energy ½mv² (J). */
  kinetic: number
  /** Spring potential energy ½kx² (J). */
  potential: number
  /** Total mechanical energy (J): always equal to ½kA². */
  total: number
}

/** The state at time t (clamped to t ≥ 0; NaN becomes 0). */
export function springAt(solution: SpringSolution, time: number): SpringInstant {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0
  const { omega, params } = solution
  const phase = omega * t
  const x = params.x0 * Math.cos(phase)
  const v = -params.x0 * omega * Math.sin(phase)
  const a = -omega * omega * x
  const kinetic = 0.5 * params.mass * v * v
  const potential = 0.5 * params.k * x * x
  return { t, x, v, a, force: -params.k * x, kinetic, potential, total: kinetic + potential }
}
