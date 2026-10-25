import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { gasParamEntries, parseGasParams, withLabParams } from '../../../lib/labUrl'
import { linkTo } from '../../../lib/links'
import { mulberry32 } from '../../../lib/random'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { boyle, DEFAULT_GAS, formatSig, gasInputProblem, GAS_KEYS, GAS_SPECS, GAS_TEMPERATURE, isotherm, kPaToAtm, kPaToTorr, R_KPA_L, type GasKey, type GasParams } from '../../../physics/gas'
import { SourceLinks } from '../../guide/SourceLinks'

const V_MAX = GAS_SPECS.v2.max
/** The same 40 dots every time: they stand for "the same amount of gas", not for real molecules. */
const DOTS = (() => {
  const r = mulberry32(2026)
  return Array.from({ length: 40 }, () => [r(), r()] as const)
})()

const BREATHING_LINK = linkTo('anatomy', { breath: 'inspiration', bpos: '50', bshow: 'airflow' })

/* ---------- Cylinder ---------- */

function Cylinder({ params, p2 }: { params: GasParams; p2: number }) {
  const W = 260
  const H = 260
  const top = 20
  const bottom = H - 20
  const left = 70
  const right = 190
  // The scale adapts to the volumes shown (labelled at the top), so small volumes stay readable.
  const vTop = niceMax(Math.max(params.v1, params.v2) * 1.3)
  const y = (v: number) => bottom - (v / vTop) * (bottom - top)
  const piston = y(params.v2)
  return (
    <svg className="gas-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`A sealed cylinder with a piston. The gas occupies ${params.v2} L (it started at ${params.v1} L) and its absolute pressure is ${formatSig(p2)} kPa.`}>
      <rect x={left} y={top} width={right - left} height={bottom - top} className="gas-cylinder" />
      <rect x={left} y={piston} width={right - left} height={bottom - piston} className="gas-gas" />
      {DOTS.map(([a, b], i) => (
        <circle key={i} cx={left + 6 + a * (right - left - 12)} cy={piston + 5 + b * Math.max(0, bottom - piston - 10)} r={2.5} className="gas-dot" />
      ))}
      <line x1={left - 8} x2={right + 8} y1={y(params.v1)} y2={y(params.v1)} className="gas-start-line" />
      <text x={right + 10} y={y(params.v1) + 4} className="wave-label">
        V₁
      </text>
      <rect x={left - 4} y={piston - 10} width={right - left + 8} height={10} className="gas-piston" />
      <line x1={(left + right) / 2} x2={(left + right) / 2} y1={4} y2={piston - 10} className="gas-rod" />
      <text x={right + 10} y={piston - 2} className="wave-label">
        V₂
      </text>
      <text x={left - 10} y={bottom} textAnchor="end" className="wave-label">
        0 L
      </text>
      <text x={left - 10} y={top + 8} textAnchor="end" className="wave-label">
        {vTop} L
      </text>
    </svg>
  )
}

/* ---------- P–V graph ---------- */

function niceMax(v: number) {
  const e = 10 ** Math.floor(Math.log10(v))
  return [1, 2, 2.5, 5, 10].map((m) => m * e).find((m) => m >= v)!
}

function PVGraph({ params, k, p2 }: { params: GasParams; k: number; p2: number }) {
  const W = 340
  const H = 230
  const M = { left: 48, right: 12, top: 24, bottom: 34 }
  const pMax = niceMax(Math.max(params.p1, p2) * 1.25)
  const sx = (v: number) => M.left + (v / V_MAX) * (W - M.left - M.right)
  const sy = (p: number) => H - M.bottom - (Math.min(p, pMax) / pMax) * (H - M.top - M.bottom)
  const pts = isotherm(k).filter(([, p]) => p <= pMax * 1.02)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * pMax)
  return (
    <figure className="wave-graph gas-graph">
      <figcaption className="small">
        Pressure against volume at constant temperature: the curve P = {formatSig(k)} kPa·L ÷ V
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`P–V graph. The curve P = ${formatSig(k)} / V passes through the starting point (${params.v1} L, ${formatSig(params.p1)} kPa) and the new point (${params.v2} L, ${formatSig(p2)} kPa).`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={sy(t)} y2={sy(t)} className="graph-grid" />
            <text x={M.left - 4} y={sy(t) + 4} textAnchor="end" className="wave-label">
              {formatSig(t, 3)}
            </text>
          </g>
        ))}
        {[0, 5, 10, 15, 20].map((v) => (
          <text key={v} x={sx(v)} y={H - M.bottom + 14} textAnchor="middle" className="wave-label">
            {v}
          </text>
        ))}
        <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} className="wave-axis" />
        <line x1={M.left} x2={M.left} y1={M.top} y2={H - M.bottom} className="wave-axis" />
        <polyline points={pts.map(([v, p]) => `${sx(v)},${sy(p)}`).join(' ')} className="wave-curve" />
        <circle cx={sx(params.v1)} cy={sy(params.p1)} r={5} className="gas-point-start" data-v={params.v1} data-p={params.p1} />
        <circle cx={sx(params.v2)} cy={sy(p2)} r={6} className="gas-point" data-v={params.v2} data-p={p2} />
        <text x={(W + M.left) / 2} y={H - 4} textAnchor="middle" className="wave-label">
          V (L)
        </text>
        <text x={M.left + 6} y={14} className="wave-label">
          P (kPa)
        </text>
      </svg>
      <p className="muted small">Hollow point: start (V₁, P₁). Filled point: now (V₂, P₂). Both lie on the same curve because P·V stays the same.</p>
    </figure>
  )
}

