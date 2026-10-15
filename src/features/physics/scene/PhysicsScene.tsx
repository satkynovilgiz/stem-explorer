import { Line, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Quaternion, Vector3, type OrthographicCamera as OrthoCam } from 'three'
import { samplePath, stateAt, type Trajectory } from '../../../physics/projectile'
import { useSimTime, type SimClock } from '../clock'
import { SCENE_COLORS } from '../colors'
import { formatTick, markerRadius, sceneBounds, ticks, vectorScales, type SceneBounds, type VectorScales } from '../sceneMath'

export type CameraView = 'side' | 'perspective'

export interface PhysicsSceneProps {
  trajectory: Trajectory
  runA: Trajectory | null
  clock: SimClock
  view: CameraView
  showPreview: boolean
  showVectors: boolean
  showComponents: boolean
  /** Changing this re-frames the camera (Reset camera). */
  cameraToken: number
  onReady: () => void
  onContextLost: () => void
}

const C = SCENE_COLORS


const noRaycast = () => null
/** Screen pixels covered by the badge (top) and legend (bottom) overlays in the side view. */
const OVERLAY_RESERVE = { top: 72, bottom: 48 }
type P3 = [number, number, number]

/* ---------- Labels: DOM overlay projected from world positions ---------- */

interface SceneLabel {
  key: string
  position: P3
  text: string
  className: string
  /** Screen offset in px (x right, y down). */
  offset?: [number, number]
  /** Higher priority labels are placed first; later ones that would overlap are hidden. */
  priority: number
}

const projected = new Vector3()

function LabelProjector({ labels, elements }: { labels: readonly SceneLabel[]; elements: RefObject<Map<string, HTMLElement>> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, labels])
  const ordered = useMemo(() => [...labels].sort((a, b) => b.priority - a.priority), [labels])

  useFrame(({ camera, size }) => {
    // useFrame runs before rendering; use this frame's camera, not the previous one.
    camera.updateMatrixWorld()
    const placed: { x: number; y: number; w: number; h: number }[] = []
    for (const label of ordered) {
      const el = elements.current.get(label.key)
      if (!el) continue
      projected.set(...label.position).project(camera)
      const [ox, oy] = label.offset ?? [0, 0]
      const x = ((projected.x + 1) / 2) * size.width + ox
      const y = ((1 - projected.y) / 2) * size.height + oy
      const w = el.offsetWidth
      const h = el.offsetHeight
      const rect = { x: x - w / 2, y: y - h / 2, w, h }
      const onScreen = projected.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height
      const clear = !placed.some(
        (p) => rect.x < p.x + p.w + 3 && p.x < rect.x + rect.w + 3 && rect.y < p.y + p.h + 1 && p.y < rect.y + rect.h + 1,
      )
      const visible = onScreen && clear
      if (visible) placed.push(rect)
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.visibility = visible ? 'visible' : 'hidden'
    }
  })
  return null
}

function LabelLayer({ labels, elements }: { labels: readonly SceneLabel[]; elements: RefObject<Map<string, HTMLElement>> }) {
  return (
    <div className="label-layer" aria-hidden="true">
      {labels.map((l) => (
        <span
          key={l.key}
          ref={(el) => {
            if (el) elements.current.set(l.key, el)
            else elements.current.delete(l.key)
          }}
          className={`physics-label ${l.className}`}
        >
          {l.text}
        </span>
      ))}
    </div>
  )
}

/* ---------- Static scene pieces ---------- */

function Ground({ bounds }: { bounds: SceneBounds }) {
  const { xMax, xStep, extent } = bounds
  const left = -Math.ceil((extent * 0.15) / xStep) * xStep
  const right = xMax + Math.ceil((extent * 0.15) / xStep) * xStep
  const halfDepth = Math.ceil((extent * 0.4) / xStep) * xStep
  const lines = useMemo(() => {
    const out: [P3, P3][] = []
    for (let x = left; x <= right + 1e-9; x += xStep) out.push([[x, 0, -halfDepth], [x, 0, halfDepth]])
    for (let z = -halfDepth; z <= halfDepth + 1e-9; z += xStep) out.push([[left, 0, z], [right, 0, z]])
    return out
  }, [left, right, halfDepth, xStep])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(left + right) / 2, -extent * 0.0005, 0]} raycast={noRaycast}>
        <planeGeometry args={[right - left, halfDepth * 2]} />
        <meshStandardMaterial color={C.ground} roughness={1} />
      </mesh>
      {lines.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={C.grid} lineWidth={1} raycast={noRaycast} />
      ))}
    </group>
  )
}

