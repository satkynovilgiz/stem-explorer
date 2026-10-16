import {
  clampToDomain,
  defaultParams,
  formatValue,
  getSurface,
  isSurfaceId,
  normalizeParamValue,
  num,
  type Params,
  type SliceAxis,
  type SurfaceId,
} from '../../math/surfaces'

export interface MathState {
  surfaceId: SurfaceId
  params: Params
  /** Inspected point (x, y). z is always recomputed from the function, never stored. */
  point: { x: number; y: number } | null
  /** Note shown next to the coordinate fields, e.g. after clamping to the domain. */
  pointNote: string
  slice: { axis: SliceAxis; value: number } | null
  /** Short message for screen readers about explicit actions only (never slider drags). */
  announcement: string
}

export type MathAction =
  | { type: 'selectSurface'; surfaceId: string }
  | { type: 'setParam'; key: string; value: number }
  | { type: 'resetParams' }
  | { type: 'setPoint'; x: number; y: number; source: 'click' | 'input' }
  | { type: 'clearPoint' }
  | { type: 'setSliceEnabled'; enabled: boolean }
  | { type: 'setSliceAxis'; axis: SliceAxis }
  | { type: 'setSliceValue'; value: number }

export function initialMathState(surfaceId: SurfaceId, params: Params, slice: MathState['slice']): MathState {
  return { surfaceId, params, point: null, pointNote: '', slice, announcement: '' }
}

export function mathReducer(state: MathState, action: MathAction): MathState {
  const surface = getSurface(state.surfaceId)
  switch (action.type) {
    case 'selectSurface': {
      if (!isSurfaceId(action.surfaceId) || action.surfaceId === state.surfaceId) return state
      const next = getSurface(action.surfaceId)
      return {
        ...state,
        surfaceId: next.id,
        // A new preset always starts from its own defaults.
        params: defaultParams(next),
        point: null,
        pointNote: '',
        slice: state.slice ? { ...state.slice, value: clampToDomain(next, state.slice.value).value } : null,
        announcement: `${next.name} selected: ${next.formula}.`,
      }
    }

    case 'setParam': {
      const def = surface.params.find((p) => p.key === action.key)
      if (!def) return state
      const value = normalizeParamValue(def, action.value)
      if (value === null || value === state.params[def.key]) return state
      return { ...state, params: { ...state.params, [def.key]: value }, announcement: '' }
    }

    case 'resetParams':
      return { ...state, params: defaultParams(surface), announcement: 'Parameters reset to their defaults.' }

    case 'setPoint': {
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y)) {
        return { ...state, pointNote: 'Enter numbers for both x and y.' }
      }
      const x = clampToDomain(surface, action.x)
      const y = clampToDomain(surface, action.y)
      const { min, max } = surface.domain
      const note =
        x.clamped || y.clamped
          ? `Limited to the drawn domain ${num(min)} ≤ x, y ≤ ${num(max)}.`
          : ''
      const z = surface.evaluate(state.params, x.value, y.value)
      return {
        ...state,
        point: { x: x.value, y: y.value },
        pointNote: note,
        announcement: `Point x = ${num(x.value)}, y = ${num(y.value)}, z ≈ ${formatValue(z)}.${note ? ` ${note}` : ''}`,
      }
    }

    case 'clearPoint':
      return state.point ? { ...state, point: null, pointNote: '', announcement: 'Point cleared.' } : state

    case 'setSliceEnabled':
      if (action.enabled === !!state.slice) return state
      return {
        ...state,
        slice: action.enabled ? { axis: 'x', value: 0 } : null,
        announcement: action.enabled ? 'Cross-section on: x = 0.' : 'Cross-section off.',
      }

    case 'setSliceAxis':
      if (!state.slice || state.slice.axis === action.axis) return state
      return {
        ...state,
        slice: { ...state.slice, axis: action.axis },
        announcement: `Cross-section now at ${action.axis} = ${num(state.slice.value)}.`,
      }

    case 'setSliceValue': {
      if (!state.slice || !Number.isFinite(action.value)) return state
      const value = Number(clampToDomain(surface, action.value).value.toFixed(3))
      return value === state.slice.value ? state : { ...state, slice: { ...state.slice, value } }
    }
  }
}
