import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Line, LineBasicMaterial, OrthographicCamera, type Group, type Mesh } from 'three'
import { springAt, type SpringSolution } from '../../../../physics/spring'
import type { SimClock } from '../../clock'
import { SCENE_COLORS } from '../../colors'

/** Scene units per metre. The block moves at most 0.5 m, i.e. 2 units either side of equilibrium. */
const S = 4
const WALL_X = -3.6
const BLOCK_HALF = 0.35
const HALF_VIEW = 4.4

export interface SpringSceneProps {
  solution: SpringSolution
  clock: SimClock
  onReady: () => void
  onContextLost: () => void
}

const TURNS = 12
const COIL_POINTS = TURNS * 24 + 1
const COIL_RADIUS = 0.22

/** Writes the coil from x = start to x = end into a position buffer (the wire keeps its thickness). */
function writeCoil(positions: Float32Array, start: number, end: number) {
  for (let i = 0; i < COIL_POINTS; i++) {
    const u = i / (COIL_POINTS - 1)
    const a = u * TURNS * Math.PI * 2
    positions[i * 3] = start + u * (end - start)
    positions[i * 3 + 1] = Math.sin(a) * COIL_RADIUS
    positions[i * 3 + 2] = Math.cos(a) * COIL_RADIUS
  }
}

/** Fits the orthographic camera to the scene width on every resize. */
function FitCamera() {
  const get = useThree((s) => s.get)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const { camera, invalidate } = get()
    if (!(camera instanceof OrthographicCamera)) return
    camera.zoom = Math.min(size.width / (2 * HALF_VIEW), size.height / 3.4)
    camera.updateProjectionMatrix()
    invalidate()
  }, [get, size])
  return null
}

function Oscillator({ solution, clock }: { solution: SpringSolution; clock: SimClock }) {
  const invalidate = useThree((s) => s.invalidate)
  const coil = useMemo(() => {
    const geometry = new BufferGeometry()
    const positions = new Float32Array(COIL_POINTS * 3)
    writeCoil(positions, WALL_X, -BLOCK_HALF)
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    return new Line(geometry, new LineBasicMaterial({ color: '#d5dde2' }))
  }, [])
  const block = useRef<Mesh>(null)
  const arrow = useRef<Group>(null)
  const maxForce = Math.max(solution.params.k * solution.amplitude, 1e-9)

  // Render only when time changes (frameloop is "demand").
  useEffect(() => clock.subscribe(() => invalidate()), [clock, invalidate])
  useEffect(() => invalidate(), [solution, invalidate])

  useFrame(() => {
    const now = springAt(solution, clock.get())
    const bx = now.x * S
    if (block.current) block.current.position.x = bx
    const attribute = coil.geometry.getAttribute('position') as BufferAttribute
    writeCoil(attribute.array as Float32Array, WALL_X, bx - BLOCK_HALF)
    attribute.needsUpdate = true
    if (arrow.current) {
      // Restoring-force arrow from the block's centre; length ∝ |F| (at most 1.6 units).
      const len = (Math.abs(now.force) / maxForce) * 1.6
      arrow.current.visible = len > 0.02
      arrow.current.position.set(bx, 0.85, 0)
      arrow.current.scale.set(Math.max(len, 0.001), 1, 1)
      arrow.current.rotation.z = now.force < 0 ? Math.PI : 0
    }
  })

  return (
    <>
      <primitive object={coil} />
      <mesh ref={block}>
        <boxGeometry args={[BLOCK_HALF * 2, 0.7, 0.7]} />
        <meshStandardMaterial color={SCENE_COLORS.projectile} roughness={0.5} />
      </mesh>
      {/* Unit arrow along +x (shaft + head), scaled to the force and flipped for −x. */}
      <group ref={arrow}>
        <mesh position={[0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshBasicMaterial color={SCENE_COLORS.acceleration} />
        </mesh>
        <mesh position={[0.9, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.11, 0.2, 12]} />
          <meshBasicMaterial color={SCENE_COLORS.acceleration} />
        </mesh>
      </group>
    </>
  )
}

export default function SpringScene({ solution, clock, onReady, onContextLost }: SpringSceneProps) {
  return (
    <Canvas
      className="viewport-canvas"
      orthographic
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 0.4, 20], zoom: 60, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onContextLost()
        })
        onReady()
      }}
    >
      <color attach="background" args={[SCENE_COLORS.background]} />
      <hemisphereLight args={['#e4eef2', '#1a1f24', 1.0]} />
      <directionalLight position={[3, 6, 10]} intensity={1.4} />
      <FitCamera />
      {/* Wall and frictionless floor. */}
      <mesh position={[WALL_X - 0.15, 0.3, 0]}>
        <boxGeometry args={[0.3, 2.2, 1]} />
        <meshStandardMaterial color="#6b7781" />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[8.4, 0.1, 1]} />
        <meshStandardMaterial color={SCENE_COLORS.grid} />
      </mesh>
      {/* Equilibrium marker (x = 0): a dashed vertical line. */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, -0.3 + i * 0.22, 0.4]}>
          <boxGeometry args={[0.035, 0.12, 0.01]} />
          <meshBasicMaterial color={SCENE_COLORS.preview} />
        </mesh>
      ))}
      {/* Tick marks every 0.25 m from −0.5 to 0.5 m. */}
      {[-0.5, -0.25, 0, 0.25, 0.5].map((m) => (
        <mesh key={m} position={[m * S, -0.52, 0.4]}>
          <boxGeometry args={[0.03, m === 0 ? 0.22 : 0.14, 0.01]} />
          <meshBasicMaterial color={SCENE_COLORS.axis} />
        </mesh>
      ))}
      <Oscillator solution={solution} clock={clock} />
    </Canvas>
  )
}
