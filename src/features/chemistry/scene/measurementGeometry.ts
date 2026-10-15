import { Vector3 } from 'three'
import type { Vec3 } from '../../../data/chemistry/types'

export interface AngleGeometry {
  arc: Vector3[]
  /** Point where the angle value label is anchored. */
  labelAnchor: Vector3
}

/**
 * Arc between the arms of an angle a–vertex–c, in source coordinates.
 * For (near-)linear or degenerate angles no arc is drawn and the label sits on the vertex.
 */
export function angleGeometry(a: Vec3, vertex: Vec3, c: Vec3): AngleGeometry {
  const v = new Vector3(...vertex)
  const u1 = new Vector3(...a).sub(v)
  const u2 = new Vector3(...c).sub(v)
  const shortest = Math.min(u1.length(), u2.length())
  // Coincident atoms leave the angle undefined: draw nothing rather than NaN geometry.
  if (shortest < 1e-9) return { arc: [], labelAnchor: v.clone() }
  const radius = Math.min(0.45, 0.35 * shortest)
  u1.normalize()
  u2.normalize()
  const theta = u1.angleTo(u2)
  if (theta > Math.PI - 0.02 || theta < 0.02) return { arc: [], labelAnchor: v.clone() }

  const arc: Vector3[] = []
  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // Spherical interpolation between the two unit arm directions.
    const s1 = Math.sin((1 - t) * theta) / Math.sin(theta)
    const s2 = Math.sin(t * theta) / Math.sin(theta)
    arc.push(u1.clone().multiplyScalar(s1).add(u2.clone().multiplyScalar(s2)).multiplyScalar(radius).add(v))
  }
  const bisector = u1.clone().add(u2).normalize()
  return { arc, labelAnchor: v.clone().add(bisector.multiplyScalar(radius * 1.9)) }
}
