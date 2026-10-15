/*
 * Ideal projectile motion (OpenStax University Physics Volume 1, §3.5 and §4.3).
 *
 * Coordinates: x horizontal (positive in the launch direction), y vertical (positive up),
 * origin on the ground directly below the launch point. Ground is the line y = 0.
 * Units: SI — metres, seconds, m/s, m/s². Angles enter in degrees and are converted to radians here.
 *
 * Assumptions: no air resistance; constant downward acceleration a = (0, −g); point-like projectile;
 * flat ground at y = 0; motion stops at impact (no bounce).
 *
 * Every state is evaluated analytically from the elapsed time t — nothing accumulates per frame.
 */

export interface LaunchParams {
  /** Launch speed v₀ (m/s). */
  speed: number
  /** Elevation angle θ above the horizontal (degrees). */
  angleDeg: number
  /** Launch height y₀ above the ground (m). */
  height: number
  /** Magnitude of the downward gravitational acceleration g (m/s²), always positive. */
  gravity: number
}

export type ParamKey = keyof LaunchParams

export interface ParamSpec {
  label: string
  symbol: string
  unit: string
  min: number
  max: number
  step: number
  default: number
  /** Decimal places shown in inputs, matching `step`. */
  decimals: number
}

export const PARAM_SPECS: Record<ParamKey, ParamSpec> = {
  speed: { label: 'Launch speed', symbol: 'v₀', unit: 'm/s', min: 0, max: 50, step: 0.5, default: 20, decimals: 1 },
  angleDeg: { label: 'Launch angle', symbol: 'θ', unit: '°', min: 0, max: 90, step: 1, default: 45, decimals: 0 },
  height: { label: 'Initial height', symbol: 'y₀', unit: 'm', min: 0, max: 50, step: 0.5, default: 0, decimals: 1 },
  gravity: { label: 'Gravity', symbol: 'g', unit: 'm/s²', min: 1, max: 25, step: 0.01, default: 9.81, decimals: 2 },
}

export const PARAM_KEYS: readonly ParamKey[] = ['speed', 'angleDeg', 'height', 'gravity']

export const DEFAULT_PARAMS: LaunchParams = {
  speed: PARAM_SPECS.speed.default,
  angleDeg: PARAM_SPECS.angleDeg.default,
  height: PARAM_SPECS.height.default,
  gravity: PARAM_SPECS.gravity.default,
}

export const degToRad = (deg: number) => (deg * Math.PI) / 180

/** True when `value` is a finite number inside the parameter's supported range. */
export function isValidParam(key: ParamKey, value: number): boolean {
  const { min, max } = PARAM_SPECS[key]
  return Number.isFinite(value) && value >= min && value <= max
}

/** Clamps a finite value into range and rounds it to the input step; returns null for non-finite input. */
export function normalizeParam(key: ParamKey, value: number): number | null {
  if (!Number.isFinite(value)) return null
  const { min, max, step, decimals } = PARAM_SPECS[key]
  const clamped = Math.min(max, Math.max(min, value))
  const stepped = Math.round(clamped / step) * step
  return Number(Math.min(max, Math.max(min, stepped)).toFixed(decimals))
}

/** Parses user-typed text strictly: empty, partial ("1.", "-", "e") or non-numeric text is rejected. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(trimmed) || /\.$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export interface Trajectory {
  params: LaunchParams
  /** Initial velocity components (m/s). */
  v0x: number
  v0y: number
  /** Time from launch to ground impact (s); 0 for an immediate impact. */
  flightTime: number
  /** Highest point above the ground (m) and when it is reached (s). */
  maxHeight: number
  timeOfMaxHeight: number
  /** Horizontal distance from the launch point to the impact point (m). */
  range: number
  /** Speed at impact (m/s). */
  impactSpeed: number
}

