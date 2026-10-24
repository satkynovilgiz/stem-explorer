import { Dices, Play } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import {
  alleles,
  ASSUMPTIONS,
  fractionText,
  fractionValue,
  gametes,
  GENOTYPES,
  genotypeProbabilities,
  INHERITANCE_SOURCES,
  LIMITS,
  MAX_SAMPLE,
  phenotypeOf,
  phenotypeProbabilities,
  punnett,
  SAMPLE_SIZES,
  simulateOffspring,
  TRAIT,
  type Genotype,
} from '../../../data/biology/inheritance'
import { isValidSeed, MAX_SEED, newSeed } from '../../../lib/random'
import type { Parents } from '../../../lib/urlState'
import { SourceLinks } from '../../guide/SourceLinks'
import { AppLink } from '../../../components/AppLink'
import { linkTo } from '../../../lib/links'

const pct = (x: number) => `${(x * 100).toFixed(1)} %`

function GenotypePicker({ label, value, onChange }: { label: string; value: Genotype; onChange: (g: Genotype) => void }) {
  return (
    <div className="inh-parent">
      <span className="param-label">{label}</span>
      <div className="segmented" role="group" aria-label={`${label} genotype`}>
        {GENOTYPES.map((g) => (
          <button key={g} type="button" className="segmented-option" aria-pressed={value === g} onClick={() => onChange(g)}>
            {g}
          </button>
        ))}
      </div>
      <span className="small muted">
        {phenotypeOf(value)} · {value === 'Yy' ? 'heterozygous' : 'homozygous'}
      </span>
      <span className="small">
        Gametes: {gametes(value).map((x) => `${x.allele} (${x.p === 1 ? 'all' : '½'})`).join(', ')}
      </span>
    </div>
  )
}

/** Observed versus theoretical proportions, as bars (observed) and tick marks (theoretical), with numbers. */
function CompareChart({ rows }: { rows: { label: string; observed: number; expected: number }[] }) {
  const w = 300
  return (
    <svg className="inh-chart" viewBox={`0 0 ${w} ${rows.length * 34 + 10}`} role="img" aria-label={rows.map((r) => `${r.label}: observed ${pct(r.observed)}, theoretical ${pct(r.expected)}`).join('; ')}>
      {rows.map((r, i) => {
        const y = 8 + i * 34
        const x0 = 64
        const span = w - x0 - 10
        return (
          <g key={r.label}>
            <text x={0} y={y + 11} className="inh-chart-label">
              {r.label}
            </text>
            <rect x={x0} y={y} width={span} height={16} className="inh-chart-track" />
            <rect x={x0} y={y} width={span * r.observed} height={16} className="inh-chart-bar" />
            <line x1={x0 + span * r.expected} y1={y - 3} x2={x0 + span * r.expected} y2={y + 19} className="inh-chart-expected" />
          </g>
        )
      })}
    </svg>
  )
}

