import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { ELEMENTS } from '../../../data/chemistry/elements'
import type { Atom, BondOrder } from '../../../data/chemistry/types'
import { SCENE } from './sceneTheme'

interface Props {
  from: Atom
  to: Atom
  order: BondOrder
}

const UP = new Vector3(0, 1, 0)
const noRaycast = () => null

interface Segment {
  key: string
  position: Vector3
  quaternion: Quaternion
  length: number
  color: string
}

/**
 * A bond drawn as `order` parallel sticks. Each stick is split at the midpoint
 * and colored by the atom at that end.
 */
export function BondMesh({ from, to, order }: Props) {
  const segments = useMemo<Segment[]>(() => {
    const a = new Vector3(...from.position)
    const b = new Vector3(...to.position)
    const dir = b.clone().sub(a)
    const length = dir.length()
    dir.normalize()
    const quaternion = new Quaternion().setFromUnitVectors(UP, dir)

    // Offset direction for multiple bonds: perpendicular to the bond axis.
    let perp = new Vector3().crossVectors(dir, new Vector3(0, 0, 1))
    if (perp.lengthSq() < 1e-6) perp = new Vector3().crossVectors(dir, UP)
    perp.normalize()

    const mid = a.clone().add(b).multiplyScalar(0.5)
    const result: Segment[] = []
    for (let i = 0; i < order; i++) {
      const offset = perp.clone().multiplyScalar((i - (order - 1) / 2) * SCENE.multiBondSpacing)
      const halves: [Vector3, Vector3, string][] = [
        [a, mid, ELEMENTS[from.element].color],
        [mid, b, ELEMENTS[to.element].color],
      ]
      halves.forEach(([p, q, color], h) => {
        result.push({
          key: `${i}-${h}`,
          position: p.clone().add(q).multiplyScalar(0.5).add(offset),
          quaternion,
          length: length / 2,
          color,
        })
      })
    }
    return result
  }, [from, to, order])

  const radius = order > 1 ? SCENE.bondRadius * 0.7 : SCENE.bondRadius

  return (
    <>
      {segments.map((s) => (
        <mesh key={s.key} position={s.position} quaternion={s.quaternion} raycast={noRaycast}>
          <cylinderGeometry args={[radius, radius, s.length, 20]} />
          <meshStandardMaterial color={s.color} roughness={0.55} />
        </mesh>
      ))}
    </>
  )
}
