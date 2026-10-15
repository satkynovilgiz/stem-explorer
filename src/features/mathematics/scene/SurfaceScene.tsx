import { Line, OrbitControls, OrthographicCamera, PerspectiveCamera, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, Vector3, type OrthographicCamera as OrthoCam } from 'three'
import { formatTick } from '../../../lib/ticks'
import { fromWorld, toWorld } from '../../../math/coordinates'
import type { Params, SliceAxis, SurfaceDef } from '../../../math/surfaces'
import { axisFrame, buildSurfaceArrays, buildWireframe, type AxisFrame } from '../sceneGeometry'

export type MathView = 'perspective' | 'top' | 'front' | 'side'

export interface SurfaceSceneProps {
  surface: SurfaceDef
  params: Params
  view: MathView
  showWireframe: boolean
  slice: { axis: SliceAxis; value: number } | null
  point: { x: number; y: number } | null
  /**
   * Explicit camera request: Fit surface keeps the current viewing direction (keep = true);
   * Reset camera uses the default direction (keep = false). Parameter edits never move the camera.
   */
  cameraRequest: { id: number; keep: boolean }
  onPick: (x: number, y: number) => void
  onReady: () => void
  onContextLost: () => void
}

const COLORS = {
  background: '#121518',
  axis: '#8a959e',
  grid: '#262c31',
  wire: '#0b0d0f',
  slicePlane: '#2fc4c0',
  sliceCurve: '#f5c26b',
  point: '#ffffff',
}
const noRaycast = () => null
type P3 = [number, number, number]
const w = (x: number, y: number, z: number): P3 => toWorld([x, y, z])

/* ---------- Labels: DOM overlay with collision avoidance ---------- */

interface SceneLabel {
  key: string
  position: P3
  text: string
  className: string
  priority: number
}

const projected = new Vector3()

function LabelProjector({ labels, elements }: { labels: readonly SceneLabel[]; elements: RefObject<Map<string, HTMLElement>> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, labels])
  const ordered = useMemo(() => [...labels].sort((a, b) => b.priority - a.priority), [labels])
  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld()
    const placed: { x: number; y: number; w: number; h: number }[] = []
    for (const label of ordered) {
      const el = elements.current.get(label.key)
      if (!el) continue
      projected.set(...label.position).project(camera)
      const x = ((projected.x + 1) / 2) * size.width
      const y = ((1 - projected.y) / 2) * size.height
      const rect = { x: x - el.offsetWidth / 2, y: y - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight }
      const onScreen = projected.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height
      const clear = !placed.some((p) => rect.x < p.x + p.w + 2 && p.x < rect.x + rect.w + 2 && rect.y < p.y + p.h && p.y < rect.y + rect.h)
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
          className={`math-label ${l.className}`}
        >
          {l.text}
        </span>
      ))}
    </div>
  )
}

/* ---------- Surface ---------- */

/** Disposes a GPU resource when it is replaced (e.g. a new geometry after a parameter edit) or unmounted. */
function useDisposeOnChange(resource: { dispose: () => void }) {
  useEffect(() => () => resource.dispose(), [resource])
}

function SurfaceMesh({ surface, params, onPick }: { surface: SurfaceDef; params: Params; onPick: (x: number, y: number) => void }) {
  const [hovered, setHovered] = useState(false)
  useCursor(hovered, 'crosshair')
  // Rebuilt only when the surface or its parameters change.
  const geometry = useMemo(() => {
    const { positions, colors, indices } = buildSurfaceArrays(surface, params)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('color', new BufferAttribute(colors, 3))
    g.setIndex(new BufferAttribute(indices, 1))
    g.computeVertexNormals()
    return g
  }, [surface, params])
  useDisposeOnChange(geometry)

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // Releasing the mouse after rotating the view is not a pick.
    if (e.delta > 4) return
    // The hit is on a flat triangle; keep only (x, y) and let the caller evaluate f(x, y) exactly.
    const [x, y] = fromWorld([e.point.x, e.point.y, e.point.z])
    onPick(x, y)
  }

  return (
    <mesh
      geometry={geometry}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Polygon offset pushes the surface back slightly so wireframe and curves draw on top. */}
      <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.55} metalness={0.05} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
    </mesh>
  )
}

