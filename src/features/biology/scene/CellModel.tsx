import { useCursor } from '@react-three/drei'
import { useState } from 'react'
import { INSTANCE_COUNTS } from '../../../data/biology/organelles'
import type { CellView, OrganelleId } from '../../../data/biology/types'
import type { BiologySelection } from '../state'
import { visibleStructures } from './visibility'
import {
  Cytoplasm,
  Golgi,
  Lysosome,
  Mitochondrion,
  Nucleolus,
  Nucleus,
  PlasmaMembrane,
  Ribosomes,
  RoughER,
  SmoothER,
  type Highlight,
  type SelectHandler,
} from './CellParts'

interface Props {
  view: CellView
  selection: BiologySelection | null
  isolated: boolean
  onSelect: SelectHandler
}

export function CellModel({ view, selection, isolated, onSelect }: Props) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const visible = visibleStructures(view, selection, isolated)
  const open = view === 'cutaway' || isolated

  const highlight = (id: OrganelleId, instance: number | null = null): Highlight => {
    if (selection?.organelleId !== id) return null
    if (selection.instance === null || instance === null || selection.instance === instance) return 'selected'
    return 'sibling'
  }
  const range = (id: OrganelleId) => Array.from({ length: INSTANCE_COUNTS[id] ?? 0 }, (_, i) => i)
  // Isolating the rough ER keeps its attached ribosomes, which define it.
  const boundRibosomes = visible.has('ribosome') || (isolated && selection?.organelleId === 'rough-er')

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {visible.has('plasma-membrane') && (
        <PlasmaMembrane open={open} highlight={highlight('plasma-membrane')} onSelect={onSelect} />
      )}
      {visible.has('cytoplasm') && <Cytoplasm highlight={highlight('cytoplasm')} onSelect={onSelect} />}
      {visible.has('nucleus') && <Nucleus open={open} highlight={highlight('nucleus')} onSelect={onSelect} />}
      {visible.has('nucleolus') && <Nucleolus highlight={highlight('nucleolus')} onSelect={onSelect} />}
      {visible.has('rough-er') && <RoughER highlight={highlight('rough-er')} onSelect={onSelect} />}
      {visible.has('smooth-er') && <SmoothER highlight={highlight('smooth-er')} onSelect={onSelect} />}
      {visible.has('golgi') && <Golgi highlight={highlight('golgi')} onSelect={onSelect} />}
      {visible.has('mitochondrion') &&
        range('mitochondrion').map((i) => (
          <Mitochondrion key={i} instance={i} highlight={highlight('mitochondrion', i)} onSelect={onSelect} />
        ))}
      {visible.has('lysosome') &&
        range('lysosome').map((i) => (
          <Lysosome key={i} instance={i} highlight={highlight('lysosome', i)} onSelect={onSelect} />
        ))}
      {(visible.has('ribosome') || boundRibosomes) && (
        <Ribosomes
          includeFree={visible.has('ribosome')}
          includeBound={boundRibosomes}
          highlight={highlight('ribosome')}
          onSelect={onSelect}
        />
      )}
    </group>
  )
}
