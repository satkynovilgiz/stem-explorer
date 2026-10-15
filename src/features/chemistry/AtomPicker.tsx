import { ELEMENTS } from '../../data/chemistry/elements'
import type { Molecule } from '../../data/chemistry/types'

interface Props {
  molecule: Molecule
  selectedAtomId: string | null
  onSelectAtom: (id: string | null) => void
}

/** Keyboard- and screen-reader-friendly alternative to clicking atoms in 3D. */
export function AtomPicker({ molecule, selectedAtomId, onSelectAtom }: Props) {
  return (
    <div className="atom-picker" role="group" aria-label={`Select an atom in ${molecule.name}`}>
      {molecule.atoms.map((atom) => {
        const element = ELEMENTS[atom.element]
        const selected = atom.id === selectedAtomId
        return (
          <button
            key={atom.id}
            type="button"
            className={`chip${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            aria-label={`${element.name} atom ${atom.label}`}
            onClick={() => onSelectAtom(selected ? null : atom.id)}
          >
            <span className="swatch" style={{ background: element.color }} aria-hidden="true" />
            {atom.label}
          </button>
        )
      })}
    </div>
  )
}
