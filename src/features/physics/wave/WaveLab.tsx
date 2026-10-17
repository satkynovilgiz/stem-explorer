import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { parseWaveParams, waveParamEntries, withLabParams } from '../../../lib/labUrl'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { DEFAULT_WAVE, deriveWave, displacement, mediumVelocity, sample, WAVE_DOMAIN, WAVE_KEYS, WAVE_SPECS, type WaveKey, type WaveParams } from '../../../physics/wave'
import { SourceLinks } from '../../guide/SourceLinks'

const f3 = (v: number) => (Math.abs(v) < 0.0005 ? '0.000' : v.toFixed(3)).replace('-', '−')

/* ---------- Medium (a row of particles that move only up and down) ---------- */

function Medium({ params, t }: { params: WaveParams; t: number }) {
  const W = 560
  const H = 200
  const sx = (x: number) => 20 + ((x - WAVE_DOMAIN.min) / (WAVE_DOMAIN.max - WAVE_DOMAIN.min)) * (W - 40)
  const sy = (y: number) => H / 2 - (y / 0.5) * (H / 2 - 24)
  const xs = Array.from({ length: 49 }, (_, i) => WAVE_DOMAIN.min + (i * (WAVE_DOMAIN.max - WAVE_DOMAIN.min)) / 48)
  const curve = sample(200, WAVE_DOMAIN.min, WAVE_DOMAIN.max, (x) => displacement(params, x, t))
  const probeY = displacement(params, params.probe, t)
  const { speed } = deriveWave(params)
  // One crest, tracked to show the pattern moving at v while the particles stay put horizontally.
  const crest = (((params.wavelength / 4 + speed * t) % params.wavelength) + params.wavelength) % params.wavelength
  return (
    <svg className="wave-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`A row of medium particles at time ${t.toFixed(2)} s. The inspected particle at x = ${params.probe} m is displaced ${f3(probeY)} m.`}>
      <line x1={20} x2={W - 20} y1={H / 2} y2={H / 2} className="wave-axis" />
      <polyline points={curve.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} className="wave-curve" />
      {xs.map((x) => (
        <circle key={x} cx={sx(x)} cy={sy(displacement(params, x, t))} r={3} className="wave-particle" />
      ))}
      <line x1={sx(params.probe)} x2={sx(params.probe)} y1={sy(params.amplitude) - 6} y2={sy(-params.amplitude) + 6} className="wave-probe-track" />
      <circle cx={sx(params.probe)} cy={sy(probeY)} r={6} className="wave-probe" />
      {crest <= WAVE_DOMAIN.max && (
        <g>
          <path d={`M ${sx(crest) - 6} ${sy(params.amplitude) - 16} l 6 8 l 6 -8 z`} className="wave-crest" />
          <text x={sx(crest) + 10} y={sy(params.amplitude) - 10} className="wave-label">
            a crest →
          </text>
        </g>
      )}
      <text x={24} y={H - 6} className="wave-label">
        x = 0
      </text>
      <text x={W - 22} y={H - 6} textAnchor="end" className="wave-label">
        x = {WAVE_DOMAIN.max} m
      </text>
    </svg>
  )
}

/* ---------- Graphs ---------- */

function Graph({ title, xLabel, points, marker, xMax, yMax }: { title: string; xLabel: string; points: [number, number][]; marker: number; xMax: number; yMax: number }) {
  const W = 300
  const H = 140
  const sx = (x: number) => 34 + (x / xMax) * (W - 44)
  const sy = (y: number) => H / 2 - (y / yMax) * (H / 2 - 14)
  return (
    <figure className="wave-graph">
      <figcaption className="small">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        <line x1={34} x2={W - 10} y1={H / 2} y2={H / 2} className="wave-axis" />
        <line x1={34} x2={34} y1={8} y2={H - 8} className="wave-axis" />
        <polyline points={points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} className="wave-curve" />
        <line x1={sx(marker)} x2={sx(marker)} y1={8} y2={H - 8} className="wave-marker" />
        <text x={W - 10} y={H / 2 + 14} textAnchor="end" className="wave-label">
          {xLabel}
        </text>
        <text x={4} y={14} className="wave-label">
          y (m)
        </text>
      </svg>
    </figure>
  )
}

/* ---------- Lab ---------- */

