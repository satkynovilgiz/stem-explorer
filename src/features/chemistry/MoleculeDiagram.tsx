import { ELEMENTS } from '../../data/chemistry/elements'
import { STRUCTURE_KINDS } from '../../data/chemistry/structureKinds'
import type { Molecule } from '../../data/chemistry/types'

/** Which two of the three axes show the most of the molecule: the flattest view is dropped. */
function flatten(molecule: Molecule): { id: string; element: Molecule['atoms'][number]['element']; x: number; y: number }[] {
  const spread = [0, 1, 2].map((axis) => {
    const values = molecule.atoms.map((a) => a.position[axis])
    return Math.max(...values) - Math.min(...values)
  })
  const drop = spread.indexOf(Math.min(...spread))
  const [u, v] = [0, 1, 2].filter((axis) => axis !== drop)
  return molecule.atoms.map((a) => ({ id: a.id, element: a.element, x: a.position[u], y: -a.position[v] }))
}

/**
 * The molecule as a flat drawing from its own coordinates, for when the 3D view is unavailable.
 * A flat view can shorten bonds and angles that are not in its plane, so it says so and lists the
 * reported values instead of implying they can be read from the picture.
 */
export function MoleculeDiagram({ molecule }: { molecule: Molecule }) {
  const atoms = flatten(molecule)
  const xs = atoms.map((a) => a.x)
  const ys = atoms.map((a) => a.y)
  const pad = 0.8
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad]
  const at = new Map(atoms.map((a) => [a.id, a]))
  const composition = molecule.atoms.length === 1 ? 'one atom' : `${molecule.atoms.length} atoms and ${molecule.bonds.length} bonds`
  return (
    <figure className="mol-diagram">
      <svg viewBox={box.join(' ')} role="img" aria-label={`Flat drawing of ${molecule.name}: ${composition}.`} focusable="false">
        {molecule.bonds.map((b) => {
          const [p, q] = [at.get(b.atoms[0])!, at.get(b.atoms[1])!]
          return <line key={b.id} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="mol-diagram-bond" />
        })}
        {atoms.map((a) => (
          <g key={a.id}>
            <circle cx={a.x} cy={a.y} r={a.element === 'H' ? 0.2 : 0.3} fill={ELEMENTS[a.element].color} className="mol-diagram-atom" />
            <text x={a.x} y={a.y} dy="0.09" textAnchor="middle" className="mol-diagram-label">
              {a.element}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        <strong>{STRUCTURE_KINDS[molecule.coordinates.kind].tag}.</strong> A flat view of the 3D coordinates: bonds out of this plane look shorter than they are.
        {molecule.parameters.length > 0 && (
          <ul className="mol-diagram-values">
            {molecule.parameters.map((p) => (
              <li key={p.label}>
                {p.label}: {p.value} {p.unit}
              </li>
            ))}
          </ul>
        )}
      </figcaption>
    </figure>
  )
}
