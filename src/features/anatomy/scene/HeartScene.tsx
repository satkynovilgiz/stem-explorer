import { Line, OrbitControls, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useEffectEvent, useMemo, useRef, useState, type RefObject } from 'react'
import { BackSide, CatmullRomCurve3, DoubleSide, Object3D, PerspectiveCamera, Quaternion, Raycaster, Vector3, type Mesh } from 'three'
import { FLOW_STEPS, HEART_PARTS, type HeartPartId, type HeartView } from '../../../data/anatomy/heart'
import { HEART_COLORS } from '../colors'
import {
  CHAMBERS,
  EXTERNAL_MARKERS,
  labelAnchor,
  ORIENTATION_MARKERS,
  partCenter,
  partRadius,
  SEPTUM,
  STEP_PATHS,
  VALVES,
  VESSELS,
  type V3,
} from './layout'

export interface HeartSceneProps {
  view: HeartView
  selected: HeartPartId | null
  /** Vessel comparison slots: both are highlighted and labelled "A ·" / "B ·". */
  compared?: { a: HeartPartId | null; b: HeartPartId | null } | null
  isolated: boolean
  tourStep: number | null
  showLabels: boolean
  reducedMotion: boolean
  resetToken: number
  focusToken: number
  onSelect: (id: HeartPartId) => void
  onBackgroundClick: () => void
  onReady: () => void
  onContextLost: () => void
}

const noRaycast = () => null
const partColor = (id: HeartPartId) => {
  const p = HEART_PARTS.find((x) => x.id === id)!
  return p.kind === 'valve' ? HEART_COLORS.valve : p.kind === 'wall' ? HEART_COLORS.wall : p.oxygenation === 'rich' ? HEART_COLORS.rich : HEART_COLORS.poor
}

type Highlight = 'selected' | 'tour' | null

function pick(id: HeartPartId, onSelect: (id: HeartPartId) => void) {
  return {
    userData: { partId: id },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (e.delta > 4) return
      onSelect(id)
    },
  }
}

function Material({ color, highlight, side, roughness = 0.55 }: { color: string; highlight: Highlight; side?: typeof DoubleSide | typeof BackSide; roughness?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={0.02}
      side={side}
      // Glow in the part's own colour so the oxygen-pathway colour stays recognizable.
      emissive={highlight ? color : '#000000'}
      emissiveIntensity={highlight === 'selected' ? 0.5 : highlight === 'tour' ? 0.45 : 0}
    />
  )
}

/* ---------- Parts ---------- */

const CUT = Math.PI / 2.6 // half-angle of the front wedge removed in the cutaway

function ChamberMesh({ id, open, highlight, onSelect }: { id: keyof typeof CHAMBERS; open: boolean; highlight: Highlight; onSelect: (id: HeartPartId) => void }) {
  const { center, radii } = CHAMBERS[id]
  const color = partColor(id)
  const [phiStart, phiLength] = open ? [Math.PI / 2 + CUT, 2 * Math.PI - 2 * CUT] : [0, 2 * Math.PI]
  return (
    <group position={center} scale={radii} {...pick(id, onSelect)}>
      <mesh>
        <sphereGeometry args={[1, 64, 40, phiStart, phiLength]} />
        <Material color={color} highlight={highlight} side={open ? DoubleSide : undefined} roughness={0.5} />
      </mesh>
      {open && (
        <mesh scale={0.9}>
          <sphereGeometry args={[1, 64, 40, phiStart, phiLength]} />
          {/* Inner wall, darker so the opened chamber reads as a cavity. */}
          <meshStandardMaterial color={color} side={BackSide} roughness={0.9} emissive="#000000" />
        </mesh>
      )}
    </group>
  )
}

