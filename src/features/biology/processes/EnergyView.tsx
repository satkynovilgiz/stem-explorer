import { useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { CONNECTION, ENERGY_PROCESSES, type ProcessStage } from '../../../data/biology/energy'
import type { CellType, OrganelleId } from '../../../data/biology/types'
import { SourceLinks } from '../../guide/SourceLinks'

export function EnergyView({ onOpenStructure }: { onOpenStructure: (cellType: CellType, id: OrganelleId) => void }) {
  const all = ENERGY_PROCESSES.flatMap((p) => p.stages.map((s) => ({ process: p, stage: s })))
  const [current, setCurrent] = useState(0)
  const { process, stage } = all[current]
  return (
    <section className="panel process-view" aria-labelledby="energy-heading">
      <h2 id="energy-heading" className="panel-title">
        Energy processes
      </h2>
      <div className="energy-grid">
        {ENERGY_PROCESSES.map((p) => (
          <div key={p.id} className="energy-col">
            <h3 className="section-title">{p.name}</h3>
            <div className="net-equation">
              <p className="eyebrow">Simplified net equation</p>
              <p className="equation">
                {p.netEquation.reactants} → {p.netEquation.products}
              </p>
              <p className="muted small">
                {p.netEquation.note}
                <SourceLinks ids={p.netEquation.sources} />
              </p>
            </div>
            <p className="eyebrow">Pathway stages (where they happen)</p>
            <ol className="stage-list">
              {p.stages.map((s: ProcessStage) => {
                const index = all.findIndex((x) => x.stage === s)
                return (
                  <li key={s.id}>
                    <button type="button" className={`stage-button${index === current ? ' is-active' : ''}`} aria-pressed={index === current} onClick={() => setCurrent(index)}>
                      <span className="stage-name">{s.name}</span>
                      <span className="stage-where">{s.location}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
      <section className="info-section" aria-live="polite">
        <p className="eyebrow">
          {process.name} · stage {process.stages.indexOf(stage) + 1} of {process.stages.length}
        </p>
        <h3 className="tour-title">{stage.name}</h3>
        <p className="small">
          <strong>Where:</strong> {stage.location}
        </p>
        <p className="prose">
          {stage.summary}
          <SourceLinks ids={stage.sources} />
        </p>
        <details className="small">
          <summary>Go deeper</summary>
          <p>{stage.deeper}</p>
        </details>
        <div className="share-row">
          <button type="button" className="tool-button bordered" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
            Previous stage
          </button>
          <button type="button" className="tool-button bordered" disabled={current === all.length - 1} onClick={() => setCurrent(current + 1)}>
            Next stage
          </button>
          {stage.link && (
            <button type="button" className="button" onClick={() => onOpenStructure(stage.link!.cellType, stage.link!.organelle)}>
              Show the {stage.link.label.toLowerCase()}
            </button>
          )}
        </div>
      </section>
      <p className="note-block small">{CONNECTION}</p>
    </section>
  )
}

export function EnergyPanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="energy-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="energy-panel-heading" className="info-title">
          Photosynthesis and respiration
        </h2>
        <p className="info-summary">Two connected overviews. The net equations summarize the overall change; the stages show where the pathway runs in the cell.</p>
      </header>
      <div className="info-body">
        <p className="small">
          The net equations are deliberately simple; the pathways have many enzyme-catalysed steps, which this section summarizes in stages rather than listing. No ATP yields
          are given here.
        </p>
        <p className="muted small">
          <SourceLinks ids={['cob-4-1', 'bio-7-2', 'bio-7-3', 'bio-7-4', 'bio-8-1', 'bio-8-3']} />
        </p>
        <ShareActions subject="biology" params={shareParams} restores="the energy-processes section" />
      </div>
    </section>
  )
}
