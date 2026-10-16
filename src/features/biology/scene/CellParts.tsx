import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BackSide,
  CatmullRomCurve3,
  DoubleSide,
  InstancedMesh,
  Object3D,
  Shape,
  Vector2,
  Vector3,
  type Side,
} from 'three'
import { findOrganelle } from '../../../data/biology/organelles'
import type { OrganelleId } from '../../../data/biology/types'
import {
  BOUND_RIBOSOMES,
  CELL_RADIUS,
  CELL_Y_SCALE,
  CUT_HALF_ANGLE,
  FREE_RIBOSOMES,
  GOLGI,
  LYSOSOME_RADIUS,
  LYSOSOMES,
  MITOCHONDRIA,
  MITOCHONDRION_SIZE,
  NUCLEOLUS,
  NUCLEUS,
  ROUGH_ER,
  SMOOTH_ER_PATHS,
  type V3,
} from './layout'
import { pick, shellAngles } from './sceneHelpers'

/**
 * 'selected' = the chosen structure (or chosen copy); 'sibling' = other copies of the same type.
 * The tint is backed by non-color cues: a "Selected" scene label, the list check mark and the details panel.
 */
export type Highlight = 'selected' | 'sibling' | null

export type { SelectHandler } from './sceneHelpers'
import type { SelectHandler } from './sceneHelpers'


const color = (id: OrganelleId) => findOrganelle(id)?.color ?? '#888888'

export function Material({
  base,
  highlight,
  side,
  roughness = 0.55,
}: {
  base: string
  highlight: Highlight
  side?: Side
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={base}
      roughness={roughness}
      metalness={0.02}
      side={side}
      // Glow in the structure's own color so its hue stays recognizable.
      emissive={highlight ? base : '#000000'}
      emissiveIntensity={highlight === 'selected' ? 0.45 : highlight === 'sibling' ? 0.12 : 0}
    />
  )
}

export function PlasmaMembrane({ open, highlight, onSelect }: { open: boolean; highlight: Highlight; onSelect: SelectHandler }) {
  const [phiStart, phiLength] = shellAngles(open)
  return (
    <mesh scale={[1, CELL_Y_SCALE, 1]} {...pick('plasma-membrane', null, onSelect)}>
      <sphereGeometry args={[CELL_RADIUS, 96, 64, phiStart, phiLength]} />
      <Material base={color('plasma-membrane')} highlight={highlight} side={open ? DoubleSide : undefined} roughness={0.4} />
    </mesh>
  )
}

