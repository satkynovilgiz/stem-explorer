import { ATLAS_IDS, ATLAS_REGIONS, ATLAS_STRUCTURES, ATLAS_SYSTEMS } from '.'

/** What the atlas URL parser needs to validate links (see parseAtlasParams). */
export const ATLAS_CONFIG = {
  validIds: ATLAS_IDS,
  systemIds: ATLAS_SYSTEMS.map((s) => s.id),
  defaultLayers: ATLAS_SYSTEMS.filter((s) => s.defaultVisible).map((s) => s.id),
  regionIds: ATLAS_REGIONS.map((r) => r.id),
  variantOf: Object.fromEntries(ATLAS_STRUCTURES.filter((s) => s.variant).map((s) => [s.id, s.variant!])),
}