export function WaveLab({ experimentSwitch, guidePanel }: { experimentSwitch: ReactNode; guidePanel: ReactNode }) {
  const [params, setParams] = useState(() => parseWaveParams(window.location.search).params)
  // Shared waves open paused at t = 0.
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [tab, setTab] = useState<'inputs' | 'graphs' | 'values'>('inputs')
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const d = deriveWave(params)
  const tMax = Number((2 * d.period).toFixed(2))
  const entries = waveParamEntries(params)
  const entriesKey = JSON.stringify(entries)

  useEffect(() => {
    const search = withLabParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'physics', params: entries })

  // Real-time playback (1 s per s), looping over two periods; pauses in a hidden tab.
  useEffect(() => {
    if (!playing || reducedMotion) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (document.visibilityState !== 'hidden') setT((x) => (x + dt) % tMax)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, tMax, reducedMotion])

  const set = (key: WaveKey, value: number) => {
    setParams((p) => ({ ...p, [key]: value }))
    if (key === 'frequency') setT((x) => Math.min(x, 2 / value))
  }

  const snapshot = useMemo(() => sample(160, WAVE_DOMAIN.min, WAVE_DOMAIN.max, (x) => displacement(params, x, t)), [params, t])
  const history = useMemo(() => sample(160, 0, tMax, (s) => displacement(params, params.probe, s)), [params, tMax])

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="wave-inputs-heading">
      <h2 id="wave-inputs-heading" className="panel-title">
        Wave inputs
      </h2>
      <div className="params">
        {WAVE_KEYS.map((key) => (
          <RangeField key={key} spec={WAVE_SPECS[key]} value={params[key]} onChange={(v) => set(key, v)} />
        ))}
      </div>
      <p className="inline-note wave-speed-note">
        Speed is not a separate control: v = f λ = {params.frequency} Hz × {params.wavelength} m = {d.speed.toFixed(3)} m/s.
      </p>
      <button
        type="button"
        className="tool-button bordered"
        onClick={() => {
          setParams(DEFAULT_WAVE)
          setT(0)
          setPlaying(false)
        }}
      >
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>
      <ShareActions subject="physics" params={entries} restores="this wave (opened paused at t = 0)" />
    </section>
  )

  const probeY = displacement(params, params.probe, t)
  const probeV = mediumVelocity(params, params.probe, t)
  const values = (
    <div className="info-body">
      <dl className="readout">
        <div>
          <dt>Wave speed v = fλ</dt>
          <dd>{d.speed.toFixed(3)} m/s</dd>
        </div>
        <div>
          <dt>Period T = 1/f</dt>
          <dd>{d.period.toFixed(3)} s</dd>
        </div>
        <div>
          <dt>Wave number k = 2π/λ</dt>
          <dd>{d.waveNumber.toFixed(3)} m⁻¹</dd>
        </div>
        <div>
          <dt>Angular frequency ω = 2πf</dt>
          <dd>{d.angularFrequency.toFixed(3)} rad/s</dd>
        </div>
        <div>
          <dt>Displacement y(x₀, t)</dt>
          <dd className="wave-probe-value">{f3(probeY)} m</dd>
        </div>
        <div>
          <dt>Medium velocity ∂y/∂t at x₀</dt>
          <dd>{f3(probeV)} m/s (up and down only)</dd>
        </div>
      </dl>
      <p className="tangent-formula">
        <code>y(x, t) = A sin(kx − ωt)</code>
        <br />
        <code>
          y = {params.amplitude} sin({d.waveNumber.toFixed(3)}·x − {d.angularFrequency.toFixed(3)}·t)
        </code>
      </p>
      <p className="small">
        <strong>Transverse wave:</strong> each bit of the medium oscillates up and down about its rest position, perpendicular to the direction the wave travels. The
        pattern — and the energy — moves along +x at v; the medium itself does not travel with the wave. The highlighted particle shows this: it stays at x₀.
        <SourceLinks ids={['up1-16-1', 'up1-16-2']} />
      </p>
      <h3 className="section-title">Ideal assumptions</h3>
      <ul className="guide-list small">
        <li>A single sinusoidal wave travelling in +x, already filling the region shown (no start-up, no reflections).</li>
        <li>No damping: the amplitude stays constant.</li>
        <li>The speed is set through f and λ; what determines v in a real medium (for example tension and mass per length on a string) is not modelled.</li>
      </ul>
    </div>
  )

  const graphs = (
    <div className="wave-graphs">
      <Graph title={`Displacement vs position at t = ${t.toFixed(2)} s (a snapshot of the whole medium)`} xLabel="x (m)" points={snapshot} marker={params.probe} xMax={WAVE_DOMAIN.max} yMax={0.5} />
      <Graph title={`Displacement vs time at x₀ = ${params.probe} m (one particle’s history)`} xLabel="t (s)" points={history} marker={t} xMax={tMax} yMax={0.5} />
      <p className="muted small">
        The first graph changes as time runs; the second is fixed for a given x₀, with a marker at the current time. Peaks are one wavelength apart in the first and
        one period apart in the second.
      </p>
    </div>
  )

  const stage = (
    <section className="panel circuit-stage" aria-labelledby="wave-stage-heading">
      <div className="atomic-head">
        <h2 id="wave-stage-heading" className="panel-title">
          Travelling wave · t = {t.toFixed(2)} s
        </h2>
        {!reducedMotion && (
          <button type="button" className="tool-button bordered" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        )}
      </div>
      <Medium params={params} t={t} />
      <label className="param-label" htmlFor="wave-time">
        Time (scrub, 0 to 2 periods)
      </label>
      <input
        id="wave-time"
        type="range"
        className="wave-time"
        min={0}
        max={tMax}
        step={0.01}
        value={Math.min(t, tMax)}
        aria-valuetext={`${t.toFixed(2)} seconds`}
        onChange={(e) => {
          setPlaying(false)
          setT(Number(e.target.value))
        }}
      />
      <p className="muted small">
        Displacement is drawn at a larger scale than position so that small amplitudes stay visible; all values are in metres.
        {reducedMotion && ' Play is not offered because reduced motion is on; use the time slider.'}
      </p>
      {!isMobile && graphs}
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile physics">
        {experimentSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Wave lab panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'graphs', label: 'Graphs', content: <div className="panel">{graphs}</div> },
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
