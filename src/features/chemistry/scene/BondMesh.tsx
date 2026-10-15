import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { ELEMENTS } from '../../../data/chemistry/elements'
import type { Atom, BondOrder } from '../../../data/chemistry/types'
import { SCENE } from './sceneTheme'

interface Props {
  from: Atom
  to: Atom
  order: BondOrder
  /** Molecule centroid in source coordinates; extra sticks are offset toward it. */
  center: Vector3
}

const UP = new Vector3(0, 1, 0)
const noRaycast = () => null

interface Stick {
  key: string
  position: Vector3
  length: number
  radius: number
  color: string
}

/** Unit vector perpendicular to `dir`, pointing toward `hint` where possible. */
function perpendicular(dir: Vector3, hint: Vector3): Vector3 {
  for (const candidate of [hint, new Vector3(0, 1, 0), new Vector3(1, 0, 0)]) {
    const p = candidate.clone().sub(dir.clone().multiplyScalar(candidate.dot(dir)))
    if (p.lengthSq() > 1e-6) return p.normalize()
  }
  return new Vector3(0, 0, 1)
}

/**
 * Bond sticks between two atoms:
 * - single/double/triple: that many parallel sticks, each split at the midpoint and
 *   colored by the atom at that end;
 * - aromatic: one solid stick plus a dashed inner stick toward the ring center, a
 *   drawing convention for delocalized π bonding.
 */
export function BondMesh({ from, to, order, center }: Props) {
  const { quaternion, sticks } = useMemo(() => {
    const a = new Vector3(...from.position)
    const b = new Vector3(...to.position)
    const dir = b.clone().sub(a)
    const length = dir.length()
    dir.normalize()
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const perp = perpendicular(dir, center.clone().sub(mid))
    const colorA = ELEMENTS[from.element].color
    const colorB = ELEMENTS[to.element].color

    const twoTone = (key: string, offset: Vector3, radius: number): Stick[] => [
      { key: `${key}a`, position: a.clone().add(mid).multiplyScalar(0.5).add(offset), length: length / 2, radius, color: colorA },
      { key: `${key}b`, position: mid.clone().add(b).multiplyScalar(0.5).add(offset), length: length / 2, radius, color: colorB },
    ]

    const result: Stick[] = []
    if (order === 'aromatic') {
      result.push(...twoTone('main', new Vector3(), SCENE.bondRadius))
      const inner = perp.clone().multiplyScalar(SCENE.multiBondSpacing * 1.15)
      const dashes = 4
      const span = length * 0.62
      const dashLength = span / (dashes * 2 - 1)
      for (let i = 0; i < dashes; i++) {
        const t = -span / 2 + dashLength / 2 + i * 2 * dashLength
        result.push({
          key: `dash${i}`,
          position: mid.clone().add(dir.clone().multiplyScalar(t)).add(inner),
          length: dashLength,
          radius: SCENE.bondRadius * 0.45,
          color: SCENE.aromaticDash,
        })
      }
    } else {
      const radius = order > 1 ? SCENE.bondRadius * 0.7 : SCENE.bondRadius
      for (let i = 0; i < order; i++) {
        const offset = perp.clone().multiplyScalar((i - (order - 1) / 2) * SCENE.multiBondSpacing)
        result.push(...twoTone(String(i), offset, radius))
      }
    }
    return { quaternion: new Quaternion().setFromUnitVectors(UP, dir), sticks: result }
  }, [from, to, order, center])

  return (
    <>
      {sticks.map((s) => (
        <mesh key={s.key} position={s.position} quaternion={quaternion} raycast={noRaycast}>
          <cylinderGeometry args={[s.radius, s.radius, s.length, 20]} />
          <meshStandardMaterial color={s.color} roughness={0.55} />
        </mesh>
      ))}
    </>
  )
}
