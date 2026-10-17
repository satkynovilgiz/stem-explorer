export const ORGANELLE_IDS = [
  'plasma-membrane',
  'cytoplasm',
  'nucleus',
  'nucleolus',
  'mitochondrion',
  'rough-er',
  'smooth-er',
  'golgi',
  'ribosome',
  'lysosome',
  'cell-wall',
  'chloroplast',
  'central-vacuole',
  'vacuole-membrane',
  'capsule',
  'bacterial-wall',
  'bacterial-membrane',
  'bacterial-cytoplasm',
  'nucleoid',
  'bacterial-ribosomes',
  'flagellum',
  'pili',
  'fimbriae',
] as const

export const CELL_TYPES = ['animal', 'plant', 'bacterium'] as const
export type CellType = (typeof CELL_TYPES)[number]

export type OrganelleId = (typeof ORGANELLE_IDS)[number]

export interface BiologySource {
  id: string
  label: string
  url: string
}

export interface Relationship {
  /** Related structure; the UI turns this into a button that selects it. */
  targetId: OrganelleId
  text: string
}

export interface GlossaryTerm {
  term: string
  definition: string
}

export interface Organelle {
  /** Stable ID used in URLs and tests. */
  id: OrganelleId
  name: string
  /** Name for one copy of a repeated structure, e.g. "Mitochondrion" → "mitochondrion 2". */
  instanceName?: string
  /** One-line tag for the structure list. */
  tag: string
  /** Short introductory explanation. */
  summary: string
  functions: readonly string[]
  structure: string
  relationships: readonly Relationship[]
  /** Technical words introduced in this entry. */
  glossary: readonly GlossaryTerm[]
  /** How the 3D model departs from real cells. */
  simplifications: readonly string[]
  sourceIds: readonly string[]
  /** Illustrative model color — not the structure's natural appearance. */
  color: string
  /** Shown as a label by default (major structures only, to limit clutter). */
  majorLabel: boolean
  /** True for structures inside the cell's outer surface (hidden in the whole-cell view). In the plant
   * model everything except the cell wall is internal; see isInternal(). */
  internal: boolean
}

export type CellView = 'whole' | 'cutaway'
