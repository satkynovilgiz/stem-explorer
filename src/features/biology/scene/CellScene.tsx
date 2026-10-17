import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { structuresOf } from '../../../data/biology/organelles'
import type { CellType, CellView, OrganelleId } from '../../../data/biology/types'
import { instanceLabel, type BiologySelection } from '../state'
import { CellCameraRig } from './CellCameraRig'
import { CellLabelLayer, CellLabelProjector, type CellLabel, type LabelElements } from './CellLabels'
import { CellModel } from './CellModel'
import { visibleStructures } from './visibility'
import { CELL_RADIUS, focusTarget, labelAnchor } from './layout'
import { PlantCellModel } from './PlantParts'
import { PLANT_CELL_RADIUS, plantFocusTarget, plantLabelAnchor } from './plantLayout'
import { BacteriumModel } from './BacteriumParts'
import { BACTERIUM_RADIUS, bacteriumFocusTarget, bacteriumLabelAnchor } from './bacteriumLayout'

export interface CellSceneProps {
  cellType: CellType
  view: CellView
  selection: BiologySelection | null
  isolated: boolean
  showLabels: boolean
  reducedMotion: boolean
  resetToken: number
  focusToken: number
  onSelect: (organelleId: OrganelleId, instance: number | null) => void
  onBackgroundClick: () => void
  onReady: () => void
  onContextLost: () => void
}

export default function CellScene({
  cellType,
  view,
  selection,
  isolated,
  showLabels,
  reducedMotion,
  resetToken,
  focusToken,
  onSelect,
  onBackgroundClick,
  onReady,
  onContextLost,
}: CellSceneProps) {
  const labelElements = useRef<LabelElements>(new Map())

  const labels = useMemo<CellLabel[]>(() => {
    const visible = visibleStructures(view, selection, isolated, cellType)
    const anchor = cellType === 'plant' ? plantLabelAnchor : cellType === 'bacterium' ? bacteriumLabelAnchor : labelAnchor
    const result: CellLabel[] = []
    for (const o of structuresOf(cellType)) {
      if (!visible.has(o.id)) continue
      const selected = selection?.organelleId === o.id
      // Default labels: major structures only, one per type. The selection is always labelled.
      if (!selected && !(showLabels && o.majorLabel)) continue
      const instance = selected ? selection.instance : null
      result.push({
        key: o.id,
        organelleId: o.id,
        position: anchor(o.id, instance, view),
        text: instance !== null ? instanceLabel(o.id, instance, cellType).replace(/ of \d+$/, '') : o.name,
        selected,
      })
    }
    return result
  }, [cellType, view, selection, isolated, showLabels])

  const focus = selection ? { organelleId: selection.organelleId, instance: selection.instance } : null

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 30] }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onPointerMissed={onBackgroundClick}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            onContextLost()
          })
          onReady()
        }}
      >
        <color attach="background" args={['#121518']} />
        <hemisphereLight args={['#e4eef2', '#1a1f24', 1.0]} />
        <directionalLight position={[6, 8, 10]} intensity={1.7} />
        <directionalLight position={[-8, -4, -6]} intensity={0.4} />

        {cellType === 'plant' ? (
          <PlantCellModel view={view} selection={selection} isolated={isolated} onSelect={onSelect} />
        ) : cellType === 'bacterium' ? (
          <BacteriumModel view={view} selection={selection} isolated={isolated} onSelect={onSelect} />
        ) : (
          <CellModel view={view} selection={selection} isolated={isolated} onSelect={onSelect} />
        )}

        <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.12} />
        <CellCameraRig
          resetToken={resetToken}
          focusToken={focusToken}
          focus={focus}
          reducedMotion={reducedMotion}
          cellRadius={cellType === 'plant' ? PLANT_CELL_RADIUS : cellType === 'bacterium' ? BACTERIUM_RADIUS : CELL_RADIUS}
          focusTarget={cellType === 'plant' ? plantFocusTarget : cellType === 'bacterium' ? bacteriumFocusTarget : focusTarget}
        />
        <CellLabelProjector labels={labels} elements={labelElements} />
      </Canvas>
      <CellLabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
