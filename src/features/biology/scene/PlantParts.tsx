import { useCursor } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BackSide, CatmullRomCurve3, DoubleSide, InstancedMesh, Object3D, Vector3 } from 'three'
import { findOrganelle, instanceCount } from '../../../data/biology/organelles'
import type { CellView, OrganelleId } from '../../../data/biology/types'
import type { BiologySelection } from '../state'
import { Material, type Highlight, type SelectHandler } from './CellParts'
import { pick, shellAngles } from './sceneHelpers'
import type { V3 } from './layout'
import {
  CHLOROPLAST_RADII,
  CHLOROPLASTS,
  MEMBRANE,
  PLANT_BOUND_RIBOSOMES,
  PLANT_FREE_RIBOSOMES,
  PLANT_GOLGI,
  PLANT_MITOCHONDRIA,
  PLANT_MITOCHONDRION,
  PLANT_NUCLEOLUS,
  PLANT_NUCLEUS,
  PLANT_ROUGH_ER,
  PLANT_SMOOTH_ER_PATHS,
  VACUOLE,
  WALL,
} from './plantLayout'
import { visibleStructures } from './visibility'

const color = (id: OrganelleId) => findOrganelle(id)?.color ?? '#888888'

/** A box-shaped shell made of slabs; with `open`, the front (+z) slab is left out (cutaway). */
function BoxShell({ half, thickness, open, base, highlight }: { half: V3; thickness: number; open: boolean; base: string; highlight: Highlight }) {
  const [hx, hy, hz] = half
  const t = thickness
  const slabs: { pos: V3; size: V3 }[] = [
    { pos: [0, 0, -hz + t / 2], size: [2 * hx, 2 * hy, t] },
    { pos: [-hx + t / 2, 0, 0], size: [t, 2 * hy, 2 * hz] },
    { pos: [hx - t / 2, 0, 0], size: [t, 2 * hy, 2 * hz] },
    { pos: [0, hy - t / 2, 0], size: [2 * hx, t, 2 * hz] },
    { pos: [0, -hy + t / 2, 0], size: [2 * hx, t, 2 * hz] },
    ...(open ? [] : [{ pos: [0, 0, hz - t / 2] as V3, size: [2 * hx, 2 * hy, t] as V3 }]),
  ]
  return (
    <>
      {slabs.map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <Material base={base} highlight={highlight} roughness={0.75} />
        </mesh>
      ))}
    </>
  )
}

function CellWall({ open, highlight, onSelect }: { open: boolean; highlight: Highlight; onSelect: SelectHandler }) {
  return (
    <group {...pick('cell-wall', null, onSelect)}>
      <BoxShell half={WALL.half} thickness={WALL.thickness} open={open} base={color('cell-wall')} highlight={highlight} />
    </group>
  )
}

function PlantMembrane({ open, highlight, onSelect }: { open: boolean; highlight: Highlight; onSelect: SelectHandler }) {
  return (
    <group {...pick('plasma-membrane', null, onSelect)}>
      <BoxShell half={MEMBRANE.half} thickness={MEMBRANE.thickness} open={open} base={color('plasma-membrane')} highlight={highlight} />
    </group>
  )
}

