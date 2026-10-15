import {
  DEFAULT_PARAMS,
  formatSig,
  normalizeParam,
  PARAM_SPECS,
  solveTrajectory,
  type LaunchParams,
  type ParamKey,
} from '../../physics/projectile'

export type PlaybackStatus = 'ready' | 'playing' | 'paused' | 'landed'
export const PLAYBACK_RATES = [0.25, 0.5, 1, 2] as const
export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

export interface PhysicsState {
  /** Inputs of the active run. Derived results are always recomputed from these. */
  params: LaunchParams
  /** Saved reference configuration (Run A), or null when not comparing. Inputs only, never results. */
  runA: LaunchParams | null
  status: PlaybackStatus
  rate: PlaybackRate
  /** Short message for screen readers about the last explicit action or completed result. */
  announcement: string
}

export type PhysicsAction =
  | { type: 'setParam'; key: ParamKey; value: number }
  | { type: 'restoreDefaults' }
  | { type: 'reset' }
  | { type: 'launch' }
  | { type: 'pause'; t: number }
  | { type: 'resume' }
  | { type: 'scrub' }
  | { type: 'landed' }
  | { type: 'setRate'; rate: PlaybackRate }
  | { type: 'saveRunA' }
  | { type: 'clearComparison' }

export function initialPhysicsState(params: LaunchParams): PhysicsState {
  return { params, runA: null, status: 'ready', rate: 1, announcement: '' }
}

/**
 * What an action does to simulation time, which lives outside React state (it changes every frame).
 * 'zero' = back to launch; 'keep' = unchanged.
 */
export function timeEffect(action: PhysicsAction): 'zero' | 'keep' {
  switch (action.type) {
    case 'setParam':
    case 'restoreDefaults':
    case 'reset':
      return 'zero'
    case 'launch':
      // Launch replays from the start; it does not continue a paused flight (that is Resume).
      return 'zero'
    default:
      return 'keep'
  }
}

export function physicsReducer(state: PhysicsState, action: PhysicsAction): PhysicsState {
  switch (action.type) {
    case 'setParam': {
      const value = normalizeParam(action.key, action.value)
      if (value === null || value === state.params[action.key]) return state
      return { ...state, params: { ...state.params, [action.key]: value }, status: 'ready', announcement: '' }
    }

    case 'restoreDefaults':
      return { ...state, params: DEFAULT_PARAMS, status: 'ready', announcement: 'Default inputs restored.' }

    case 'reset':
      return { ...state, status: 'ready', announcement: 'Experiment reset to t = 0 s.' }

    case 'launch': {
      if (solveTrajectory(state.params).flightTime === 0) {
        return {
          ...state,
          status: 'landed',
          announcement: 'The projectile starts on the ground with no upward velocity, so it lands immediately.',
        }
      }
      return { ...state, status: 'playing', announcement: 'Launched.' }
    }

    case 'pause':
      if (state.status !== 'playing') return state
      return { ...state, status: 'paused', announcement: `Paused at t = ${formatSig(action.t)} s.` }

    case 'resume':
      if (state.status !== 'paused') return state
      return { ...state, status: 'playing', announcement: 'Resumed.' }

    case 'scrub':
      // Scrubbing always pauses so the chosen time stays put.
      return state.status === 'playing' || state.status === 'landed' || state.status === 'ready'
        ? { ...state, status: 'paused', announcement: '' }
        : state

    case 'landed': {
      if (state.status !== 'playing') return state
      const t = solveTrajectory(state.params)
      return {
        ...state,
        status: 'landed',
        announcement: `Landed after ${formatSig(t.flightTime)} s, ${formatSig(t.range)} m from the launch point.`,
      }
    }

    case 'setRate':
      return { ...state, rate: action.rate }

    case 'saveRunA':
      return {
        ...state,
        runA: { ...state.params },
        announcement: 'Saved the current inputs as Run A. Change the inputs to set up Run B.',
      }

    case 'clearComparison':
      if (!state.runA) return state
      return { ...state, runA: null, announcement: 'Comparison cleared.' }
  }
}

export function describeParams(p: LaunchParams): string {
  const s = PARAM_SPECS
  return `${s.speed.symbol} = ${p.speed} ${s.speed.unit}, ${s.angleDeg.symbol} = ${p.angleDeg}°, ${s.height.symbol} = ${p.height} m, g = ${p.gravity} m/s²`
}