function ValveMesh({ id, highlight, onSelect }: { id: keyof typeof VALVES; highlight: Highlight; onSelect: (id: HeartPartId) => void }) {
  const { center, normal, radius, flaps } = VALVES[id]
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...normal).normalize()), [normal])
  const color = HEART_COLORS.valve
  const gap = 0.12
  return (
    <group position={center} quaternion={quaternion} {...pick(id, onSelect)}>
      <mesh>
        <torusGeometry args={[radius, radius * 0.16, 12, 48]} />
        <Material color={color} highlight={highlight} roughness={0.4} />
      </mesh>
      {Array.from({ length: flaps }, (_, i) => {
        const theta = (2 * Math.PI) / flaps
        return (
          <mesh key={i} position={[0, 0, radius * 0.12]} rotation={[0, 0, i * theta]}>
            {/* One flat flap per cusp, separated by small gaps; flap counts follow the source. */}
            <circleGeometry args={[radius * 0.92, 24, gap / 2, theta - gap]} />
            <Material color={color} highlight={highlight} side={DoubleSide} roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}

function SeptumMesh({ highlight, onSelect }: { highlight: Highlight; onSelect: (id: HeartPartId) => void }) {
  return (
    <mesh position={SEPTUM.center} scale={SEPTUM.radii} {...pick('interventricular-septum', onSelect)}>
      <sphereGeometry args={[1, 32, 24]} />
      <Material color={HEART_COLORS.wall} highlight={highlight} roughness={0.7} />
    </mesh>
  )
}

function VesselMesh({ id, highlight, onSelect }: { id: keyof typeof VESSELS; highlight: Highlight; onSelect: (id: HeartPartId) => void }) {
  const { paths, radius } = VESSELS[id]
  const curves = useMemo(() => paths.map((p) => new CatmullRomCurve3(p.map((v) => new Vector3(...v)))), [paths])
  const color = partColor(id)
  return (
    <group {...pick(id, onSelect)}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 48, i === 0 || id !== 'pulmonary-trunk' ? radius : radius * 0.75, 16, false]} />
          <Material color={color} highlight={highlight} roughness={0.45} />
        </mesh>
      ))}
    </group>
  )
}

/** Conceptual flow marker: shows direction only, never speed, timing or pressure. */
function FlowMarker({ path, animate }: { path: readonly V3[]; animate: boolean }) {
  const ref = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const curve = useMemo(() => new CatmullRomCurve3(path.map((p) => new Vector3(...p))), [path])
  const t = useRef(0)
  useEffect(() => {
    t.current = 0
    invalidate()
  }, [curve, invalidate])
  useFrame((_, delta) => {
    if (!ref.current) return
    if (animate) {
      t.current = (t.current + Math.min(delta, 0.1) / 2.4) % 1
      invalidate()
    } else {
      t.current = 1
    }
    ref.current.position.copy(curve.getPointAt(t.current))
  })
  return (
    <group>
      <Line points={curve.getPoints(40)} color={HEART_COLORS.marker} lineWidth={2} dashed dashSize={0.08} gapSize={0.06} depthTest={false} renderOrder={8} raycast={noRaycast} />
      <mesh ref={ref} raycast={noRaycast} renderOrder={9}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshBasicMaterial color={HEART_COLORS.marker} depthTest={false} />
      </mesh>
    </group>
  )
}

/* ---------- Labels ---------- */

interface Label {
  key: string
  position: V3
  text: string
  className: string
  priority: number
  /** Part the label belongs to (for occlusion); undefined labels are never hidden by geometry. */
  partId?: HeartPartId
}

const v = new Vector3()
const dir = new Vector3()
const raycaster = new Raycaster()
const partOf = (o: Object3D | null): string | undefined => {
  for (let x = o; x; x = x.parent) if (x.userData.partId) return x.userData.partId as string
  return undefined
}

