import { Pause, Play, RotateCcw, Shuffle, StepForward } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { COMPARTMENT_AREA, concentration, createDiffusion, DIFFUSION_LIMITS, GRID, MAX_STEPS, netMovement, type DiffusionParams, type StepRecord } from '../../../data/biology/diffusion'
import { usePrefersReducedMotion } from '../../../lib/hooks'
import { MAX_SEED, newSeed } from '../../../lib/random'
import { SourceLinks } from '../../guide/SourceLinks'

const CELL = 12
const STEPS_PER_SECOND = 20

/* ---------- Box ---------- */

function Box({ x, y, kind, mode, step }: { x: Int16Array; y: Int16Array; kind: Uint8Array; mode: DiffusionParams['mode']; step: number }) {
  const W = GRID.width * CELL
  const H = GRID.height * CELL
  const wallX = GRID.wall * CELL
  const [g0, g1] = GRID.gap
  const dots = []
  for (let i = 0; i < x.length; i++) {
    const cx = x[i] * CELL + CELL / 2
    const cy = y[i] * CELL + CELL / 2
    dots.push(kind[i] === 0 ? <circle key={i} cx={cx} cy={cy} r={3.2} className="dif-a" /> : <rect key={i} x={cx - 3.2} y={cy - 3.2} width={6.4} height={6.4} className="dif-b" />)
  }
  return (
    <svg className="dif-svg" viewBox={`-4 -4 ${W + 8} ${H + 8}`} role="img" aria-label={`Two equal compartments at step ${step}. ${mode === 'gap' ? `The barrier has an opening in rows ${g0 + 1}–${g1 + 1}.` : 'The barrier is a membrane that only round particles (A) can cross.'}`}>
      <rect x={0} y={0} width={W} height={H} className="dif-box" />
      {mode === 'gap' ? (
        <>
          <line x1={wallX} x2={wallX} y1={0} y2={g0 * CELL} className="dif-wall" />
          <line x1={wallX} x2={wallX} y1={(g1 + 1) * CELL} y2={H} className="dif-wall" />
        </>
      ) : (
        <line x1={wallX} x2={wallX} y1={0} y2={H} className="dif-membrane" />
      )}
      {dots}
    </svg>
  )
}

/* ---------- Counts over time ---------- */