/** Cytoplasm: the back panel seen through the cutaway, behind the vacuole. */
function PlantCytoplasm({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const [hx, hy, hz] = MEMBRANE.half
  return (
    <mesh position={[0, 0, -hz + MEMBRANE.thickness + 0.04]} {...pick('cytoplasm', null, onSelect)}>
      <boxGeometry args={[2 * hx - 0.3, 2 * hy - 0.3, 0.04]} />
      <Material base={color('cytoplasm')} highlight={highlight} roughness={0.9} />
    </mesh>
  )
}

/** The vacuole: its membrane as an outer shell (opened in the cutaway) and its contents as the inner wall. */
function Vacuole({
  open,
  showMembrane,
  showContents,
  membraneHighlight,
  contentsHighlight,
  onSelect,
}: {
  open: boolean
  showMembrane: boolean
  showContents: boolean
  membraneHighlight: Highlight
  contentsHighlight: Highlight
  onSelect: SelectHandler
}) {
  const [phiStart, phiLength] = shellAngles(open)
  return (
    <group position={VACUOLE.center} scale={VACUOLE.radii}>
      {showMembrane && (
        <mesh {...pick('vacuole-membrane', null, onSelect)}>
          <sphereGeometry args={[1, 64, 48, phiStart, phiLength]} />
          <Material base={color('vacuole-membrane')} highlight={membraneHighlight} side={DoubleSide} roughness={0.3} />
        </mesh>
      )}
      {showContents && (
        <mesh {...pick('central-vacuole', null, onSelect)}>
          <sphereGeometry args={[0.95, 64, 48, phiStart, phiLength]} />
          <Material base={color('central-vacuole')} highlight={contentsHighlight} side={BackSide} roughness={0.95} />
        </mesh>
      )}
    </group>
  )
}

function PlantNucleus({ open, highlight, onSelect }: { open: boolean; highlight: Highlight; onSelect: SelectHandler }) {
  const [phiStart, phiLength] = shellAngles(open)
  return (
    <group position={PLANT_NUCLEUS.center} {...pick('nucleus', null, onSelect)}>
      <mesh>
        <sphereGeometry args={[PLANT_NUCLEUS.radius, 48, 36, phiStart, phiLength]} />
        <Material base={color('nucleus')} highlight={highlight} side={DoubleSide} roughness={0.45} />
      </mesh>
      {open && (
        <mesh>
          <sphereGeometry args={[PLANT_NUCLEUS.radius * 0.92, 48, 36, phiStart, phiLength]} />
          <Material base="#3b3373" highlight={highlight} side={BackSide} roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}

function PlantNucleolus({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  return (
    <mesh position={PLANT_NUCLEOLUS.center} {...pick('nucleolus', null, onSelect)}>
      <icosahedronGeometry args={[PLANT_NUCLEOLUS.radius, 3]} />
      <Material base={color('nucleolus')} highlight={highlight} roughness={0.8} />
    </mesh>
  )
}

function PlantRoughER({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const arc = ((PLANT_ROUGH_ER.endDeg - PLANT_ROUGH_ER.startDeg) * Math.PI) / 180
  const start = (PLANT_ROUGH_ER.startDeg * Math.PI) / 180
  return (
    <group position={PLANT_NUCLEUS.center} {...pick('rough-er', null, onSelect)}>
      {PLANT_ROUGH_ER.radii.map((r) => (
        <mesh key={r} rotation={[0, 0, start]} scale={[1, 1, PLANT_ROUGH_ER.depthScale]}>
          <torusGeometry args={[r, PLANT_ROUGH_ER.tube, 10, 48, arc]} />
          <Material base={color('rough-er')} highlight={highlight} />
        </mesh>
      ))}
    </group>
  )
}

function PlantSmoothER({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const curves = useMemo(() => PLANT_SMOOTH_ER_PATHS.map((path) => new CatmullRomCurve3(path.map((p) => new Vector3(...p)))), [])
  return (
    <group {...pick('smooth-er', null, onSelect)}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 32, 0.1, 10, false]} />
          <Material base={color('smooth-er')} highlight={highlight} />
        </mesh>
      ))}
    </group>
  )
}

function PlantGolgi({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const g = PLANT_GOLGI
  return (
    <group position={g.center} {...pick('golgi', null, onSelect)}>
      {Array.from({ length: g.sacs }, (_, i) => {
        const arc = (110 - i * 10) * (Math.PI / 180)
        return (
          <mesh key={i} position={[i * g.spacing - g.arcRadius, 0, 0]} rotation={[0, 0, -arc / 2]} scale={[1, 1, g.depthScale]}>
            <torusGeometry args={[g.arcRadius, g.tube, 8, 32, arc]} />
            <Material base={color('golgi')} highlight={highlight} />
          </mesh>
        )
      })}
    </group>
  )
}

/** A lens-shaped chloroplast with grana (stacks of thylakoids) shown on its front face. */
function Chloroplast({ instance, highlight, onSelect }: { instance: number; highlight: Highlight; onSelect: SelectHandler }) {
  const { center, rotationDeg } = CHLOROPLASTS[instance]
  const [rx, ry, rz] = CHLOROPLAST_RADII
  return (
    <group position={center} rotation={[0, 0, (rotationDeg * Math.PI) / 180]} {...pick('chloroplast', instance, onSelect)}>
      <mesh scale={[rx, ry, rz]}>
        <sphereGeometry args={[1, 32, 24]} />
        <Material base={color('chloroplast')} highlight={highlight} roughness={0.6} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh key={x} position={[x * rx, 0, rz * 0.82]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.12, 16]} />
          <Material base="#2e7d32" highlight={highlight} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function PlantMitochondrion({ instance, highlight, onSelect }: { instance: number; highlight: Highlight; onSelect: SelectHandler }) {
  const { center, rotationDeg } = PLANT_MITOCHONDRIA[instance]
  return (
    <mesh position={center} rotation={[0, 0, (rotationDeg * Math.PI) / 180]} {...pick('mitochondrion', instance, onSelect)}>
      <capsuleGeometry args={[PLANT_MITOCHONDRION.radius, PLANT_MITOCHONDRION.length, 8, 16]} />
      <Material base={color('mitochondrion')} highlight={highlight} />
    </mesh>
  )
}

function PlantRibosomes({ points, highlight, onSelect }: { points: readonly V3[]; highlight: Highlight; onSelect: SelectHandler }) {
  const ref = useRef<InstancedMesh>(null)
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
    <instancedMesh key={points.length} ref={ref} args={[undefined, undefined, points.length]} {...pick('ribosome', null, onSelect)}>
      <sphereGeometry args={[0.075, 10, 8]} />
      <Material base={color('ribosome')} highlight={highlight} roughness={0.7} />
    </instancedMesh>
  )
}

/** Precomputed point sets, so each combination keeps a stable identity between renders. */
const RIBOSOME_SETS: Record<string, readonly V3[]> = {
  '': [],
  free: PLANT_FREE_RIBOSOMES,
  bound: PLANT_BOUND_RIBOSOMES,
  freebound: [...PLANT_FREE_RIBOSOMES, ...PLANT_BOUND_RIBOSOMES],
}

export function PlantCellModel({
  view,
  selection,
  isolated,
  onSelect,
}: {
  view: CellView
  selection: BiologySelection | null
  isolated: boolean
  onSelect: SelectHandler
}) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const visible = visibleStructures(view, selection, isolated, 'plant')
  const open = view === 'cutaway' || isolated
  const highlight = (id: OrganelleId, instance: number | null = null): Highlight => {
    if (selection?.organelleId !== id) return null
    if (selection.instance === null || instance === null || selection.instance === instance) return 'selected'
    return 'sibling'
  }
  const range = (id: OrganelleId) => Array.from({ length: instanceCount('plant', id) ?? 0 }, (_, i) => i)
  const boundRibosomes = visible.has('ribosome') || (isolated && selection?.organelleId === 'rough-er')
  const ribosomePoints = RIBOSOME_SETS[`${visible.has('ribosome') ? 'free' : ''}${boundRibosomes ? 'bound' : ''}`]

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {visible.has('cell-wall') && <CellWall open={open} highlight={highlight('cell-wall')} onSelect={onSelect} />}
      {visible.has('plasma-membrane') && <PlantMembrane open={open} highlight={highlight('plasma-membrane')} onSelect={onSelect} />}
      {visible.has('cytoplasm') && <PlantCytoplasm highlight={highlight('cytoplasm')} onSelect={onSelect} />}
      {(visible.has('central-vacuole') || visible.has('vacuole-membrane')) && (
        <Vacuole
          open={open}
          showMembrane={visible.has('vacuole-membrane')}
          showContents={visible.has('central-vacuole')}
          membraneHighlight={highlight('vacuole-membrane')}
          contentsHighlight={highlight('central-vacuole')}
          onSelect={onSelect}
        />
      )}
      {visible.has('nucleus') && <PlantNucleus open={open} highlight={highlight('nucleus')} onSelect={onSelect} />}
      {visible.has('nucleolus') && <PlantNucleolus highlight={highlight('nucleolus')} onSelect={onSelect} />}
      {visible.has('rough-er') && <PlantRoughER highlight={highlight('rough-er')} onSelect={onSelect} />}
      {visible.has('smooth-er') && <PlantSmoothER highlight={highlight('smooth-er')} onSelect={onSelect} />}
      {visible.has('golgi') && <PlantGolgi highlight={highlight('golgi')} onSelect={onSelect} />}
      {visible.has('chloroplast') &&
        range('chloroplast').map((i) => <Chloroplast key={i} instance={i} highlight={highlight('chloroplast', i)} onSelect={onSelect} />)}
      {visible.has('mitochondrion') &&
        range('mitochondrion').map((i) => (
          <PlantMitochondrion key={i} instance={i} highlight={highlight('mitochondrion', i)} onSelect={onSelect} />
        ))}
      {ribosomePoints.length > 0 && <PlantRibosomes points={ribosomePoints} highlight={highlight('ribosome')} onSelect={onSelect} />}
    </group>
  )
}
