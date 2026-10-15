import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'

/** The subset of OrbitControls this component touches. */
interface Controls {
  target: Vector3
  enableDamping: boolean
  minDistance: number
  maxDistance: number
  update: () => void
}

interface Props {
  /** Radius (Å) of a sphere that encloses the whole model. */
  fitRadius: number
  /** Any change re-frames the camera. */
  resetToken: unknown
}

/** Slightly elevated three-quarter view so depth is visible from the start. */
const VIEW_DIRECTION = new Vector3(0.45, 0.3, 1).normalize()

/**
 * Frames the model when the molecule changes or the user resets the view. When only the
 * fit radius changes (switching display mode), the zoom is rescaled and the user's
 * rotation is kept.
 */
export function CameraRig({ fitRadius, resetToken }: Props) {
  // Subscribed only so the effect re-runs once OrbitControls registers itself.
  const hasControls = useThree((s) => s.controls !== null)
  const get = useThree((s) => s.get)
  const framed = useRef<{ token: unknown; radius: number } | null>(null)

  useEffect(() => {
    // Read the latest state imperatively: resizing should not undo the user's zoom.
    const { camera, size, invalidate } = get()
    const controls = get().controls as unknown as Controls | null
    if (!(camera instanceof PerspectiveCamera)) return
    const aspect = size.width / Math.max(1, size.height)
    const vFov = (camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const fov = Math.min(vFov, hFov)
    const distance = (fitRadius / Math.sin(fov / 2)) * 1.2

    // Flush any leftover damping momentum so it is not applied after re-framing.
    const damping = controls?.enableDamping ?? false
    if (controls) {
      controls.enableDamping = false
      controls.update()
    }

    const previous = framed.current
    framed.current = { token: resetToken, radius: fitRadius }
    if (controls && previous && previous.token === resetToken && previous.radius !== fitRadius) {
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(fitRadius / previous.radius)
      camera.position.copy(controls.target).add(offset)
      controls.minDistance = fitRadius * 1.2
      controls.maxDistance = distance * 3
      controls.update()
      controls.enableDamping = damping
      invalidate()
      return
    }

    camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.minDistance = fitRadius * 1.2
      controls.maxDistance = distance * 3
      controls.update()
      controls.enableDamping = damping
    }
    invalidate()
  }, [get, hasControls, fitRadius, resetToken])

  return null
}