/** The cytoplasm is drawn as the inner back wall seen through the cutaway. */
export function Cytoplasm({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const [phiStart, phiLength] = shellAngles(true)
  return (
    <mesh scale={[1, CELL_Y_SCALE, 1]} {...pick('cytoplasm', null, onSelect)}>
      <sphereGeometry args={[CELL_RADIUS * 0.965, 96, 64, phiStart, phiLength]} />
      <Material base={color('cytoplasm')} highlight={highlight} side={BackSide} roughness={0.9} />
    </mesh>
  )
}

/** Fibonacci points on the front part of the nuclear envelope, used as pore markers. */
function porePositions(): V3[] {
  const points: V3[] = []
  const n = 60
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n
    const r = Math.sqrt(1 - y * y)
    const theta = i * Math.PI * (3 - Math.sqrt(5))
    const x = Math.cos(theta) * r
    const z = Math.sin(theta) * r
    // Skip the opened wedge (around +z) so pores sit only on the remaining envelope.
    const phi = Math.atan2(z, -x)
    const fromFront = Math.abs(((phi - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
    if (fromFront < CUT_HALF_ANGLE + 0.1) continue
    points.push([x * NUCLEUS.radius * 1.005, y * NUCLEUS.radius * 1.005, z * NUCLEUS.radius * 1.005])
  }
  return points
}

export function Nucleus({ open, highlight, onSelect }: { open: boolean; highlight: Highlight; onSelect: SelectHandler }) {
  const [phiStart, phiLength] = shellAngles(open)
  const pores = useMemo(() => porePositions(), [])
  const base = color('nucleus')
  return (
    <group position={NUCLEUS.center} {...pick('nucleus', null, onSelect)}>
      {/* Nuclear envelope (double membrane, drawn as outer surface + inner nucleoplasm wall). */}
      <mesh>
        <sphereGeometry args={[NUCLEUS.radius, 64, 48, phiStart, phiLength]} />
        <Material base={base} highlight={highlight} side={DoubleSide} roughness={0.45} />
      </mesh>
      {open && (
        <mesh>
          <sphereGeometry args={[NUCLEUS.radius * 0.93, 64, 48, phiStart, phiLength]} />
          <Material base="#3b3373" highlight={highlight} side={BackSide} roughness={0.9} />
        </mesh>
      )}
      {pores.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.075, 10, 8]} />
          <meshStandardMaterial color="#2a2350" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

export function Nucleolus({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  return (
    <mesh position={NUCLEOLUS.center} {...pick('nucleolus', null, onSelect)}>
      <icosahedronGeometry args={[NUCLEOLUS.radius, 3]} />
      <Material base={color('nucleolus')} highlight={highlight} roughness={0.8} />
    </mesh>
  )
}

export function RoughER({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const arc = ((ROUGH_ER.endDeg - ROUGH_ER.startDeg) * Math.PI) / 180
  const start = (ROUGH_ER.startDeg * Math.PI) / 180
  return (
    <group position={NUCLEUS.center} {...pick('rough-er', null, onSelect)}>
      {ROUGH_ER.radii.map((radius) => (
        <mesh key={radius} rotation={[0, 0, start]} scale={[1, 1, ROUGH_ER.depthScale]}>
          <torusGeometry args={[radius, ROUGH_ER.tube, 10, 64, arc]} />
          <Material base={color('rough-er')} highlight={highlight} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function SmoothER({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const curves = useMemo(
    () => SMOOTH_ER_PATHS.map((path) => new CatmullRomCurve3(path.map((p) => new Vector3(...p)))),
    [],
  )
  return (
    <group {...pick('smooth-er', null, onSelect)}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 48, 0.12, 10, false]} />
          <Material base={color('smooth-er')} highlight={highlight} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export function Golgi({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const base = color('golgi')
  return (
    <group {...pick('golgi', null, onSelect)}>
      <group position={GOLGI.center}>
        {Array.from({ length: GOLGI.sacs }, (_, i) => {
          // Sacs get shorter toward the trans (right) face; all curve toward the nucleus.
          const arc = (110 - i * 9) * (Math.PI / 180)
          return (
            <mesh
              key={i}
              position={[i * GOLGI.spacing - GOLGI.arcRadius, 0, 0]}
              rotation={[0, 0, -arc / 2]}
              scale={[1, 1, GOLGI.depthScale]}
            >
              <torusGeometry args={[GOLGI.arcRadius, GOLGI.tube, 10, 40, arc]} />
              <Material base={base} highlight={highlight} roughness={0.5} />
            </mesh>
          )
        })}
      </group>
      {GOLGI.vesicles.map((p, i) => (
        <mesh key={`v${i}`} position={p}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <Material base={base} highlight={highlight} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** A mitochondrion cut in half lengthwise: outer half-shell, matrix face and cristae folds. */
export function Mitochondrion({
  instance,
  highlight,
  onSelect,
}: {
  instance: number
  highlight: Highlight
  onSelect: SelectHandler
}) {
  const { center, rotationDeg } = MITOCHONDRIA[instance]
  const { radius, length } = MITOCHONDRION_SIZE
  const half = length / 2

  const profile = useMemo(() => {
    // Capsule outline (x ≥ 0) rotated around the y axis by the lathe.
    const pts: Vector2[] = []
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2)
      pts.push(new Vector2(Math.cos(a) * radius, -half + Math.sin(a) * radius))
    }
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * (Math.PI / 2)
      pts.push(new Vector2(Math.cos(a) * radius, half + Math.sin(a) * radius))
    }
    return pts
  }, [radius, half])

  const faceShape = useMemo(() => {
    const s = new Shape()
    const r = radius * 0.94
    s.absarc(0, half, r, 0, Math.PI, false)
    s.absarc(0, -half, r, Math.PI, 2 * Math.PI, false)
    s.closePath()
    return s
  }, [radius, half])

  const base = color('mitochondrion')
  return (
    <group position={center} rotation={[0, 0, (rotationDeg * Math.PI) / 180]} {...pick('mitochondrion', instance, onSelect)}>
      {/* Outer membrane: back half of a capsule, open toward the viewer. */}
      <mesh>
        <latheGeometry args={[profile, 32, Math.PI / 2, Math.PI]} />
        <Material base={base} highlight={highlight} side={DoubleSide} roughness={0.5} />
      </mesh>
      {/* Matrix seen in section. */}
      <mesh position={[0, 0, -0.02]}>
        <shapeGeometry args={[faceShape]} />
        <Material base="#f6b48d" highlight={highlight} roughness={0.8} />
      </mesh>
      {/* Cristae: folds of the inner membrane reaching in from alternate sides. */}
      {[-0.75, -0.38, 0, 0.38, 0.75].map((t, i) => (
        <mesh key={i} position={[(i % 2 === 0 ? -1 : 1) * radius * 0.28, t * half, 0.03]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.04, radius * 1.05, 4, 8]} />
          <Material base="#b9532a" highlight={highlight} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

export function Lysosome({
  instance,
  highlight,
  onSelect,
}: {
  instance: number
  highlight: Highlight
  onSelect: SelectHandler
}) {
  return (
    <mesh position={LYSOSOMES[instance]} {...pick('lysosome', instance, onSelect)}>
      <sphereGeometry args={[LYSOSOME_RADIUS, 24, 16]} />
      <Material base={color('lysosome')} highlight={highlight} roughness={0.35} />
    </mesh>
  )
}

/** Free (and optionally ER-bound) ribosomes as one instanced mesh, selected as a group. */
export function Ribosomes({
  includeFree,
  includeBound,
  highlight,
  onSelect,
}: {
  includeFree: boolean
  includeBound: boolean
  highlight: Highlight
  onSelect: SelectHandler
}) {
  const ref = useRef<InstancedMesh>(null)
  const points = useMemo(
    () => [...(includeFree ? FREE_RIBOSOMES : []), ...(includeBound ? BOUND_RIBOSOMES : [])],
    [includeFree, includeBound],
  )

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    points.forEach((p, i) => {
      dummy.position.set(...p)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [points])

  if (points.length === 0) return null
  return (
    <instancedMesh
      key={points.length}
      ref={ref}
      args={[undefined, undefined, points.length]}
      {...pick('ribosome', null, onSelect)}
    >
      <sphereGeometry args={[0.085, 10, 8]} />
      <Material base={color('ribosome')} highlight={highlight} roughness={0.7} />
    </instancedMesh>
  )
}
