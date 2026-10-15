import {
  DEFAULT_SURFACE,
  defaultParams,
  getSurface,
  isSurfaceId,
  isValidParamValue,
  SURFACES,
  type Params,
  type SliceAxis,
  type SurfaceId,
} from '../math/surfaces'
import type { Representation } from '../data/chemistry/types'

export const REPRESENTATIONS: readonly Representation[] = ['ball-and-stick', 'space-filling']

export interface ChemistryUrlState {
  moleculeId: string
  representation: Representation
}

/**
 * Reads `?molecule=<id>&view=<representation>`. Unknown or missing values fall back to
 * the defaults; `invalid` lists the parameters that were ignored.
 */
export function parseChemistryParams(
  search: string,
  validMoleculeIds: readonly string[],
  defaults: ChemistryUrlState,
): ChemistryUrlState & { invalid: string[] } {
  const params = new URLSearchParams(search)
  const invalid: string[] = []

  const molecule = params.get('molecule')
  const moleculeId = molecule && validMoleculeIds.includes(molecule) ? molecule : defaults.moleculeId
  if (molecule !== null && moleculeId !== molecule) invalid.push('molecule')

  const view = params.get('view')
  const representation = REPRESENTATIONS.find((r) => r === view) ?? defaults.representation
  if (view !== null && representation !== view) invalid.push('view')

  return { moleculeId, representation, invalid }
}

/** Returns `search` with the chemistry parameters set, keeping any unrelated parameters. */
export function withChemistryParams(search: string, state: ChemistryUrlState): string {
  const params = new URLSearchParams(search)
  params.set('molecule', state.moleculeId)
  params.set('view', state.representation)
  return `?${params.toString()}`
}

export const CELL_VIEWS = ['whole', 'cutaway'] as const
export type CellViewParam = (typeof CELL_VIEWS)[number]

export interface BiologyUrlState {
  /** Selected organelle type; repeated-instance choice is not stored in the URL. */
  structureId: string | null
  cellView: CellViewParam
}

/**
 * Reads `?structure=<organelle id>&cell=<whole|cutaway>`. These keys never overlap with
 * Chemistry's `molecule`/`view`, so neither subject can change the other's state.
 */
export function parseBiologyParams(
  search: string,
  validStructureIds: readonly string[],
  defaults: BiologyUrlState,
): BiologyUrlState & { invalid: string[] } {
  const params = new URLSearchParams(search)
  const invalid: string[] = []

  const structure = params.get('structure')
  const structureId = structure && validStructureIds.includes(structure) ? structure : defaults.structureId
  if (structure !== null && structureId !== structure) invalid.push('structure')

  const cell = params.get('cell')
  const cellView = CELL_VIEWS.find((v) => v === cell) ?? defaults.cellView
  if (cell !== null && cellView !== cell) invalid.push('cell')

  return { structureId, cellView, invalid }
}

/** Returns `search` with the Biology parameters set (structure removed when nothing is selected). */
export function withBiologyParams(search: string, state: BiologyUrlState): string {
  const params = new URLSearchParams(search)
  if (state.structureId) params.set('structure', state.structureId)
  else params.delete('structure')
  params.set('cell', state.cellView)
  return `?${params.toString()}`
}

/**
 * A share link for one subject: the current origin and path, only that subject's
 * parameters, and its hash route. Never hard-codes a host.
 */
export function shareUrl(
  location: Pick<Location, 'origin' | 'pathname'>,
  subject: string,
  params: Record<string, string>,
): string {
  const query = new URLSearchParams(params).toString()
  return `${location.origin}${location.pathname}${query ? `?${query}` : ''}#/${subject}`
}

/** URL keys for the Physics launch parameters (none overlap Chemistry's or Biology's keys). */
export const PHYSICS_URL_KEYS = {
  speed: 'speed',
  angleDeg: 'angle',
  height: 'height',
  gravity: 'gravity',
} as const

type PhysicsKey = keyof typeof PHYSICS_URL_KEYS

/**
 * Reads `?speed=…&angle=…&height=…&gravity=…`. Each value must be a plain finite number inside its
 * supported range, otherwise that one parameter falls back to its default. Animation time is never
 * stored, so shared experiments always open paused at t = 0.
 */
export function parsePhysicsParams<T extends Record<PhysicsKey, number>>(
  search: string,
  defaults: T,
  isValid: (key: PhysicsKey, value: number) => boolean,
): { params: T; invalid: string[] } {
  const query = new URLSearchParams(search)
  const params = { ...defaults }
  const invalid: string[] = []
  for (const key of Object.keys(PHYSICS_URL_KEYS) as PhysicsKey[]) {
    const raw = query.get(PHYSICS_URL_KEYS[key])
    if (raw === null) continue
    const value = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN
    if (isValid(key, value)) params[key] = value as T[PhysicsKey]
    else invalid.push(PHYSICS_URL_KEYS[key])
  }
  return { params, invalid }
}

