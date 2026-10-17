import { ATLAS_CONFIG } from '../data/anatomy/atlas/config'
import { findStructure } from '../data/anatomy/atlas'
import { findHeartPart, HEART_PART_IDS } from '../data/anatomy/heart'
import { CELL_STRUCTURES, findOrganelle } from '../data/biology/organelles'
import { findMolecule, MOLECULES } from '../data/chemistry/molecules'
import { isSubjectId, SUBJECTS, type SubjectId } from '../data/subjects'
import { getSurface } from '../math/surfaces'
import { DEFAULT_PARAMS, isValidParam, normalizeParam, PARAM_KEYS } from '../physics/projectile'
import { DEFAULT_SPRING, isValidSpringParam, normalizeSpringParam, SPRING_KEYS } from '../physics/spring'
import {
  anatomyModule,
  anatomyParamEntries,
  atlasParamEntries,
  parseAtlasParams,
  mathParamEntries,
  parseAnatomyParams,
  parseBiologyParams,
  parseChemistryParams,
  parseMathParams,
  parsePhysicsParams,
  physicsParamEntries,
  parsePhysicsExperiment,
  parseSpringParams,
  springParamEntries,
} from './urlState'

/**
 * A shareable exploration: a subject plus its validated query parameters — exactly what Copy link
 * produces. Never an absolute URL, never transient state (camera, animation, tour progress).
 */
export interface ShareState {
  subject: SubjectId
  params: Record<string, string>
}

/**
 * Validates and canonicalizes a subject's parameters using that subject's own URL parser.
 * Returns null when any supplied parameter is invalid (so corrupt stored data is rejected rather
 * than silently "repaired"). Missing parameters take the subject's defaults.
 */
export function canonicalize(subject: string, params: Record<string, unknown>): ShareState | null {
  if (!isSubjectId(subject) || typeof params !== 'object' || params === null) return null
  const entries = Object.entries(params)
  if (entries.some(([k, v]) => typeof k !== 'string' || typeof v !== 'string')) return null
  const search = new URLSearchParams(entries as [string, string][]).toString()

  switch (subject) {
    case 'chemistry': {
      const r = parseChemistryParams(search, MOLECULES.map((m) => m.id), { moleculeId: 'water', representation: 'ball-and-stick' })
      return r.invalid.length ? null : { subject, params: { molecule: r.moleculeId, view: r.representation } }
    }
    case 'biology': {
      const r = parseBiologyParams(search, (t) => CELL_STRUCTURES[t], { structureId: null, cellView: 'cutaway' })
      if (r.invalid.length) return null
      // `type` only for the plant cell, so animal-cell states keep their original canonical form.
      return {
        subject,
        params: { ...(r.structureId ? { structure: r.structureId } : {}), cell: r.cellView, ...(r.cellType === 'plant' ? { type: 'plant' } : {}) },
      }
    }
    case 'physics': {
      const exp = parsePhysicsExperiment(search)
      if (exp.invalid) return null
      if (exp.experiment === 'spring') {
        const r = parseSpringParams(search, DEFAULT_SPRING, isValidSpringParam)
        if (r.invalid.length) return null
        const p = { ...r.params }
        for (const key of SPRING_KEYS) p[key] = normalizeSpringParam(key, p[key]) ?? DEFAULT_SPRING[key]
        return { subject, params: springParamEntries(p) }
      }
      const r = parsePhysicsParams(search, DEFAULT_PARAMS, isValidParam)
      if (r.invalid.length) return null
      const p = { ...r.params }
      for (const key of PARAM_KEYS) p[key] = normalizeParam(key, p[key]) ?? DEFAULT_PARAMS[key]
      return { subject, params: physicsParamEntries(p) }
    }
    case 'mathematics': {
      const r = parseMathParams(search)
      return r.invalid.length ? null : { subject, params: mathParamEntries(r) }
    }
    case 'anatomy': {
      if (anatomyModule(search) === 'atlas') {
        const r = parseAtlasParams(search, ATLAS_CONFIG)
        return r.invalid.length ? null : { subject, params: atlasParamEntries(r, ATLAS_CONFIG.defaultLayers) }
      }
      const r = parseAnatomyParams(search, HEART_PART_IDS, { partId: null, heartView: 'whole' })
      return r.invalid.length ? null : { subject, params: anatomyParamEntries(r) }
    }
  }
}

/** Stable identity of a share state, used to deduplicate saved and recent entries. */
export function canonicalKey(state: ShareState): string {
  const sorted = Object.entries(state.params).sort(([a], [b]) => a.localeCompare(b))
  return `${state.subject}?${new URLSearchParams(sorted).toString()}`
}

/** Relative in-app link ("?…#/subject"); never includes an origin. */
export function hrefFor(state: ShareState): string {
  const query = new URLSearchParams(state.params).toString()
  return `${query ? `?${query}` : ''}#/${state.subject}`
}

export function subjectName(subject: SubjectId): string {
  return SUBJECTS.find((s) => s.id === subject)!.name
}

/** A readable default title derived from the state (users can rename saved entries). */
export function defaultTitle(state: ShareState): string {
  const p = state.params
  switch (state.subject) {
    case 'chemistry': {
      const m = findMolecule(p.molecule)
      return `${m?.name ?? 'Molecule'} · ${p.view === 'space-filling' ? 'space-filling' : 'ball and stick'}`
    }
    case 'biology':
      return p.structure
        ? `${findOrganelle(p.structure)?.name ?? 'Cell structure'} in the ${p.type === 'plant' ? 'plant' : 'animal'} cell`
        : `${p.type === 'plant' ? 'Plant' : 'Animal'} cell · ${p.cell === 'whole' ? 'whole' : 'cutaway'}`
    case 'physics':
      if (p.experiment === 'spring') return `Spring: m = ${p.mass} kg, k = ${p.k} N/m, x₀ = ${p.x0} m`
      return `Launch at ${p.speed} m/s, ${p.angle}°${Number(p.height) > 0 ? ` from ${p.height} m` : ''}${p.gravity !== '9.81' ? `, g = ${p.gravity} m/s²` : ''}`
    case 'mathematics': {
      const name = getSurface(p.surface as never)?.name ?? 'Surface'
      return p.slice ? `${name} · slice ${p.slice} = ${p.at}` : name
    }
    case 'anatomy':
      if (p.bview) {
        const views: Record<string, string> = { front: 'front', back: 'back', side: 'side' }
        const s = p.atlas ? findStructure(p.atlas) : undefined
        return s ? `Body atlas · ${s.name} · ${views[p.bview] ?? 'front'} view` : `Body atlas · ${views[p.bview] ?? 'front'} view`
      }
      return p.part ? `${findHeartPart(p.part)?.name ?? 'Heart structure'} · ${p.heart === 'cutaway' ? 'cutaway' : 'whole'} heart` : `Human heart · ${p.heart === 'cutaway' ? 'cutaway' : 'whole'}`
  }
}