export function InheritanceView({ parents, onParents }: { parents: Parents; onParents: (p: Parents) => void }) {
  const id = useId()
  const { p1, p2 } = parents
  const square = punnett(p1, p2)
  const g = genotypeProbabilities(p1, p2)
  const ph = phenotypeProbabilities(p1, p2)
  const [n, setN] = useState<number>(20)
  const [nText, setNText] = useState('20')
  const [seed, setSeed] = useState(() => newSeed())
  const [seedText, setSeedText] = useState(String(seed))
  const [run, setRun] = useState<{ n: number; seed: number } | null>(null)
  const sim = useMemo(() => (run ? simulateOffspring(p1, p2, run.n, run.seed) : null), [p1, p2, run])
  const nValid = /^\d+$/.test(nText) && Number(nText) >= 1 && Number(nText) <= MAX_SAMPLE
  const seedValid = /^\d+$/.test(seedText) && isValidSeed(Number(seedText))
  const go = (s: number, size: number) => {
    setSeed(s)
    setSeedText(String(s))
    setRun({ n: size, seed: s })
  }
  return (
    <section className="panel process-view inheritance" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        One-gene inheritance
      </h2>
      <p className="small">
        {TRAIT.organism}, {TRAIT.character}: allele <strong>Y</strong> (yellow) is dominant over <strong>y</strong> (green).
        <SourceLinks ids={['bio-12-2']} />
      </p>
      <div className="inh-parents">
        <GenotypePicker label="Parent 1" value={p1} onChange={(v) => onParents({ p1: v, p2 })} />
        <span className="inh-cross" aria-hidden="true">
          ×
        </span>
        <GenotypePicker label="Parent 2" value={p2} onChange={(v) => onParents({ p1, p2: v })} />
      </div>

      <h3 className="section-title">Punnett square</h3>
      <div className="table-scroll">
        <table className="data-table punnett">
          <caption>
            Each cell is one equally likely combination of a gamete from parent 1 (rows) and parent 2 (columns): probability ¼ each.
          </caption>
          <thead>
            <tr>
              <td />
              {alleles(p2).map((a, j) => (
                <th key={j} scope="col">
                  {a} <span className="muted small">(½)</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {square.map((row, i) => (
              <tr key={i}>
                <th scope="row">
                  {alleles(p1)[i]} <span className="muted small">(½)</span>
                </th>
                {row.map((cell, j) => (
                  <td key={j} className={cell === 'yy' ? 'is-recessive' : 'is-dominant'}>
                    <strong>{cell}</strong>
                    <span className="small">{phenotypeOf(cell)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Probabilities for one offspring</h3>
      <div className="table-scroll">
        <table className="data-table">
          <caption className="visually-hidden">Genotype and phenotype probabilities</caption>
          <thead>
            <tr>
              <th scope="col">Outcome</th>
              <th scope="col">Exact</th>
              <th scope="col">Percent</th>
            </tr>
          </thead>
          <tbody>
            {GENOTYPES.map((x) => (
              <tr key={x}>
                <th scope="row">Genotype {x}</th>
                <td>{fractionText(g[x])}</td>
                <td>{pct(fractionValue(g[x]))}</td>
              </tr>
            ))}
            <tr className="is-sum">
              <th scope="row">{TRAIT.dominant.phenotype} (YY or Yy)</th>
              <td>{fractionText(ph.dominant)}</td>
              <td>{pct(fractionValue(ph.dominant))}</td>
            </tr>
            <tr>
              <th scope="row">{TRAIT.recessive.phenotype} (yy)</th>
              <td>{fractionText(ph.recessive)}</td>
              <td>{pct(fractionValue(ph.recessive))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Yellow seeds come from two different genotypes, so their probabilities add (the sum rule). Genotypes and phenotypes each total 1.
        <SourceLinks ids={['bio-12-1']} />
      </p>

      <h3 className="section-title">Sampling simulation</h3>
      <p className="small">
        Each simulated offspring gets one allele from each parent at random (probability ½ for each of a parent’s two alleles). The probabilities above are worked out
        exactly and do not depend on the simulation.
      </p>
      <div className="inh-sim-controls">
        <div className="segmented" role="group" aria-label="Number of offspring">
          {SAMPLE_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className="segmented-option"
              aria-pressed={n === s}
              onClick={() => {
                setN(s)
                setNText(String(s))
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <label className="inh-field">
          <span className="param-label">Offspring (1–{MAX_SAMPLE.toLocaleString('en')})</span>
          <input
            className="rx-amount"
            inputMode="numeric"
            value={nText}
            aria-invalid={!nValid}
            onChange={(e) => {
              setNText(e.target.value)
              if (/^\d+$/.test(e.target.value) && Number(e.target.value) >= 1 && Number(e.target.value) <= MAX_SAMPLE) setN(Number(e.target.value))
            }}
          />
        </label>
        <label className="inh-field">
          <span className="param-label">Seed</span>
          <input className="rx-amount" inputMode="numeric" value={seedText} aria-invalid={!seedValid} onChange={(e) => setSeedText(e.target.value)} />
        </label>
      </div>
      {!nValid && (
        <p className="status-error small" role="alert">
          Enter a whole number of offspring from 1 to {MAX_SAMPLE.toLocaleString('en')}.
        </p>
      )}
      {!seedValid && (
        <p className="status-error small" role="alert">
          The seed is a whole number from 0 to {MAX_SEED.toLocaleString('en')}.
        </p>
      )}
      <div className="share-row">
        <button type="button" className="button" disabled={!nValid || !seedValid} onClick={() => go(Number(seedText), n)}>
          <Play size={15} aria-hidden="true" />
          <span>Run with this seed</span>
        </button>
        <button type="button" className="tool-button bordered" disabled={!nValid} onClick={() => go(newSeed(), n)}>
          <Dices size={15} aria-hidden="true" />
          <span>Run again (new seed)</span>
        </button>
      </div>
      {sim && run && (
        <div className="inh-results" role="status">
          <p className="small">
            {run.n} offspring, seed {run.seed}: the same seed and parents always give these counts.
          </p>
          <div className="table-scroll">
            <table className="data-table">
              <caption className="visually-hidden">Observed and expected counts</caption>
              <thead>
                <tr>
                  <th scope="col">Outcome</th>
                  <th scope="col">Observed</th>
                  <th scope="col">Expected (n × p)</th>
                  <th scope="col">Observed share</th>
                  <th scope="col">Theoretical</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: TRAIT.dominant.phenotype, observed: sim.YY + sim.Yy, p: fractionValue(ph.dominant) },
                  { label: TRAIT.recessive.phenotype, observed: sim.yy, p: fractionValue(ph.recessive) },
                  ...GENOTYPES.map((x) => ({ label: `Genotype ${x}`, observed: sim[x], p: fractionValue(g[x]) })),
                ].map((r) => (
                  <tr key={r.label}>
                    <th scope="row">{r.label}</th>
                    <td>{r.observed}</td>
                    <td>{(run.n * r.p).toFixed(run.n * r.p < 100 ? 1 : 0)}</td>
                    <td>{pct(r.observed / run.n)}</td>
                    <td>{pct(r.p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CompareChart
            rows={[
              { label: 'Yellow', observed: (sim.YY + sim.Yy) / run.n, expected: fractionValue(ph.dominant) },
              { label: 'Green', observed: sim.yy / run.n, expected: fractionValue(ph.recessive) },
            ]}
          />
          <p className="small muted">
            Bars: observed share in this sample. Vertical marks: theoretical probability. Repeated samples differ by chance, and small samples can be far from the
            theoretical ratio; with larger samples the observed shares usually come closer.
            <SourceLinks ids={['bio-12-1']} />
          </p>
          <p className="small">
            The number of green-seeded offspring is a binomial count under this model.{' '}
            <AppLink href={linkTo('mathematics', { msec: 'statistics', sv: 'binomial', bn: String(Math.min(run.n, 500)), bp: String(fractionValue(ph.recessive)), br: '1000', seed: String(run.seed) })}>
              See the same model as a binomial distribution (n = {Math.min(run.n, 500)}, p = {fractionText(ph.recessive)})
            </AppLink>
            {run.n > 500 ? ' (the probability lab goes up to 500 trials).' : '.'}
          </p>
        </div>
      )}
    </section>
  )
}

export function InheritancePanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="inh-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="inh-panel-heading" className="info-title">
          Mendelian inheritance: one gene
        </h2>
        <p className="info-summary">How one gene with a dominant and a recessive allele passes from parents to offspring, as probabilities.</p>
      </header>
      <div className="info-body">
        <h3 className="section-title">Model assumptions</h3>
        <ul className="guide-list small">
          {ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <p className="note-block small">
          {LIMITS}
          <SourceLinks ids={INHERITANCE_SOURCES} />
        </p>
        <p className="small muted">
          The example is Mendel’s pea seed colour, a trait with two distinct classes. Traits such as human height are not used: they vary continuously because many genes
          act on them.
          <SourceLinks ids={['bio-12-1']} />
        </p>
        <ShareActions subject="biology" params={shareParams} restores="these parent genotypes (simulation results are not stored)" />
      </div>
    </section>
  )
}