function LabelProjector({ labels, elements }: { labels: readonly Label[]; elements: RefObject<Map<string, HTMLElement>> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, labels])
  const ordered = useMemo(() => [...labels].sort((a, b) => b.priority - a.priority), [labels])
  useFrame(({ camera, size, scene, gl }) => {
    camera.updateMatrixWorld()
    // The colour legend is an HTML overlay on the canvas; labels must not end up underneath it.
    const canvasRect = gl.domElement.getBoundingClientRect()
    const legend = gl.domElement.closest('.viewport')?.querySelector('.heart-legend')?.getBoundingClientRect()
    const obstacle = legend
      ? { x: legend.left - canvasRect.left, y: legend.top - canvasRect.top, w: legend.width, h: legend.height }
      : null
    const pickables: Object3D[] = []
    scene.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh && partOf(o)) pickables.push(o)
    })
    const placed: { x: number; y: number; w: number; h: number }[] = []
    for (const label of ordered) {
      const el = elements.current.get(label.key)
      if (!el) continue
      v.set(...label.position)
      let blocked = false
      if (label.partId) {
        const dist = camera.position.distanceTo(v)
        dir.copy(v).sub(camera.position).normalize()
        raycaster.set(camera.position, dir)
        raycaster.far = dist - 0.05
        blocked = raycaster.intersectObjects(pickables, false).some((hit) => partOf(hit.object) !== label.partId)
      }
      v.project(camera)
      let x = ((v.x + 1) / 2) * size.width
      let y = ((1 - v.y) / 2) * size.height
      // Orientation labels are kept inside the viewport (they matter most on narrow screens).
      if (label.className === 'is-orientation') {
        const half = el.offsetWidth / 2 + 6
        x = Math.min(size.width - half, Math.max(half, x))
      }
      let rect = { x: x - el.offsetWidth / 2, y: y - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight }
      const underLegend = (r: typeof rect) =>
        !!obstacle && r.x < obstacle.x + obstacle.w && obstacle.x < r.x + r.w && r.y < obstacle.y + obstacle.h && obstacle.y < r.y + r.h
      if (underLegend(rect) && label.className === 'is-orientation') {
        // Orientation matters: lift the label just above the legend instead of hiding it.
        y = obstacle!.y - rect.h / 2 - 4
        rect = { ...rect, y: y - rect.h / 2 }
      }
      const onScreen = v.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height
      const clear = !placed.some((p) => rect.x < p.x + p.w + 3 && p.x < rect.x + rect.w + 3 && rect.y < p.y + p.h + 1 && p.y < rect.y + rect.h + 1)
      // Anything else that the legend would cover is hidden (it stays available in the list).
      const visible = onScreen && !blocked && clear && !underLegend(rect)
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

/* ---------- Camera ---------- */

const VIEW_DIRECTION = new Vector3(0.25, 0.18, 1).normalize()
const CENTER = new Vector3(0, 0.5, 0)
const MODEL_RADIUS = 3.1

function CameraRig({ resetToken, focusToken, focusId, reducedMotion }: { resetToken: number; focusToken: number; focusId: HeartPartId | null; reducedMotion: boolean }) {
  const get = useThree((s) => s.get)
  const controlsObject = useThree((s) => s.controls)
  const flight = useRef<{ fromP: Vector3; toP: Vector3; fromT: Vector3; toT: Vector3; t: number } | null>(null)
  const first = useRef(true)

  const distanceFor = (radius: number) => {
    const { camera, size } = get()
    const fov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 0.6
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * (size.width / Math.max(1, size.height)))
    return (radius / Math.sin(Math.min(fov, hFov) / 2)) * 1.05
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

  const reset = useEffectEvent(() => {
    fly(CENTER.clone(), CENTER.clone().addScaledVector(VIEW_DIRECTION, distanceFor(MODEL_RADIUS)), !first.current && !reducedMotion)
    first.current = false
  })
  useEffect(() => {
    if (controlsObject) reset()
  }, [controlsObject, resetToken])

  const focus = useEffectEvent(() => {
    if (!focusId) return
    const { camera } = get()
    const controls = get().controls as unknown as { target: Vector3 }
    const target = new Vector3(...partCenter(focusId))
    const d = camera.position.clone().sub(controls.target).normalize()
    fly(target, target.clone().addScaledVector(d, Math.max(distanceFor(partRadius(focusId)), 1.6)), !reducedMotion)
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

/* ---------- Visibility and labels ---------- */

/** Drawn parts only — anything not drawn cannot intercept clicks. */
function isPartVisible(id: HeartPartId, view: HeartView, selected: HeartPartId | null, isolated: boolean): boolean {
  if (isolated && selected) return id === selected
  return !HEART_PARTS.find((p) => p.id === id)!.internal || view === 'cutaway'
}

function buildLabels(
  view: HeartView,
  selected: HeartPartId | null,
  isolated: boolean,
  tourStep: number | null,
  showLabels: boolean,
  compared: { a: HeartPartId | null; b: HeartPartId | null } | null = null,
): Label[] {
  const step = tourStep !== null ? FLOW_STEPS[tourStep] : null
  const out: Label[] = []
  for (const p of HEART_PARTS) {
    if (!isPartVisible(p.id, view, selected, isolated)) continue
    const slot = compared ? (compared.a === p.id ? 'A' : compared.b === p.id ? 'B' : null) : null
    if (slot) {
      // Letters and border style (solid A, dashed B) tell the two apart without relying on colour.
      out.push({ key: p.id, position: labelAnchor(p.id), text: `${slot} · ${p.name}`, className: `is-selected is-compare-${slot.toLowerCase()}`, priority: 11, partId: p.id })
      continue
    }
    const isSel = p.id === selected && !step
    const inTour = !!step?.parts.includes(p.id)
    if (!isSel && !inTour && !(showLabels && p.majorLabel && !step)) continue
    out.push({
      key: p.id,
      position: labelAnchor(p.id),
      text: isSel ? `● ${p.name}` : inTour ? `Step ${tourStep! + 1}: ${p.name}` : p.name,
      className: isSel || inTour ? 'is-selected' : '',
      priority: isSel || inTour ? 10 : p.kind === 'chamber' ? 5 : 4,
      partId: p.id,
    })
  }
  if (!(isolated && selected)) {
    for (const m of EXTERNAL_MARKERS) {
      const active = step?.external === m.destination
      if (!showLabels && !active) continue
      out.push({ key: m.key, position: m.position, text: m.text, className: `is-external${active ? ' is-active' : ''}`, priority: active ? 9 : 3 })
    }
  }
  // Orientation labels stay visible even with labels off: left and right are easy to misread.
  for (const m of ORIENTATION_MARKERS) out.push({ key: m.key, position: m.position, text: m.text, className: 'is-orientation', priority: 7 })
  return out
}

/* ---------- Root ---------- */

export default function HeartScene(props: HeartSceneProps) {
  const { view, selected, compared = null, isolated, tourStep, showLabels, reducedMotion, resetToken, focusToken, onSelect, onBackgroundClick, onReady, onContextLost } = props
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const labelElements = useRef<Map<string, HTMLElement>>(new Map())

  const step = tourStep !== null ? FLOW_STEPS[tourStep] : null
  const open = view === 'cutaway' || isolated
  const visible = (id: HeartPartId) => isPartVisible(id, view, selected, isolated)
  const highlight = (id: HeartPartId): Highlight =>
    step ? (step.parts.includes(id) ? 'tour' : null) : compared ? (id === compared.a || id === compared.b ? 'selected' : null) : id === selected ? 'selected' : null

  const labels = useMemo(
    () => buildLabels(view, selected, isolated, tourStep, showLabels, compared),
    [view, selected, isolated, tourStep, showLabels, compared],
  )

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ fov: 35, near: 0.1, far: 100, position: [0, 0.5, 12] }}
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
        <color attach="background" args={['#121518']} />
        <hemisphereLight args={['#eef2f4', '#1b2025', 1.0]} />
        <directionalLight position={[3, 6, 8]} intensity={1.5} />
        <directionalLight position={[-6, -3, -5]} intensity={0.35} />

        <group
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={() => setHovered(false)}
        >
          {(Object.keys(CHAMBERS) as (keyof typeof CHAMBERS)[]).map((id) =>
            visible(id) ? <ChamberMesh key={id} id={id} open={open} highlight={highlight(id)} onSelect={onSelect} /> : null,
          )}
          {(Object.keys(VALVES) as (keyof typeof VALVES)[]).map((id) =>
            visible(id) ? <ValveMesh key={id} id={id} highlight={highlight(id)} onSelect={onSelect} /> : null,
          )}
          {visible('interventricular-septum') && <SeptumMesh highlight={highlight('interventricular-septum')} onSelect={onSelect} />}
          {(Object.keys(VESSELS) as (keyof typeof VESSELS)[]).map((id) =>
            visible(id) ? <VesselMesh key={id} id={id} highlight={highlight(id)} onSelect={onSelect} /> : null,
          )}
        </group>
        {step && <FlowMarker path={STEP_PATHS[step.id]} animate={!reducedMotion} />}

        <OrbitControls makeDefault enablePan={false} enableDamping={!reducedMotion} dampingFactor={0.12} minDistance={2} maxDistance={30} />
        <CameraRig resetToken={resetToken} focusToken={focusToken} focusId={selected} reducedMotion={reducedMotion} />
        <LabelProjector labels={labels} elements={labelElements} />
      </Canvas>
      <LabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
