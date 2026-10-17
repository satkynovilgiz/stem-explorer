/*
 * Whole-body atlas schema. Coordinates are "body units": the schematic figure stands in the
 * anatomical position with its feet at y = 0 and the top of the head at y = 10.
 * - +x is the body's LEFT (so in an anterior view the body's left appears on the viewer's right),
 * - +y is superior,
 * - +z is anterior.
 * Every shape is schematic: simple primitives placed to show position and relationships, not
 * anatomically precise form or size.
 */

export type Vec3 = readonly [number, number, number]

export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'nervous'
  | 'cardiovascular'
  | 'respiratory'
  | 'digestive'
  | 'urinary'
  | 'endocrine'
  | 'lymphatic'
  | 'integumentary'
  | 'reproductive'

export type RegionId = 'head-neck' | 'thorax' | 'abdomen' | 'pelvis' | 'back' | 'upper-limb' | 'lower-limb' | 'whole-body'

/** The two typical reproductive configurations shown; neither is presented as universal. */
export type ReproductiveVariant = 'ovarian' | 'testicular'

export type Shape =
  | { kind: 'ellipsoid'; center: Vec3; radii: Vec3; /** Euler angles in radians (XYZ). */ rotation?: Vec3 }
  | { kind: 'capsule'; from: Vec3; to: Vec3; radius: number }
  | { kind: 'box'; center: Vec3; size: Vec3; rotation?: Vec3 }
  /** A smooth tube through the points (vessels, nerves, airways, ribs, the gut). */
  | { kind: 'tube'; points: readonly Vec3[]; radius: number; closed?: boolean }

export type Representation =
  /** One named structure drawn as its own shape. */
  | 'individual'
  /** Several structures drawn together as one shape or set of shapes (e.g. the carpal bones). */
  | 'group'
  /** Not drawn; it organises child structures in the list. */
  | 'container'

export interface AtlasStructure {
  /** Stable identifier used in links, saved explorations and notes. Never reuse or rename. */
  id: string
  name: string
  system: SystemId
  /** Other systems the structure also belongs to (e.g. the pancreas: digestive and endocrine). */
  alsoIn?: readonly SystemId[]
  region: RegionId
  /** Parent in the hierarchical list (e.g. a bone's parent is its skeletal division). */
  parent?: string
  /** Related structures in the atlas (selectable links), with how they relate. */
  related?: readonly { id: string; relation: string }[]
  /** Paired structures: which side, and the id of the other side. */
  side?: 'left' | 'right'
  pairId?: string
  /** Only shown with this reproductive variant. */
  variant?: ReproductiveVariant
  description: string
  function: string
  representation: Representation
  /** For groups: what the group contains and why it is grouped. */
  grouping?: string
  shapes: readonly Shape[]
  /** What the drawn shape does not show. Falls back to the system's general limitation. */
  limitations?: string
  /** Source ids from the shared registry (src/data/sources.ts). */
  sources: readonly string[]
  /** Other names people search for (only well-established synonyms). */
  aliases?: readonly string[]
  /** Opens a detailed module for this structure. */
  module?: 'heart'
}

export interface AtlasSystem {
  id: SystemId
  name: string
  color: string
  /** Shown by default when the atlas opens. */
  defaultVisible: boolean
  defaultOpacity: number
  summary: string
  /** Applies to every structure in the system unless it states its own. */
  limitation: string
  /** "What is included" inventory: explicit omissions. */
  omissions: readonly string[]
  sources: readonly string[]
}

export interface AtlasRegion {
  id: RegionId
  name: string
  /** Camera framing for "focus on region" (body units). */
  center: Vec3
  size: number
}
