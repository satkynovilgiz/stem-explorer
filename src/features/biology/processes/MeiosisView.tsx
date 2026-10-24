import { useMemo, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { COMPARISON, countsOf, meiosisStages, MEIOSIS_SCALE_NOTE, type CellState, type Chromosome, type MeiosisOptions, type MeiosisStage } from '../../../data/biology/meiosis'
import { SourceLinks } from '../../guide/SourceLinks'
import { StepNav } from './StepNav'

/* Origin is shown by colour and by the M/P letter on every chromosome; pairs differ in length. */
const ORIGIN_COLOR = { maternal: '#e8837e', paternal: '#8db4ff' } as const
const LENGTH = { A: 40, B: 24 } as const

function ChromosomeGlyph({ c, x, y, scale }: { c: Chromosome; x: number; y: number; scale: number }) {
  const len = LENGTH[c.pair] * scale
  const w = 5 * scale
  const offsets = c.chromatids.length === 2 ? [-w * 0.75, w * 0.75] : [0]
  const top = y - len / 2
  return (
    <g>
      {c.chromatids.map((t, i) =>
        t.segments.map((s, k) => (
          <rect
            key={`${i}-${k}`}
            x={x + offsets[i] - w / 2}
            y={top + s.from * len}
            width={w}
            height={(s.to - s.from) * len}
            rx={k === 0 || k === t.segments.length - 1 ? w / 2 : 0}
            fill={ORIGIN_COLOR[s.origin]}
          />
        )),
      )}
      {c.chromatids.length === 2 && <circle cx={x} cy={y} r={2.2 * scale} className="centromere" />}
      <text x={x} y={top + len + 9 * scale} textAnchor="middle" className="meiosis-label" fontSize={8 * scale}>
        {c.pair}
        {c.origin === 'maternal' ? 'M' : 'P'}
      </text>
    </g>
  )
}

interface CellBox {
  cx: number
  cy: number
  rx: number
  ry: number
  scale: number
}

const BOXES: Record<number, CellBox[]> = {
  1: [{ cx: 180, cy: 110, rx: 165, ry: 98, scale: 1.25 }],
  2: [
    { cx: 92, cy: 110, rx: 84, ry: 96, scale: 1 },
    { cx: 268, cy: 110, rx: 84, ry: 96, scale: 1 },
  ],
  4: [
    { cx: 92, cy: 58, rx: 82, ry: 50, scale: 0.8 },
    { cx: 268, cy: 58, rx: 82, ry: 50, scale: 0.8 },
    { cx: 92, cy: 164, rx: 82, ry: 50, scale: 0.8 },
    { cx: 268, cy: 164, rx: 82, ry: 50, scale: 0.8 },
  ],
}

/** Where each chromosome of a cell is drawn, by arrangement (positions are schematic). */
function layout(cell: CellState, box: CellBox): { c: Chromosome; x: number; y: number }[] {
  const { cx, cy, scale } = box
  const list = cell.chromosomes
  const byPair = (p: 'A' | 'B') => list.filter((c) => c.pair === p)
  switch (cell.arrangement) {
    case 'paired':
      // Homologs side by side (synapsis), pair A left, pair B right.
      return (['A', 'B'] as const).flatMap((p, k) => byPair(p).map((c, i) => ({ c, x: cx + (k === 0 ? -45 : 45) * scale + (i === 0 ? -9 : 9) * scale, y: cy })))
    case 'pairs-at-plate':
    case 'homologs-separating': {
      const gap = cell.arrangement === 'pairs-at-plate' ? 11 : 75
      // chromosomes = [pole1 A, pole1 B, pole2 A, pole2 B]
      return list.map((c, i) => ({ c, x: cx + (i < 2 ? -gap : gap) * scale, y: cy + (c.pair === 'A' ? -30 : 34) * scale }))
    }
    case 'at-plate':
      return list.map((c) => ({ c, x: cx, y: cy + (c.pair === 'A' ? -22 : 26) * scale }))
    case 'sisters-separating':
      return list.map((c) => ({ c, x: cx + (c.id.endsWith('.1') ? -48 : 48) * scale, y: cy + (c.pair === 'A' ? -22 : 26) * scale }))
    default:
      return list.map((c, i) => ({ c, x: cx + (i - (list.length - 1) / 2) * 30 * scale, y: cy }))
  }
}

const SPINDLE = new Set(['pairs-at-plate', 'homologs-separating', 'at-plate', 'sisters-separating'])

function MeiosisDrawing({ stage }: { stage: MeiosisStage }) {
  const boxes = BOXES[stage.cells.length]
  const counts = countsOf(stage)
  return (
    <svg className="division-svg meiosis-svg" viewBox="0 0 360 220" role="img" aria-label={`Schematic of ${stage.name}. ${counts.map((c, i) => `Cell ${i + 1}: ${c.chromosomes} chromosomes, ${c.chromatids} chromatids, ${c.ploidy}`).join('. ')}.`}>
      {stage.cells.map((cell, k) => {
        const b = boxes[k]
        return (
          <g key={k}>
            <ellipse cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} className="div-cell" />
            {SPINDLE.has(cell.arrangement) &&
              [-0.5, 0, 0.5].map((f) => (
                <g key={f}>
                  <line x1={b.cx - b.rx * 0.85} y1={b.cy} x2={b.cx} y2={b.cy + f * b.ry} className="div-spindle" />
                  <line x1={b.cx + b.rx * 0.85} y1={b.cy} x2={b.cx} y2={b.cy + f * b.ry} className="div-spindle" />
                </g>
              ))}
            {(cell.arrangement === 'pairs-at-plate' || cell.arrangement === 'at-plate') && <line x1={b.cx} y1={b.cy - b.ry * 0.85} x2={b.cx} y2={b.cy + b.ry * 0.85} className="div-plate" />}
            {layout(cell, b).map(({ c, x, y }) => (
              <ChromosomeGlyph key={c.id} c={c} x={x} y={y} scale={b.scale} />
            ))}
            {stage.cells.length > 1 && (
              <text x={b.cx} y={b.cy - b.ry + 12} textAnchor="middle" className="meiosis-cell-label">
                Cell {k + 1}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const DIVISION_TEXT = { before: 'Before meiosis (interphase)', I: 'Meiosis I: homologous chromosomes separate', II: 'Meiosis II: sister chromatids separate' } as const

const describeChromosome = (c: Chromosome) =>
  `${c.pair}${c.origin === 'maternal' ? 'M' : 'P'} (${c.chromatids.length === 2 ? '2 sister chromatids' : 'one chromatid'}${
    c.chromatids.some((t) => t.segments.length > 1) ? ', carrying a crossed-over segment' : ''
  })`

export function MeiosisView() {
  const [i, setI] = useState(1)
  const [options, setOptions] = useState<MeiosisOptions>({ crossover: true, orientation: 'same' })
  const stages = useMemo(() => meiosisStages(options), [options])
  const stage = stages[i]
  const counts = countsOf(stage)
  return (
    <section className="panel process-view" aria-labelledby="meiosis-heading">
      <h2 id="meiosis-heading" className="panel-title">
        Meiosis
      </h2>
      <StepNav steps={stages.map((s) => ({ title: s.name, text: s.summary, sources: s.sources }))} index={i} onChange={setI} label="Meiosis stages" />
      <p className={`stage-kind is-${stage.division === 'before' ? 'interphase' : 'mitosis'}`}>{DIVISION_TEXT[stage.division]}</p>
      <div className="meiosis-controls">
        <label className="check-label">
          <input type="checkbox" checked={options.crossover} onChange={(e) => setOptions({ ...options, crossover: e.target.checked })} /> Crossing over in prophase I
        </label>
        <div className="segmented" role="group" aria-label="Metaphase I orientation of pair B">
          <button type="button" className="segmented-option" aria-pressed={options.orientation === 'same'} onClick={() => setOptions({ ...options, orientation: 'same' })}>
            Pair B like pair A
          </button>
          <button type="button" className="segmented-option" aria-pressed={options.orientation === 'swapped'} onClick={() => setOptions({ ...options, orientation: 'swapped' })}>
            Pair B flipped
          </button>
        </div>
      </div>
      <MeiosisDrawing stage={stage} />
      <ul className="meiosis-legend small" aria-label="Legend">
        <li>
          <span className="legend-chip" style={{ background: ORIGIN_COLOR.maternal }} aria-hidden="true" /> M: maternal (from the egg)
        </li>
        <li>
          <span className="legend-chip" style={{ background: ORIGIN_COLOR.paternal }} aria-hidden="true" /> P: paternal (from the sperm)
        </li>
        <li>A: the longer pair · B: the shorter pair</li>
        <li>Two bars joined by a dot: one chromosome made of 2 sister chromatids</li>
      </ul>
      <div className="table-scroll">
        <table className="data-table meiosis-counts">
          <caption>Counts at this stage (computed from the diagram)</caption>
          <thead>
            <tr>
              <th scope="col">Cell</th>
              <th scope="col">Chromosomes</th>
              <th scope="col">Chromatids</th>
              <th scope="col">Sets</th>
              <th scope="col">In this cell</th>
            </tr>
          </thead>
          <tbody>
            {stage.cells.map((cell, k) => (
              <tr key={k}>
                <th scope="row">{k + 1}</th>
                <td>{counts[k].chromosomes}</td>
                <td>{counts[k].chromatids}</td>
                <td>{counts[k].ploidy}</td>
                <td>{cell.chromosomes.map(describeChromosome).join('; ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Illustrative animal cell with 2n = 4, as in OpenStax’s figure; human cells have 46 chromosomes. {MEIOSIS_SCALE_NOTE}
      </p>
    </section>
  )
}

export function MeiosisPanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="meiosis-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="meiosis-panel-heading" className="info-title">
          Meiosis compared with mitosis
        </h2>
        <p className="info-summary">One replication, two divisions: meiosis halves the number of chromosome sets and makes genetically distinct cells.</p>
      </header>
      <div className="info-body">
        <p className="small">{COMPARISON.context}</p>
        <div className="table-scroll">
          <table className="data-table compare-table">
            <caption className="visually-hidden">Mitosis and meiosis compared</caption>
            <thead>
              <tr>
                <th scope="col">Aspect</th>
                <th scope="col">Mitosis</th>
                <th scope="col">Meiosis</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.rows.map((r) => (
                <tr key={r.aspect}>
                  <th scope="row">{r.aspect}</th>
                  <td>{r.mitosis}</td>
                  <td>{r.meiosis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note-block small">
          {COMPARISON.limitation}
          <SourceLinks ids={COMPARISON.sources} />
        </p>
        <h3 className="section-title">Where variation comes from</h3>
        <ul className="guide-list small">
          <li>
            <strong>Crossing over</strong> (prophase I): nonsister chromatids of a homologous pair exchange matching segments, so chromatids carry DNA from both parents.
          </li>
          <li>
            <strong>Independent assortment</strong> (metaphase I): each pair’s orientation is random, so with n pairs there are 2ⁿ possible combinations; 2²³ (over eight million)
            for human gametes, before counting crossing over.
          </li>
        </ul>
        <p className="muted small">
          <SourceLinks ids={['bio-11-1']} />
        </p>
        <ShareActions subject="biology" params={shareParams} restores="the meiosis section (the crossing-over and orientation settings are not stored)" />
      </div>
    </section>
  )
}