function Wireframe({ surface, params }: { surface: SurfaceDef; params: Params }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(buildWireframe(surface, params), 3))
    return g
  }, [surface, params])
  useDisposeOnChange(geometry)
  return (
    <lineSegments geometry={geometry} raycast={noRaycast}>
      <lineBasicMaterial color={COLORS.wire} transparent opacity={0.45} />
    </lineSegments>
  )
}

/* ---------- Axes, grid, slice, point ---------- */

function AxesAndGrid({ surface, frame }: { surface: SurfaceDef; frame: AxisFrame }) {
  const { min, max } = surface.domain
  const z0 = frame.zFloor
  const tick = (max - min) * 0.02
  const gridLines: [P3, P3][] = frame.xyTicks.flatMap((t): [P3, P3][] => [
    [w(t, min, z0), w(t, max, z0)],
    [w(min, t, z0), w(max, t, z0)],
  ])
  return (
    <group>
      {gridLines.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={COLORS.grid} lineWidth={1} raycast={noRaycast} />
      ))}
      {/* x along the front edge, y along the right edge, z up the front-left corner. */}
      <Line points={[w(min, min, z0), w(max, min, z0)]} color={COLORS.axis} lineWidth={1.6} raycast={noRaycast} />
      <Line points={[w(max, min, z0), w(max, max, z0)]} color={COLORS.axis} lineWidth={1.6} raycast={noRaycast} />
      <Line points={[w(min, min, z0), w(min, min, frame.zCeil)]} color={COLORS.axis} lineWidth={1.6} raycast={noRaycast} />
      {frame.xyTicks.map((t) => (
        <Line key={`x${t}`} points={[w(t, min, z0), w(t, min - tick, z0)]} color={COLORS.axis} lineWidth={1.4} raycast={noRaycast} />
      ))}
      {frame.xyTicks.map((t) => (
        <Line key={`y${t}`} points={[w(max, t, z0), w(max + tick, t, z0)]} color={COLORS.axis} lineWidth={1.4} raycast={noRaycast} />
      ))}
      {frame.zTicks.map((t) => (
        <Line key={`z${t}`} points={[w(min, min, t), w(min - tick, min - tick, t)]} color={COLORS.axis} lineWidth={1.4} raycast={noRaycast} />
      ))}
    </group>
  )
}

function Slice({ surface, params, slice, frame }: { surface: SurfaceDef; params: Params; slice: { axis: SliceAxis; value: number }; frame: AxisFrame }) {
  const { min, max } = surface.domain
  const { axis, value } = slice
  // The curve is evaluated from the surface function, not from triangle intersections.
  const curve = useMemo(() => {
    const s = surface.slice(params, axis, value)
    return Array.from({ length: 241 }, (_, i): P3 => {
      const u = min + ((max - min) * i) / 240
      return axis === 'x' ? w(value, u, s.evaluate(u)) : w(u, value, s.evaluate(u))
    })
  }, [surface, params, axis, value, min, max])
  const { zFloor, zCeil } = frame
  const corners = useMemo<P3[]>(
    () =>
      axis === 'x'
        ? [w(value, min, zFloor), w(value, max, zFloor), w(value, max, zCeil), w(value, min, zCeil)]
        : [w(min, value, zFloor), w(max, value, zFloor), w(max, value, zCeil), w(min, value, zCeil)],
    [axis, value, min, max, zFloor, zCeil],
  )
  const plane = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(corners.flat()), 3))
    g.setIndex([0, 1, 2, 0, 2, 3])
    return g
  }, [corners])
  useDisposeOnChange(plane)
  return (
    <group>
      {/* Translucent, non-interactive plane: clicks pass through to the surface. */}
      <mesh geometry={plane} raycast={noRaycast} renderOrder={2}>
        <meshBasicMaterial color={COLORS.slicePlane} transparent opacity={0.12} side={DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={[...corners, corners[0]]} color={COLORS.slicePlane} lineWidth={1.2} transparent opacity={0.6} raycast={noRaycast} />
      <Line points={curve} color={COLORS.sliceCurve} lineWidth={3.5} depthTest={false} renderOrder={5} raycast={noRaycast} />
    </group>
  )
}

