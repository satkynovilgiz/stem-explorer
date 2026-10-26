import { Pause, Play, RotateCcw, StepBack, StepForward } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { linkTo } from '../../../lib/links'
import { withMathSection } from '../../../lib/mathSections'
import { motionEntries, parseMotionState } from '../../../lib/motionUrl'
import { formatTick, niceStep, ticksBetween } from '../../../lib/ticks'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import {
  clampTime,
  defaultParams,
  fmt,
  getMotion,
  MAX_DT,
  MIN_DT,
  MOTION_INVESTIGATIONS,
  MOTIONS,
  paramsProblem,
  samples,
  secant,
  type MotionDef,
  type MotionId,
  type MotionInvestigation,
  type MotionState,
  type Params,
  type Secant,
} from '../../../math/motion'
import { SourceLinks } from '../../guide/SourceLinks'

/* ---------- Labels: the same quantities in mathematical or physical words ---------- */

type Q = 's' | 'v' | 'a'
const UNIT: Record<Q, string> = { s: 'm', v: 'm/s', a: 'm/s²' }

function names(m: MotionDef, view: MotionState['view']): Record<Q, { title: string; axis: string; short: string }> {
  const x = m.symbol
  return view === 'math'
    ? {
        s: { title: `${x}(t), the function`, axis: `${x}(t) (m)`, short: `${x}(t)` },
        v: { title: `${x}′(t), its derivative`, axis: `${x}′(t) (m/s)`, short: `${x}′(t)` },
        a: { title: `${x}″(t), the second derivative`, axis: `${x}″(t) (m/s²)`, short: `${x}″(t)` },
      }
    : {
        s: { title: m.axis === 'vertical' ? 'Height y against time' : 'Position x against time', axis: `${x} (m)`, short: m.axis === 'vertical' ? 'height y' : 'position x' },
        v: { title: 'Velocity against time', axis: 'v (m/s)', short: 'velocity v' },
        a: { title: 'Acceleration against time', axis: 'a (m/s²)', short: 'acceleration a' },
      }
}

/* ---------- Graphs (one current-time marker shared by all three) ---------- */

const GW = 460
const GH = 170
const GM = { l: 50, r: 14, t: 24, b: 34 }

