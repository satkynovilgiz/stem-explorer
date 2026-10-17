import { OrbitControls, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useEffectEvent, useMemo, useRef, useState, type RefObject } from 'react'
import { CatmullRomCurve3, PerspectiveCamera, Quaternion, Vector3, type Mesh } from 'three'
import { boundsOf, getRegion, getSystem, type AtlasStructure, type RegionId, type Shape, type Vec3 } from '../../../../data/anatomy/atlas'
import type { AtlasView } from '../../../../lib/urlState'
import { VIEW_DIRECTIONS } from '../atlasState'
import type { DrawnStructure } from '../visibility'

export interface AtlasSceneProps {
  drawn: readonly DrawnStructure[]
  selected: string | null
  /** A movement demonstration in progress: the camera frames that joint from the side. */
  demo: { id: string; side: 'left' | 'right'; pivot: Vec3 } | null
  /** Tour step framing (overrides the region framing while a tour runs). */
  frame: { key: string; center: Vec3; size: number } | null
  /** Conceptual marker moving along a path (tour steps). */
  marker: { key: string; points: readonly Vec3[]; kind: 'route' | 'contribution' } | null
  view: AtlasView
  region: RegionId
  showLabels: boolean
  reducedMotion: boolean
  resetToken: number
  focusToken: number
  onSelect: (id: string) => void
  onBackgroundClick: () => void
  onReady: () => void
  onContextLost: () => void
}

const UP = new Vector3(0, 1, 0)

/* ---------- Shapes ---------- */

function TubeShape({ points, radius, closed }: { points: readonly Vec3[]; radius: number; closed?: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), !!closed, 'centripetal'), [points, closed])
  return <tubeGeometry args={[curve, Math.max(16, points.length * 10), radius, 8, !!closed]} />
}

function ShapeMesh({ shape, children }: { shape: Shape; children: React.ReactNode }) {
  switch (shape.kind) {
    case 'ellipsoid':
      return (
        <mesh position={shape.center} scale={shape.radii} rotation={shape.rotation ?? [0, 0, 0]}>
          <sphereGeometry args={[1, 24, 16]} />
          {children}
        </mesh>
      )
    case 'box':
      return (
        <mesh position={shape.center} rotation={shape.rotation ?? [0, 0, 0]}>
          <boxGeometry args={shape.size as [number, number, number]} />
          {children}
        </mesh>
      )
    case 'capsule': {
      const a = new Vector3(...shape.from)
      const b = new Vector3(...shape.to)
      const length = a.distanceTo(b)
      const mid = a.clone().add(b).multiplyScalar(0.5)
      const q = new Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize())
      return (
        <mesh position={mid} quaternion={q}>
          <capsuleGeometry args={[shape.radius, Math.max(0.001, length), 6, 12]} />
          {children}
        </mesh>
      )
    }
    case 'tube':
      return (
        <mesh>
          <TubeShape points={shape.points} radius={shape.radius} closed={shape.closed} />
          {children}
        </mesh>
      )
  }
}

const StructureMesh = memo(function StructureMesh({
  structure,
  shapes,
  opacity,
  pickable,
  selected,
  onSelect,
}: {
  structure: AtlasStructure
  shapes: readonly Shape[]
  opacity: number
  pickable: boolean
  selected: boolean
  onSelect: (id: string) => void
}) {
  const color = getSystem(structure.system).color
  const transparent = opacity < 0.999
  return (
    <group
      userData={{ structureId: structure.id }}
      onClick={
        pickable
          ? (e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              if (e.delta > 4) return
              onSelect(structure.id)
            }
          : undefined
      }
      // Faint context outside the chosen region does not take clicks.
      raycast={pickable ? undefined : () => null}
    >
      {shapes.map((shape, i) => (
        <ShapeMesh key={i} shape={shape}>
          <meshStandardMaterial
            // three.js compiles transparency into the shader: switching it needs a new material.
            key={transparent ? 'translucent' : 'opaque'}
            color={color}
            roughness={0.6}
            metalness={0.02}
            transparent={transparent}
            opacity={opacity}
            depthWrite={!transparent}
            emissive={selected ? color : '#000000'}
            emissiveIntensity={selected ? 0.55 : 0}
          />
        </ShapeMesh>
      ))}
    </group>
  )
})

