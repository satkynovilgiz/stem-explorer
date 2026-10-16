import { ExternalLink, FlaskConical, Info } from 'lucide-react'
import { useState } from 'react'
import { ShareActions } from '../../components/ShareActions'
import { Tabs } from '../../components/Tabs'
import { BALL_AND_STICK_SCALE, ELEMENTS } from '../../data/chemistry/elements'
import type { GeometryKind, Molecule, Representation } from '../../data/chemistry/types'
import { bondedNeighbors, bondOrderName, composition } from '../../lib/chemistry'
import type { InteractionMode } from '../../lib/measurement'
import { AtomPicker } from './AtomPicker'
import { Formula } from './Formula'

interface Props {
  molecule: Molecule
  representation: Representation
  mode: InteractionMode
  inspectedAtomId: string | null
  onPickAtom: (id: string) => void
}

type InfoTab = 'overview' | 'structure' | 'sources'

const KIND_LABEL: Record<GeometryKind, string> = {
  experimental: 'Experimental',
  computed: 'Computed',
  illustrative: 'Illustrative',
}

export function InfoPanel({ molecule, representation, mode, inspectedAtomId, onPickAtom }: Props) {
  const [tab, setTab] = useState<InfoTab>('overview')

  return (
    <section className="panel info" aria-labelledby="molecule-heading">
      <header className="info-header">
        <p className="eyebrow">Molecule</p>
        <h2 id="molecule-heading" className="info-title">
          {molecule.name}
        </h2>
        <Formula formula={molecule.formula} className="info-formula" />
        <p className="info-summary">{molecule.summary}</p>
        <ShareActions subject="chemistry" params={{ molecule: molecule.id, view: representation }} restores="this molecule and display mode" />
      </header>

      <Tabs
        label={`${molecule.name} information`}
        className="info-tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <Overview
                molecule={molecule}
                representation={representation}
                mode={mode}
                inspectedAtomId={inspectedAtomId}
                onPickAtom={onPickAtom}
              />
            ),
          },
          { id: 'structure', label: 'Structure', content: <Structure molecule={molecule} representation={representation} /> },
          { id: 'sources', label: 'Sources', content: <Sources molecule={molecule} /> },
        ]}
      />
    </section>
  )
}

function Overview({ molecule, representation, mode, inspectedAtomId, onPickAtom }: Props) {
  const rows = composition(molecule)
  return (
    <div className="info-body">
      <div className="info-section">
        <h3 className="section-title">Composition</h3>
        <table className="data-table">
          <caption className="visually-hidden">Atoms in {molecule.name} by element</caption>
          <thead>
            <tr>
              <th scope="col">Element (model color)</th>
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
              <td className="num">{molecule.atoms.length}</td>
            </tr>
          </tfoot>
        </table>
        <p className="muted small table-note">Colors follow the CPK convention. They are a labelling aid, not a property of the atoms.</p>
      </div>

      <div className="info-section">
        <h3 className="section-title">Atoms</h3>
        {mode === 'inspect' ? (
          <>
            <AtomPicker
              molecule={molecule}
              selectedIds={inspectedAtomId ? [inspectedAtomId] : []}
              ordered={false}
              onPick={onPickAtom}
              label={`Select an atom in ${molecule.name}`}
            />
            <SelectedAtom molecule={molecule} atomId={inspectedAtomId} representation={representation} />
          </>
        ) : (
          <p className="muted hint">
            Measurement mode is active. Choose atoms in the measurement panel under the 3D view.
          </p>
        )}
      </div>

      <div className="info-section">
        <h3 className="section-title">Shape</h3>
        <ul className="centers">
          {molecule.centers.map((c) => (
            <li key={c.atomId}>
              <span className="center-shape">{c.shape}</span>
              <span className="center-atom">around {c.atomId}</span>
              <span className="center-desc">{c.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Structure({ molecule, representation }: { molecule: Molecule; representation: Representation }) {
  return (
    <div className="info-body">
      <div className="info-section">
        <h3 className="section-title">Reported geometry</h3>
        <table className="data-table">
          <caption className="visually-hidden">Bond lengths and angles reported by the source</caption>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col" className="num">
                Value
              </th>
              <th scope="col" className="num">
                Type
              </th>
            </tr>
          </thead>
          <tbody>
            {molecule.parameters.map((p) => (
              <tr key={p.label}>
                <td>{p.label}</td>
                <td className="num">{p.unit === '°' ? `${p.value}°` : `${p.value} ${p.unit}`}</td>
                <td className="num">
                  <span className={`kind-tag kind-${p.kind}`}>{KIND_LABEL[p.kind]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small table-note">
          Values as reported by the source. Use the Distance and Angle tools to measure any pair or triple of atoms
          in the model.
        </p>
      </div>

      <div className="info-section">
        <h3 className="section-title">Why this shape?</h3>
        <p className="prose">{molecule.shapeExplanation}</p>
        {molecule.notes.map((n) => (
          <div key={n.title} className="note">
            <p className="note-title">{n.title}</p>
            <p className="prose">{n.body}</p>
          </div>
        ))}
      </div>

      <div className="info-section">
        <h3 className="section-title">Model vs. measurement</h3>
        <dl className="conventions">
          <div>
            <dt>
              <FlaskConical size={14} aria-hidden="true" /> Measured data
            </dt>
            <dd>
              Atom positions: <span className={`kind-tag kind-${molecule.coordinates.kind}`}>{KIND_LABEL[molecule.coordinates.kind]}</span>{' '}
              coordinates in ångströms (Å). {molecule.coordinates.note}
            </dd>
          </div>
          <div>
            <dt>
              <Info size={14} aria-hidden="true" /> Visual conventions
            </dt>
            <dd>
              {representation === 'ball-and-stick'
                ? `Sphere sizes are schematic (${Math.round(BALL_AND_STICK_SCALE * 100)}% of the van der Waals radius) so bonds stay visible. `
                : 'Sphere sizes are approximate van der Waals radii (Bondi, 1964): how closely molecules pack, not a sharp atomic edge. '}
              Colors, stick thickness and the default viewing angle are drawing choices.
            </dd>
          </div>
        </dl>
        <h4 className="subsection-title">Limitations</h4>
        <ul className="limitations">
          {molecule.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Sources({ molecule }: { molecule: Molecule }) {
  return (
    <div className="info-body">
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
  )
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
    <div className="atom-detail">
      <div className="atom-detail-head">
        <span className="element-tile" style={{ borderColor: element.color }}>
          <span className="element-number">{element.atomicNumber}</span>
          <span className="element-symbol">{element.symbol}</span>
        </span>
        <div>
          <p className="atom-detail-name">
            {element.name} <span className="atom-detail-id">{atom.id}</span>
          </p>
          <p className="muted">
            Symbol {element.symbol} · atomic number {element.atomicNumber}
          </p>
        </div>
      </div>
      <dl className="stats compact">
        <div>
          <dt>Bonded to</dt>
          <dd>
            {neighbors.length
              ? neighbors.map((n) => `${n.atom.id} (${bondOrderName(n.order)})`).join(', ')
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
      {representation === 'ball-and-stick' && <p className="muted small">Sphere size in this view is schematic.</p>}
    </div>
  )
}