function MotionGraph({ which, m, q, t, sc, view }: { which: Q; m: MotionDef; q: Params; t: number; sc: Secant | null; view: MotionState['view'] }) {
  const id = useId()
  const label = names(m, view)[which]
  const end = m.tEnd(q)
  const pts = useMemo(() => samples(m, q, which), [m, q, which])
  let lo = Math.min(0, ...pts.map(([, v]) => v))
  let hi = Math.max(0, ...pts.map(([, v]) => v))
  if (hi - lo < 1e-9) {
    lo -= 1
    hi += 1
  }
  const vStep = niceStep(hi - lo, 4)
  const vTicks = ticksBetween(lo, hi, vStep)
  lo = vTicks[0]
  hi = vTicks[vTicks.length - 1]
  const tStep = niceStep(end, 5)
  const tTicks = ticksBetween(0, end, tStep).filter((v) => v <= end + 1e-9)
  const x = (time: number) => GM.l + (time / end) * (GW - GM.l - GM.r)
  const y = (v: number) => GM.t + (1 - (v - lo) / (hi - lo)) * (GH - GM.t - GM.b)
  const path = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(b).toFixed(1)}`).join('')
  const value = m[which](q, t)
  // Tangent to the position graph at t: slope s′(t), drawn across part of the time axis.
  const span = end * 0.22
  const tangent =
    which === 's' ? [Math.max(0, t - span), Math.min(end, t + span)].map((tt) => [tt, value + m.v(q, t) * (tt - t)] as const) : null
  const secantLine = which === 's' && sc?.ok ? ([[t, sc.s1], [sc.t2, sc.s2]] as const) : null
  return (
    <figure className="mo-graph">
      <figcaption className="mo-graph-title small">{label.title}</figcaption>
      <svg
        viewBox={`0 0 ${GW} ${GH}`}
        role="img"
        aria-labelledby={`${id}-d`}
      >
        <desc id={`${id}-d`}>
          {`${label.title} from t = 0 to ${fmt(end)} s. At t = ${fmt(t)} s, ${label.short} = ${fmt(value)} ${UNIT[which]}.`}
          {which === 's' && sc?.ok ? ` The secant from t = ${fmt(t)} s to ${fmt(sc.t2)} s has slope ${fmt(sc.slope)} m/s; the tangent has slope ${fmt(m.v(q, t))} m/s.` : ''}
        </desc>
        <defs>
          <clipPath id={`${id}-clip`}>
            <rect x={GM.l} y={GM.t} width={GW - GM.l - GM.r} height={GH - GM.t - GM.b} />
          </clipPath>
        </defs>
        {vTicks.map((v) => (
          <g key={`v${v}`}>
            <line x1={GM.l} x2={GW - GM.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'mo-zero' : 'graph-grid'} />
            <text x={GM.l - 5} y={y(v) + 4} textAnchor="end" className="wave-label">
              {formatTick(v, vStep)}
            </text>
          </g>
        ))}
        {tTicks.map((v) => (
          <text key={`t${v}`} x={x(v)} y={GH - GM.b + 14} textAnchor="middle" className="wave-label">
            {formatTick(v, tStep)}
          </text>
        ))}
        <line x1={GM.l} x2={GM.l} y1={GM.t} y2={GH - GM.b} className="wave-axis" />
        <text x={GW - GM.r} y={GH - 4} textAnchor="end" className="wave-label">
          t (s)
        </text>
        <text x={GM.l} y={12} className="wave-label">
          {label.axis}
        </text>
        <g clipPath={`url(#${id}-clip)`}>
          <path d={path} className={`mo-curve is-${which}`} />
          {tangent && <line x1={x(tangent[0][0])} y1={y(tangent[0][1])} x2={x(tangent[1][0])} y2={y(tangent[1][1])} className="mo-tangent" />}
          {secantLine && <line x1={x(secantLine[0][0])} y1={y(secantLine[0][1])} x2={x(secantLine[1][0])} y2={y(secantLine[1][1])} className="mo-secant" />}
        </g>
        {secantLine && (
          <>
            <rect x={x(secantLine[1][0]) - 4} y={y(secantLine[1][1]) - 4} width={8} height={8} className="mo-secant-point" />
            <text x={x(secantLine[1][0])} y={y(secantLine[1][1]) - 8} textAnchor="middle" className="wave-label">
              t + Δt
            </text>
          </>
        )}
        <line x1={x(t)} x2={x(t)} y1={GM.t} y2={GH - GM.b} className="mo-now" />
        <circle cx={x(t)} cy={y(value)} r={5} className="mo-point" />
      </svg>
    </figure>
  )
}

/* ---------- One-dimensional motion, driven by the same t ---------- */