function PointMarker({ surface, params, point, frame }: { surface: SurfaceDef; params: Params; point: { x: number; y: number }; frame: AxisFrame }) {
  const z = surface.evaluate(params, point.x, point.y)
  const radius = (surface.domain.max - surface.domain.min) * 0.012
  return (
    <group>
      <mesh position={w(point.x, point.y, z)} raycast={noRaycast} renderOrder={6}>
        <sphereGeometry args={[radius, 20, 14]} />
        <meshBasicMaterial color={COLORS.point} depthTest={false} />
      </mesh>
      <Line
        points={[w(point.x, point.y, z), w(point.x, point.y, frame.zFloor)]}
        color={COLORS.point}
        lineWidth={1.2}
        dashed
        dashSize={radius * 1.5}
        gapSize={radius}
        transparent
        opacity={0.7}
        raycast={noRaycast}
      />
    </group>
  )
}

/* ---------- Camera ---------- */

const DIRECTIONS: Record<MathView, { dir: P3; up: P3 }> = {
  // Math view directions (from the target toward the camera), mapped to world space below.
  perspective: { dir: [1.15, -1.45, 1.05], up: [0, 0, 1] },
  top: { dir: [0, 0, 1], up: [0, 1, 0] },
  front: { dir: [0, -1, 0], up: [0, 0, 1] },
  side: { dir: [1, 0, 0], up: [0, 0, 1] },
}

function CameraRig({ surface, frame, view, token, keepDirection }: { surface: SurfaceDef; frame: AxisFrame; view: MathView; token: string; keepDirection: boolean }) {
  const get = useThree((s) => s.get)
  // Switching cameras recreates OrbitControls; re-run framing for the new controls, not the old ones.
  const controlsObject = useThree((s) => s.controls)
  const hasControls = controlsObject !== null
  const latest = useRef({ surface, frame, keepDirection })
  useEffect(() => {
    latest.current = { surface, frame, keepDirection }
  }, [surface, frame, keepDirection])

  useEffect(() => {
    if (!hasControls) return
    const { surface: s, frame: f, keepDirection: keep } = latest.current
    const { camera, size, invalidate } = get()
    const controls = get().controls as unknown as { target: Vector3; update: () => void }
    const { min, max } = s.domain
    const span = max - min
    const center = new Vector3(...w((min + max) / 2, (min + max) / 2, (f.zFloor + f.zCeil) / 2))
    const box = new Vector3(span, f.zCeil - f.zFloor, span)
    const preset = DIRECTIONS[view]
    let dir = new Vector3(...toWorld(preset.dir)).normalize()
    if (keep && view === 'perspective') {
      const current = camera.position.clone().sub(controls.target)
      if (current.lengthSq() > 1e-9) dir = current.normalize()
    }
    camera.up.set(...toWorld(preset.up))
    const radius = box.length() / 2
    if (view === 'perspective') {
      const fov = (35 * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(fov / 2) * (size.width / Math.max(1, size.height)))
      camera.position.copy(center).addScaledVector(dir, (radius / Math.sin(Math.min(fov, hFov) / 2)) * 1.05)
    } else {
      const ortho = camera as OrthoCam
      const [wSpan, hSpan] = view === 'top' ? [span, span] : [span, f.zCeil - f.zFloor]
      ortho.position.copy(center).addScaledVector(dir, radius * 4)
      ortho.zoom = Math.min(size.width / (wSpan * 1.35), (size.height - 90) / (hSpan * 1.35))
      ortho.near = 0.01
      ortho.far = radius * 20
    }
    controls.target.copy(center)
    camera.lookAt(center)
    camera.updateProjectionMatrix()
    controls.update()
    invalidate()
  }, [controlsObject, hasControls, token, view, get])
  return null
}