/* ---------- Camera ---------- */

const VIEW_DIRS = Object.fromEntries(
  Object.entries(VIEW_DIRECTIONS).map(([k, v]) => [k, new Vector3(...v).normalize()]),
) as Record<AtlasView, Vector3>

function CameraRig({
  view,
  region,
  selected,
  demo,
  frame,
  resetToken,
  focusToken,
  reducedMotion,
}: {
  view: AtlasView
  region: RegionId
  selected: string | null
  demo: AtlasSceneProps['demo']
  frame: AtlasSceneProps['frame']
  resetToken: number
  focusToken: number
  reducedMotion: boolean
}) {
  const get = useThree((s) => s.get)
  const controlsObject = useThree((s) => s.controls)
  const flight = useRef<{ fromP: Vector3; toP: Vector3; fromT: Vector3; toT: Vector3; t: number } | null>(null)
  const first = useRef(true)

  const distanceFor = (size: number) => {
    const { camera, size: px } = get()
    const fov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 0.6
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * (px.width / Math.max(1, px.height)))
    return (size / 2 / Math.tan(Math.min(fov, hFov) / 2)) * 1.12
  }

  const fly = (target: Vector3, position: Vector3, animate: boolean) => {
    const { camera, invalidate } = get()
    const controls = get().controls as unknown as { target: Vector3; update: () => void } | null
    if (!controls) return
    if (!animate) {
      flight.current = null
      camera.position.copy(position)
      controls.target.copy(target)
      controls.update()
    } else {
      flight.current = { fromP: camera.position.clone(), toP: position, fromT: controls.target.clone(), toT: target, t: 0 }
    }
    invalidate()
  }

  const frameRegion = useEffectEvent(() => {
    if (demo) {
      // Side-on to the moving limb (from the body's left for the left limb, right for the right).
      // Exactly side-on, so the 2D sketch in the panel matches this view.
      const target = new Vector3(demo.pivot[0], demo.pivot[1] + (demo.id === 'knee-flexion' ? 0.1 : 0.15), demo.pivot[2])
      const dir = new Vector3(demo.side === 'left' ? 1 : -1, 0.05, 0).normalize()
      fly(target, target.clone().addScaledVector(dir, distanceFor(demo.id === 'knee-flexion' ? 5.4 : 4.6)), !first.current && !reducedMotion)
      first.current = false
      return
    }
    if (frame) {
      const target = new Vector3(...frame.center)
      fly(target, target.clone().addScaledVector(VIEW_DIRS[view], distanceFor(Math.max(2.4, frame.size * 1.3))), !first.current && !reducedMotion)
      first.current = false
      return
    }
    const r = getRegion(region)
    const target = new Vector3(...r.center)
    fly(target, target.clone().addScaledVector(VIEW_DIRS[view], distanceFor(r.size)), !first.current && !reducedMotion)
    first.current = false
  })
  const demoKey = demo ? `${demo.id}:${demo.side}` : ''
  const frameKey = frame?.key ?? ''
  useEffect(() => {
    if (controlsObject) frameRegion()
  }, [controlsObject, resetToken, view, region, demoKey, frameKey])

  const focus = useEffectEvent(() => {
    const b = selected ? boundsOf(selected) : null
    if (!b) return
    const { camera } = get()
    const controls = get().controls as unknown as { target: Vector3 }
    const target = new Vector3(...b.center)
    const d = camera.position.clone().sub(controls.target).normalize()
    fly(target, target.clone().addScaledVector(d, Math.max(distanceFor(b.size), 1.4)), !reducedMotion)
  })
  useEffect(() => {
    if (focusToken > 0) focus()
  }, [focusToken])

  useFrame((_, delta) => {
    const f = flight.current
    if (!f) return
    const { camera, invalidate } = get()
    const controls = get().controls as unknown as { target: Vector3; update: () => void }
    f.t = Math.min(1, f.t + delta / 0.6)
    const k = 1 - Math.pow(1 - f.t, 3)
    if (f.t >= 1) {
      camera.position.copy(f.toP)
      controls.target.copy(f.toT)
      flight.current = null
    } else {
      camera.position.lerpVectors(f.fromP, f.toP, k)
      controls.target.lerpVectors(f.fromT, f.toT, k)
    }
    controls.update()
    invalidate()
  })
  return null
}

