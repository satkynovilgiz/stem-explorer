import { Dices } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { findDataset, SAMPLE_DATASETS } from '../../../data/mathematics/datasets'
import { useMediaQuery } from '../../../lib/hooks'
import { DEFAULT_STATS, MAX_LINK_VALUES, parseStatsState, statsEntries, withMathSection, type StatsState } from '../../../lib/mathSections'
import { isValidSeed, MAX_SEED, newSeed } from '../../../lib/random'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import {
  binomialMoments,
  binomialPmf,
  fmtStat,
  histogram,
  MAX_BINS,
  MAX_REPETITIONS,
  MAX_TRIALS,
  MAX_VALUES,
  parseValues,
  simulateBinomial,
  suggestedBins,
  summarize,
  type Histogram,
  type Summary,
} from '../../../math/statistics'
import { SourceLinks } from '../../guide/SourceLinks'

/* ---------- Charts ---------- */

const W = 560
const H = 220
const PAD = { l: 56, r: 16, t: 12, b: 40 }

function HistogramChart({ h, unit }: { h: Histogram; unit: string }) {
  const max = Math.max(...h.counts)
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const bw = iw / h.counts.length
  const ticks = h.edges.length <= 11 ? h.edges : h.edges.filter((_, i) => i % Math.ceil(h.edges.length / 10) === 0 || i === h.edges.length - 1)
  return (
    <svg className="stat-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Histogram with ${h.counts.length} bins of width ${fmtStat(h.width)}: counts ${h.counts.join(', ')}.`}>
      <line x1={PAD.l} y1={PAD.t + ih} x2={PAD.l + iw} y2={PAD.t + ih} className="stat-axis" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} className="stat-axis" />
      {[0, max].map((v) => (
        <text key={v} x={PAD.l - 6} y={PAD.t + ih - (v / max) * ih + 4} textAnchor="end" className="stat-tick">
          {v}
        </text>
      ))}
      <text x={12} y={PAD.t + ih / 2} transform={`rotate(-90 12 ${PAD.t + ih / 2})`} textAnchor="middle" className="stat-tick">
        count
      </text>
      {h.counts.map((c, i) => (
        <g key={i}>
          <rect x={PAD.l + i * bw + 1} y={PAD.t + ih - (c / max) * ih} width={Math.max(1, bw - 2)} height={(c / max) * ih} className="stat-bar" />
          {bw > 18 && c > 0 && (
            <text x={PAD.l + i * bw + bw / 2} y={PAD.t + ih - (c / max) * ih - 3} textAnchor="middle" className="stat-tick">
              {c}
            </text>
          )}
        </g>
      ))}
      {ticks.map((e, i) => {
        const x = PAD.l + ((e - h.start) / (h.edges[h.edges.length - 1] - h.start)) * iw
        return (
          <text key={i} x={x} y={PAD.t + ih + 14} textAnchor="middle" className="stat-tick">
            {fmtStat(e)}
          </text>
        )
      })}
      <text x={PAD.l + iw / 2} y={H - 6} textAnchor="middle" className="stat-tick">
        value{unit ? ` (${unit})` : ''}
      </text>
    </svg>
  )
}