/* ---------- Root ---------- */

export default function SurfaceScene(props: SurfaceSceneProps) {
  const { surface, params, view, showWireframe, slice, point, cameraRequest, onPick, onReady, onContextLost } = props
  const range = useMemo(() => {
    const { zMin, zMax } = buildSurfaceArrays(surface, params)
    return { zMin, zMax }
  }, [surface, params])
  const frame = useMemo(() => axisFrame(surface, range.zMin, range.zMax), [surface, range])
  const labelElements = useRef<Map<string, HTMLElement>>(new Map())
  const { min, max } = surface.domain

  // Re-frame when a preset opens, the view changes, or on Fit surface / Reset camera — never on parameter edits.
  const token = `${surface.id}:${view}:${cameraRequest.id}`

  const labels = useMemo<SceneLabel[]>(() => {
    const out: SceneLabel[] = []
    const pad = (max - min) * 0.09
    out.push({ key: 'x-title', position: w(max + pad, min - pad * 0.6, frame.zFloor), text: 'x', className: 'is-axis', priority: 9 })
    out.push({ key: 'y-title', position: w(max + pad * 0.6, max + pad, frame.zFloor), text: 'y', className: 'is-axis', priority: 9 })
    out.push({ key: 'z-title', position: w(min, min, frame.zCeil + pad * 0.7), text: 'z', className: 'is-axis', priority: 9 })
    for (const t of frame.xyTicks) {
      out.push({ key: `xt${t}`, position: w(t, min - pad, frame.zFloor), text: formatTick(t, frame.xyStep), className: 'is-tick', priority: 3 })
      out.push({ key: `yt${t}`, position: w(max + pad, t, frame.zFloor), text: formatTick(t, frame.xyStep), className: 'is-tick', priority: 3 })
    }
    for (const t of frame.zTicks) {
      out.push({ key: `zt${t}`, position: w(min - pad * 0.7, min - pad * 0.7, t), text: formatTick(t, frame.zStep), className: 'is-tick', priority: 3 })
    }
    if (point) {
      const z = surface.evaluate(params, point.x, point.y)
      out.push({ key: 'point', position: w(point.x, point.y, z + (max - min) * 0.06), text: 'P', className: 'is-point', priority: 10 })
    }
    return out
  }, [surface, params, frame, point, min, max])

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
        <color attach="background" args={[COLORS.background]} />
        {/* A soft headlight travels with the camera so faces turned away from the fixed lights stay readable. */}
        {view === 'perspective' ? (
          <PerspectiveCamera makeDefault fov={35} near={0.05} far={500} position={[10, 10, 10]}>
            <directionalLight position={[1, 2, 3]} intensity={0.75} />
          </PerspectiveCamera>
        ) : (
          <OrthographicCamera makeDefault position={[0, 10, 0]} zoom={40}>
            <directionalLight position={[1, 2, 3]} intensity={0.75} />
          </OrthographicCamera>
        )}
        <hemisphereLight args={['#e6eef2', '#1b2025', 0.95]} />
        <directionalLight position={[6, 10, 4]} intensity={1.1} />
        <directionalLight position={[-6, -4, -8]} intensity={0.35} />

        <AxesAndGrid surface={surface} frame={frame} />
        <SurfaceMesh surface={surface} params={params} onPick={onPick} />
        {showWireframe && <Wireframe surface={surface} params={params} />}
        {slice && <Slice surface={surface} params={params} slice={slice} frame={frame} />}
        {point && <PointMarker surface={surface} params={params} point={point} frame={frame} />}

        <OrbitControls makeDefault enableRotate={view === 'perspective'} enableDamping={false} screenSpacePanning />
        <CameraRig surface={surface} frame={frame} view={view} token={token} keepDirection={cameraRequest.keep} />
        <LabelProjector labels={labels} elements={labelElements} />
      </Canvas>
      <LabelLayer labels={labels} elements={labelElements} />
    </>
  )
}