/* ---------- Lab ---------- */

export function GasLab({ experimentSwitch, guidePanel }: { experimentSwitch: ReactNode; guidePanel: ReactNode }) {
  const [params, setParams] = useState(() => parseGasParams(window.location.search).params)
  // Shared states open paused; playback is never stored.
  const [playing, setPlaying] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [tab, setTab] = useState<'inputs' | 'graph' | 'values'>('inputs')
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const entries = gasParamEntries(params)
  const entriesKey = JSON.stringify(entries)
  const result = boyle(params.p1, params.v1, params.v2)!

  useEffect(() => {
    const search = withLabParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'physics', params: entries })

  // Play slowly sweeps V₂ between half and twice V₁ (within the allowed range); one cycle takes 12 s.
  const phase = useRef(0)
  useEffect(() => {
    if (!playing || reducedMotion) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (document.visibilityState !== 'hidden') {
        phase.current = (phase.current + dt / 12) % 1
        setParams((p) => {
          const s = GAS_SPECS.v2
          const v = p.v1 * 2 ** Math.sin(2 * Math.PI * phase.current)
          const stepped = Number((Math.round(Math.min(s.max, Math.max(s.min, v)) / s.step) * s.step).toFixed(s.decimals))
          return stepped === p.v2 ? p : { ...p, v2: stepped }
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, reducedMotion])

  const set = (key: GasKey, value: number) => {
    const why = gasInputProblem(key, value)
    setProblem(why ? `${GAS_SPECS[key].label}: ${why}` : null)
    if (why) return
    setPlaying(false)
    phase.current = 0
    setParams((p) => ({ ...p, [key]: value }))
  }

  const reset = () => {
    setPlaying(false)
    phase.current = 0
    setProblem(null)
    setParams(DEFAULT_GAS)
  }

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="gas-inputs-heading">
      <h2 id="gas-inputs-heading" className="panel-title">
        Gas sample
      </h2>
      <p className="small muted">A fixed amount of gas in a sealed cylinder, kept at {GAS_TEMPERATURE} K (20 °C). You set the starting state and a new volume; the new pressure follows.</p>
      <div className="params">
        {GAS_KEYS.map((key) => (
          <RangeField key={key} spec={GAS_SPECS[key]} value={params[key]} onChange={(v) => set(key, v)} clamp={false} />
        ))}
      </div>
      <p className={`small gas-problem${problem ? ' status-error' : ''}`} role="status" aria-live="polite">
        {problem}
      </p>
      <p className="inline-note">
        Pressure is not a control after the start: P₂ is calculated from P₁, V₁ and V₂.
      </p>
      <button type="button" className="tool-button bordered" onClick={reset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Reset</span>
      </button>
      <ShareActions subject="physics" params={entries} restores="this gas sample and volume (opened paused)" />
    </section>
  )

  const rows = [params.v1, params.v2, ...[0.5, 1, 2, 5, 10, 20].filter((v) => v !== params.v1 && v !== params.v2)].sort((a, b) => a - b)
  const values = (
    <div className="info-body">
      <dl className="readout">
        <div>
          <dt>New pressure P₂ (absolute)</dt>
          <dd className="gas-p2">{formatSig(result.p2)} kPa</dd>
        </div>
        <div>
          <dt>In other units</dt>
          <dd>
            {formatSig(kPaToAtm(result.p2))} atm · {formatSig(kPaToTorr(result.p2))} torr
          </dd>
        </div>
        <div>
          <dt>P₁V₁ = P₂V₂</dt>
          <dd>{formatSig(result.k)} kPa·L</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>
            {result.change === 'unchanged'
              ? 'Volume unchanged, so pressure unchanged'
              : `Volume × ${formatSig(params.v2 / params.v1, 3)}, so pressure × ${formatSig(result.ratio, 3)} (${result.change})`}
          </dd>
        </div>
        <div>
          <dt>Amount of gas n = PV/RT</dt>
          <dd>{formatSig(result.moles, 3)} mol (constant)</dd>
        </div>
      </dl>
      <p className="tangent-formula">
        <code>P₂ = P₁V₁ / V₂</code>
        <br />
        <code className="gas-substituted">
          P₂ = ({params.p1} kPa × {params.v1} L) / {params.v2} L = {formatSig(result.p2)} kPa
        </code>
      </p>
      <p className="small">
        At constant temperature and amount, the pressure of a gas is inversely proportional to its volume: halve the volume and the pressure doubles. A P–V graph is a
        curve (a hyperbola), not a straight line.
        <SourceLinks ids={['chem-9-2']} />
      </p>
      <p className="small">
        <strong>Absolute pressure.</strong> Boyle’s law uses absolute pressure. A gauge reads pressure relative to the atmosphere, and can be zero or negative.
        1 atm = 101.325 kPa = 760 torr.
        <SourceLinks ids={['up-14-2', 'chem-9-1']} />
      </p>
      <h3 className="section-title">Model assumptions</h3>
      <ul className="guide-list small">
        <li>Ideal gas, sealed: no gas enters or leaves.</li>
        <li>The temperature stays at {GAS_TEMPERATURE} K, so changes are slow enough for heat to flow. R = {R_KPA_L} kPa·L/(mol·K) is used only to report n.</li>
        <li>The ideal gas law is most accurate at relatively low pressures and high temperatures; departures from it are not modelled.</li>
      </ul>
      <h3 className="section-title">Why this is not a model of the lungs</h3>
      <p className="small">
        Breathing uses the same inverse pressure–volume relationship: the chest enlarges, pressure in the alveoli falls below atmospheric, and air flows in. But lungs are not a
        sealed rigid cylinder. They are open to the air through the airways, so the amount of gas inside changes with every breath; and the lungs are elastic: they do not
        expand by themselves but follow the chest wall and diaphragm, and recoil when those relax. This lab models none of that.
        <SourceLinks ids={['ap-22-3']} />
      </p>
      <p className="small">
        <AppLink href={BREATHING_LINK}>See breathing mechanics in Anatomy</AppLink>
      </p>
    </div>
  )

  const graph = (
    <div className="gas-graphs">
      <PVGraph params={params} k={result.k} p2={result.p2} />
      <table className="data-table gas-table">
        <caption className="small">Points on the curve (the graph’s values as a table)</caption>
        <thead>
          <tr>
            <th scope="col">V (L)</th>
            <th scope="col">P (kPa)</th>
            <th scope="col">P·V (kPa·L)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v} className={v === params.v2 ? 'is-current' : undefined}>
              <td>
                {v}
                {v === params.v2 ? ' (now)' : v === params.v1 ? ' (start)' : ''}
              </td>
              <td>{formatSig(result.k / v)}</td>
              <td>{formatSig(result.k)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const stage = (
    <section className="panel circuit-stage" aria-labelledby="gas-stage-heading">
      <div className="atomic-head">
        <h2 id="gas-stage-heading" className="panel-title">
          Boyle’s law · V₂ = {params.v2} L, P₂ = {formatSig(result.p2)} kPa
        </h2>
        {!reducedMotion && (
          <button type="button" className="tool-button bordered" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        )}
      </div>
      <div className="gas-stage">
        <Cylinder params={params} p2={result.p2} />
        {!isMobile && graph}
      </div>
      <p className="muted small">
        The dots only show that the amount of gas is the same as the volume changes; they are not molecules to scale. Play slowly moves the piston between half and twice V₁; it
        starts paused.
        {reducedMotion && ' Play is not offered because reduced motion is on; change the new volume instead.'}
      </p>
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile physics">
        {experimentSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Gas lab panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'graph', label: 'Graph', content: <div className="panel">{graph}</div> },
            { id: 'values', label: 'Values', content: <div className="panel">{values}</div> },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem physics">
      <aside className="chem-side chem-side--left">
        {experimentSwitch}
        {inputs}
      </aside>
      <div className="chem-stage process-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        <section className="panel info">{values}</section>
      </aside>
    </div>
  )
}