function BoxPlot({ s, unit }: { s: Summary; unit: string }) {
  const iw = W - PAD.l - PAD.r
  const span = s.max - s.min || 1
  const x = (v: number) => PAD.l + ((v - s.min) / span) * iw
  const y = 60
  // Edge labels are anchored inward so they never run off the chart.
  const label = (v: number, text: string, dy: number, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <text x={x(v)} y={y + dy} textAnchor={anchor} className="stat-tick">
      {text} {fmtStat(v)}
    </text>
  )
  return (
    <svg className="stat-svg is-box" viewBox={`0 0 ${W} 130`} role="img" aria-label={`Box plot: minimum ${fmtStat(s.min)}, Q1 ${fmtStat(s.q1)}, median ${fmtStat(s.median)}, Q3 ${fmtStat(s.q3)}, maximum ${fmtStat(s.max)}.`}>
      <line x1={x(s.min)} y1={y} x2={x(s.q1)} y2={y} className="stat-whisker" />
      <line x1={x(s.q3)} y1={y} x2={x(s.max)} y2={y} className="stat-whisker" />
      <line x1={x(s.min)} y1={y - 12} x2={x(s.min)} y2={y + 12} className="stat-whisker" />
      <line x1={x(s.max)} y1={y - 12} x2={x(s.max)} y2={y + 12} className="stat-whisker" />
      <rect x={x(s.q1)} y={y - 22} width={Math.max(1, x(s.q3) - x(s.q1))} height={44} className="stat-box" />
      <line x1={x(s.median)} y1={y - 22} x2={x(s.median)} y2={y + 22} className="stat-median" />
      {s.potentialOutliers.map((v, i) => (
        <circle key={i} cx={x(v)} cy={y} r={4} className="stat-outlier" />
      ))}
      {label(s.min, 'min', -30, 'start')}
      {label(s.max, 'max', -30, 'end')}
      {label(s.q1, 'Q1', 40)}
      {label(s.median, 'M', 56)}
      {label(s.q3, 'Q3', 40)}
      {unit && (
        <text x={W - PAD.r} y={124} textAnchor="end" className="stat-tick">
          {unit}
        </text>
      )}
    </svg>
  )
}

function BinomialChart({ pmf, observed, repetitions }: { pmf: number[]; observed: number[] | null; repetitions: number }) {
  const n = pmf.length - 1
  const freq = observed ? observed.map((c) => c / repetitions) : null
  const max = Math.max(...pmf, ...(freq ?? [0]))
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const bw = iw / (n + 1)
  const step = Math.ceil((n + 1) / 12)
  return (
    <svg className="stat-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Binomial distribution for k = 0 to ${n}: bars are exact probabilities${freq ? ', marks are observed frequencies' : ''}.`}>
      <line x1={PAD.l} y1={PAD.t + ih} x2={PAD.l + iw} y2={PAD.t + ih} className="stat-axis" />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} className="stat-axis" />
      <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" className="stat-tick">
        {fmtStat(max)}
      </text>
      <text x={PAD.l - 6} y={PAD.t + ih + 4} textAnchor="end" className="stat-tick">
        0
      </text>
      {pmf.map((p, k) => (
        <rect key={k} x={PAD.l + k * bw + (bw > 3 ? 0.5 : 0)} y={PAD.t + ih - (p / max) * ih} width={Math.max(0.6, bw - (bw > 3 ? 1 : 0))} height={(p / max) * ih} className="stat-bar" />
      ))}
      {freq?.map((f, k) =>
        f > 0 ? <line key={k} x1={PAD.l + k * bw} x2={PAD.l + (k + 1) * bw} y1={PAD.t + ih - (f / max) * ih} y2={PAD.t + ih - (f / max) * ih} className="stat-observed" /> : null,
      )}
      {pmf.map((_, k) =>
        k % step === 0 ? (
          <text key={k} x={PAD.l + k * bw + bw / 2} y={PAD.t + ih + 14} textAnchor="middle" className="stat-tick">
            {k}
          </text>
        ) : null,
      )}
      <text x={PAD.l + iw / 2} y={H - 6} textAnchor="middle" className="stat-tick">
        k = number of successes
      </text>
    </svg>
  )
}

/* ---------- Lab ---------- */

