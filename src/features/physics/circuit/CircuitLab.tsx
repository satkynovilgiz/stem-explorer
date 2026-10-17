import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { circuitParamEntries, parseCircuitParams, withLabParams } from '../../../lib/labUrl'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import {
  ARRANGEMENT_LABEL,
  ARRANGEMENTS,
  CIRCUIT_SPECS,
  DEFAULT_CIRCUIT,
  resistorCount,
  solveCircuit,
  type Arrangement,
  type CircuitKey,
  type CircuitParams,
  type CircuitSolution,
} from '../../../physics/circuit'
import { SourceLinks } from '../../guide/SourceLinks'

type P = readonly [number, number]

/* ---------- Schematic geometry (SVG units) ---------- */

const SRC_X = 60
const TOP = 50
const BOT = 230
const RIGHT = 520

interface Layout {
  wires: P[][]
  resistors: { id: 'r1' | 'r2' | 'r3'; at: P; vertical: boolean }[]
  /** Paths from the + terminal round to the − terminal, one per branch, with the branch's resistor ids. */
  paths: { points: P[]; via: ('r1' | 'r2' | 'r3')[] }[]
}

function layoutFor(a: Arrangement): Layout {
  const n = resistorCount(a)
  const plus: P = [SRC_X, 120]
  const minus: P = [SRC_X, 160]
  if (a === 'series-2' || a === 'series-3') {
    const xs = n === 2 ? [210, 370] : [180, 300, 420]
    const loop: P[] = [plus, [SRC_X, TOP], [RIGHT, TOP], [RIGHT, BOT], [SRC_X, BOT], minus]
    return {
      wires: [loop],
      resistors: xs.map((x, i) => ({ id: (['r1', 'r2', 'r3'] as const)[i], at: [x, TOP] as P, vertical: false })),
      paths: [{ points: loop, via: (['r1', 'r2', 'r3'] as const).slice(0, n) }],
    }
  }
  if (a === 'parallel-2' || a === 'parallel-3') {
    const xs = n === 2 ? [270, 440] : [220, 350, 480]
    const branches = xs.map((x) => [plus, [SRC_X, TOP], [x, TOP], [x, BOT], [SRC_X, BOT], minus] as P[])
    return {
      wires: [[plus, [SRC_X, TOP], [xs[xs.length - 1], TOP]], [[SRC_X, BOT], [xs[xs.length - 1], BOT]], [[SRC_X, BOT], minus], ...xs.map((x) => [[x, TOP], [x, BOT]] as P[])],
      resistors: xs.map((x, i) => ({ id: (['r1', 'r2', 'r3'] as const)[i], at: [x, (TOP + BOT) / 2] as P, vertical: true })),
      paths: branches.map((points, i) => ({ points, via: [(['r1', 'r2', 'r3'] as const)[i]] })),
    }
  }
  // mixed: R1 on the top wire, then R2 and R3 in parallel.
  const xs = [360, 480]
  const branch = (x: number): P[] => [plus, [SRC_X, TOP], [x, TOP], [x, BOT], [SRC_X, BOT], minus]
  return {
    wires: [[plus, [SRC_X, TOP], [480, TOP]], [[SRC_X, BOT], [480, BOT]], [[SRC_X, BOT], minus], [[360, TOP], [360, BOT]], [[480, TOP], [480, BOT]]],
    resistors: [
      { id: 'r1', at: [200, TOP], vertical: false },
      { id: 'r2', at: [360, (TOP + BOT) / 2], vertical: true },
      { id: 'r3', at: [480, (TOP + BOT) / 2], vertical: true },
    ],
    paths: [
      { points: branch(xs[0]), via: ['r1', 'r2'] },
      { points: branch(xs[1]), via: ['r1', 'r3'] },
    ],
  }
}

function pathLength(points: readonly P[]) {
  let l = 0
  for (let i = 1; i < points.length; i++) l += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return l
}

function pointAt(points: readonly P[], d: number): P {
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg
      return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t]
    }
    d -= seg
  }
  return points[points.length - 1]
}

const fmt = (v: number, unit: string) => {
  const a = Math.abs(v)
  if (unit === 'A' && a < 1) return `${(v * 1000).toPrecision(3)} mA`
  if (unit === 'W' && a < 1) return `${(v * 1000).toPrecision(3)} mW`
  return `${v.toPrecision(3)} ${unit}`
}

/* ---------- Schematic ---------- */

/**
 * The markers move at a fixed pace; how many pass per unit length shows the current (more markers =
 * more current). They are conceptual: not individual charges, and not their drift speed. They move
 * in the conventional-current direction, from the source's + terminal round to its − terminal.
 */
