import type { ThreeEvent } from '@react-three/fiber'
import { ELEMENTS } from '../../../data/chemistry/elements'
import type { Atom } from '../../../data/chemistry/types'
import { SCENE } from './sceneTheme'

interface Props {
  atom: Atom
  radius: number
  selected: boolean
  hovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const noRaycast = () => null

export function AtomMesh({ atom, radius, selected, hovered, onSelect, onHover }: Props) {
  const element = ELEMENTS[atom.element]

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(atom.id)
  }
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onHover(atom.id)
  }

  return (
    <group position={atom.position}>
      <mesh onClick={handleClick} onPointerOver={handleOver} onPointerOut={() => onHover(null)}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshStandardMaterial
          color={element.color}
          roughness={0.42}
          metalness={0.05}
          emissive={selected ? SCENE.accent : hovered ? SCENE.hover : '#000000'}
          emissiveIntensity={selected ? 0.45 : 1}
        />
      </mesh>
      {selected && (
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[radius * 1.16, 48, 32]} />
          <meshBasicMaterial color={SCENE.accent} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