function CountsGraph({ history, total }: { history: readonly StepRecord[]; total: number }) {
  const W = 360
  const H = 160
  const M = { l: 36, r: 10, t: 10, b: 28 }
  const n = history.length
  const xMax = Math.max(100, n - 1)
  const sx = (i: number) => M.l + (i / xMax) * (W - M.l - M.r)
  const sy = (c: number) => H - M.b - (c / total) * (H - M.t - M.b)
  const every = Math.max(1, Math.ceil(n / 300))
  const pts = (k: 'aLeft' | 'aRight') =>
    history
      .filter((_, i) => i % every === 0 || i === n - 1)
      .map((h, j, arr) => `${sx(j === arr.length - 1 ? n - 1 : j * every)},${sy(h[k])}`)
      .join(' ')
  return (
    <figure className="wave-graph dif-graph">
      <figcaption className="small">Round particles (A) in each compartment, by step</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Counts of A over ${n - 1} steps: now ${history[n - 1].aLeft} left and ${history[n - 1].aRight} right, out of ${total}.`}>
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="wave-axis" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className="wave-axis" />
        <line x1={M.l} x2={W - M.r} y1={sy(total / 2)} y2={sy(total / 2)} className="graph-grid" />
        <text x={M.l - 4} y={sy(total) + 4} textAnchor="end" className="wave-label">
          {total}
        </text>
        <text x={M.l - 4} y={sy(total / 2) + 4} textAnchor="end" className="wave-label">
          {total / 2}
        </text>
        <text x={M.l - 4} y={sy(0) + 4} textAnchor="end" className="wave-label">
          0
        </text>
        <polyline points={pts('aLeft')} className="dif-line-left" />
        <polyline points={pts('aRight')} className="dif-line-right" />
        <text x={W - M.r} y={H - 8} textAnchor="end" className="wave-label">
          step {xMax}
        </text>
      </svg>
      <p className="muted small">Solid line: left compartment. Dashed line: right compartment. The faint line marks half of the particles.</p>
    </figure>
  )
}

/* ---------- View ---------- */

export function DiffusionView({ params, onParams, shareParams }: { params: DiffusionParams; onParams: (p: DiffusionParams) => void; shareParams: Record<string, string> }) {
  const id = useId()
  const reducedMotion = usePrefersReducedMotion()
  // The run in progress. Changing a setting or pressing Reset starts a new run at step 0, paused.
  const [sim, setSim] = useState(() => createDiffusion(params))
  const [, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [seedText, setSeedText] = useState(String(params.seed))
  const [seedError, setSeedError] = useState('')
  const raf = useRef(0)

  useEffect(() => {
    if (!playing || reducedMotion) return
    let last = performance.now()
    let acc = 0
    const loop = (now: number) => {
      acc += (Math.min(0.1, (now - last) / 1000) * STEPS_PER_SECOND)
      last = now
      if (document.visibilityState !== 'hidden' && acc >= 1) {
        const k = Math.floor(acc)
        acc -= k
        for (let i = 0; i < k; i++) sim.step()
        setTick((t) => t + 1)
        if (sim.steps >= MAX_STEPS) {
          setPlaying(false)
          return
        }
      }
      raf.current = requestAnimationFrame(loop)
    }
    raf.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, reducedMotion, sim])

  const advance = (k: number) => {
    setPlaying(false)
    for (let i = 0; i < k; i++) sim.step()
    setTick((t) => t + 1)
  }
  const reset = () => {
    setPlaying(false)
    setSim(createDiffusion(params))
  }

  const h = sim.history[sim.history.length - 1]
  const recent = netMovement(sim.history, 50)
  const set = (patch: Partial<DiffusionParams>) => {
    const next = { ...params, ...patch }
    next.startLeft = Math.min(next.startLeft, next.count)
    setPlaying(false)
    setSim(createDiffusion(next))
    onParams(next)
  }
  const atEnd = sim.steps >= MAX_STEPS
  const summary =
    sim.steps === 0
      ? `Step 0. ${h.aLeft} round particles on the left and ${h.aRight} on the right${params.blocked ? `; ${h.bLeft} square particles on the left` : ''}.`
      : `Step ${sim.steps}. Left ${h.aLeft}, right ${h.aRight}. In the last ${Math.min(50, sim.steps)} steps, ${recent.toRight} crossed to the right and ${recent.toLeft} to the left (net ${recent.net >= 0 ? `${recent.net} to the right` : `${-recent.net} to the left`}).`

  return (
    <section className="panel dif-lab" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        Diffusion between two compartments · step {sim.steps}
      </h2>
      <div className="share-row dif-controls">
        {!reducedMotion && (
          <button type="button" className="tool-button bordered" aria-pressed={playing} disabled={atEnd} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        )}
        <button type="button" className="tool-button bordered" disabled={atEnd} onClick={() => advance(1)}>
          <StepForward size={15} aria-hidden="true" />
          <span>1 step</span>
        </button>
        <button type="button" className="tool-button bordered" disabled={atEnd} onClick={() => advance(100)}>
          <span>+100 steps</span>
        </button>
        <button type="button" className="tool-button bordered" onClick={reset}>
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>
      <Box x={sim.x} y={sim.y} kind={sim.kind} mode={params.mode} step={sim.steps} />
      <p className="muted small">
        Time is counted in steps: in each step every particle tries one random move to a neighbouring cell; a move into the box wall or a closed part of the barrier is not taken. Steps are not seconds, and the grid is not a
        real size. Opens paused at step 0; the run stops at step {MAX_STEPS}.
        {reducedMotion && ' Play is not offered because reduced motion is on; use the step buttons.'}
      </p>
      <p className="visually-hidden" role="status" aria-live="polite">
        {playing ? '' : summary}
      </p>

      <table className="data-table dif-table">
        <caption className="small">Exact counts at step {sim.steps} (the motion is random; these numbers are not estimates)</caption>
        <thead>
          <tr>
            <th scope="col">Particles</th>
            <th scope="col">Left</th>
            <th scope="col">Right</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">● A (round)</th>
            <td>{h.aLeft}</td>
            <td>{h.aRight}</td>
            <td>{h.aLeft + h.aRight}</td>
          </tr>
          {params.blocked > 0 && (
            <tr>
              <th scope="row">■ B (square)</th>
              <td>{h.bLeft}</td>
              <td>{h.bRight}</td>
              <td>{h.bLeft + h.bRight}</td>
            </tr>
          )}
          <tr>
            <th scope="row">A concentration (per 100 cells)</th>
            <td>{concentration(h.aLeft).toFixed(1)}</td>
            <td>{concentration(h.aRight).toFixed(1)}</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
      <p className="small dif-net">
        Last {Math.min(50, sim.steps)} steps: {recent.toRight} A crossed left → right, {recent.toLeft} right → left; net {recent.net === 0 ? 'zero' : recent.net > 0 ? `${recent.net} to the right` : `${-recent.net} to the left`}.
      </p>
      <CountsGraph history={sim.history} total={params.count} />

      <fieldset className="dif-settings">
        <legend className="param-label">Settings (changing one starts a new run at step 0)</legend>
        <label className="param-label" htmlFor={`${id}-n`}>
          Round particles A: {params.count}
        </label>
        <input id={`${id}-n`} type="range" min={DIFFUSION_LIMITS.count[0]} max={DIFFUSION_LIMITS.count[1]} step={10} value={params.count} onChange={(e) => set({ count: Number(e.target.value), startLeft: Number(e.target.value) })} />
        <label className="param-label" htmlFor={`${id}-l`}>
          A starting on the left: {params.startLeft} of {params.count}
        </label>
        <input id={`${id}-l`} type="range" min={0} max={params.count} step={1} value={params.startLeft} onChange={(e) => set({ startLeft: Number(e.target.value) })} />
        <label className="param-label" htmlFor={`${id}-b`}>
          Square particles B (start on the left): {params.blocked}
        </label>
        <input id={`${id}-b`} type="range" min={DIFFUSION_LIMITS.blocked[0]} max={DIFFUSION_LIMITS.blocked[1]} step={10} value={params.blocked} onChange={(e) => set({ blocked: Number(e.target.value) })} />
        <div className="segmented" role="group" aria-label="Barrier">
          <button type="button" className="segmented-option" aria-pressed={params.mode === 'gap'} onClick={() => set({ mode: 'gap' })}>
            Wall with an opening
          </button>
          <button type="button" className="segmented-option" aria-pressed={params.mode === 'membrane'} onClick={() => set({ mode: 'membrane' })}>
            Membrane (A crosses, B does not)
          </button>
        </div>
        <p className="muted small">
          {params.mode === 'gap'
            ? 'Both kinds of particle can pass, but only through the opening.'
            : 'Defined crossing rule: round particles (A) can cross anywhere along the membrane; square particles (B) never cross it.'}
        </p>
        <label className="param-label" htmlFor={`${id}-s`}>
          Seed (the same seed always gives the same run)
        </label>
        <div className="sol-input-row">
          <input
            id={`${id}-s`}
            className="param-input"
            type="text"
            inputMode="numeric"
            value={seedText}
            aria-invalid={seedError ? true : undefined}
            onChange={(e) => {
              setSeedText(e.target.value)
              const v = /^\d{1,10}$/.test(e.target.value.trim()) ? Number(e.target.value) : Number.NaN
              if (Number.isInteger(v) && v <= MAX_SEED) {
                setSeedError('')
                set({ seed: v })
              } else setSeedError(`Use a whole number from 0 to ${MAX_SEED}.`)
            }}
          />
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              const s = newSeed()
              setSeedText(String(s))
              setSeedError('')
              set({ seed: s })
            }}
          >
            <Shuffle size={15} aria-hidden="true" />
            <span>New seed</span>
          </button>
        </div>
        {seedError && <p className="small status-error">{seedError}</p>}
      </fieldset>
      <ShareActions subject="biology" params={shareParams} restores="these settings and seed (opened paused at step 0)" />
      <p className="muted small">Each compartment has {COMPARTMENT_AREA} cells.</p>
    </section>
  )
}

export function DiffusionPanel() {
  return (
    <section className="panel info" aria-labelledby="dif-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="dif-panel-heading" className="info-title">
          Diffusion: random motion, net movement
        </h2>
      </header>
      <div className="info-body">
        <p className="small">
          Each particle moves at random; none is “aimed” at the emptier side. But when one side has more particles, more of them happen to cross from that side, so there is a{' '}
          <strong>net movement</strong> down the concentration gradient until the particles are spread evenly.
          <SourceLinks ids={['bio-5-2']} />
        </p>
        <p className="small">
          <strong>Dynamic equilibrium.</strong> Once the concentrations are equal, particles keep moving and crossing both ways, but there is no net movement: the counts only
          fluctuate around half each.
          <SourceLinks ids={['bio-5-2']} />
        </p>
        <p className="small">
          <strong>Which particles cross.</strong> With the membrane, the rule is set by the model: round particles (A) cross and square particles (B) do not. Real membranes are
          selectively permeable: small nonpolar molecules cross the lipid layer, while ions and many polar molecules need channel or carrier proteins.
          <SourceLinks ids={['bio-5-2']} />
        </p>
        <p className="small">
          <strong>Not osmosis.</strong> Osmosis is the movement of water across a semipermeable membrane. This model has no water; it shows solute particles diffusing.
          <SourceLinks ids={['bio-5-2']} />
        </p>
        <h3 className="section-title">Random run, exact numbers</h3>
        <ul className="guide-list small">
          <li>The motion is random but seeded: the same settings and seed always give the same run, step for step.</li>
          <li>The counts and concentrations shown are exact for the particles in this run. A different seed gives different fluctuations, not different rules.</li>
          <li>Particles are never created or lost: the totals stay the same at every step.</li>
        </ul>
        <h3 className="section-title">Simplified</h3>
        <ul className="guide-list small">
          <li>A conceptual model: no real time scale, distances or molecules, and no physiological rates.</li>
          <li>Particles do not collide or interact; temperature, mass and other factors that change diffusion rates are not modelled.</li>
        </ul>
      </div>
    </section>
  )
}