function Schematic({ params, solution, flowing }: { params: CircuitParams; solution: CircuitSolution; flowing: boolean }) {
  const layout = useMemo(() => layoutFor(params.arrangement), [params.arrangement])
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (!flowing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      if (document.visibilityState !== 'hidden') setPhase((p) => (p + ((now - last) / 1000) * 40) % 100000)
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [flowing])
  const maxI = Math.max(...solution.resistors.map((r) => r.current))
  const byId = Object.fromEntries(solution.resistors.map((r) => [r.id, r]))
  return (
    <svg className="circuit-svg" viewBox="0 0 580 280" role="img" aria-label={`Circuit schematic: ${ARRANGEMENT_LABEL[params.arrangement]}, ideal source of ${params.emf} volts.`}>
      {layout.wires.map((w, i) => (
        <polyline key={i} points={w.map((p) => p.join(',')).join(' ')} className="circuit-wire" />
      ))}
      {/* Ideal source: long plate +, short plate −. */}
      <line x1={SRC_X - 22} x2={SRC_X + 22} y1={128} y2={128} className="circuit-plate" />
      <line x1={SRC_X - 12} x2={SRC_X + 12} y1={152} y2={152} className="circuit-plate is-short" />
      <text x={SRC_X + 28} y={126} className="circuit-label">
        +
      </text>
      <text x={SRC_X + 28} y={160} className="circuit-label">
        −
      </text>
      <text x={SRC_X + 44} y={145} className="circuit-label">
        ε = {params.emf} V
      </text>
      {layout.resistors.map((r) => {
        const v = byId[r.id]
        const [x, y] = r.at
        return (
          <g key={r.id}>
            <rect x={r.vertical ? x - 11 : x - 32} y={r.vertical ? y - 32 : y - 11} width={r.vertical ? 22 : 64} height={r.vertical ? 64 : 22} rx={3} className="circuit-resistor" />
            <text x={r.vertical ? x + 18 : x} y={r.vertical ? y - 4 : y - 18} textAnchor={r.vertical ? 'start' : 'middle'} className="circuit-label">
              {CIRCUIT_SPECS[r.id].symbol} = {v.resistance} Ω
            </text>
            <text x={r.vertical ? x + 18 : x} y={r.vertical ? y + 12 : y + 30} textAnchor={r.vertical ? 'start' : 'middle'} className="circuit-value">
              {fmt(v.current, 'A')}, {fmt(v.voltage, 'V')}
            </text>
          </g>
        )
      })}
      {layout.paths.map((path, i) => {
        const current = Math.min(...path.via.map((id) => byId[id].current))
        const spacing = 26 * (maxI / current)
        const L = pathLength(path.points)
        const count = Math.min(80, Math.floor(L / spacing))
        if (!flowing) {
          // Still: a few arrows along the path show the conventional-current direction.
          return [0.12, 0.45, 0.78].map((f) => {
            const [x, y] = pointAt(path.points, f * L)
            const [x2, y2] = pointAt(path.points, f * L + 6)
            const a = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI
            return <path key={`${i}-${f}`} d="M -6 -5 L 4 0 L -6 5 z" transform={`translate(${x} ${y}) rotate(${a})`} className="circuit-arrow" />
          })
        }
        return Array.from({ length: count }, (_, k) => {
          const [x, y] = pointAt(path.points, (phase + k * spacing) % L)
          return <circle key={`${i}-${k}`} cx={x} cy={y} r={3.2} className="circuit-marker" />
        })
      })}
    </svg>
  )
}

/* ---------- Lab ---------- */

function initFromUrl(): CircuitParams {
  return parseCircuitParams(window.location.search).params
}