/**
 * Solves the full flight. Callers must pass validated parameters; gravity must be positive.
 *
 * Impact time is the non-negative root of y₀ + v₀ᵧt − ½gt² = 0:
 *   t = (v₀ᵧ + √(v₀ᵧ² + 2g·y₀)) / g
 * The discriminant is never negative because y₀ ≥ 0 and g > 0, and for v₀ᵧ ≥ 0 the sum does
 * not suffer cancellation.
 */
export function solveTrajectory(params: LaunchParams): Trajectory {
  const { speed, angleDeg, height, gravity: g } = params
  if (!(g > 0)) throw new RangeError('Gravity must be positive')
  const theta = degToRad(angleDeg)
  // cos(90°) is ~6e-17 in floating point; snap the exact vertical and horizontal cases.
  const v0x = angleDeg === 90 ? 0 : speed * Math.cos(theta)
  const v0y = angleDeg === 0 ? 0 : speed * Math.sin(theta)

  const discriminant = Math.max(0, v0y * v0y + 2 * g * height)
  const flightTime = Math.max(0, (v0y + Math.sqrt(discriminant)) / g)

  // Rising launches peak at t = v₀ᵧ/g; otherwise the launch point is the highest point.
  const timeOfMaxHeight = v0y > 0 ? Math.min(v0y / g, flightTime) : 0
  const maxHeight = v0y > 0 ? height + (v0y * v0y) / (2 * g) : height

  const vyImpact = v0y - g * flightTime
  return {
    params,
    v0x,
    v0y,
    flightTime,
    maxHeight,
    timeOfMaxHeight,
    range: v0x * flightTime,
    impactSpeed: Math.hypot(v0x, vyImpact),
  }
}

export interface MotionState {
  /** Time actually evaluated: the requested time clamped to [0, flightTime]. */
  t: number
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  /** Acceleration components (m/s²). */
  ax: number
  ay: number
  /** True once the projectile has reached the ground (t ≥ flightTime). */
  landed: boolean
}

/** Position and velocity at time t, from the closed-form constant-acceleration solution. */
export function stateAt(trajectory: Trajectory, time: number): MotionState {
  const { v0x, v0y, flightTime, params } = trajectory
  const g = params.gravity
  const t = Number.isFinite(time) ? Math.min(Math.max(time, 0), flightTime) : 0
  const landed = t >= flightTime
  const vy = v0y - g * t
  return {
    t,
    x: landed ? trajectory.range : v0x * t,
    // At impact the analytic landing point is exactly y = 0; never report a position below ground.
    y: landed ? 0 : Math.max(0, params.height + v0y * t - 0.5 * g * t * t),
    vx: v0x,
    vy,
    speed: Math.hypot(v0x, vy),
    ax: 0,
    ay: -g,
    landed,
  }
}

/** Evenly spaced samples along the flight, always including launch and impact. */
export function samplePath(trajectory: Trajectory, count = 96): MotionState[] {
  const n = Math.max(2, Math.floor(count))
  return Array.from({ length: n }, (_, i) => stateAt(trajectory, (trajectory.flightTime * i) / (n - 1)))
}

/** Longest real time step applied in one animation frame, so returning from a background tab never jumps. */
export const MAX_FRAME_DT = 0.1

/**
 * Advances simulation time for one animation frame. Playback rate only scales how fast time passes;
 * positions always come from `stateAt`, so the rate cannot change the physics.
 */
export function advanceTime(t: number, realDeltaSeconds: number, rate: number, flightTime: number): number {
  const dt = Math.min(Math.max(realDeltaSeconds, 0), MAX_FRAME_DT) * rate
  return Math.min(flightTime, t + dt)
}

/** Formats a value to about three significant figures — the precision the inputs justify. */
export function formatSig(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) < 5e-4) return '0'
  const magnitude = Math.floor(Math.log10(Math.abs(value)))
  const decimals = Math.max(0, digits - 1 - magnitude)
  return value.toFixed(Math.min(decimals, 3))
}
