import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import type { Atom } from '../../../data/chemistry/types'
import { angleGeometry } from './measurementGeometry'
import { SCENE } from './sceneTheme'

interface Props {
  /** Selected atoms in order; for angles the second atom is the vertex. */
  atoms: readonly Atom[]
  mode: 'distance' | 'angle'
}

const noRaycast = () => null

/** Shared line settings: drawn on top of atoms and bonds, never intercepting pointer events. */
const LINE = {
  color: SCENE.measure,
  depthTest: false,
  transparent: true,
  renderOrder: 10,
  raycast: noRaycast,
} as const

export function MeasurementOverlay({ atoms, mode }: Props) {
  const points = useMemo(() => atoms.map((a) => new Vector3(...a.position)), [atoms])

  // Consecutive pairs: a–b for distances; a–vertex and vertex–c for angles.
  const segments = points.slice(1).map((q, i) => [points[i], q] as const)

  const arc = useMemo(
    () =>
      mode === 'angle' && atoms.length === 3
        ? angleGeometry(atoms[0].position, atoms[1].position, atoms[2].position).arc
        : [],
    [atoms, mode],
  )

  return (
    <group>
      {segments.map(([p, q], i) => (
        <Line key={i} points={[p, q]} lineWidth={2.5} dashed dashSize={0.1} gapSize={0.06} {...LINE} />
      ))}
      {arc.length > 1 && <Line points={arc} lineWidth={2} {...LINE} />}
    </group>
  )
}
