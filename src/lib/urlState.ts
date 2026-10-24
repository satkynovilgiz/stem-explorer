import { DEFAULT_REACTION, REACTION_IDS } from '../data/chemistry/reactions'
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

/* Chemistry sections. Links without `csec` are molecule links, so every older link opens as before. */
export type ChemistrySection = 'periodic' | 'atomic' | 'molecules' | 'bonding' | 'reactions'
export const CHEMISTRY_SECTIONS: readonly ChemistrySection[] = ['periodic', 'atomic', 'molecules', 'bonding', 'reactions']
export const DEFAULT_ELEMENT = 8

/**
 * Reads `?csec=periodic|atomic|bonding|reactions&el=<1–118>&rx=<reaction>`; `el` belongs to the
 * periodic and atomic sections and `rx` to the reactions section.
 */
export function parseChemistrySection(search: string): { section: ChemistrySection; element: number; reaction: string; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const raw = q.get('csec')
  const section: ChemistrySection = raw === 'periodic' || raw === 'atomic' || raw === 'bonding' || raw === 'reactions' ? raw : 'molecules'
  if (raw !== null && section !== raw) invalid.push('csec')
  const el = q.get('el')
  const n = el !== null && /^\d{1,3}$/.test(el) ? Number(el) : NaN
  const element = Number.isInteger(n) && n >= 1 && n <= 118 ? n : DEFAULT_ELEMENT
  if (el !== null && (element !== n || (section !== 'periodic' && section !== 'atomic'))) invalid.push('el')
  const rx = q.get('rx')
  const reaction = rx !== null && REACTION_IDS.includes(rx) ? rx : DEFAULT_REACTION
  if (rx !== null && (reaction !== rx || section !== 'reactions')) invalid.push('rx')
  return { section, element, reaction, invalid }
}

export function chemistrySectionEntries(section: ChemistrySection, element: number, reaction: string = DEFAULT_REACTION): Record<string, string> {
  if (section === 'molecules') return {}
  if (section === 'bonding') return { csec: 'bonding' }
  if (section === 'reactions') return { csec: 'reactions', rx: reaction }
  return { csec: section, el: String(element) }
}

/** Replaces the section keys in `search`, keeping everything else. */
export function withChemistrySection(search: string, section: ChemistrySection, element: number, reaction?: string): string {
  const q = new URLSearchParams(search)
  q.delete('csec')
  q.delete('el')
  q.delete('rx')
  for (const [k, v] of Object.entries(chemistrySectionEntries(section, element, reaction))) q.set(k, v)
  return `?${q.toString()}`
}

/* Biology sections. Links without `bsec` are cell links, so older links open as before. */
export type BiologySection = 'cells' | 'dna' | 'division' | 'meiosis' | 'inheritance' | 'energy'
export const BIOLOGY_SECTIONS: readonly BiologySection[] = ['cells', 'dna', 'division', 'meiosis', 'inheritance', 'energy']
export type ParentGenotype = 'YY' | 'Yy' | 'yy'
export interface Parents {
  p1: ParentGenotype
  p2: ParentGenotype
}
export const DEFAULT_PARENTS: Parents = { p1: 'Yy', p2: 'Yy' }
const isGenotype = (v: string | null): v is ParentGenotype => v === 'YY' || v === 'Yy' || v === 'yy'

/** Reads `?bsec=…`, plus `p1`/`p2` (parent genotypes) for the inheritance section. */
export function parseBiologySection(search: string): { section: BiologySection; parents: Parents; invalid: string[] } {
  const q = new URLSearchParams(search)
  const raw = q.get('bsec')
  const section: BiologySection = (BIOLOGY_SECTIONS as readonly string[]).includes(raw ?? '') && raw !== 'cells' ? (raw as BiologySection) : 'cells'
  const invalid = raw !== null && section !== raw ? ['bsec'] : []
  const parents = { ...DEFAULT_PARENTS }
  for (const k of ['p1', 'p2'] as const) {
    const v = q.get(k)
    if (v === null) continue
    if (isGenotype(v) && section === 'inheritance') parents[k] = v
    else invalid.push(k)
  }
  return { section, parents, invalid }
}
export const biologySectionEntries = (section: BiologySection, parents: Parents = DEFAULT_PARENTS): Record<string, string> =>
  section === 'cells' ? {} : section === 'inheritance' ? { bsec: section, p1: parents.p1, p2: parents.p2 } : { bsec: section }
export function withBiologySection(search: string, section: BiologySection, parents?: Parents): string {
  const q = new URLSearchParams(search)
  for (const k of ['bsec', 'p1', 'p2']) q.delete(k)
  for (const [k, v] of Object.entries(biologySectionEntries(section, parents))) q.set(k, v)
  return `?${q.toString()}`
}

export const CELL_VIEWS = ['whole', 'cutaway'] as const
export type CellViewParam = (typeof CELL_VIEWS)[number]

