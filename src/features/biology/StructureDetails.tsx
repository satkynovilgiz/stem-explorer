import { Compass, ExternalLink, EyeOff, Info } from 'lucide-react'
import { useState } from 'react'
import { ShareActions } from '../../components/ShareActions'
import { Tabs } from '../../components/Tabs'
import {
  BIOLOGY_SOURCES,
  CELL_DISCLAIMER,
  COLOR_NOTE,
  findOrganelle,
  INSTANCE_COUNTS,
} from '../../data/biology/organelles'
import type { CellView, Organelle, OrganelleId } from '../../data/biology/types'
import type { BiologySelection } from './state'

interface Props {
  selection: BiologySelection | null
  view: CellView
  onSelect: (id: OrganelleId, instance?: number | null) => void
  onClear: () => void
}

type DetailTab = 'overview' | 'structure' | 'sources'

export function StructureDetails({ selection, view, onSelect, onClear }: Props) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const organelle = selection ? findOrganelle(selection.organelleId) : undefined
  const copyLink = (
    <ShareActions
      subject="biology"
      params={{ ...(selection ? { structure: selection.organelleId } : {}), cell: view }}
      restores={organelle ? `this structure (${organelle.name}) and view` : 'this view'}
    />
  )

  if (!selection || !organelle) {
    return (
      <section className="panel info" aria-labelledby="cell-heading">
        <header className="info-header">
          <p className="eyebrow">Biology</p>
          <h2 id="cell-heading" className="info-title">
            Animal cell
          </h2>
          <p className="info-summary">Explore the main structures of a generalized animal cell.</p>
        </header>
        <div className="info-body">
          <div className="info-section">
            <h3 className="section-title">How to explore</h3>
            <ol className="orientation">
              <li>
                <Compass size={15} aria-hidden="true" /> Drag to rotate and scroll or pinch to zoom.
              </li>
              <li>Choose <strong>Cutaway</strong> to look inside the membrane.</li>
              <li>Click a structure in the model, or pick one from the list.</li>
              <li>Use <strong>Focus</strong> to move closer and <strong>Isolate</strong> to show it alone.</li>
            </ol>
          </div>
          <Disclaimer />
          {copyLink}
        </div>
      </section>
    )
  }

  const count = INSTANCE_COUNTS[organelle.id]
  const hiddenInView = view === 'whole' && organelle.internal

  return (
    <section className="panel info" aria-labelledby="structure-heading">
      <header className="info-header">
        <p className="eyebrow">Selected structure</p>
        <h2 id="structure-heading" className="info-title">
          {organelle.name}
        </h2>
        <p className="info-summary">{organelle.summary}</p>
        {count && (
          <InstancePicker organelle={organelle} count={count} instance={selection.instance} onSelect={onSelect} />
        )}
        {hiddenInView && (
          <p className="inline-note">
            <EyeOff size={14} aria-hidden="true" /> Inside the cell — switch to Cutaway to see it.
          </p>
        )}
        <div className="header-actions">
          {copyLink}
          <button type="button" className="tool-button bordered" onClick={onClear}>
            Clear selection
          </button>
        </div>
      </header>

      <Tabs
        label={`${organelle.name} information`}
        className="info-tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview', content: <Overview organelle={organelle} /> },
          {
            id: 'structure',
            label: 'Structure & relationships',
            content: <StructureTab organelle={organelle} onSelect={onSelect} />,
          },
          { id: 'sources', label: 'Sources', content: <SourcesTab organelle={organelle} /> },
        ]}
      />
    </section>
  )
}

function InstancePicker({
  organelle,
  count,
  instance,
  onSelect,
}: {
  organelle: Organelle
  count: number
  instance: number | null
  onSelect: Props['onSelect']
}) {
  return (
    <div className="instance-picker">
      <p className="instance-note">
        {instance === null
          ? `All ${count} ${organelle.name.toLowerCase()} in this model are highlighted. They share one description.`
          : `${organelle.instanceName} ${instance + 1} of ${count} is selected. The description applies to all ${organelle.name.toLowerCase()}.`}
      </p>
      <div className="atom-picker" role="group" aria-label={`Choose one ${organelle.instanceName?.toLowerCase()}`}>
        <button
          type="button"
          className={`chip${instance === null ? ' is-selected' : ''}`}
          aria-pressed={instance === null}
          onClick={() => onSelect(organelle.id, null)}
        >
          All
        </button>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`chip${instance === i ? ' is-selected' : ''}`}
            aria-pressed={instance === i}
            aria-label={`${organelle.instanceName} ${i + 1}`}
            onClick={() => onSelect(organelle.id, i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

function Overview({ organelle }: { organelle: Organelle }) {
  return (
    <div className="info-body">
      <div className="info-section">
        <h3 className="section-title">Main functions</h3>
        <ul className="bullets">
          {organelle.functions.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      {organelle.glossary.length > 0 && (
        <div className="info-section">
          <h3 className="section-title">Key terms</h3>
          <dl className="glossary">
            {organelle.glossary.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

function StructureTab({ organelle, onSelect }: { organelle: Organelle; onSelect: Props['onSelect'] }) {
  return (
    <div className="info-body">
      <div className="info-section">
        <h3 className="section-title">Structure</h3>
        <p className="prose">{organelle.structure}</p>
      </div>
      {organelle.relationships.length > 0 && (
        <div className="info-section">
          <h3 className="section-title">Related structures</h3>
          <ul className="relations">
            {organelle.relationships.map((r) => (
              <li key={r.targetId + r.text}>
                <button type="button" className="relation-link" onClick={() => onSelect(r.targetId)}>
                  {findOrganelle(r.targetId)?.name}
                </button>
                <span className="relation-text">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="info-section">
        <h3 className="section-title">In this model</h3>
        <ul className="limitations">
          {organelle.simplifications.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SourcesTab({ organelle }: { organelle: Organelle }) {
  return (
    <div className="info-body">
      <ul className="sources">
        {organelle.sourceIds.map((id) => {
          const s = BIOLOGY_SOURCES[id]
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
                <ExternalLink size={12} aria-hidden="true" className="external-icon" />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          )
        })}
      </ul>
      <p className="muted small">Text is paraphrased from these OpenStax pages (CC BY 4.0).</p>
      <Disclaimer />
    </div>
  )
}

function Disclaimer() {
  return (
    <div className="note">
      <p className="note-title">
        <Info size={14} aria-hidden="true" /> About this model
      </p>
      <p className="prose">{CELL_DISCLAIMER}</p>
      <p className="prose">{COLOR_NOTE}</p>
    </div>
  )
}
