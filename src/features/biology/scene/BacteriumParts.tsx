import { useCursor } from '@react-three/drei'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CatmullRomCurve3, DoubleSide, InstancedMesh, Object3D, Quaternion, Vector2, Vector3 } from 'three'
import { findOrganelle } from '../../../data/biology/organelles'
import type { CellView, OrganelleId } from '../../../data/biology/types'
import type { BiologySelection } from '../state'
import { Material, type Highlight, type SelectHandler } from './CellParts'
import { FIMBRIAE, FLAGELLUM_PATH, NUCLEOID_PATH, PILI, RADII, RIBOSOMES, ROD } from './bacteriumLayout'
import { pick } from './sceneHelpers'
import { CUT_HALF_ANGLE, type V3 } from './layout'
import { visibleStructures } from './visibility'

const color = (id: OrganelleId) => findOrganelle(id)?.color ?? '#888888'

/** The rod outline (a stadium) as a lathe profile around the cell axis. */
function rodProfile(r: number): Vector2[] {
  const pts: Vector2[] = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2)
    pts.push(new Vector2(r * Math.cos(a), -ROD.halfLength + r * Math.sin(a)))
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2)
    pts.push(new Vector2(r * Math.cos(a), ROD.halfLength + r * Math.sin(a)))
  }
  return pts
}

/** A rod-shaped shell; with `open`, a wedge facing the viewer (+z) is left out (cutaway). */
function RodShell({ r, open, id, highlight, onSelect, opacity = 1 }: { r: number; open: boolean; id: OrganelleId; highlight: Highlight; onSelect: SelectHandler; opacity?: number }) {
  const profile = useMemo(() => rodProfile(r), [r])
  // Lathe angles start at +z (unlike a sphere's), so the gap centred on phi = 0 faces the viewer.
  const [phiStart, phiLength] = open ? [CUT_HALF_ANGLE, 2 * Math.PI - 2 * CUT_HALF_ANGLE] : [0, 2 * Math.PI]
  const translucent = opacity < 1
  return (
    // The lathe is built around y; rotating by −90° about z puts the cell's axis along x.
    <mesh rotation={[0, 0, -Math.PI / 2]} {...pick(id, null, onSelect)}>
      <latheGeometry args={[profile, 64, phiStart, phiLength]} />
      {translucent ? (
        <meshStandardMaterial
          key="translucent"
          color={color(id)}
          transparent
          opacity={highlight === 'selected' ? Math.min(1, opacity + 0.25) : opacity}
          depthWrite={false}
          side={DoubleSide}
          emissive={highlight ? color(id) : '#000000'}
          emissiveIntensity={highlight === 'selected' ? 0.45 : 0}
        />
      ) : (
        <Material base={color(id)} highlight={highlight} side={open ? DoubleSide : undefined} roughness={0.6} />
      )}
    </mesh>
  )
}

function Tube({ points, radius, closed = false, id, highlight, onSelect }: { points: readonly V3[]; radius: number; closed?: boolean; id: OrganelleId; highlight: Highlight; onSelect: SelectHandler }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), closed, 'centripetal'), [points, closed])
  return (
    <mesh {...pick(id, null, onSelect)}>
      <tubeGeometry args={[curve, points.length * 6, radius, 8, closed]} />
      <Material base={color(id)} highlight={highlight} />
    </mesh>
  )
}

function Ribosomes({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const dummy = new Object3D()
    RIBOSOMES.forEach((p, i) => {
      dummy.position.set(...p)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, RIBOSOMES.length]} {...pick('bacterial-ribosomes', null, onSelect)}>
      <sphereGeometry args={[0.11, 10, 8]} />
      <Material base={color('bacterial-ribosomes')} highlight={highlight} />
    </instancedMesh>
  )
}

const UP = new Vector3(0, 1, 0)
function Fimbriae({ highlight, onSelect }: { highlight: Highlight; onSelect: SelectHandler }) {
  return (
    <group {...pick('fimbriae', null, onSelect)}>
      {FIMBRIAE.map(([a, b], i) => {
        const va = new Vector3(...a)
        const vb = new Vector3(...b)
        const q = new Quaternion().setFromUnitVectors(UP, vb.clone().sub(va).normalize())
        return (
          <mesh key={i} position={va.clone().add(vb).multiplyScalar(0.5)} quaternion={q}>
            <cylinderGeometry args={[0.025, 0.025, va.distanceTo(vb), 6]} />
            <Material base={color('fimbriae')} highlight={highlight} />
          </mesh>
        )
      })}
    </group>
  )
}

export function BacteriumModel({ view, selection, isolated, onSelect }: { view: CellView; selection: BiologySelection | null; isolated: boolean; onSelect: SelectHandler }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const visible = visibleStructures(view, selection, isolated, 'bacterium')
  const open = view === 'cutaway' || isolated
  const h = (id: OrganelleId): Highlight => (selection?.organelleId === id ? 'selected' : null)
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {visible.has('capsule') && <RodShell r={RADII.capsule} open={open} id="capsule" highlight={h('capsule')} onSelect={onSelect} opacity={0.28} />}
      {visible.has('bacterial-wall') && <RodShell r={RADII.wall} open={open} id="bacterial-wall" highlight={h('bacterial-wall')} onSelect={onSelect} />}
      {visible.has('bacterial-membrane') && <RodShell r={RADII.membrane} open={open} id="bacterial-membrane" highlight={h('bacterial-membrane')} onSelect={onSelect} />}
      {visible.has('bacterial-cytoplasm') && (
        <RodShell r={RADII.cytoplasm} open id="bacterial-cytoplasm" highlight={h('bacterial-cytoplasm')} onSelect={onSelect} />
      )}
      {visible.has('nucleoid') && <Tube points={NUCLEOID_PATH} radius={0.09} closed id="nucleoid" highlight={h('nucleoid')} onSelect={onSelect} />}
      {visible.has('bacterial-ribosomes') && <Ribosomes highlight={h('bacterial-ribosomes')} onSelect={onSelect} />}
      {visible.has('flagellum') && <Tube points={FLAGELLUM_PATH} radius={0.07} id="flagellum" highlight={h('flagellum')} onSelect={onSelect} />}
      {visible.has('pili') && (
        <group>
          {PILI.map((p, i) => (
            <Tube key={i} points={p} radius={0.045} id="pili" highlight={h('pili')} onSelect={onSelect} />
          ))}
        </group>
      )}
      {visible.has('fimbriae') && <Fimbriae highlight={h('fimbriae')} onSelect={onSelect} />}
    </group>
  )
}