/* ---------- Labels (DOM, projected each frame) ---------- */

interface Label {
  key: string
  position: Vec3
  text: string
  className: string
  /** Orientation labels: the body axis they name; hidden when it points along the line of sight. */
  axis?: Vec3
}

/** Anatomical orientation, always relative to the body (never to the screen). */
const ORIENTATION: Label[] = [
  { key: 'sup', position: [0, 10.75, 0], text: 'Superior', className: 'is-orientation', axis: [0, 1, 0] },
  { key: 'inf', position: [0, -0.55, 0], text: 'Inferior', className: 'is-orientation', axis: [0, 1, 0] },
  { key: 'right', position: [-3.1, 6.2, 0], text: 'Body’s right', className: 'is-orientation', axis: [1, 0, 0] },
  { key: 'left', position: [3.1, 6.2, 0], text: 'Body’s left', className: 'is-orientation', axis: [1, 0, 0] },
  { key: 'ant', position: [0, 6.2, 1.9], text: 'Anterior', className: 'is-orientation', axis: [0, 0, 1] },
  { key: 'post', position: [0, 6.2, -1.9], text: 'Posterior', className: 'is-orientation', axis: [0, 0, 1] },
]

const rank = (l: Label) => (l.axis ? 0 : l.className.includes('is-selected') ? 1 : 2)
const tmp = new Vector3()
const fwd = new Vector3()
const axisV = new Vector3()

function LabelProjector({ labels, elements }: { labels: readonly Label[]; elements: RefObject<Map<string, HTMLElement>> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, labels])
  // Orientation first (they matter most), then primary labels, then the rest.
  const ordered = useMemo(() => [...labels].sort((a, b) => rank(a) - rank(b)), [labels])
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld()
    camera.getWorldDirection(fwd)
    const placed: { x: number; y: number; w: number; h: number }[] = []
    for (const label of ordered) {
      const el = elements.current.get(label.key)
      if (!el) continue
      let hidden = false
      // An axis seen end-on (e.g. anterior/posterior in the front view) would overlap the body.
      if (label.axis) hidden = Math.abs(axisV.set(...label.axis).dot(fwd)) > 0.7
      tmp.set(...label.position).project(camera)
      let x = ((tmp.x + 1) / 2) * size.width
      let y = ((1 - tmp.y) / 2) * size.height
      if (label.axis) {
        // Keep orientation labels inside the viewport on narrow screens.
        const hw = el.offsetWidth / 2 + 6
        const hh = el.offsetHeight / 2 + 6
        x = Math.min(size.width - hw, Math.max(hw, x))
        // Leave the top band for the viewport badge.
        y = Math.min(size.height - hh - 28, Math.max(hh + 64, y))
      }
      const onScreen = tmp.z < 1
      const rect = { x: x - el.offsetWidth / 2, y: y - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight }
      // A label that would overlap one already placed is hidden (the panel lists everything).
      const clear = !placed.some((p) => rect.x < p.x + p.w + 2 && p.x < rect.x + rect.w + 2 && rect.y < p.y + p.h + 1 && p.y < rect.y + rect.h + 1)
      const visible = onScreen && !hidden && clear
      if (visible) placed.push(rect)
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.visibility = visible ? 'visible' : 'hidden'
    }
  })
  return null
}

function LabelLayer({ labels, elements }: { labels: readonly Label[]; elements: RefObject<Map<string, HTMLElement>> }) {
  return (
    <div className="label-layer" aria-hidden="true">
      {labels.map((l) => (
        <span
          key={l.key}
          ref={(el) => {
            if (el) elements.current.set(l.key, el)
            else elements.current.delete(l.key)
          }}
          className={`heart-label ${l.className}`}
        >
          {l.text}
        </span>
      ))}
    </div>
  )
}

/* ---------- Tour marker ---------- */

const MARKER_COLORS = { route: '#f5f7f8', contribution: '#f5c26b' } as const

/**
 * A small sphere travelling along the step's path (2.5 s, repeating), or — with reduced motion —
 * still dots along the path with the sphere at its end. Conceptual: order and direction only.
 */