function Track({ m, q, t }: { m: MotionDef; q: Params; t: number }) {
  const W = 460
  const pts = samples(m, q, 's')
  let lo = Math.min(...pts.map(([, v]) => v))
  let hi = Math.max(...pts.map(([, v]) => v))
  if (m.axis === 'vertical') lo = 0
  if (hi - lo < 1e-6) {
    lo -= 1
    hi += 1
  }
  const step = niceStep(hi - lo, 5)
  const ticks = ticksBetween(lo, hi, step)
  lo = ticks[0]
  hi = ticks[ticks.length - 1]
  const s = m.s(q, t)
  const v = m.v(q, t)
  const a = m.a(q, t)
  const vMax = Math.max(1e-9, ...pts.map((_, i) => Math.abs(m.v(q, pts[i][0]))))
  const aMax = Math.max(1e-9, ...pts.map((_, i) => Math.abs(m.a(q, pts[i][0]))))
  const arrow = (value: number, max: number) => (Math.abs(value) < 1e-9 ? 0 : (value / max) * 60)
  const dirWord = (value: number, pos: string, neg: string) => (Math.abs(value) < 1e-9 ? 'zero' : value > 0 ? pos : neg)
  const [pos, neg] = m.axis === 'vertical' ? ['up', 'down'] : ['right', 'left']
  const label = `${m.axis === 'vertical' ? 'Height' : 'Position'} ${fmt(s)} m; velocity ${fmt(v)} m/s (${dirWord(v, pos, neg)}); acceleration ${fmt(a)} m/s² (${dirWord(a, pos, neg)}).`
  if (m.axis === 'vertical') {
    const H = 240
    const yy = (val: number) => 36 + (1 - (val - lo) / (hi - lo)) * (H - 66)
    const cy = yy(s)
    return (
      <svg className="mo-track" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Vertical motion at t = ${fmt(t)} s. ${label} Up is positive.`}>
        <line x1={150} x2={150} y1={yy(hi)} y2={yy(lo)} className="wave-axis" />
        {ticks.map((v2) => (
          <text key={v2} x={140} y={yy(v2) + 4} textAnchor="end" className="wave-label">
            {formatTick(v2, step)} m
          </text>
        ))}
        <line x1={150} x2={290} y1={yy(0)} y2={yy(0)} className="mo-ground" />
        <text x={292} y={yy(0) + 4} className="wave-label">
          ground (y = 0)
        </text>
        <text x={150} y={14} textAnchor="middle" className="wave-label">
          ↑ positive (up)
        </text>
        <circle cx={200} cy={cy} r={9} className="mo-object" />
        {arrow(v, vMax) !== 0 && <Arrow x1={222} y1={cy} x2={222} y2={cy - arrow(v, vMax)} cls="mo-arrow-v" />}
        <text x={232} y={cy - arrow(v, vMax) / 2 + 4} className="wave-label">
          v = {fmt(v)} m/s
        </text>
        <Arrow x1={330} y1={cy} x2={330} y2={cy - arrow(a, aMax)} cls="mo-arrow-a" />
        <text x={340} y={cy - arrow(a, aMax) / 2 + 4} className="wave-label">
          a = {fmt(a)} m/s²
        </text>
      </svg>
    )
  }
  const H = 120
  const xx = (val: number) => 30 + ((val - lo) / (hi - lo)) * (W - 60)
  const cx = xx(s)
  return (
    <svg className="mo-track" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Motion along a line at t = ${fmt(t)} s. ${label} Right is positive.`}>
      <line x1={xx(lo)} x2={xx(hi)} y1={70} y2={70} className="wave-axis" />
      {ticks.map((v2) => (
        <g key={v2}>
          <line x1={xx(v2)} x2={xx(v2)} y1={66} y2={74} className="wave-axis" />
          <text x={xx(v2)} y={90} textAnchor="middle" className="wave-label">
            {formatTick(v2, step)}
          </text>
        </g>
      ))}
      <text x={W - 30} y={106} textAnchor="end" className="wave-label">
        {m.symbol} (m), positive to the right →
      </text>
      <circle cx={cx} cy={70} r={9} className="mo-object" />
      {arrow(v, vMax) !== 0 && <Arrow x1={cx} y1={44} x2={cx + arrow(v, vMax)} y2={44} cls="mo-arrow-v" />}
      <text x={cx} y={34} textAnchor="middle" className="wave-label">
        v = {fmt(v)} m/s
      </text>
      {arrow(a, aMax) !== 0 && <Arrow x1={cx} y1={58} x2={cx + arrow(a, aMax)} y2={58} cls="mo-arrow-a" />}
      <text x={cx} y={16} textAnchor="middle" className="wave-label">
        a = {fmt(a)} m/s²
      </text>
    </svg>
  )
}

