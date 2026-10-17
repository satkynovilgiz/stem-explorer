import { L, mirror } from './figure'
import type { Shape, Vec3 } from './types'

/*
 * Two conceptual movement demonstrations. Flexion "decreases the angle between the bones (bending
 * of the joint)" and knee flexion brings "the foot toward the posterior thigh" (OpenStax A&P 2e
 * §9.5). The elbow is a uniaxial hinge allowing only flexion and extension; the knee functions
 * primarily as a hinge (§9.6).
 *
 * The demonstrations rotate rigid segments about a fixed axis through the joint. They do not model
 * joint surfaces, ligaments, muscle shortening or forces, and the range is conceptual: no
 * population-specific range of motion is claimed, so no angles are shown.
 */

export type MovementId = 'elbow-flexion' | 'knee-flexion'
export type Side = 'left' | 'right'

export interface MovementDemo {
  id: MovementId
  name: string
  joint: string
  definition: string
  referencePosture: string
  /** Pivot on the LEFT side; mirrored for the right. */
  pivot: Vec3
  /** Rotation (radians) about the transverse (x) axis at full conceptual flexion. Sign sets direction. */
  fullAngle: number
  /** Structures that move rigidly with the distal segment (base ids, without -left/-right). */
  moving: readonly string[]
  /** Muscles crossing the joint: their distal end follows the segment, so they stretch or bunch. */
  spanning: readonly string[]
  /** Static context: the proximal segment. */
  context: readonly string[]
  principal: readonly { id: string; role: string }[]
  opposing: readonly { id: string; role: string }[]
  notes: readonly string[]
  sources: readonly string[]
}

export const MOVEMENTS: readonly MovementDemo[] = [
  {
    id: 'elbow-flexion',
    name: 'Elbow flexion',
    joint: 'elbow-joint',
    definition: 'Flexion at the elbow bends the joint: the forearm moves forward and up, decreasing the angle between the forearm and the arm. Extension straightens it.',
    referencePosture: 'Starts from the anatomical position: elbow straight, palm facing forward.',
    pivot: L.elbow,
    // The forearm swings anteriorly (towards +z): a negative rotation about +x.
    fullAngle: -2.3,
    moving: ['ulna', 'radius', 'carpals', 'metacarpals', 'hand-phalanges', 'forearm-flexors', 'forearm-extensors'],
    spanning: ['biceps-brachii', 'brachialis', 'brachioradialis', 'triceps-brachii'],
    context: ['humerus', 'clavicle', 'scapula', 'deltoid', 'elbow-joint', 'shoulder-joint'],
    principal: [
      { id: 'biceps-brachii', role: 'Flexes the forearm' },
      { id: 'brachialis', role: 'Adds power to flexion' },
      { id: 'brachioradialis', role: 'Flexes the forearm' },
    ],
    opposing: [{ id: 'triceps-brachii', role: 'Extends the forearm (with the anconeus, not drawn)' }],
    notes: ['The biceps brachii also takes part in supinating the forearm, which is not animated.'],
    sources: ['ap-9-5', 'ap-9-6', 'ap-11-5'],
  },
  {
    id: 'knee-flexion',
    name: 'Knee flexion',
    joint: 'knee-joint',
    definition: 'Knee flexion bends the knee, bringing the foot towards the back of the thigh. Extension straightens the knee.',
    referencePosture: 'Starts from the anatomical position: knee straight, foot flat, toes forward.',
    pivot: L.knee,
    // The leg swings posteriorly (towards −z): a positive rotation about +x.
    fullAngle: 2.0,
    moving: ['tibia', 'fibula', 'tarsals', 'metatarsals', 'foot-phalanges', 'gastrocnemius', 'soleus', 'tibialis-anterior'],
    spanning: ['hamstrings', 'sartorius', 'quadriceps'],
    context: ['femur', 'hip-bone', 'patella', 'knee-joint', 'hip-joint', 'gluteus-maximus', 'adductors'],
    principal: [
      { id: 'hamstrings', role: 'Flexes the knee' },
      { id: 'sartorius', role: 'Flexes the leg at the knee' },
    ],
    opposing: [{ id: 'quadriceps', role: 'Extends and stabilizes the knee' }],
    notes: [
      'In a real knee, rolling and gliding of the femur on the tibia accompany flexion, and some rotation is possible once it is flexed. None of this is modelled.',
      'The patella stays still here; in a real knee it slides in a groove on the femur.',
    ],
    sources: ['ap-9-5', 'ap-9-6', 'ap-11-6'],
  },
]

export const findMovement = (id: string) => MOVEMENTS.find((m) => m.id === id)

/** Rotates p about the x-axis through `pivot` by `angle` radians (right-handed). */
export function rotateAboutX(p: Vec3, pivot: Vec3, angle: number): Vec3 {
  const y = p[1] - pivot[1]
  const z = p[2] - pivot[2]
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return [p[0], pivot[1] + y * c - z * s, pivot[2] + y * s + z * c]
}

/** The rigid pose of one shape. Adding to the X Euler angle is exact for three.js's default XYZ order. */
export function rotateShape(shape: Shape, pivot: Vec3, angle: number): Shape {
  const r = (p: Vec3) => rotateAboutX(p, pivot, angle)
  switch (shape.kind) {
    case 'ellipsoid':
    case 'box': {
      const [rx, ry, rz] = shape.rotation ?? [0, 0, 0]
      return { ...shape, center: r(shape.center), rotation: [rx + angle, ry, rz] }
    }
    case 'capsule':
      return { ...shape, from: r(shape.from), to: r(shape.to) }
    case 'tube':
      return { ...shape, points: shape.points.map(r) }
  }
}

/** A muscle crossing the joint: only its distal end (capsule `to`, a tube's last point) follows the segment. */
export function stretchShape(shape: Shape, pivot: Vec3, angle: number): Shape {
  switch (shape.kind) {
    case 'capsule':
      return { ...shape, to: rotateAboutX(shape.to, pivot, angle) }
    case 'tube':
      return { ...shape, points: shape.points.map((p, i) => (i === shape.points.length - 1 ? rotateAboutX(p, pivot, angle) : p)) }
    default:
      return shape
  }
}

export const sided = (base: string, side: Side) => `${base}-${side}`

export function demoPivot(demo: MovementDemo, side: Side): Vec3 {
  return side === 'left' ? demo.pivot : mirror(demo.pivot)
}

/** Structure ids taking part in a demo, by role. */
export function demoMembers(demo: MovementDemo, side: Side) {
  const s = (ids: readonly string[]) => ids.map((b) => sided(b, side))
  return { moving: s(demo.moving), spanning: s(demo.spanning), context: s(demo.context) }
}

/** Conceptual progress 0 (reference posture) … 1 (fully flexed in this demonstration). */
export const angleAt = (demo: MovementDemo, t: number) => demo.fullAngle * Math.min(1, Math.max(0, t))

/** Words for the slider position; deliberately not degrees. */
export function poseWords(t: number): string {
  if (t <= 0.02) return 'Extended (reference posture)'
  if (t >= 0.98) return 'Flexed (end of this demonstration)'
  return t < 0.5 ? 'Starting to flex' : 'Mostly flexed'
}
