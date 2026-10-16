import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useEffectEvent, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { OrganelleId } from '../../../data/biology/types'
import { CELL_RADIUS, focusTarget as animalFocusTarget, type FocusTarget } from './layout'

interface Controls {
  target: Vector3
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  update: () => void
}

interface Props {
  /** Changing this returns the camera to the default view. */
  resetToken: number
  /** Changing this moves the camera to the focus target below (only then — never on every render). */
  focusToken: number
  focus: { organelleId: OrganelleId; instance: number | null } | null
  reducedMotion: boolean
  /** Radius that frames the whole cell (differs between the animal and plant models). */
  cellRadius?: number
  focusTarget?: (organelleId: OrganelleId, instance: number | null) => FocusTarget
}

/** Default view: slightly above and to the right, looking into the cutaway. */
const VIEW_DIRECTION = new Vector3(0.32, 0.36, 1).normalize()
const DURATION = 0.6

interface Flight {
  fromPos: Vector3
  toPos: Vector3
  fromTarget: Vector3
  toTarget: Vector3
  t: number
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3)

export function CellCameraRig({ resetToken, focusToken, focus, reducedMotion, cellRadius = CELL_RADIUS, focusTarget = animalFocusTarget }: Props) {
  const get = useThree((s) => s.get)
  const hasControls = useThree((s) => s.controls !== null)
  const flight = useRef<Flight | null>(null)

  const fitDistance = (radius: number) => {
    const { camera, size } = get()
    const vFov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 0.6
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (size.width / Math.max(1, size.height)))
    return (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.1
  }

  const flyTo = (target: Vector3, position: Vector3, animate: boolean) => {
    const { camera, invalidate } = get()
    const controls = get().controls as unknown as Controls | null
    if (!controls) return
    if (!animate) {
      flight.current = null
      camera.position.copy(position)
      controls.target.copy(target)
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.enableDamping = damping
      invalidate()
      return
    }
    flight.current = {
      fromPos: camera.position.clone(),
      toPos: position,
      fromTarget: controls.target.clone(),
      toTarget: target,
      t: 0,
    }
    invalidate()
  }

  // Reset: initial framing happens without animation; later resets animate unless reduced motion.
  const firstFrame = useRef(true)
  const frameCell = useEffectEvent(() => {
    const controls = get().controls as unknown as Controls
    controls.minDistance = 1.2
    controls.maxDistance = fitDistance(cellRadius) * 2.5
    const distance = fitDistance(cellRadius)
    flyTo(new Vector3(0, 0, 0), VIEW_DIRECTION.clone().multiplyScalar(distance), !firstFrame.current && !reducedMotion)
    firstFrame.current = false
  })
  // Also re-frames when the model changes (animal ↔ plant), since the cells differ in size.
  useEffect(() => {
    if (hasControls) frameCell()
  }, [hasControls, resetToken, cellRadius])

  // Focus reads the selection at the moment the button is pressed; selecting alone never moves the camera.
  const focusSelection = useEffectEvent(() => {
    if (!focus || !hasControls) return
    const { center, radius } = focusTarget(focus.organelleId, focus.instance)
    const target = new Vector3(...center)
    const { camera } = get()
    const controls = get().controls as unknown as Controls
    // Keep the current viewing direction, just move closer.
    const direction = camera.position.clone().sub(controls.target).normalize()
    const distance = Math.max(fitDistance(radius), 2)
    flyTo(target, target.clone().add(direction.multiplyScalar(distance)), !reducedMotion)
  })
  useEffect(() => {
    if (focusToken > 0) focusSelection()
  }, [focusToken])

  useFrame((_, delta) => {
    const f = flight.current
    if (!f) return
    const { camera, invalidate } = get()
    const controls = get().controls as unknown as Controls | null
    if (!controls) return
    f.t = Math.min(1, f.t + delta / DURATION)
    const k = ease(f.t)
    if (f.t >= 1) {
      // Land exactly on the destination so Reset view is pixel-identical to the initial view.
      camera.position.copy(f.toPos)
      controls.target.copy(f.toTarget)
      flight.current = null
    } else {
      camera.position.lerpVectors(f.fromPos, f.toPos, k)
      controls.target.lerpVectors(f.fromTarget, f.toTarget, k)
    }
    controls.update()
    invalidate()
  })

  return null
}