export const CELL_TYPE_PARAMS = ['animal', 'plant', 'bacterium'] as const
export type CellTypeParam = (typeof CELL_TYPE_PARAMS)[number]

export interface BiologyUrlState {
  /** Selected organelle type; repeated-instance choice is not stored in the URL. */
  structureId: string | null
  cellView: CellViewParam
  /** Optional for backward compatibility: links without `type` are animal-cell links. */
  cellType?: CellTypeParam
}

/**
 * Reads `?structure=<organelle id>&cell=<whole|cutaway>&type=plant`. These keys never overlap with
 * Chemistry's `molecule`/`view`, so neither subject can change the other's state. `type` is absent
 * for the animal cell, so links made before the plant model existed keep working unchanged.
 * `validStructureIds` may depend on the cell type.
 */
export function parseBiologyParams(
  search: string,
  validStructureIds: readonly string[] | ((cellType: CellTypeParam) => readonly string[]),
  defaults: BiologyUrlState,
): Required<BiologyUrlState> & { invalid: string[] } {
  const params = new URLSearchParams(search)
  const invalid: string[] = []

  const type = params.get('type')
  const cellType = CELL_TYPE_PARAMS.find((t) => t === type) ?? defaults.cellType ?? 'animal'
  if (type !== null && cellType !== type) invalid.push('type')
  const ids = typeof validStructureIds === 'function' ? validStructureIds(cellType) : validStructureIds

  const structure = params.get('structure')
  const structureId = structure && ids.includes(structure) ? structure : defaults.structureId
  if (structure !== null && structureId !== structure) invalid.push('structure')

  const cell = params.get('cell')
  const cellView = CELL_VIEWS.find((v) => v === cell) ?? defaults.cellView
  if (cell !== null && cellView !== cell) invalid.push('cell')

  return { structureId, cellView, cellType, invalid }
}

