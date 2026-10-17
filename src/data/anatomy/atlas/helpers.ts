import { mirrorShape } from './figure'
import type { AtlasStructure, Shape } from './types'

type PairInput = Omit<AtlasStructure, 'id' | 'name' | 'side' | 'pairId' | 'shapes'> & {
  /** Base id; the pair becomes `${id}-left` and `${id}-right`. */
  id: string
  /** Name without a side, e.g. "kidney" → "Left kidney" / "Right kidney". */
  name: string
  /** Related ids may contain "{side}", replaced by left/right. Shapes for the LEFT side (x > 0); the right side is mirrored. */
  shapes: readonly Shape[]
  /** Right-side shapes when the two sides are not mirror images (e.g. the kidneys). */
  rightShapes?: readonly Shape[]
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Builds a left/right pair that link to each other. */
export function pair(input: PairInput): [AtlasStructure, AtlasStructure] {
  const { shapes, rightShapes, ...rest } = input
  const make = (side: 'left' | 'right'): AtlasStructure => ({
    ...rest,
    id: `${input.id}-${side}`,
    name: `${capitalise(side)} ${input.name}`,
    side,
    pairId: `${input.id}-${side === 'left' ? 'right' : 'left'}`,
    parent: rest.parent?.replace('{side}', side),
    // "{side}" in a related id means the structure on the same side (e.g. adrenal-gland-{side}).
    related: rest.related?.map((r) => ({ ...r, id: r.id.replace('{side}', side) })),
    shapes: side === 'left' ? shapes : (rightShapes ?? shapes.map(mirrorShape)),
  })
  return [make('left'), make('right')]
}
