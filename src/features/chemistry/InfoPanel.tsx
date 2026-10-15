import { ExternalLink, Info } from 'lucide-react'
import { BALL_AND_STICK_SCALE, ELEMENTS } from '../../data/chemistry/elements'
import type { Molecule, Representation } from '../../data/chemistry/types'
import { bondedNeighbors, bondOrderName, composition } from '../../lib/chemistry'
import { AtomPicker } from './AtomPicker'
import { Formula } from './Formula'

interface Props {
  molecule: Molecule
  representation: Representation
  selectedAtomId: string | null
  onSelectAtom: (id: string | null) => void
}

export function InfoPanel({ molecule, representation, selectedAtomId, onSelectAtom }: Props) {
  const rows = composition(molecule)
  const total = molecule.atoms.length

  return (
    <section className="panel info" aria-labelledby="molecule-heading">
      <header className="info-header">
        <p className="eyebrow">Molecule</p>
        <h2 id="molecule-heading" className="info-title">
          {molecule.name}
        </h2>
        <Formula formula={molecule.formula} className="info-formula" />
        <p className="info-summary">{molecule.summary}</p>
      </header>

      <div className="info-section">
        <h3 className="section-title">Composition</h3>
        <table className="data-table">
          <caption className="visually-hidden">Atoms in {molecule.name} by element</caption>
          <thead>
            <tr>
              <th scope="col">Element</th>
              <th scope="col">Symbol</th>
              <th scope="col" className="num">
                Atoms
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ element, count }) => (
              <tr key={element.symbol}>
                <td>
                  <span className="swatch" style={{ background: element.color }} aria-hidden="true" />
                  {element.name}
                </td>
                <td>{element.symbol}</td>
                <td className="num">{count}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td className="num">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="info-section">
        <h3 className="section-title">Atoms</h3>
        <AtomPicker molecule={molecule} selectedAtomId={selectedAtomId} onSelectAtom={onSelectAtom} />
        <SelectedAtom molecule={molecule} atomId={selectedAtomId} representation={representation} />
      </div>

      <div className="info-section">
        <h3 className="section-title">Molecular shape</h3>
        <dl className="stats">
          <div>
            <dt>Shape</dt>
            <dd>{molecule.geometry.shape}</dd>
          </div>
          <div>
            <dt>Bond angle</dt>
            <dd>{formatAngle(molecule.geometry.bondAngleDeg)}</dd>
          </div>
          <div>
            <dt>{molecule.geometry.bondLabel} length</dt>
            <dd>{molecule.geometry.bondLengthAngstrom.toFixed(3)} Å</dd>
          </div>
        </dl>
        <p className="prose">{molecule.shapeExplanation}</p>
      </div>

      <aside className="callout" aria-label="About this model">
        <Info size={16} aria-hidden="true" className="callout-icon" />
        <div>
          <p>
            <strong>Simplified model.</strong> Atom positions use experimental bond lengths and angles. Real
            molecules vibrate, and electrons form clouds rather than hard spheres; lone pairs and charges are
            not shown.
          </p>
          <p>
            {representation === 'ball-and-stick'
              ? `Ball-and-stick sizes are schematic: each sphere is ${Math.round(BALL_AND_STICK_SCALE * 100)}% of the element's van der Waals radius so the bonds stay visible. They are not physical atom sizes.`
              : 'Space-filling spheres use approximate van der Waals radii (Bondi, 1964). These describe how closely molecules pack, not a sharp atomic boundary.'}
          </p>
        </div>
      </aside>

      <div className="info-section">
        <h3 className="section-title">Sources</h3>
        <ul className="sources">
          {molecule.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
                <ExternalLink size={12} aria-hidden="true" className="external-icon" />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="source-use">{s.usedFor}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function formatAngle(deg: number): string {
  return Number.isInteger(deg) ? `${deg}°` : `${deg.toFixed(2)}°`
}

function SelectedAtom({
  molecule,
  atomId,
  representation,
}: {
  molecule: Molecule
  atomId: string | null
  representation: Representation
}) {
  const atom = atomId ? molecule.atoms.find((a) => a.id === atomId) : undefined
  if (!atom) {
    return <p className="muted hint">Select an atom here or click one in the 3D view.</p>
  }
  const element = ELEMENTS[atom.element]
  const neighbors = bondedNeighbors(molecule, atom.id)

  return (
    <div className="atom-detail" aria-live="polite">
      <div className="atom-detail-head">
        <span className="element-tile" style={{ borderColor: element.color }}>
          <span className="element-number">{element.atomicNumber}</span>
          <span className="element-symbol">{element.symbol}</span>
        </span>
        <div>
          <p className="atom-detail-name">{element.name}</p>
          <p className="muted">
            Atom {atom.label} · symbol {element.symbol} · atomic number {element.atomicNumber}
          </p>
        </div>
      </div>
      <dl className="stats compact">
        <div>
          <dt>Bonded to</dt>
          <dd>
            {neighbors.length
              ? neighbors.map((n) => `${n.atom.label} (${bondOrderName(n.order)})`).join(', ')
              : 'None'}
          </dd>
        </div>
        <div>
          <dt>Van der Waals radius</dt>
          <dd>
            {element.vdwRadius.toFixed(2)} Å <span className="muted">(approx.)</span>
          </dd>
        </div>
      </dl>
      {representation === 'ball-and-stick' && (
        <p className="muted small">Sphere size in this view is schematic.</p>
      )}
    </div>
  )
}