/** Returns `search` with the Biology parameters set (structure removed when nothing is selected). */
export function withBiologyParams(search: string, state: BiologyUrlState): string {
  const params = new URLSearchParams(search)
  if (state.structureId) params.set('structure', state.structureId)
  else params.delete('structure')
  params.set('cell', state.cellView)
  if (state.cellType && state.cellType !== 'animal') params.set('type', state.cellType)
  else params.delete('type')
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

/** Which Physics experiment a link opens. Links without `experiment` are projectile links. */
export type PhysicsExperiment = 'projectile' | 'spring' | 'circuit' | 'wave'

export function parsePhysicsExperiment(search: string): { experiment: PhysicsExperiment; invalid: boolean } {
  const raw = new URLSearchParams(search).get('experiment')
  if (raw === null || raw === 'projectile') return { experiment: 'projectile', invalid: false }
  if (raw === 'spring' || raw === 'circuit' || raw === 'wave') return { experiment: raw, invalid: false }
  return { experiment: 'projectile', invalid: true }
}

export const SPRING_URL_KEYS = { mass: 'mass', k: 'k', x0: 'x0' } as const
/** Keys of the circuit and wave labs (see labUrl.ts); removed when going back to a projectile link. */
export const LAB_URL_KEYS = ['arr', 'emf', 'r1', 'r2', 'r3', 'wamp', 'wfreq', 'wlen', 'wx'] as const
type SpringUrlKey = keyof typeof SPRING_URL_KEYS

/** Reads `?experiment=spring&mass=…&k=…&x0=…`; each invalid value falls back to its default on its own. */
export function parseSpringParams<T extends Record<SpringUrlKey, number>>(
  search: string,
  defaults: T,
  isValid: (key: SpringUrlKey, value: number) => boolean,
): { params: T; invalid: string[] } {
  const query = new URLSearchParams(search)
  const params = { ...defaults }
  const invalid: string[] = []
  for (const key of Object.keys(SPRING_URL_KEYS) as SpringUrlKey[]) {
    const raw = query.get(SPRING_URL_KEYS[key])
    if (raw === null) continue
    const value = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN
    if (isValid(key, value)) params[key] = value as T[SpringUrlKey]
    else invalid.push(SPRING_URL_KEYS[key])
  }
  return { params, invalid }
}

export function springParamEntries(params: Record<SpringUrlKey, number>): Record<string, string> {
  return { experiment: 'spring', mass: String(params.mass), k: String(params.k), x0: String(params.x0) }
}

/** `search` with the spring experiment's keys set (projectile keys are left alone). */
export function withSpringParams(search: string, params: Record<SpringUrlKey, number>): string {
  const query = new URLSearchParams(search)
  for (const [key, value] of Object.entries(springParamEntries(params))) query.set(key, value)
  return `?${query.toString()}`
}

/** `search` without the spring experiment (back to a projectile link). */
export function withoutSpringParams(search: string): string {
  const query = new URLSearchParams(search)
  for (const key of ['experiment', ...Object.values(SPRING_URL_KEYS), ...LAB_URL_KEYS]) query.delete(key)
  return `?${query.toString()}`
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

/* ---------- Anatomy: whole-body atlas ---------- */

export type AtlasView = 'front' | 'back' | 'side'
export const ATLAS_VIEWS: readonly AtlasView[] = ['front', 'back', 'side']
export const ATLAS_URL_KEYS = ['atlas', 'bview', 'layers', 'region', 'repro'] as const
export const HEART_URL_KEYS = ['part', 'heart'] as const

export interface AtlasUrlState {
  structureId: string | null
  view: AtlasView
  /** Visible systems, in the fixed system order. */
  layers: string[]
  region: string
  variant: 'ovarian' | 'testicular' | null
}

export interface AtlasUrlConfig {
  validIds: readonly string[]
  systemIds: readonly string[]
  defaultLayers: readonly string[]
  regionIds: readonly string[]
  /** Structures that belong to one reproductive configuration. */
  variantOf: Readonly<Record<string, 'ovarian' | 'testicular'>>
}

/**
 * Anatomy has two modules. Links with a heart key (`part`, `heart`) open the detailed heart
 * explorer, so every link made before the atlas existed opens exactly as before; anything else
 * opens the whole-body atlas.
 */
export function anatomyModule(search: string): 'atlas' | 'heart' {
  const q = new URLSearchParams(search)
  return HEART_URL_KEYS.some((k) => q.has(k)) ? 'heart' : 'atlas'
}

/**
 * Reads `?atlas=<structure>&bview=front|back|side&layers=a,b&region=<id>&repro=ovarian|testicular`.
 * The reproductive layer is only valid with a chosen variant, and a variant only with that layer.
 */
export function parseAtlasParams(search: string, cfg: AtlasUrlConfig): AtlasUrlState & { invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const atlas = q.get('atlas')
  const structureId = atlas && cfg.validIds.includes(atlas) ? atlas : null
  if (atlas !== null && structureId === null) invalid.push('atlas')

  const v = q.get('bview')
  const view = v && (ATLAS_VIEWS as readonly string[]).includes(v) ? (v as AtlasView) : 'front'
  if (v !== null && view !== v) invalid.push('bview')

  let layers = [...cfg.defaultLayers]
  const rawLayers = q.get('layers')
  if (rawLayers !== null) {
    const parts = rawLayers === '' ? [] : rawLayers.split(',')
    if (parts.every((p) => cfg.systemIds.includes(p)) && new Set(parts).size === parts.length) layers = parts
    else invalid.push('layers')
  }
  layers = cfg.systemIds.filter((id) => layers.includes(id))

  const r = q.get('region')
  const region = r && cfg.regionIds.includes(r) ? r : 'whole-body'
  if (r !== null && region !== r) invalid.push('region')

  const rp = q.get('repro')
  let variant: AtlasUrlState['variant'] = rp === 'ovarian' || rp === 'testicular' ? rp : null
  if (rp !== null && variant === null) invalid.push('repro')
  const reproShown = layers.includes('reproductive')
  if (reproShown && !variant) {
    invalid.push('layers')
    layers = layers.filter((l) => l !== 'reproductive')
  } else if (!reproShown && variant) {
    invalid.push('repro')
    variant = null
  }
  // A structure from one configuration is only valid in a link that shows that configuration.
  if (structureId && cfg.variantOf[structureId] && cfg.variantOf[structureId] !== variant) invalid.push('atlas')
  return { structureId, view, layers, region, variant, invalid: [...new Set(invalid)] }
}

export function atlasParamEntries(state: AtlasUrlState, defaultLayers: readonly string[]): Record<string, string> {
  const sameLayers = state.layers.length === defaultLayers.length && state.layers.every((l) => defaultLayers.includes(l))
  return {
    ...(state.structureId ? { atlas: state.structureId } : {}),
    bview: state.view,
    ...(sameLayers ? {} : { layers: state.layers.join(',') }),
    ...(state.region !== 'whole-body' ? { region: state.region } : {}),
    ...(state.variant ? { repro: state.variant } : {}),
  }
}

/** Replaces the atlas keys (and drops heart keys, so the link opens the atlas). */
export function withAtlasParams(search: string, entries: Record<string, string>): string {
  const q = new URLSearchParams(search)
  for (const k of [...ATLAS_URL_KEYS, ...HEART_URL_KEYS]) q.delete(k)
  for (const [k, v] of Object.entries(entries)) q.set(k, v)
  return `?${q.toString()}`
}

/** Drops the atlas keys (used when opening the heart module). */
export function withoutAtlasParams(search: string): string {
  const q = new URLSearchParams(search)
  for (const k of ATLAS_URL_KEYS) q.delete(k)
  return `?${q.toString()}`
}
