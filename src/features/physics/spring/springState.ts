import { formatSig } from '../../../physics/projectile'
import { DEFAULT_SPRING, normalizeSpringParam, solveSpring, type SpringKey, type SpringParams } from '../../../physics/spring'
import type { PlaybackRate, PlaybackStatus } from '../state'

/** 'landed' is reused for "reached the end of the recorded window". */
export interface SpringState {
  params: SpringParams
  status: PlaybackStatus
  rate: PlaybackRate
  announcement: string
}

export type SpringAction =
  | { type: 'setParam'; key: SpringKey; value: number }
  | { type: 'restoreDefaults' }
  | { type: 'reset' }
  | { type: 'launch' }
  | { type: 'pause'; t: number }
  | { type: 'resume' }
  | { type: 'scrub' }
  | { type: 'ended' }
  | { type: 'setRate'; rate: PlaybackRate }

export function initialSpringState(params: SpringParams = DEFAULT_SPRING): SpringState {
  return { params, status: 'ready', rate: 1, announcement: '' }
}

/** What an action does to simulation time (kept outside React state, like the projectile lab). */
export function springTimeEffect(action: SpringAction): 'zero' | 'keep' {
  return action.type === 'setParam' || action.type === 'restoreDefaults' || action.type === 'reset' || action.type === 'launch' ? 'zero' : 'keep'
}

export function springReducer(state: SpringState, action: SpringAction): SpringState {
  switch (action.type) {
    case 'setParam': {
      const value = normalizeSpringParam(action.key, action.value)
      if (value === null || value === state.params[action.key]) return state
      return { ...state, params: { ...state.params, [action.key]: value }, status: 'ready', announcement: '' }
    }
    case 'restoreDefaults':
      return { ...state, params: DEFAULT_SPRING, status: 'ready', announcement: 'Default inputs restored.' }
    case 'reset':
      return { ...state, status: 'ready', announcement: 'Experiment reset to t = 0 s.' }
    case 'launch':
      return {
        ...state,
        status: 'playing',
        announcement: state.params.x0 === 0 ? 'Released at equilibrium: with zero displacement the block stays at rest.' : 'Released from rest.',
      }
    case 'pause':
      if (state.status !== 'playing') return state
      return { ...state, status: 'paused', announcement: `Paused at t = ${formatSig(action.t)} s.` }
    case 'resume':
      if (state.status !== 'paused') return state
      return { ...state, status: 'playing', announcement: 'Resumed.' }
    case 'scrub':
      return state.status === 'paused' ? state : { ...state, status: 'paused', announcement: '' }
    case 'ended': {
      if (state.status !== 'playing') return state
      const s = solveSpring(state.params)
      return { ...state, status: 'landed', announcement: `End of the ${formatSig(s.duration)} s window (3 periods of ${formatSig(s.period)} s).` }
    }
    case 'setRate':
      return { ...state, rate: action.rate }
  }
}
