import { Check } from 'lucide-react'
import { ELEMENTS } from '../../data/chemistry/elements'
import type { Molecule } from '../../data/chemistry/types'

interface Props {
  molecule: Molecule
  /** Selected atom IDs. In ordered mode their position is shown as 1, 2, 3. */
  selectedIds: readonly string[]
  ordered: boolean
  onPick: (id: string) => void
  label: string
}

/**
 * Keyboard- and screen-reader-friendly alternative to clicking atoms in 3D.
 * Selection is shown with a check mark or order number, not by color alone.
 */
export function AtomPicker({ molecule, selectedIds, ordered, onPick, label }: Props) {
  return (
    <div className="atom-picker" role="group" aria-label={label}>
      {molecule.atoms.map((atom) => {
        const element = ELEMENTS[atom.element]
        const index = selectedIds.indexOf(atom.id)
        const selected = index >= 0
        return (
          <button
            key={atom.id}
            type="button"
            className={`chip${selected ? (ordered ? ' is-measured' : ' is-selected') : ''}`}
            aria-pressed={selected}
            aria-label={`${element.name} ${atom.id}${selected && ordered ? `, selection ${index + 1}` : ''}`}
            onClick={() => onPick(atom.id)}
          >
            {selected ? (
              ordered ? (
                <span className="chip-order" aria-hidden="true">
                  {index + 1}
                </span>
              ) : (
                <Check size={13} className="chip-check" aria-hidden="true" />
              )
            ) : (
              <span className="swatch" style={{ background: element.color }} aria-hidden="true" />
            )}
            {atom.id}
          </button>
        )
      })}
    </div>
  )
}