export function StatisticsLab({ sectionSwitch, guidePanel }: { sectionSwitch: ReactNode; guidePanel: ReactNode }) {
  const initial = useMemo(() => parseStatsState(window.location.search).state, [])
  const [state, setState] = useState<StatsState>(initial)
  const [text, setText] = useState(() => (initial.data ? initial.data.join(', ') : ''))
  const [includeData, setIncludeData] = useState(() => initial.data !== null)
  const [seedText, setSeedText] = useState(String(initial.seed))
  const [resetMessage, setResetMessage] = useState('')
  const [tab, setTab] = useState<'inputs' | 'results'>('inputs')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const textId = useId()

  const custom = state.dataset === 'custom'
  const parsed = useMemo(() => parseValues(text), [text])
  const values = useMemo(() => (custom ? parsed.values : (findDataset(state.dataset)?.values ?? [])), [custom, parsed, state.dataset])
  const dataset = custom ? null : findDataset(state.dataset)!
  const linkData = custom && includeData && parsed.values.length > 0 && parsed.values.length <= MAX_LINK_VALUES ? parsed.values : null
  const shareState = { ...state, data: linkData }
  const entries = statsEntries(shareState)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    const search = withMathSection(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'mathematics', params: entries })

  const summary = useMemo(() => summarize(values), [values])
  const bins = state.bins ?? suggestedBins(values.length)
  const hist = useMemo(() => histogram(values, bins), [values, bins])
  const pmf = useMemo(() => binomialPmf(state.n, state.p)!, [state.n, state.p])
  const observed = useMemo(() => simulateBinomial(state.n, state.p, state.repetitions, state.seed), [state.n, state.p, state.repetitions, state.seed])
  const moments = binomialMoments(state.n, state.p)
  const set = (patch: Partial<StatsState>) => {
    setResetMessage('')
    setState((s) => ({ ...s, ...patch }))
  }
  /*
   * Restores every setting of the current view, and every text field that mirrors a setting (the
   * seed), so the inputs, simulation, legend and link agree. Values typed into "Your own values"
   * are user data, not a setting: they are kept (never silently deleted) and simply stop being the
   * selected dataset; "Include my values" is switched off so the link holds no data.
   */
  const restoreDefaults = () => {
    setState({ ...DEFAULT_STATS, view: state.view })
    setSeedText(String(DEFAULT_STATS.seed))
    setIncludeData(false)
    setResetMessage(
      isBinomial
        ? `Default settings restored: n = ${DEFAULT_STATS.n}, p = ${DEFAULT_STATS.p}, ${DEFAULT_STATS.repetitions} repetitions, seed ${DEFAULT_STATS.seed}.`
        : text.trim()
          ? 'Default settings restored. The values you typed are kept: choose “Your own values” to use them again.'
          : 'Default settings restored.',
    )
  }
  const isBinomial = state.view === 'binomial'
  const seedValid = /^\d+$/.test(seedText) && isValidSeed(Number(seedText))

  const viewSwitch = (
    <div className="segmented" role="group" aria-label="Statistics topic">
      <button type="button" className="segmented-option" aria-pressed={!isBinomial} onClick={() => set({ view: 'describe' })}>
        Descriptive statistics
      </button>
      <button type="button" className="segmented-option" aria-pressed={isBinomial} onClick={() => set({ view: 'binomial' })}>
        Binomial probability
      </button>
    </div>
  )

  const describeInputs = (
    <>
      <div className="rx-field">
        <label className="param-label" htmlFor={`${textId}-ds`}>
          Data
        </label>
        <select id={`${textId}-ds`} className="select" value={state.dataset} onChange={(e) => set({ dataset: e.target.value })}>
          {SAMPLE_DATASETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
          <option value="custom">Your own values</option>
        </select>
      </div>
      {custom ? (
        <>
          <label className="param-label" htmlFor={textId}>
            Your values (up to {MAX_VALUES})
          </label>
          <textarea id={textId} className="stat-textarea" rows={5} value={text} placeholder="e.g. 3, 5.5, -2, 8" aria-describedby={`${textId}-help`} onChange={(e) => setText(e.target.value)} />
          <p id={`${textId}-help`} className="small muted">
            Separate numbers with commas, spaces, semicolons or new lines. Use a point for decimals. Your values stay in this browser: they are not uploaded anywhere.
          </p>
          {(parsed.invalid.length > 0 || parsed.tooLarge.length > 0 || parsed.truncated) && (
            <div className="status-error small" role="alert">
              {parsed.invalid.length > 0 && <p>Not a number, ignored: {parsed.invalid.map((x) => `“${x.token}” (item ${x.position})`).join(', ')}.</p>}
              {parsed.tooLarge.length > 0 && <p>Larger than 10⁹ in size, ignored: {parsed.tooLarge.map((x) => `“${x.token}” (item ${x.position})`).join(', ')}.</p>}
              {parsed.truncated && <p>Only the first {MAX_VALUES} numbers are used.</p>}
            </div>
          )}
          <label className="check-label small">
            <input type="checkbox" checked={includeData} onChange={(e) => setIncludeData(e.target.checked)} /> Include my values in the link and in saved explorations
          </label>
          <p className="small muted">
            {includeData
              ? parsed.values.length > MAX_LINK_VALUES
                ? `Too many values for a link (more than ${MAX_LINK_VALUES}): the link will not contain them.`
                : 'Anyone with the link will see these values, and they appear in the address bar and your recent history.'
              : 'Off: links, saves and recent history record only “your own values”, not the numbers.'}
          </p>
        </>
      ) : (
        <p className="small muted">
          {dataset!.provenance}
          {dataset!.source && <SourceLinks ids={[dataset!.source]} />}
        </p>
      )}
      <RangeField spec={{ label: 'Histogram bins', min: 1, max: MAX_BINS, step: 1, decimals: 0 }} value={bins} onChange={(v) => set({ bins: v })} />
      <button type="button" className="tool-button bordered" disabled={state.bins === null} onClick={() => set({ bins: null })}>
        Use the suggested number ({suggestedBins(values.length)})
      </button>
    </>
  )

  const binomialInputs = (
    <>
      <RangeField spec={{ label: 'Trials', symbol: 'n', min: 1, max: MAX_TRIALS, step: 1, decimals: 0 }} value={state.n} onChange={(v) => set({ n: v })} />
      <RangeField spec={{ label: 'Probability of success', symbol: 'p', min: 0, max: 1, step: 0.01, decimals: 2 }} value={state.p} onChange={(v) => set({ p: v })} />
      <RangeField spec={{ label: 'Repetitions of the experiment', min: 1, max: MAX_REPETITIONS, step: 1, decimals: 0 }} value={state.repetitions} onChange={(v) => set({ repetitions: v })} />
      <label className="inh-field">
        <span className="param-label">Seed</span>
        <input
          className="rx-amount"
          inputMode="numeric"
          value={seedText}
          aria-invalid={!seedValid}
          onChange={(e) => {
            setSeedText(e.target.value)
            if (/^\d+$/.test(e.target.value) && isValidSeed(Number(e.target.value))) set({ seed: Number(e.target.value) })
          }}
        />
      </label>
      {!seedValid && (
        <p className="status-error small" role="alert">
          The seed is a whole number from 0 to {MAX_SEED.toLocaleString('en')}.
        </p>
      )}
      <button
        type="button"
        className="tool-button bordered"
        onClick={() => {
          const s = newSeed()
          setSeedText(String(s))
          set({ seed: s })
        }}
      >
        <Dices size={15} aria-hidden="true" />
        <span>Run again (new seed)</span>
      </button>
      <p className="small muted">The same n, p, repetitions and seed always give the same simulated counts.</p>
    </>
  )

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="stat-inputs-heading">
      <h2 id="stat-inputs-heading" className="panel-title">
        Statistics
      </h2>
      {viewSwitch}
      {isBinomial ? binomialInputs : describeInputs}
      <button type="button" className="tool-button bordered" onClick={restoreDefaults}>
        Restore default settings
      </button>
      {resetMessage && (
        <p className="small muted" role="status">
          {resetMessage}
        </p>
      )}
      <ShareActions
        subject="mathematics"
        params={entries}
        restores={isBinomial ? 'n, p, the number of repetitions and the seed' : custom ? (linkData ? 'your values and the bin count' : 'the “your own values” choice and the bin count, without the numbers') : 'this sample dataset and the bin count'}
      />
    </section>
  )

  const describeStage = (
    <section className="panel stat-stage" aria-labelledby="stat-stage-heading">
      <h2 id="stat-stage-heading" className="panel-title">
        {custom ? 'Your values' : dataset!.name}
        {dataset?.synthetic && <span className="rx-type"> synthetic data</span>}
      </h2>
      {!summary || !hist ? (
        <p className="empty-state">{custom ? 'Enter at least one number to see statistics.' : 'No data.'}</p>
      ) : (
        <>
          <h3 className="section-title">Histogram</h3>
          <HistogramChart h={hist} unit={dataset?.unit ?? ''} />
          <p className="small muted">
            {hist.counts.length} bin{hist.counts.length === 1 ? '' : 's'} of width {fmtStat(hist.width)} from {fmtStat(hist.start)}; each bin includes its left edge, and the
            last also includes the maximum. The same data can look smooth, lumpy or flat depending on the bins: few wide bins hide detail, many narrow bins show gaps and
            noise. Many histograms use 5 to 15 bars.
            <SourceLinks ids={['stat-2-2']} />
          </p>
          <h3 className="section-title">Box plot</h3>
          <BoxPlot s={summary} unit={dataset?.unit ?? ''} />
          <p className="small muted">
            Whiskers run to the minimum and maximum; the box spans Q1 to Q3, with the median (M) inside.
            {summary.potentialOutliers.length > 0 && ` Circles mark potential outliers (more than 1.5 × IQR beyond the box): ${summary.potentialOutliers.map(fmtStat).join(', ')}.`}
            <SourceLinks ids={['stat-2-4', 'stat-2-3']} />
          </p>
          <h3 className="section-title">Sorted data ({summary.n})</h3>
          <p className="stat-sorted small">
            {summary.sorted.slice(0, 200).map(fmtStat).join(', ')}
            {summary.n > 200 ? ` … (${summary.n - 200} more)` : ''}
          </p>
        </>
      )}
    </section>
  )

  const shownK = pmf.map((p, k) => ({ k, p, o: observed ? observed[k] : 0 })).filter((r) => r.p >= 1e-4 || r.o > 0)
  const binomialStage = (
    <section className="panel stat-stage" aria-labelledby="stat-binom-heading">
      <h2 id="stat-binom-heading" className="panel-title">
        Binomial distribution: n = {state.n}, p = {state.p.toFixed(2)}
      </h2>
      <BinomialChart pmf={pmf} observed={observed} repetitions={state.repetitions} />
      <ul className="meiosis-legend small" aria-label="Legend">
        <li>
          <span className="legend-chip stat-chip-bar" aria-hidden="true" /> Bars: exact probability P(X = k)
        </li>
        <li>
          <span className="legend-line stat-chip-observed" aria-hidden="true" /> Marks: observed share in {state.repetitions} simulated repetitions (seed {state.seed})
        </li>
      </ul>
      <p className="small">
        Each repetition runs n independent trials, each a success with probability p (a Bernoulli trial), and counts the successes. The exact probabilities come from the
        formula and do not depend on the simulation; the simulated shares vary from seed to seed and usually come closer with more repetitions.
        <SourceLinks ids={['stat-4-3']} />
      </p>
      {(state.p === 0 || state.p === 1) && <p className="inline-note small">With p = {state.p}, every trial {state.p === 0 ? 'fails' : 'succeeds'}: X = {state.p === 0 ? 0 : state.n} with probability 1.</p>}
      <div className="table-scroll">
        <table className="data-table stat-binom-table">
          <caption className="small">
            k with P(X = k) ≥ 0.0001 or observed at least once ({shownK.length} of {state.n + 1})
          </caption>
          <thead>
            <tr>
              <th scope="col">k</th>
              <th scope="col">P(X = k), exact</th>
              <th scope="col">Expected count</th>
              <th scope="col">Observed count</th>
              <th scope="col">Observed share</th>
            </tr>
          </thead>
          <tbody>
            {shownK.map((r) => (
              <tr key={r.k}>
                <th scope="row">{r.k}</th>
                <td>{fmtStat(r.p)}</td>
                <td>{fmtStat(r.p * state.repetitions)}</td>
                <td>{r.o}</td>
                <td>{fmtStat(r.o / state.repetitions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  const results = isBinomial ? (
    <div className="info-body">
      <dl className="readout">
        <div>
          <dt>Mean μ = np</dt>
          <dd>{fmtStat(moments.mean)}</dd>
        </div>
        <div>
          <dt>Variance σ² = npq</dt>
          <dd>{fmtStat(moments.variance)}</dd>
        </div>
        <div>
          <dt>Standard deviation σ</dt>
          <dd>{fmtStat(moments.sd)}</dd>
        </div>
        <div>
          <dt>Total of P(X = k)</dt>
          <dd>{pmf.reduce((a, b) => a + b, 0).toFixed(6)}</dd>
        </div>
      </dl>
      <p className="small">
        P(X = k) = C(n, k) pᵏ qⁿ⁻ᵏ with q = 1 − p, for k = 0, 1, …, n. It applies when there is a fixed number of independent trials, each with the same two outcomes and the
        same p. With n = 1 it describes a single Bernoulli trial.
        <SourceLinks ids={['stat-4-3']} />
      </p>
      <p className="small muted">Computed for n up to {MAX_TRIALS} in logarithms, so large n neither overflows nor underflows; p = 0 and p = 1 are handled exactly.</p>
      <PrivacyNote />
    </div>
  ) : (
    <div className="info-body">
      {summary ? (
        <dl className="readout stat-readout">
          <div>
            <dt>Count n</dt>
            <dd>{summary.n}</dd>
          </div>
          <div>
            <dt>Mean x̄</dt>
            <dd>{fmtStat(summary.mean)}</dd>
          </div>
          <div>
            <dt>Median</dt>
            <dd>{fmtStat(summary.median)}</dd>
          </div>
          <div>
            <dt>Range (max − min)</dt>
            <dd>{fmtStat(summary.range)}</dd>
          </div>
          <div>
            <dt>Q1 / Q3</dt>
            <dd>
              {fmtStat(summary.q1)} / {fmtStat(summary.q3)}
            </dd>
          </div>
          <div>
            <dt>IQR (Q3 − Q1)</dt>
            <dd>{fmtStat(summary.iqr)}</dd>
          </div>
          <div>
            <dt>Population variance σ² (÷ N)</dt>
            <dd>{fmtStat(summary.populationVariance)}</dd>
          </div>
          <div>
            <dt>Population SD σ</dt>
            <dd>{fmtStat(summary.populationSd)}</dd>
          </div>
          <div>
            <dt>Sample variance s² (÷ (n − 1))</dt>
            <dd>{summary.sampleVariance === null ? 'undefined for one value' : fmtStat(summary.sampleVariance)}</dd>
          </div>
          <div>
            <dt>Sample SD s</dt>
            <dd>{summary.sampleSd === null ? 'undefined for one value' : fmtStat(summary.sampleSd)}</dd>
          </div>
        </dl>
      ) : (
        <p className="small muted">No values yet.</p>
      )}
      <p className="small">
        Use σ when the values are the whole population and s when they are a sample from a larger population: dividing by n − 1 makes s² a better estimate of the
        population variance.
        <SourceLinks ids={['stat-2-7', 'stat-2-5']} />
      </p>
      <p className="small muted">
        Quartile convention: Q1 and Q3 are the medians of the lower and upper halves; with an odd count the median is left out of both halves, and with one value Q1 = Q3 =
        that value. Other conventions (for example percentile interpolation) can give slightly different quartiles.
        <SourceLinks ids={['stat-2-3']} />
      </p>
      <PrivacyNote />
    </div>
  )

  const stage = isBinomial ? binomialStage : describeStage
  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {sectionSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Statistics panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'results', label: 'Results', content: <div className="panel">{results}</div> },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem">
      <aside className="chem-side chem-side--left">
        {sectionSwitch}
        {inputs}
      </aside>
      <div className="chem-stage process-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        <section className="panel info">{results}</section>
      </aside>
    </div>
  )
}

function PrivacyNote() {
  return (
    <details className="small stat-privacy">
      <summary>What links, saves and exports contain</summary>
      <ul className="guide-list">
        <li>Nothing you enter is uploaded: all calculations run in this browser.</li>
        <li>Links, Save exploration and recent history store the section, the sample dataset’s name, the bin count, and n, p, the repetitions and the seed.</li>
        <li>Values you type are stored in them only if you tick “Include my values” (up to {MAX_LINK_VALUES} values); otherwise they record only that you used your own values.</li>
        <li>A notebook note stores the same link. A PNG export shows the chart (which reflects your data) and the link, but not the list of values.</li>
      </ul>
    </details>
  )
}