function Arrow({ x1, y1, x2, y2, cls }: { x1: number; y1: number; x2: number; y2: number; cls: string }) {
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const h = 7
  const p1 = `${x2 - h * Math.cos(ang - 0.45)},${y2 - h * Math.sin(ang - 0.45)}`
  const p2 = `${x2 - h * Math.cos(ang + 0.45)},${y2 - h * Math.sin(ang + 0.45)}`
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon points={`${x2},${y2} ${p1} ${p2}`} />
    </g>
  )
}

/* ---------- Inputs ---------- */

function NumberField({ label, value, min, max, step, onValue, describe, check }: { label: string; value: number; min: number; max: number; step: number; onValue: (v: number) => void; describe?: string; check?: (v: number) => string | null }) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  const [error, setError] = useState<string | null>(null)
  if (shown !== value) {
    setShown(value)
    setText(String(value))
    setError(null)
  }
  return (
    <div className="enz-field">
      <label className="param-label" htmlFor={`${id}-n`}>
        {label}
      </label>
      <div className="sol-input-row">
        <input type="range" className="enz-range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} aria-label={`${label} slider`} onChange={(e) => onValue(Number(e.target.value))} />
        <input
          id={`${id}-n`}
          className="param-input enz-number"
          inputMode="decimal"
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-e` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            const v = /^[-+]?(\d+\.?\d*|\.\d+)$/.test(e.target.value.trim()) ? Number(e.target.value) : Number.NaN
            const why = !Number.isFinite(v) ? 'Enter a number.' : v < min || v > max ? `Use a value from ${min} to ${max}.` : (check?.(v) ?? null)
            setError(why)
            if (!why) {
              setShown(v)
              onValue(v)
            }
          }}
        />
      </div>
      {describe && <p className="muted small">{describe}</p>}
      {error && (
        <p id={`${id}-e`} className="small status-error">
          {error} The last valid value is kept.
        </p>
      )}
    </div>
  )
}

/* ---------- The lab ---------- */

export function MotionLab({ sectionSwitch, guidePanel }: { sectionSwitch: ReactNode; guidePanel: ReactNode }) {
  const [st, setSt] = useState<MotionState>(() => parseMotionState(window.location.search).state)
  const [playing, setPlaying] = useState(false)
  const [investigation, setInvestigation] = useState<MotionInvestigation | null>(null)
  const [paramError, setParamError] = useState<string | null>(null)
  const [tab, setTab] = useState<'setup' | 'explain'>('setup')
  const reduced = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const m = getMotion(st.motion)
  const end = m.tEnd(st.params)
  const sc = secant(m, st.params, st.t, st.dt)
  const running = playing && !reduced && st.t < end

  // Links store the paused state only; while playing, the address is not rewritten every frame.
  const entries = motionEntries(st)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    if (running) return
    const search = withMathSection(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey, running])
  useRecordVisit({ subject: 'mathematics', params: running ? {} : entries })

  // Playback: real time (1 s of motion per second), from the current t to the end (landing).
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!running) return
    let frame = 0
    last.current = null
    const tick = (now: number) => {
      if (document.visibilityState !== 'hidden') {
        const dt = last.current === null ? 0 : (now - last.current) / 1000
        setSt((s) => ({ ...s, t: Math.min(getMotion(s.motion).tEnd(s.params), s.t + dt) }))
      }
      last.current = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running])

  const pause = () => setPlaying(false)
  const setT = (t: number) => (pause(), setSt((s) => ({ ...s, t: clampTime(getMotion(s.motion), s.params, t) })))
  const chooseMotion = (id: MotionId) => {
    pause()
    setInvestigation(null)
    setParamError(null)
    const def = getMotion(id)
    const params = defaultParams(def)
    setSt((s) => ({ ...s, motion: id, params, t: clampTime(def, params, Math.min(s.t, 1)), dt: 1 }))
  }
  const setParam = (key: string, v: number) => {
    const params = { ...st.params, [key]: v }
    const why = paramsProblem(m, params)
    setParamError(why)
    if (why) return
    pause()
    setSt((s) => ({ ...s, params, t: clampTime(m, params, s.t) }))
  }
  const start = (inv: MotionInvestigation) => {
    pause()
    setParamError(null)
    setInvestigation(inv)
    setSt((s) => ({ ...inv.state, params: { ...inv.state.params }, view: s.view }))
  }
  const sameAs = (inv: MotionInvestigation) =>
    inv.state.motion === st.motion && Math.abs(inv.state.t - st.t) < 1e-9 && Object.entries(inv.state.params).every(([k, v]) => st.params[k] === v)
  const active = investigation && sameAs(investigation) ? investigation : null
  const label = names(m, st.view)
  const sub = m.sub(st.params, st.t)
  const playLabel = st.t >= end ? (m.id === 'vertical-throw' ? 'Landed' : 'At the end') : running ? 'Pause' : 'Play'

  const controls = (
    <div className="mo-playback" role="group" aria-label="Time controls">
      {!reduced && (
        <button type="button" className="button" disabled={st.t >= end} onClick={() => setPlaying((p) => !p)} aria-pressed={running}>
          {running ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          {playLabel}
        </button>
      )}
      <button type="button" className="tool-button bordered" disabled={st.t <= 0} onClick={() => setT(st.t - 0.1)}>
        <StepBack size={15} aria-hidden="true" />
        <span>−0.1 s</span>
      </button>
      <button type="button" className="tool-button bordered" disabled={st.t >= end} onClick={() => setT(st.t + 0.1)}>
        <StepForward size={15} aria-hidden="true" />
        <span>+0.1 s</span>
      </button>
      <button type="button" className="tool-button bordered" onClick={() => setT(0)}>
        <RotateCcw size={15} aria-hidden="true" />
        <span>Reset to t = 0</span>
      </button>
      <label className="mo-scrub">
        <span className="param-label">
          Time t = <output>{fmt(st.t)}</output> s of {fmt(end)} s{m.id === 'vertical-throw' ? ' (landing)' : ''}
        </span>
        {/* The slider moves in 0.01 s steps; its last step is the end of the motion itself (e.g. the landing). */}
        <input type="range" min={0} max={end} step={0.01} value={st.t} aria-label="Current time t (s)" onChange={(e) => setT(Number(e.target.value) > end - 0.01 ? end : Number(e.target.value))} />
      </label>
      {reduced && <p className="muted small">Reduced motion is on: move through time with the slider or the step buttons.</p>}
    </div>
  )

  const readouts = (
    <table className="data-table mo-readouts">
      <caption className="small">At t = {fmt(st.t)} s (the graphs, the motion and these numbers all use this time)</caption>
      <tbody>
        <tr>
          <th scope="row">{st.view === 'math' ? label.s.short : `${label.s.short[0].toUpperCase()}${label.s.short.slice(1)}`}</th>
          <td>{fmt(m.s(st.params, st.t))} m</td>
        </tr>
        <tr>
          <th scope="row">{st.view === 'math' ? `${label.v.short}, the tangent slope` : 'Instantaneous velocity v'}</th>
          <td>{fmt(m.v(st.params, st.t))} m/s</td>
        </tr>
        <tr>
          <th scope="row">{st.view === 'math' ? `${label.a.short}` : 'Acceleration a'}</th>
          <td>{fmt(m.a(st.params, st.t))} m/s²</td>
        </tr>
        <tr>
          <th scope="row">{st.view === 'math' ? 'Secant slope over [t, t + Δt]' : `Average velocity Δ${m.symbol}/Δt over [t, t + Δt]`}</th>
          <td>{sc.ok ? `${fmt(sc.slope, 5)} m/s` : '—'}</td>
        </tr>
        <tr>
          <th scope="row">Average minus instantaneous</th>
          <td>{sc.ok ? `${fmt(sc.slope - m.v(st.params, st.t), 3)} m/s` : '—'}</td>
        </tr>
      </tbody>
    </table>
  )

  const stage = (
    <div className="mo-lab">
      <section className="panel" aria-labelledby="mo-heading">
        <h2 id="mo-heading" className="panel-title">
          {m.name} · t = {fmt(st.t)} s
        </h2>
        {controls}
        <Track m={m} q={st.params} t={st.t} />
        <div className="mo-graphs">
          <MotionGraph which="s" m={m} q={st.params} t={st.t} sc={sc} view={st.view} />
          <MotionGraph which="v" m={m} q={st.params} t={st.t} sc={null} view={st.view} />
          <MotionGraph which="a" m={m} q={st.params} t={st.t} sc={null} view={st.view} />
        </div>
        <p className="muted small">
          On the first graph: the solid straight line is the tangent at t (slope {label.v.short}); the dashed line is the secant to t + Δt (square marker), whose slope is the
          average velocity. The vertical line marks the same t on all three graphs.
        </p>
        {readouts}
        {!sc.ok && (
          <p className="small status-error" role="status">
            {sc.reason}
          </p>
        )}
      </section>
    </div>
  )

  const setup = (
    <section className="panel" aria-labelledby="mo-setup">
      <h2 id="mo-setup" className="panel-title">
        Derivatives and motion
      </h2>
      <div className="segmented section-switch" role="group" aria-label="Explain as">
        {(['math', 'phys'] as const).map((v) => (
          <button key={v} type="button" className="segmented-option" aria-pressed={st.view === v} onClick={() => setSt((s) => ({ ...s, view: v }))}>
            {v === 'math' ? 'Mathematics' : 'Physics'}
          </button>
        ))}
      </div>
      <p className="muted small">Switching changes the words and labels only; the motion and its numbers stay the same.</p>
      <label className="param-label" htmlFor="mo-motion">
        Motion
      </label>
      <select id="mo-motion" className="select" value={st.motion} onChange={(e) => chooseMotion(e.target.value as MotionId)}>
        {MOTIONS.map((mm) => (
          <option key={mm.id} value={mm.id}>
            {mm.name} ({mm.family.toLowerCase()} position)
          </option>
        ))}
      </select>
      <p className="mo-formula">{m.position}</p>
      {m.params.map((s) => (
        <NumberField key={`${m.id}-${s.key}`} label={`${s.label} ${s.symbol} (${s.unit})`} value={st.params[s.key]} min={s.min} max={s.max} step={s.step} onValue={(v) => setParam(s.key, v)} />
      ))}
      {paramError && (
        <p className="small status-error" role="status">
          {paramError} Nothing was changed.
        </p>
      )}
      <NumberField
        label="Δt for the secant (s)"
        value={st.dt}
        min={-MAX_DT}
        max={MAX_DT}
        step={0.001}
        describe={`Not zero; |Δt| from ${MIN_DT} to ${MAX_DT} s. A negative Δt uses the interval before t.`}
        check={(v) => (v === 0 ? 'Δt must not be zero: the average velocity divides by Δt.' : Math.abs(v) < MIN_DT ? `Use |Δt| of at least ${MIN_DT} s.` : null)}
        onValue={(dt) => setSt((s) => ({ ...s, dt }))}
      />
      <div className="share-row">
        {[1, 0.1, 0.01, 0.001].map((d) => (
          <button key={d} type="button" className="tool-button bordered" aria-pressed={st.dt === d} onClick={() => setSt((s) => ({ ...s, dt: d }))}>
            Δt = {d} s
          </button>
        ))}
      </div>
      <h3 className="section-title">Investigations</h3>
      <div className="enz-investigations" role="group" aria-label="Investigations">
        {MOTION_INVESTIGATIONS.map((inv) => (
          <button key={inv.id} type="button" className="tool-button bordered" aria-pressed={active?.id === inv.id} onClick={() => start(inv)}>
            {inv.title}
          </button>
        ))}
      </div>
      {active && (
        <div className="enz-investigation" role="status">
          <p className="small">
            <strong>{active.question}</strong>
          </p>
          <p className="small">{active.explain(st)}</p>
        </div>
      )}
      <ShareActions subject="mathematics" params={entries} restores="this motion, time, Δt and explanation (opened paused)" />
    </section>
  )

  const explain = (
    <section className="panel info" aria-labelledby="mo-explain">
      <header className="info-header">
        <p className="eyebrow">Mathematics · with physics</p>
        <h2 id="mo-explain" className="info-title">
          {st.view === 'math' ? 'Derivative as a slope' : 'Position, velocity and acceleration'}
        </h2>
      </header>
      <div className="info-body">
        <p className="mo-formula">{m.position}</p>
        <p className="mo-formula">{m.velocity}</p>
        <p className="mo-formula">{m.acceleration}</p>
        <h3 className="section-title">At t = {fmt(st.t)} s</h3>
        <p className="mo-sub">{sub.s}</p>
        <p className="mo-sub">{sub.v}</p>
        <p className="mo-sub">{sub.a}</p>
        <p className="mo-sub">
          {sc.ok
            ? `Δ${m.symbol}/Δt = (${m.symbol}(${fmt(sc.t2)}) − ${m.symbol}(${fmt(st.t)})) / ${fmt(st.dt)} s = (${fmt(sc.s2, 5)} − ${fmt(sc.s1, 5)}) m / ${fmt(st.dt)} s = ${fmt(sc.slope, 5)} m/s`
            : sc.reason}
        </p>
        {st.view === 'math' ? (
          <>
            <p className="small">
              The secant through (t, {m.symbol}(t)) and (t + Δt, {m.symbol}(t + Δt)) has slope ({m.symbol}(t + Δt) − {m.symbol}(t)) / Δt. As Δt shrinks toward 0 the secant approaches
              the tangent, and its slope approaches the derivative {m.symbol}′(t). Differentiating again gives {m.symbol}″(t), the slope of the {m.symbol}′ graph.
              <SourceLinks ids={['calc1-3-1', 'calc1-3-4']} />
            </p>
            <p className="small">
              Family: {m.family.toLowerCase()}.{' '}
              {m.family === 'Linear'
                ? 'A linear function has a constant derivative, and its second derivative is 0.'
                : m.family === 'Quadratic'
                  ? 'A quadratic has a linear derivative and a constant second derivative.'
                  : 'The derivative of a cosine is a negative sine, and differentiating twice returns −ω² times the function.'}
              <SourceLinks ids={['calc1-3-3', 'calc1-3-5']} />
            </p>
          </>
        ) : (
          <>
            <p className="small">
              Average velocity is the displacement divided by the elapsed time, Δ{m.symbol}/Δt. As Δt → 0 it approaches the instantaneous velocity, the slope of the tangent to the
              position graph. Acceleration is the rate of change of velocity, the slope of the velocity graph.
              <SourceLinks ids={['up-3-2', 'up-3-3']} />
            </p>
            <p className="small">
              <strong>Direction.</strong> {m.direction}
              <SourceLinks ids={m.sources} />
            </p>
          </>
        )}
        <p className="small">
          Related: <AppLink href={linkTo('physics', { speed: '20', angle: '60', height: '0', gravity: '9.81' })}>Physics › Projectile motion</AppLink> (the vertical part of a launch is a
          vertical throw) and <AppLink href={linkTo('physics', { experiment: 'spring' })}>Physics › Spring–mass oscillator</AppLink>; <AppLink href={linkTo('mathematics', { msec: 'functions', fn: 'quadratic' })}>Mathematics › 2D functions</AppLink> has
          the same secant and tangent tools for other functions.
        </p>
        <p className="small muted">
          Ideal one-dimensional motions with exact formulas: no friction or air resistance, and the oscillation has no damping. Numbers are shown to three significant figures
          (five for the secant slope, so small changes of Δt stay visible).
        </p>
      </div>
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {sectionSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Motion panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'setup', label: 'Set up', content: setup },
            { id: 'explain', label: 'Explanation', content: explain },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem">
      <aside className="chem-side chem-side--left">
        {sectionSwitch}
        {setup}
      </aside>
      <div className="chem-stage process-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        {explain}
      </aside>
    </div>
  )
}
