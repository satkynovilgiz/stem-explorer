import { useCursor } from '@react-three/drei'
import { useMemo, useState } from 'react'
import { Vector3 } from 'three'
import { atomRadius } from '../../../data/chemistry/elements'
import type { Molecule, Representation } from '../../../data/chemistry/types'
import { centroid } from '../../../lib/chemistry'
import { AtomMesh, type AtomHighlight } from './AtomMesh'
import { BondMesh } from './BondMesh'

interface Props {
  molecule: Molecule
  representation: Representation
  highlights: ReadonlyMap<string, Exclude<AtomHighlight, null>>
  onPickAtom: (id: string) => void
}

/** Atoms and bonds drawn in source coordinates (Å); the parent group handles the display transform. */
export function MoleculeModel({ molecule, representation, highlights, onPickAtom }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  useCursor(hoveredId !== null)

  const atomsById = useMemo(() => new Map(molecule.atoms.map((a) => [a.id, a])), [molecule])
  const center = useMemo(() => new Vector3(...centroid(molecule)), [molecule])

  return (
    <group>
      {molecule.atoms.map((atom) => (
        <AtomMesh
          key={atom.id}
          atom={atom}
          radius={atomRadius(atom.element, representation)}
          highlight={highlights.get(atom.id) ?? null}
          hovered={atom.id === hoveredId}
          onSelect={onPickAtom}
          onHover={setHoveredId}
        />
      ))}
      {representation === 'ball-and-stick' &&
        molecule.bonds.map((bond) => {
          const from = atomsById.get(bond.atoms[0])
          const to = atomsById.get(bond.atoms[1])
          return from && to ? (
            <BondMesh key={bond.id} from={from} to={to} order={bond.order} center={center} />
          ) : null
        })}
    </group>
  )
}