function Axes({ bounds }: { bounds: SceneBounds }) {
  const { xMax, yMax, xStep, yStep, extent } = bounds
  const tick = extent * 0.012
  return (
    <group>
      <Line points={[[0, 0, 0], [xMax, 0, 0]]} color={C.axis} lineWidth={1.5} raycast={noRaycast} />
      <Line points={[[0, 0, 0], [0, yMax, 0]]} color={C.axis} lineWidth={1.5} raycast={noRaycast} />
      {ticks(xMax, xStep).map((x) => (
        <Line key={`x${x}`} points={[[x, 0, 0], [x, -tick, 0]]} color={C.axis} lineWidth={1.5} raycast={noRaycast} />
      ))}
      {ticks(yMax, yStep).map((y) => (
        <Line key={`y${y}`} points={[[0, y, 0], [-tick, y, 0]]} color={C.axis} lineWidth={1.5} raycast={noRaycast} />
      ))}
    </group>
  )
}

const UP = new Vector3(0, 1, 0)

/** Arrow from the origin along `vector` (scene metres): shaft + cone, or a dashed shaft for components. */
function Arrow({ vector, color, radius, dashed }: { vector: P3; color: string; radius: number; dashed?: boolean }) {
  const dir = new Vector3(...vector)
  const length = dir.length()
  if (length < radius * 3) return null
  const quaternion = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
  const head = Math.min(length * 0.4, radius * 7)
  const shaft = length - head
  return (
    <group quaternion={quaternion}>
      {dashed ? (
        <Line points={[[0, 0, 0], [0, shaft, 0]]} color={color} lineWidth={2} dashed dashSize={radius * 3} gapSize={radius * 2.5} raycast={noRaycast} />
      ) : (
        <mesh position={[0, shaft / 2, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[radius, radius, shaft, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      <mesh position={[0, shaft + head / 2, 0]} raycast={noRaycast}>
        <coneGeometry args={[radius * 2.6, head, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  )
}

/* ---------- Time-dependent pieces ---------- */

/**
 * Projectile, travelled path and vectors at the current simulation time. Subscribes to the shared
 * clock, so the scene, readouts and graphs all show the same instant.
 */
function MovingParts({
  trajectory,
  clock,
  bounds,
  scales,
  showVectors,
  showComponents,
}: {
  trajectory: Trajectory
  clock: SimClock
  bounds: SceneBounds
  scales: VectorScales
  showVectors: boolean
  showComponents: boolean
}) {
  const t = useSimTime(clock)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [t, invalidate])

  const samples = useMemo(() => samplePath(trajectory, 200), [trajectory])
  const s = stateAt(trajectory, t)
  const radius = markerRadius(bounds.extent)
  const arrow = radius * 0.3
  const travelled = [...samples.filter((p) => p.t < s.t).map((p): P3 => [p.x, p.y, 0]), [s.x, s.y, 0] as P3]

  return (
    <group>
      {travelled.length > 1 && <Line points={travelled} color={C.path} lineWidth={3} raycast={noRaycast} />}
      <group position={[s.x, s.y, 0]}>
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[radius, 24, 16]} />
          <meshStandardMaterial color={C.projectile} emissive="#33434a" roughness={0.4} />
        </mesh>
        {showVectors && (
          <>
            <Arrow vector={[s.vx * scales.velocity, s.vy * scales.velocity, 0]} color={C.velocity} radius={arrow} />
            {showComponents && (
              <>
                <Arrow vector={[s.vx * scales.velocity, 0, 0]} color={C.component} radius={arrow * 0.8} dashed />
                <Arrow vector={[0, s.vy * scales.velocity, 0]} color={C.component} radius={arrow * 0.8} dashed />
              </>
            )}
            <Arrow vector={[0, s.ay * scales.acceleration, 0]} color={C.acceleration} radius={arrow} />
          </>
        )}
      </group>
    </group>
  )
}

/** Labels that follow the projectile; rebuilt when time changes. */
function useMovingLabels(
  trajectory: Trajectory,
  clock: SimClock,
  bounds: SceneBounds,
  scales: VectorScales,
  showVectors: boolean,
  activeName: string,
): SceneLabel[] {
  const t = useSimTime(clock)
  const s = stateAt(trajectory, t)
  const r = markerRadius(bounds.extent)
  const labels: SceneLabel[] = [
    // Left of the marker: the velocity arrow points forward and the acceleration arrow down.
    { key: 'projectile', position: [s.x, s.y, 0], offset: [-58, 0], text: activeName, className: 'is-projectile', priority: 10 },
  ]
  if (showVectors) {
    const k = scales.velocity * 1.12
    if (s.speed * scales.velocity > r * 3) {
      labels.push({ key: 'v', position: [s.x + s.vx * k, s.y + s.vy * k, 0], text: 'v', className: 'is-velocity', priority: 8 })
    }
    labels.push({ key: 'a', position: [s.x, s.y + s.ay * scales.acceleration * 1.18, 0], text: 'a', className: 'is-acceleration', priority: 8 })
  }
  return labels
}

/* ---------- Camera ---------- */

/** Frames the whole flight (and Run A). Runs only when its token changes — never while the user drags. */
function CameraRig({ bounds, view, token }: { bounds: SceneBounds; view: CameraView; token: string }) {
  const get = useThree((s) => s.get)
  const hasControls = useThree((s) => s.controls !== null)
  const boundsRef = useRef(bounds)
  useEffect(() => {
    boundsRef.current = bounds
  }, [bounds])

  useEffect(() => {
    if (!hasControls) return
    const b = boundsRef.current
    const { camera, size, invalidate } = get()
    const controls = get().controls as unknown as { target: Vector3; update: () => void }
    const cx = b.xMax / 2
    const cy = b.yMax / 2
    const w = b.xMax + b.extent * 0.35
    const h = b.yMax + b.extent * 0.3
    controls.target.set(cx, cy, 0)
    if (view === 'side') {
      const ortho = camera as OrthoCam
      // Leave room for the badge (top) and legend strip (bottom) drawn over the canvas.
      const top = OVERLAY_RESERVE.top
      const bottom = OVERLAY_RESERVE.bottom
      const zoom = Math.min(size.width / w, Math.max(40, size.height - top - bottom) / h)
      // Shift the view so the content is centred in the space between the overlays.
      const shift = (top - bottom) / 2 / zoom
      controls.target.set(cx, cy + shift, 0)
      // Orthographic side view: one metre has the same length on both axes everywhere on screen.
      ortho.position.set(cx, cy + shift, b.extent * 5)
      ortho.zoom = zoom
      ortho.near = 0.01
      ortho.far = b.extent * 20
    } else {
      const radius = Math.hypot(w, h) / 2
      const dir = new Vector3(0.55, 0.38, 1).normalize()
      camera.position.set(cx, cy, 0).add(dir.multiplyScalar((radius / Math.sin((35 * Math.PI) / 360)) * 1.05))
      camera.far = b.extent * 50
    }
    camera.lookAt(controls.target)
    camera.updateProjectionMatrix()
    controls.update()
    invalidate()
  }, [hasControls, token, view, get])

  return null
}

/** `value` once it has stopped changing for `delay` ms (so slider drags re-frame once, at the end). */
function useSettled<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return settled
}

/* ---------- Root ---------- */

export default function PhysicsScene(props: PhysicsSceneProps) {
  const { trajectory, runA, clock, view, showPreview, showVectors, showComponents, cameraToken, onReady, onContextLost } = props
  const bounds = useMemo(() => sceneBounds(runA ? [trajectory, runA] : [trajectory]), [trajectory, runA])
  const scales = useMemo(() => vectorScales(trajectory, bounds.extent), [trajectory, bounds.extent])
  const preview = useMemo(() => samplePath(trajectory, 120).map((s): P3 => [s.x, s.y, 0]), [trajectory])
  const runAPath = useMemo(() => (runA ? samplePath(runA, 120).map((s): P3 => [s.x, s.y, 0]) : null), [runA])
  const labelElements = useRef<Map<string, HTMLElement>>(new Map())
  const radius = markerRadius(bounds.extent)
  const { height } = trajectory.params

  const framing = useSettled(`${bounds.xMax}:${bounds.yMax}`, 250)

  const staticLabels = useMemo<SceneLabel[]>(() => {
    const out: SceneLabel[] = [
      { key: 'x-title', position: [bounds.xMax, 0, 0], offset: [0, 32], text: 'x (m) — horizontal', className: 'is-axis', priority: 9 },
      { key: 'y-title', position: [0, bounds.yMax, 0], offset: [8, -16], text: 'y (m) — height', className: 'is-axis', priority: 9 },
    ]
    for (const x of ticks(bounds.xMax, bounds.xStep)) {
      out.push({ key: `xt${x}`, position: [x, 0, 0], offset: [0, 14], text: formatTick(x, bounds.xStep), className: 'is-tick', priority: 2 })
    }
    for (const y of ticks(bounds.yMax, bounds.yStep).slice(1)) {
      out.push({ key: `yt${y}`, position: [0, y, 0], offset: [-20, 0], text: formatTick(y, bounds.yStep), className: 'is-tick', priority: 2 })
    }
    out.push({ key: 'launch', position: [0, height, 0], offset: [-34, 0], text: 'Launch', className: 'is-marker', priority: 6 })
    if (showPreview && trajectory.flightTime > 0) {
      out.push({ key: 'landing', position: [trajectory.range, 0, 0], offset: [0, -16], text: 'Predicted landing', className: 'is-marker', priority: 5 })
    }
    if (runA && runA.flightTime > 0) {
      const peak = stateAt(runA, runA.timeOfMaxHeight)
      out.push({ key: 'runA', position: [peak.x, peak.y, 0], offset: [0, -14], text: 'Run A (saved)', className: 'is-run-a', priority: 7 })
    }
    return out
  }, [bounds, height, showPreview, trajectory, runA])

  const movingLabels = useMovingLabels(trajectory, clock, bounds, scales, showVectors, runA ? 'Run B (active)' : 'Projectile')
  const labels = useMemo(() => [...staticLabels, ...movingLabels], [staticLabels, movingLabels])

  return (
    <>
      <Canvas
        className="viewport-canvas"
        dpr={[1, 2]}
        frameloop="demand"
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            onContextLost()
          })
          onReady()
        }}
      >
        <color attach="background" args={[C.background]} />
        {view === 'side' ? (
          <OrthographicCamera makeDefault position={[0, 0, 100]} zoom={10} />
        ) : (
          <PerspectiveCamera makeDefault fov={35} near={0.05} far={1000} position={[0, 0, 100]} />
        )}
        <ambientLight intensity={0.85} />
        <directionalLight position={[5, 10, 8]} intensity={1.4} />

        <Ground bounds={bounds} />
        <Axes bounds={bounds} />

        {/* Launch point: a post up to the initial height and a block marking the launch. */}
        {height > 0 && <Line points={[[0, 0, 0], [0, height, 0]]} color="#5b6670" lineWidth={2} raycast={noRaycast} />}
        <mesh position={[0, height, 0]} raycast={noRaycast}>
          <boxGeometry args={[radius * 1.6, radius * 1.6, radius * 1.6]} />
          <meshStandardMaterial color="#5b6670" />
        </mesh>

        {showPreview && preview.length > 1 && (
          <Line
            points={preview}
            color={C.preview}
            lineWidth={1.5}
            dashed
            dashSize={bounds.extent * 0.015}
            gapSize={bounds.extent * 0.012}
            raycast={noRaycast}
          />
        )}
        {showPreview && trajectory.flightTime > 0 && (
          <mesh position={[trajectory.range, bounds.extent * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
            <ringGeometry args={[radius * 1.2, radius * 1.8, 32]} />
            <meshBasicMaterial color={C.preview} />
          </mesh>
        )}
        {runAPath && runAPath.length > 1 && (
          <Line points={runAPath} color={C.runA} lineWidth={2.5} dashed dashSize={bounds.extent * 0.004} gapSize={bounds.extent * 0.01} raycast={noRaycast} />
        )}

        <MovingParts
          trajectory={trajectory}
          clock={clock}
          bounds={bounds}
          scales={scales}
          showVectors={showVectors}
          showComponents={showComponents}
        />

        <OrbitControls makeDefault enableRotate={view === 'perspective'} enableDamping={false} screenSpacePanning />
        <CameraRig bounds={bounds} view={view} token={`${framing}:${cameraToken}:${view}`} />
        <LabelProjector labels={labels} elements={labelElements} />
      </Canvas>
      <LabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
