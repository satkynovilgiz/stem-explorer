import { motionEntries, parseMotionState } from './motionUrl'
import { MOTIONS } from '../math/motion'
import { ATLAS_CONFIG } from '../data/anatomy/atlas/config'
import { ATLAS_SYSTEMS, findStructure } from '../data/anatomy/atlas'
import { findHeartPart, HEART_PART_IDS } from '../data/anatomy/heart'
import { CELL_STRUCTURES, findOrganelle } from '../data/biology/organelles'
import { findMolecule, MOLECULES } from '../data/chemistry/molecules'
import { findElement } from '../data/chemistry/periodicTable'
import { findReaction } from '../data/chemistry/reactions'
import { isSubjectId, SUBJECTS, type SubjectId } from '../data/subjects'
import { getSurface } from '../math/surfaces'
import { DEFAULT_PARAMS, isValidParam, normalizeParam, PARAM_KEYS } from '../physics/projectile'
import { ARRANGEMENT_LABEL, type Arrangement } from '../physics/circuit'
import { functionsEntries, parseFunctionsState, parseMathSection, parseStatsState, parseVectorsState, statsEntries, vectorsEntries } from './mathSections'
import { FUNCTIONS } from '../math/functions'
import { findDataset } from '../data/mathematics/datasets'
import { parseSolutionsState, solutionsEntries } from './solutionsUrl'
import { circuitParamEntries, gasParamEntries, opticsParamEntries, parseCircuitParams, parseGasParams, parseOpticsParams, parseWaveParams, waveParamEntries } from './labUrl'
import { DEFAULT_SPRING, isValidSpringParam, normalizeSpringParam, SPRING_KEYS } from '../physics/spring'
import {
  anatomyModule,
  breathingParamEntries,
  parseBreathingParams,
  biologySectionEntries,
  parseBiologySection,
  chemistrySectionEntries,
  parseChemistrySection,
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

const ATLAS_SYSTEM_NAMES: Record<string, string> = Object.fromEntries(ATLAS_SYSTEMS.map((s) => [s.id, s.name]))

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
      const sec = parseChemistrySection(search)
      if (r.invalid.length || sec.invalid.length) return null
      if (sec.section === 'solutions') {
        const sol = parseSolutionsState(search)
        return sol.invalid.length ? null : { subject, params: { molecule: r.moleculeId, view: r.representation, csec: 'solutions', ...solutionsEntries(sol.state) } }
      }
      return { subject, params: { molecule: r.moleculeId, view: r.representation, ...chemistrySectionEntries(sec.section, sec.element, sec.reaction) } }
    }
    case 'biology': {
      const r = parseBiologyParams(search, (t) => CELL_STRUCTURES[t], { structureId: null, cellView: 'cutaway' })
      const sec = parseBiologySection(search)
      if (r.invalid.length || sec.invalid.length) return null
      if (sec.section !== 'cells') return { subject, params: { cell: r.cellView, ...biologySectionEntries(sec.section, sec.parents, sec.diffusion, sec.enzyme) } }
      // `type` only for the plant cell, so animal-cell states keep their original canonical form.
      return {
        subject,
        params: { ...(r.structureId ? { structure: r.structureId } : {}), cell: r.cellView, ...(r.cellType && r.cellType !== 'animal' ? { type: r.cellType } : {}) },
      }
    }
    case 'physics': {
      const exp = parsePhysicsExperiment(search)
      if (exp.invalid) return null
      if (exp.experiment === 'circuit') {
        const r = parseCircuitParams(search)
        return r.invalid.length ? null : { subject, params: circuitParamEntries(r.params) }
      }
      if (exp.experiment === 'optics') {
        const r = parseOpticsParams(search)
        return r.invalid.length ? null : { subject, params: opticsParamEntries(r.params) }
      }
      if (exp.experiment === 'gas') {
        const r = parseGasParams(search)
        return r.invalid.length ? null : { subject, params: gasParamEntries(r.params) }
      }
      if (exp.experiment === 'wave') {
        const r = parseWaveParams(search)
        return r.invalid.length ? null : { subject, params: waveParamEntries(r.params) }
      }
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
      const sec = parseMathSection(search)
      if (sec.invalid.length) return null
      if (sec.section === 'functions') {
        const f = parseFunctionsState(search)
        return f.invalid.length ? null : { subject, params: functionsEntries(f.state) }
      }
      if (sec.section === 'statistics') {
        const st = parseStatsState(search)
        return st.invalid.length ? null : { subject, params: statsEntries(st.state) }
      }
      if (sec.section === 'motion') {
        const mo = parseMotionState(search)
        return mo.invalid.length ? null : { subject, params: motionEntries(mo.state) }
      }
      if (sec.section === 'vectors') {
        const v = parseVectorsState(search)
        return v.invalid.length ? null : { subject, params: vectorsEntries(v.state) }
      }
      const r = parseMathParams(search)
      return r.invalid.length ? null : { subject, params: mathParamEntries(r) }
    }
    case 'anatomy': {
      if (anatomyModule(search) === 'breathing') {
        const r = parseBreathingParams(search)
        return r.invalid.length ? null : { subject, params: breathingParamEntries(r) }
      }
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
      const element = p.el ? findElement(Number(p.el))?.name : undefined
      if (p.csec === 'periodic') return `Periodic table · ${element ?? 'element'}`
      if (p.csec === 'atomic') return `Atomic structure · ${element ?? 'element'}`
      if (p.csec === 'bonding') return 'Bonding and geometry'
      if (p.csec === 'solutions') return p.st === 'dilution' ? 'Solutions · dilution C₁V₁ = C₂V₂' : 'Solutions · molarity'
      if (p.csec === 'reactions') return `Reactions · ${findReaction(p.rx)?.name ?? 'reaction'}`
      const m = findMolecule(p.molecule)
      return `${m?.name ?? 'Molecule'} · ${p.view === 'space-filling' ? 'space-filling' : 'ball and stick'}`
    }
    case 'biology':
      if (p.bsec === 'dna') return 'DNA and RNA'
      if (p.bsec === 'division') return 'Cell division: mitosis'
      if (p.bsec === 'meiosis') return 'Meiosis'
      if (p.bsec === 'inheritance') return `Inheritance: ${p.p1} × ${p.p2}`
      if (p.bsec === 'energy') return 'Energy processes'
      if (p.bsec === 'enzymes') return `Enzyme lab: [S] = ${p.ezs} mM, Vmax = ${p.ezv} µM/s, Km = ${p.ezk} mM${p.ezv2 ? `, compared with Vmax = ${p.ezv2}, Km = ${p.ezk2}` : ''}`
      if (p.bsec === 'diffusion') return `Diffusion: ${p.dfn} particles, ${p.dfm === 'membrane' ? 'membrane' : 'gap'}, seed ${p.dfs}`
      return p.structure
        ? `${findOrganelle(p.structure)?.name ?? 'Cell structure'} in the ${p.type === 'plant' ? 'plant cell' : p.type === 'bacterium' ? 'bacterial cell' : 'animal cell'}`
        : `${p.type === 'plant' ? 'Plant cell' : p.type === 'bacterium' ? 'Bacterial cell' : 'Animal cell'} · ${p.cell === 'whole' ? 'whole' : 'cutaway'}`
    case 'physics':
      if (p.experiment === 'circuit') return `Circuit: ${ARRANGEMENT_LABEL[p.arr as Arrangement] ?? 'resistors'}, ε = ${p.emf} V`
      if (p.experiment === 'wave') return `Wave: f = ${p.wfreq} Hz, λ = ${p.wlen} m`
      if (p.experiment === 'optics')
        return p.opt === 'lens' ? `Thin lens: ${p.lens}, |f| = ${p.f} cm, dₒ = ${p.do} cm` : `Refraction: n₁ = ${p.n1}, n₂ = ${p.n2}, θ₁ = ${p.inc}°`
      if (p.experiment === 'gas') return `Boyle’s law: ${p.gp} kPa, ${p.gv1} L → ${p.gv2} L`
      if (p.experiment === 'spring') return `Spring: m = ${p.mass} kg, k = ${p.k} N/m, x₀ = ${p.x0} m`
      return `Launch at ${p.speed} m/s, ${p.angle}°${Number(p.height) > 0 ? ` from ${p.height} m` : ''}${p.gravity !== '9.81' ? `, g = ${p.gravity} m/s²` : ''}`
    case 'mathematics': {
      if (p.msec === 'functions') return `${FUNCTIONS.find((f) => f.id === p.fn)?.name ?? 'Function'} function · calculus tools`
      if (p.msec === 'motion') return `Derivatives and motion · ${MOTIONS.find((m) => m.id === p.mo)?.name ?? 'motion'} at t = ${p.mt} s`
      if (p.msec === 'vectors') return 'Vectors and a 2×2 transformation'
      if (p.msec === 'statistics')
        return p.sv === 'binomial' ? `Binomial distribution: n = ${p.bn}, p = ${p.bp}` : `Descriptive statistics · ${p.ds === 'custom' ? 'your values' : (findDataset(p.ds)?.name ?? 'data')}`
      const name = getSurface(p.surface as never)?.name ?? 'Surface'
      return p.slice ? `${name} · slice ${p.slice} = ${p.at}` : name
    }
    case 'anatomy':
      if (p.breath) return `Breathing mechanics · ${p.breath} ${p.bpos}%${p.bshow === 'exchange' ? ' · gas exchange' : ''}`
      if (p.bview) {
        const views: Record<string, string> = { front: 'front', back: 'back', side: 'side' }
        const s = p.atlas ? findStructure(p.atlas) : undefined
        const sys = p.asys ? ATLAS_SYSTEM_NAMES[p.asys] : undefined
        if (s) return `Body atlas · ${s.name}${sys ? ` (from the ${sys.toLowerCase()} system)` : ''} · ${views[p.bview] ?? 'front'} view`
        return sys ? `Body atlas · ${sys} system · ${views[p.bview] ?? 'front'} view` : `Body atlas · ${views[p.bview] ?? 'front'} view`
      }
      return p.part ? `${findHeartPart(p.part)?.name ?? 'Heart structure'} · ${p.heart === 'cutaway' ? 'cutaway' : 'whole'} heart` : `Human heart · ${p.heart === 'cutaway' ? 'cutaway' : 'whole'}`
  }
}
