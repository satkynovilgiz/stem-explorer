import { type SystemId } from '../data/anatomy/atlas'
import { ATLAS_CONFIG } from '../data/anatomy/atlas/config'
import type { SubjectId } from '../data/subjects'
import { canonicalize, hrefFor } from './explorations'

/** A link through the same validation as saved explorations, so it always opens a real state. */
export function linkTo(subject: SubjectId, params: Record<string, string>): string {
  const state = canonicalize(subject, params)
  if (!state) throw new Error(`Invalid link ${subject} ${JSON.stringify(params)}`)
  return hrefFor(state)
}

/** Atlas link that also shows the structure's layer (and its reproductive configuration, if any). */
export function atlasLink(id: string, system: SystemId, variant?: 'ovarian' | 'testicular', extra: Record<string, string> = {}): string {
  const layers = ATLAS_CONFIG.defaultLayers.includes(system) ? [...ATLAS_CONFIG.defaultLayers] : [...ATLAS_CONFIG.defaultLayers, system]
  return linkTo('anatomy', {
    atlas: id,
    bview: 'front',
    layers: ATLAS_CONFIG.systemIds.filter((s) => layers.includes(s)).join(','),
    ...(variant ? { repro: variant } : {}),
    ...extra,
  })
}