function TourMarker({ points, kind, reducedMotion }: { points: readonly Vec3[]; kind: 'route' | 'contribution'; reducedMotion: boolean }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p)), false, 'centripetal'), [points])
  const ref = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return
    if (start.current === null) start.current = clock.elapsedTime
    const t = ((clock.elapsedTime - start.current) / 2.5) % 1
    ref.current.position.copy(curve.getPointAt(t))
    invalidate()
  })
  const color = MARKER_COLORS[kind]
  const end = curve.getPointAt(1)
  return (
    <group raycast={() => null}>
      <mesh>
        <tubeGeometry args={[curve, Math.max(24, points.length * 12), 0.012, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} depthTest={false} />
      </mesh>
      {reducedMotion &&
        [0.25, 0.5, 0.75].map((t) => (
          <mesh key={t} position={curve.getPointAt(t)}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color={color} depthTest={false} />
          </mesh>
        ))}
      <mesh ref={ref} position={reducedMotion ? end : curve.getPointAt(0)} renderOrder={10}>
        <sphereGeometry args={[0.06, 16, 12]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    </group>
  )
}

/** A representative point of a set of shapes (for labels). */
function anchorOf(shapes: readonly Shape[]): Vec3 {
  // Groups spread over the body (e.g. limb nerves) are labelled at their first part, not their average.
  const first = shapes.slice(0, shapes.length > 3 ? 1 : shapes.length)
  const pts = first.flatMap((s): Vec3[] => (s.kind === 'ellipsoid' || s.kind === 'box' ? [s.center] : s.kind === 'capsule' ? [s.from, s.to] : [s.points[Math.floor(s.points.length / 2)]]))
  const n = Math.max(1, pts.length)
  return [pts.reduce((a, p) => a + p[0], 0) / n, pts.reduce((a, p) => a + p[1], 0) / n, pts.reduce((a, p) => a + p[2], 0) / n]
}

/* ---------- Root ---------- */

export default function AtlasScene(props: AtlasSceneProps) {
  const { drawn, selected, demo, frame, marker, view, region, showLabels, reducedMotion, resetToken, focusToken, onSelect, onBackgroundClick, onReady, onContextLost } = props
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const labelElements = useRef<Map<string, HTMLElement>>(new Map())

  const labels = useMemo(() => {
    const out: Label[] = showLabels ? [...ORIENTATION] : ORIENTATION.filter((l) => l.key === 'left' || l.key === 'right')
    const b = selected ? boundsOf(selected) : null
    const sel = selected ? drawn.find((d) => d.structure.id === selected) : undefined
    if (b && sel && !demo) out.push({ key: 'selected', position: [b.center[0], b.max[1] + 0.12, b.center[2]], text: `● ${sel.structure.name}`, className: 'is-selected' })
    // Demonstration roles and tour steps are labelled in words, not only by highlight colour.
    for (const d of drawn) {
      if (!d.label) continue
      out.push({ key: `label-${d.structure.id}`, position: anchorOf(d.shapes ?? d.structure.shapes), text: d.label, className: d.labelStyle === 'primary' ? 'is-selected' : 'is-external' })
    }
    return out
  }, [drawn, selected, showLabels, demo])

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ fov: 30, near: 0.1, far: 200, position: [0, 5, 30] }}
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
        <hemisphereLight args={['#eef2f4', '#1b2025', 1.0]} />
        <directionalLight position={[4, 12, 10]} intensity={1.4} />
        <directionalLight position={[-6, 2, -8]} intensity={0.45} />
        <group
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          {/* Opaque structures first, then translucent ones, so layers blend predictably. */}
          {[...drawn]
            .sort((a, b) => b.opacity - a.opacity)
            .map((d) => (
              <StructureMesh
                key={d.structure.id}
                structure={d.structure}
                shapes={d.shapes ?? d.structure.shapes}
                opacity={d.opacity}
                pickable={!d.dimmed}
                selected={d.structure.id === selected || !!d.highlight}
                onSelect={onSelect}
              />
            ))}
        </group>
        <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.12} minDistance={1.5} maxDistance={60} />
        {marker && <TourMarker key={marker.key} points={marker.points} kind={marker.kind} reducedMotion={reducedMotion} />}
        <CameraRig view={view} region={region} selected={selected} demo={demo} frame={frame} resetToken={resetToken} focusToken={focusToken} reducedMotion={reducedMotion} />
        <LabelProjector labels={labels} elements={labelElements} />
      </Canvas>
      <LabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
