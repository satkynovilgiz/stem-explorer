import { useCursor } from '@react-three/drei'
import { useState } from 'react'
import { atomRadius } from '../../../data/chemistry/elements'
import type { Molecule, Representation } from '../../../data/chemistry/types'
import { AtomMesh } from './AtomMesh'
import { BondMesh } from './BondMesh'

interface Props {
  molecule: Molecule
  representation: Representation
  selectedAtomId: string | null
  onSelectAtom: (id: string) => void
}

export function MoleculeModel({ molecule, representation, selectedAtomId, onSelectAtom }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  useCursor(hoveredId !== null)

  const atomsById = new Map(molecule.atoms.map((a) => [a.id, a]))

  return (
    <group>
      {molecule.atoms.map((atom) => (
        <AtomMesh
          key={atom.id}
          atom={atom}
          radius={atomRadius(atom.element, representation)}
          selected={atom.id === selectedAtomId}
          hovered={atom.id === hoveredId}
          onSelect={onSelectAtom}
          onHover={setHoveredId}
        />
      ))}
      {representation === 'ball-and-stick' &&
        molecule.bonds.map((bond) => {
          const from = atomsById.get(bond.atoms[0])
          const to = atomsById.get(bond.atoms[1])
          return from && to ? <BondMesh key={bond.id} from={from} to={to} order={bond.order} /> : null
        })}
    </group>
  )
}