export function CircuitLab({ experimentSwitch, guidePanel }: { experimentSwitch: ReactNode; guidePanel: ReactNode }) {
  const [params, setParams] = useState(initFromUrl)
  const reducedMotion = usePrefersReducedMotion()
  // Shared circuits open paused: the markers start still until Play.
  const [playing, setPlaying] = useState(false)
  const [tab, setTab] = useState<'inputs' | 'values' | 'about'>('inputs')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const solution = useMemo(() => solveCircuit(params), [params])
  const entries = circuitParamEntries(params)
  const entriesKey = JSON.stringify(entries)

  useEffect(() => {
    const search = withLabParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'physics', params: entries })

  const n = resistorCount(params.arrangement)
  const keys: CircuitKey[] = ['emf', 'r1', 'r2', ...(n === 3 ? (['r3'] as const) : [])]
  const set = (key: CircuitKey, value: number) => setParams((p) => ({ ...p, [key]: value }))

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="circuit-inputs-heading">
      <h2 id="circuit-inputs-heading" className="panel-title">
        Circuit
      </h2>
      <fieldset className="variant-choice">
        <legend className="small">Arrangement</legend>
        {ARRANGEMENTS.map((a) => (
          <label key={a} className="small">
            <input type="radio" name="arrangement" checked={params.arrangement === a} onChange={() => setParams((p) => ({ ...p, arrangement: a }))} />
            {ARRANGEMENT_LABEL[a]}
          </label>
        ))}
      </fieldset>
      <div className="params">
        {keys.map((key) => (
          <RangeField key={key} spec={{ ...CIRCUIT_SPECS[key], decimals: key === 'emf' ? 1 : 0 }} value={params[key]} onChange={(v) => set(key, v)} />
        ))}
      </div>
      <p className="inline-note">Resistances must be positive (1–1000 Ω); the source is limited to 0.5–24 V.</p>
      <button type="button" className="tool-button bordered" onClick={() => setParams(DEFAULT_CIRCUIT)}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>
      <ShareActions subject="physics" params={entries} restores="this circuit (opened with the markers paused)" />
    </section>
  )

  const eq = solution.equivalent
  const formula =
    params.arrangement === 'series-2' || params.arrangement === 'series-3'
      ? `R_eq = ${solution.resistors.map((r) => CIRCUIT_SPECS[r.id].symbol).join(' + ')} = ${solution.resistors.map((r) => r.resistance).join(' + ')} Ω = ${eq.toPrecision(4)} Ω`
      : params.arrangement === 'mixed'
        ? `R_eq = R₁ + (1/R₂ + 1/R₃)⁻¹ = ${params.r1} + (1/${params.r2} + 1/${params.r3})⁻¹ Ω ≈ ${eq.toPrecision(4)} Ω`
        : `1/R_eq = ${solution.resistors.map((r) => `1/${CIRCUIT_SPECS[r.id].symbol}`).join(' + ')} → R_eq ≈ ${eq.toPrecision(4)} Ω`

  const values = (
    <div className="info-body">
      <table className="compare-table circuit-table">
        <caption className="visually-hidden">Current, voltage drop and power for each resistor</caption>
        <thead>
          <tr>
            <th scope="col">Resistor</th>
            <th scope="col">R</th>
            <th scope="col">Current I</th>
            <th scope="col">Voltage drop V</th>
            <th scope="col">Power P</th>
          </tr>
        </thead>
        <tbody>
          {solution.resistors.map((r) => (
            <tr key={r.id}>
              <th scope="row">{CIRCUIT_SPECS[r.id].symbol}</th>
              <td>{r.resistance} Ω</td>
              <td>{fmt(r.current, 'A')}</td>
              <td>{fmt(r.voltage, 'V')}</td>
              <td>{fmt(r.power, 'W')}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Source</th>
            <td>R_eq ≈ {eq.toPrecision(4)} Ω</td>
            <td>{fmt(solution.current, 'A')}</td>
            <td>{params.emf} V</td>
            <td>{fmt(solution.sourcePower, 'W')}</td>
          </tr>
        </tfoot>
      </table>
      <section className="info-section">
        <h3 className="section-title">Equations used</h3>
        <div className="small equation-list">
          <p>
            <code>{formula}</code>
          </p>
          <p>
            <code>
              I = ε / R_eq = {params.emf} V / {eq.toPrecision(4)} Ω ≈ {fmt(solution.current, 'A')}
            </code>
          </p>
          <p>
            <code>V = I R</code> for each resistor (Ohm’s law)
          </p>
          <p>
            <code>P = I V = I² R = V² / R</code>: the resistors dissipate {fmt(solution.dissipated, 'W')}, equal to the {fmt(solution.sourcePower, 'W')} supplied (P = εI).
          </p>
        </div>
        <p className="small muted">
          Series: the same current through each resistor and R_eq is the sum. Parallel: the same voltage across each branch and the branch currents add.
          <SourceLinks ids={['up2-9-4', 'up2-9-5', 'up2-10-2']} />
        </p>
      </section>
    </div>
  )

  const about = (
    <div className="info-body">
      <h3 className="section-title">Ideal assumptions</h3>
      <ul className="guide-list small">
        <li>An ideal voltage source: no internal resistance, so its terminal voltage equals its emf.</li>
        <li>Ideal wires with no resistance.</li>
        <li>Ohmic resistors whose resistance stays fixed (no heating effects).</li>
        <li>Steady direct current; switching on and off is not modelled.</li>
      </ul>
      <p className="small">
        <strong>Moving markers are conceptual.</strong> They move in the direction of conventional current — the direction positive charge would flow, from the + terminal
        to the − terminal through the circuit. In metal wires the moving charges are actually electrons, going the other way. Marker spacing shows relative current;
        marker speed means nothing.
        <SourceLinks ids={['up2-9-1', 'up2-10-1']} />
      </p>
      <p className="muted small">Only preset arrangements are available; there is no free-form circuit builder.</p>
    </div>
  )

  const stage = (
    <section className="panel circuit-stage" aria-labelledby="circuit-stage-heading">
      <div className="atomic-head">
        <h2 id="circuit-stage-heading" className="panel-title">
          {ARRANGEMENT_LABEL[params.arrangement]}
        </h2>
        {!reducedMotion && (
          <button type="button" className="tool-button bordered" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{playing ? 'Pause markers' : 'Show flow (conceptual)'}</span>
          </button>
        )}
      </div>
      <Schematic params={params} solution={solution} flowing={playing && !reducedMotion} />
      <p className="muted small">
        Schematic, not a wiring diagram. {playing && !reducedMotion ? 'Markers: conceptual conventional current; more markers per length = more current.' : 'Arrows: conventional-current direction (+ to −).'}
        {reducedMotion && ' Markers stay still because reduced motion is on.'}
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
          label="Circuit lab panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'values', label: 'Values', content: <div className="panel">{values}</div> },
            { id: 'about', label: 'Assumptions', content: <div className="panel">{about}</div> },
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
        <section className="panel info">{about}</section>
      </aside>
    </div>
  )
}
