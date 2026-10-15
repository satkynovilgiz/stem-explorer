import type { ThreeEvent } from '@react-three/fiber'
import { ELEMENTS } from '../../../data/chemistry/elements'
import type { Atom } from '../../../data/chemistry/types'
import { SCENE } from './sceneTheme'

export type AtomHighlight = 'inspect' | 'measure' | null

interface Props {
  atom: Atom
  radius: number
  highlight: AtomHighlight
  hovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const noRaycast = () => null

export function AtomMesh({ atom, radius, highlight, hovered, onSelect, onHover }: Props) {
  const element = ELEMENTS[atom.element]
  const ringColor = highlight === 'measure' ? SCENE.measure : SCENE.accent

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
          emissive={highlight ? ringColor : hovered ? SCENE.hover : '#000000'}
          // A light tint keeps the element color recognizable; the halo and label carry the selection.
          emissiveIntensity={highlight ? 0.14 : 1}
        />
      </mesh>
      {highlight && (
        <mesh raycast={noRaycast}>
          <sphereGeometry args={[radius * 1.18, 48, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.32} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
