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
