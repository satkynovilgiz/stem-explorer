import { formatTick, niceStep } from '../../lib/ticks'
import type { Trajectory } from '../../physics/projectile'

// Re-exported so existing Physics imports keep working.
export { formatTick, niceStep }

/** Tick values from 0 up to and including the first multiple of `step` ≥ `max`. */
export function ticks(max: number, step: number): number[] {
  const count = Math.max(1, Math.ceil(max / step - 1e-9))
  return Array.from({ length: count + 1 }, (_, i) => Number((i * step).toPrecision(12)))
}

export interface SceneBounds {
  /** Axis extents in metres (always at least 1 m so tiny flights stay visible). */
  xMax: number
  yMax: number
  xStep: number
  yStep: number
  /** Largest dimension, used to size markers and arrows. */
  extent: number
}

/** One shared frame for every trajectory on screen, so runs are drawn to the same scale. */
export function sceneBounds(trajectories: readonly Trajectory[]): SceneBounds {
  const rawX = Math.max(1, ...trajectories.map((t) => t.range))
  const rawY = Math.max(1, ...trajectories.map((t) => t.maxHeight))
  // Both axes use the same step so a metre looks the same in x and y.
  const step = niceStep(Math.max(rawX, rawY), 6)
  const xMax = ticks(rawX, step).at(-1)!
  const yMax = ticks(rawY, step).at(-1)!
  return { xMax, yMax, xStep: step, yStep: step, extent: Math.max(xMax, yMax) }
}

export interface VectorScales {
  /** Scene metres drawn per 1 m/s of velocity. */
  velocity: number
  /** Scene metres drawn per 1 m/s² of acceleration. */
  acceleration: number
}

/**
 * Arrow display scales. Velocity and acceleration have different units, so each has its own scale
 * (shown in the legend); arrow lengths of different quantities cannot be compared.
 */
export function vectorScales(trajectory: Trajectory, extent: number): VectorScales {
  const fastest = Math.max(1, Math.hypot(trajectory.v0x, trajectory.v0y), trajectory.impactSpeed)
  return {
    velocity: (0.25 * extent) / fastest,
    acceleration: (0.12 * extent) / trajectory.params.gravity,
  }
}

/** Schematic marker radius: enlarged for visibility, not the projectile's size. */
export function markerRadius(extent: number): number {
  return Math.max(0.05, extent * 0.012)
}

