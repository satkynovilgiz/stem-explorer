import { useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { DIVISION_STAGES, ILLUSTRATIVE_CHROMOSOMES, NOT_GAMETES, type DivisionStage } from '../../../data/biology/mitosis'
import { SourceLinks } from '../../guide/SourceLinks'
import { StepNav } from './StepNav'

/* Two homologous pairs: colours tell the pairs apart, and pair members differ in length. */
const CHROMOSOMES = [
  { len: 30, color: '#e8837e' },
  { len: 30, color: '#f0aaa6' },
  { len: 20, color: '#8db4ff' },
  { len: 20, color: '#b9d0ff' },
]

function Chromosome({ x, y, len, color, chromatids, condensed }: { x: number; y: number; len: number; color: string; chromatids: 1 | 2; condensed: boolean }) {
  const w = condensed ? 6 : 3
  const offsets = chromatids === 2 ? [-w / 1.4, w / 1.4] : [0]
  return (
    <g>
      {offsets.map((o, i) => (
        <rect key={i} x={x + o - w / 2} y={y - len / 2} width={w} height={len} rx={w / 2} fill={color} opacity={condensed ? 1 : 0.7} />
      ))}
      {chromatids === 2 && <circle cx={x} cy={y} r={2.6} className="centromere" />}
    </g>
  )
}

function StageDrawing({ stage }: { stage: DivisionStage }) {
  const d = stage.draw
  const condensed = d.arrangement !== 'loose'
  const cx = 160
  const cy = 95
  const positions = (): { x: number; y: number }[][] => {
    switch (d.arrangement) {
      case 'aligned':
        return CHROMOSOMES.map((_, i) => [{ x: cx, y: 45 + i * 34 }])
      case 'separating':
        return CHROMOSOMES.map((_, i) => [
          { x: cx - 48, y: 45 + i * 34 },
          { x: cx + 48, y: 45 + i * 34 },
        ])
      case 'poles':
        return CHROMOSOMES.map((_, i) => [
          { x: cx - 95 + (i % 2) * 14, y: 60 + Math.floor(i / 2) * 50 },
          { x: cx + 95 - (i % 2) * 14, y: 60 + Math.floor(i / 2) * 50 },
        ])
      default:
        return CHROMOSOMES.map((_, i) => [{ x: cx - 40 + i * 26, y: cy + (i % 2 ? 14 : -14) }])
    }
  }
  const pos = positions()
  return (
    <svg className="division-svg" viewBox="0 0 320 190" role="img" aria-label={`Schematic of ${stage.name}: ${stage.chromosomes}`}>
      {d.cells === 2 ? (
        <>
          <ellipse cx={85} cy={cy} rx={70} ry={78} className="div-cell" />
          <ellipse cx={235} cy={cy} rx={70} ry={78} className="div-cell" />
          <circle cx={85} cy={cy} r={34} className="div-nucleus" />
          <circle cx={235} cy={cy} r={34} className="div-nucleus" />
        </>
      ) : (
        <>
          <ellipse cx={cx} cy={cy} rx={stage.id === 'telophase' ? 150 : 140} ry={84} className="div-cell" />
          {d.nuclearEnvelope === 'intact' && <circle cx={cx} cy={cy} r={58} className="div-nucleus" />}
          {d.nuclearEnvelope === 'breaking' && <circle cx={cx} cy={cy} r={58} className="div-nucleus is-breaking" />}
          {d.nuclearEnvelope === 'reforming' && (
            <>
              <circle cx={cx - 88} cy={cy} r={38} className="div-nucleus is-breaking" />
              <circle cx={cx + 88} cy={cy} r={38} className="div-nucleus is-breaking" />
            </>
          )}
          {d.spindle &&
            [-60, -30, 0, 30, 60].map((dy) => (
              <g key={dy}>
                <line x1={cx - 120} y1={cy} x2={cx} y2={cy + dy} className="div-spindle" />
                <line x1={cx + 120} y1={cy} x2={cx} y2={cy + dy} className="div-spindle" />
              </g>
            ))}
          {d.spindle && (
            <>
              <circle cx={cx - 120} cy={cy} r={5} className="div-centrosome" />
              <circle cx={cx + 120} cy={cy} r={5} className="div-centrosome" />
            </>
          )}
        </>
      )}
      {d.cells === 2
        ? CHROMOSOMES.flatMap((c, i) => [
            <Chromosome key={`a${i}`} x={67 + i * 12} y={cy} len={c.len * 0.8} color={c.color} chromatids={1} condensed={false} />,
            <Chromosome key={`b${i}`} x={217 + i * 12} y={cy} len={c.len * 0.8} color={c.color} chromatids={1} condensed={false} />,
          ])
        : CHROMOSOMES.flatMap((c, i) => pos[i].map((p, k) => <Chromosome key={`${i}-${k}`} x={p.x} y={p.y} len={c.len} color={c.color} chromatids={d.chromatids} condensed={condensed} />))}
      {stage.id === 'metaphase' && <line x1={cx} y1={18} x2={cx} y2={172} className="div-plate" />}
    </svg>
  )
}

export function DivisionView() {
  const [i, setI] = useState(1)
  const stage = DIVISION_STAGES[i]
  return (
    <section className="panel process-view" aria-labelledby="division-heading">
      <h2 id="division-heading" className="panel-title">
        Cell division: mitosis
      </h2>
      <StepNav steps={DIVISION_STAGES.map((s) => ({ title: s.name, text: s.summary, sources: s.sources }))} index={i} onChange={setI} label="Cell division stages" />
      <p className={`stage-kind is-${stage.kind}`}>{stage.kind === 'mitosis' ? 'Part of mitosis (nuclear division)' : stage.kind === 'interphase' ? 'Not part of mitosis: interphase' : 'Not part of mitosis: cytokinesis divides the cytoplasm'}</p>
      <StageDrawing stage={stage} />
      <p className="small">
        <strong>Chromosomes:</strong> {stage.chromosomes}
      </p>
      <p className="muted small">
        Illustrative cell with {ILLUSTRATIVE_CHROMOSOMES} chromosomes (two homologous pairs, told apart by colour and length). Real cells have other numbers — human body
        cells have 46. The drawing is schematic; the stages blend into one another in a real cell.
      </p>
    </section>
  )
}

export function DivisionPanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="division-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="division-panel-heading" className="info-title">
          Mitosis and cytokinesis
        </h2>
        <p className="info-summary">Mitosis divides the nucleus in five stages; cytokinesis, a separate process, then usually divides the cytoplasm.</p>
      </header>
      <div className="info-body">
        <ol className="guide-list small">
          {DIVISION_STAGES.map((s) => (
            <li key={s.id}>
              <strong>{s.name}.</strong> {s.summary}
            </li>
          ))}
        </ol>
        <details className="small">
          <summary>Go deeper</summary>
          <ul className="guide-list">
            {DIVISION_STAGES.map((s) => (
              <li key={s.id}>
                <strong>{s.name}.</strong> {s.deeper}
              </li>
            ))}
          </ul>
        </details>
        <p className="note-block small">
          {NOT_GAMETES}
          <SourceLinks ids={['bio-10-2', 'bio-11-1']} />
        </p>
        <p className="muted small">
          <SourceLinks ids={['bio-10-1', 'bio-10-2']} />
        </p>
        <ShareActions subject="biology" params={shareParams} restores="the cell-division section" />
      </div>
    </section>
  )
}