/** Physics URL parameters as strings, for `shareUrl` and the address bar. */
export function physicsParamEntries(params: Record<PhysicsKey, number>): Record<string, string> {
  return Object.fromEntries(
    (Object.keys(PHYSICS_URL_KEYS) as PhysicsKey[]).map((key) => [PHYSICS_URL_KEYS[key], String(params[key])]),
  )
}

/** Returns `search` with the Physics parameters set, keeping other subjects' parameters. */
export function withPhysicsParams(search: string, params: Record<PhysicsKey, number>): string {
  const query = new URLSearchParams(search)
  for (const [key, value] of Object.entries(physicsParamEntries(params))) query.set(key, value)
  return `?${query.toString()}`
}

/* ---------- Mathematics ---------- */


export interface MathUrlState {
  surfaceId: SurfaceId
  params: Params
  slice: { axis: SliceAxis; value: number } | null
}

/** Every query key Mathematics owns: none overlap Chemistry, Biology or Physics. */
export const MATH_URL_KEYS = ['surface', 'slice', 'at', ...new Set(SURFACES.flatMap((s) => s.params.map((p) => p.urlKey)))]

const NUMBER_RE = /^[-+]?(\d+\.?\d*|\.\d+)$/

/**
 * Reads `?surface=…&<parameters>&slice=x|y&at=…`. Parameters are only accepted for the chosen
 * surface and inside its ranges; anything else falls back to that surface's defaults.
 * Camera position and point selection are never stored.
 */
export function parseMathParams(search: string): MathUrlState & { invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []

  const rawSurface = q.get('surface')
  const surfaceId = rawSurface && isSurfaceId(rawSurface) ? rawSurface : DEFAULT_SURFACE
  if (rawSurface !== null && surfaceId !== rawSurface) invalid.push('surface')
  const surface = getSurface(surfaceId)

  const params = defaultParams(surface)
  for (const def of surface.params) {
    const raw = q.get(def.urlKey)
    if (raw === null) continue
    const value = NUMBER_RE.test(raw.trim()) ? Number(raw) : Number.NaN
    if (isValidParamValue(def, value)) params[def.key] = value
    else invalid.push(def.urlKey)
  }

  let slice: MathUrlState['slice'] = null
  const rawSlice = q.get('slice')
  if (rawSlice === 'x' || rawSlice === 'y') {
    const rawAt = q.get('at')
    const at = rawAt === null ? 0 : NUMBER_RE.test(rawAt.trim()) ? Number(rawAt) : Number.NaN
    if (Number.isFinite(at) && at >= surface.domain.min && at <= surface.domain.max) {
      slice = { axis: rawSlice, value: at }
    } else {
      invalid.push('at')
      slice = { axis: rawSlice, value: 0 }
    }
  } else if (rawSlice !== null) {
    invalid.push('slice')
  }

  return { surfaceId, params, slice, invalid }
}

/** Mathematics parameters for share links and the address bar. */
export function mathParamEntries(state: MathUrlState): Record<string, string> {
  const surface = getSurface(state.surfaceId)
  const entries: Record<string, string> = { surface: state.surfaceId }
  for (const def of surface.params) entries[def.urlKey] = String(state.params[def.key])
  if (state.slice) {
    entries.slice = state.slice.axis
    entries.at = String(Number(state.slice.value.toFixed(3)))
  }
  return entries
}

/** Replaces all Mathematics keys in `search` with the current state; other subjects' keys are kept. */
export function withMathParams(search: string, state: MathUrlState): string {
  const q = new URLSearchParams(search)
  for (const key of MATH_URL_KEYS) q.delete(key)
  for (const [key, value] of Object.entries(mathParamEntries(state))) q.set(key, value)
  return `?${q.toString()}`
}

/* ---------- Anatomy ---------- */

export interface AnatomyUrlState {
  partId: string | null
  heartView: 'whole' | 'cutaway'
}

/**
 * Reads `?part=<structure id>&heart=whole|cutaway` (keys unused by other subjects). Tour progress is
 * never stored.
 */
export function parseAnatomyParams(
  search: string,
  validPartIds: readonly string[],
  defaults: AnatomyUrlState,
): AnatomyUrlState & { invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const part = q.get('part')
  const partId = part && validPartIds.includes(part) ? part : defaults.partId
  if (part !== null && partId !== part) invalid.push('part')
  const view = q.get('heart')
  const heartView = view === 'whole' || view === 'cutaway' ? view : defaults.heartView
  if (view !== null && heartView !== view) invalid.push('heart')
  return { partId, heartView, invalid }
}

export function anatomyParamEntries(state: AnatomyUrlState): Record<string, string> {
  return { ...(state.partId ? { part: state.partId } : {}), heart: state.heartView }
}

export function withAnatomyParams(search: string, state: AnatomyUrlState): string {
  const q = new URLSearchParams(search)
  q.delete('part')
  for (const [k, v] of Object.entries(anatomyParamEntries(state))) q.set(k, v)
  return `?${q.toString()}`
}
