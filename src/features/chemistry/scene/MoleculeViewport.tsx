import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { atomRadius } from '../../../data/chemistry/elements'
import type { Molecule, Representation } from '../../../data/chemistry/types'
import { AtomLabelLayer, AtomLabelProjector, type LabelElements } from './AtomLabels'
import { CameraRig } from './CameraRig'
import { MoleculeModel } from './MoleculeModel'
import { SCENE } from './sceneTheme'

export interface MoleculeViewportProps {
  molecule: Molecule
  representation: Representation
  showLabels: boolean
  autoRotate: boolean
  reducedMotion: boolean
  selectedAtomId: string | null
  resetToken: number
  onSelectAtom: (id: string | null) => void
  onReady: () => void
  onContextLost: () => void
}

/** Enclosing radius using van der Waals spheres, so framing is stable across display modes. */
function fitRadius(molecule: Molecule): number {
  return Math.max(
    ...molecule.atoms.map((a) => Math.hypot(...a.position) + atomRadius(a.element, 'space-filling')),
  )
}

export default function MoleculeViewport({
  molecule,
  representation,
  showLabels,
  autoRotate,
  reducedMotion,
  selectedAtomId,
  resetToken,
  onSelectAtom,
  onReady,
  onContextLost,
}: MoleculeViewportProps) {
  const radius = useMemo(() => fitRadius(molecule), [molecule])
  const radii = useMemo(
    () => new Map(molecule.atoms.map((a) => [a.id, atomRadius(a.element, representation)])),
    [molecule, representation],
  )
  const labelElements = useRef<LabelElements>(new Map())

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop={autoRotate ? 'always' : 'demand'}
        camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 10] }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onPointerMissed={() => onSelectAtom(null)}
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

        <MoleculeModel
          molecule={molecule}
          representation={representation}
          selectedAtomId={selectedAtomId}
          onSelectAtom={onSelectAtom}
        />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping={!reducedMotion}
          dampingFactor={0.12}
          autoRotate={autoRotate}
          autoRotateSpeed={reducedMotion ? 0.6 : 1.4}
        />
        <CameraRig fitRadius={radius} resetToken={`${molecule.id}:${resetToken}`} />
        <AtomLabelProjector
          atoms={molecule.atoms}
          radii={radii}
          offsetAbove={representation === 'ball-and-stick'}
          elements={labelElements}
          visible={showLabels}
        />
      </Canvas>
      {showLabels && (
        <AtomLabelLayer atoms={molecule.atoms} selectedAtomId={selectedAtomId} elements={labelElements} />
      )}
    </>
  )
}
