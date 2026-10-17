import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { atomRadius } from '../../../data/chemistry/elements'
import type { Atom, Molecule, Representation, Vec3 } from '../../../data/chemistry/types'
import { formatAngle, formatDistance, measure, type InteractionMode } from '../../../lib/measurement'
import { SceneLabelLayer, SceneLabelProjector, type LabelElements, type SceneLabel } from './AtomLabels'
import type { AtomHighlight } from './AtomMesh'
import { CameraRig } from './CameraRig'
import { displayMatrix, enclosingRadius } from './displayTransform'
import { MeasurementOverlay } from './MeasurementOverlay'
import { angleGeometry } from './measurementGeometry'
import { MoleculeModel } from './MoleculeModel'
import { SCENE } from './sceneTheme'

export interface MoleculeViewportProps {
  molecule: Molecule
  representation: Representation
  showLabels: boolean
  /** Effective auto-rotation (already paused by the parent while measuring). */
  autoRotate: boolean
  reducedMotion: boolean
  mode: InteractionMode
  inspectedAtomId: string | null
  measureSelection: readonly string[]
  resetToken: number
  onPickAtom: (id: string) => void
  onBackgroundClick: () => void
  onReady: () => void
  onContextLost: () => void
}

function measurementValueLabel(
  molecule: Molecule,
  selection: readonly string[],
  mode: InteractionMode,
): SceneLabel | null {
  if (mode === 'inspect') return null
  const result = measure(molecule, selection, mode)
  if (!result) return null
  let position: Vec3
  if (result.kind === 'distance') {
    const [a, b] = result.atoms
    position = [
      (a.position[0] + b.position[0]) / 2,
      (a.position[1] + b.position[1]) / 2,
      (a.position[2] + b.position[2]) / 2,
    ]
  } else {
    const [a, v, c] = result.atoms
    const { labelAnchor } = angleGeometry(a.position, v.position, c.position)
    position = [labelAnchor.x, labelAnchor.y, labelAnchor.z]
  }
  return {
    key: 'measure:value',
    position,
    liftRadius: 0,
    className: 'measure-label',
    content: result.kind === 'distance' ? formatDistance(result.value) : formatAngle(result.value),
  }
}

export default function MoleculeViewport({
  molecule,
  representation,
  showLabels,
  autoRotate,
  reducedMotion,
  mode,
  inspectedAtomId,
  measureSelection,
  resetToken,
  onPickAtom,
  onBackgroundClick,
  onReady,
  onContextLost,
}: MoleculeViewportProps) {
  const matrix = useMemo(() => displayMatrix(molecule), [molecule])
  const radius = useMemo(() => enclosingRadius(molecule, representation), [molecule, representation])
  const labelElements = useRef<LabelElements>(new Map())

  const measuredAtoms = useMemo(
    () =>
      measureSelection
        .map((id) => molecule.atoms.find((a) => a.id === id))
        .filter((a): a is Atom => a !== undefined),
    [molecule, measureSelection],
  )

  const highlights = useMemo(() => {
    const map = new Map<string, Exclude<AtomHighlight, null>>()
    if (inspectedAtomId) map.set(inspectedAtomId, 'inspect')
    for (const a of measuredAtoms) map.set(a.id, 'measure')
    return map
  }, [inspectedAtomId, measuredAtoms])

  const labels = useMemo<SceneLabel[]>(() => {
    const result: SceneLabel[] = []
    for (const atom of molecule.atoms) {
      const order = measureSelection.indexOf(atom.id)
      const inspected = atom.id === inspectedAtomId
      // Selected atoms always keep a label so selection is never shown by color alone.
      if (!showLabels && order < 0 && !inspected) continue
      result.push({
        key: `atom:${atom.id}`,
        position: atom.position,
        liftRadius: representation === 'ball-and-stick' ? atomRadius(atom.element, representation) : 0,
        className: `atom-label${order >= 0 ? ' is-measured' : inspected ? ' is-selected' : ''}`,
        content:
          order >= 0 ? (
            <>
              <span className="label-order">{order + 1}</span>
              {atom.id}
            </>
          ) : (
            atom.id
          ),
      })
    }
    const value = measurementValueLabel(molecule, measureSelection, mode)
    if (value) result.push(value)
    return result
  }, [molecule, representation, showLabels, inspectedAtomId, measureSelection, mode])

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop={autoRotate ? 'always' : 'demand'}
        camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 10] }}
        gl={{ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true }}
        onPointerMissed={onBackgroundClick}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            onContextLost()
          })
          onReady()
        }}
      >
        <color attach="background" args={[SCENE.background]} />
        <hemisphereLight args={['#dfe9ee', '#1a1f24', 0.9]} />
        <directionalLight position={[5, 6, 8]} intensity={1.8} />
        <directionalLight position={[-6, -3, -4]} intensity={0.45} />

        {/* Display-only transform: atoms stay in source coordinates (Å) inside this group. */}
        <group matrixAutoUpdate={false} matrix={matrix}>
          {/* Keyed by molecule so hover state never carries over to another molecule's atom IDs. */}
          <MoleculeModel
            key={molecule.id}
            molecule={molecule}
            representation={representation}
            highlights={highlights}
            onPickAtom={onPickAtom}
          />
          {mode !== 'inspect' && measuredAtoms.length > 1 && (
            <MeasurementOverlay atoms={measuredAtoms} mode={mode} />
          )}
        </group>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping={!reducedMotion}
          dampingFactor={0.12}
          autoRotate={autoRotate}
          autoRotateSpeed={reducedMotion ? 0.6 : 1.4}
        />
        <CameraRig fitRadius={radius} resetToken={`${molecule.id}:${resetToken}`} />
        <SceneLabelProjector labels={labels} matrix={matrix} elements={labelElements} />
      </Canvas>
      <SceneLabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
