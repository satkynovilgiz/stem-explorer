import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery } from '../../../lib/hooks'
import { functionsEntries, parseFunctionsState, withMathSection, X_RANGE, type FunctionsState } from '../../../lib/mathSections'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { defaultFnParams, FUNCTIONS, getFunction, integrate, plotSegments, secantSlope, type FunctionId } from '../../../math/functions'
import { formatCoefficient } from '../../../math/surfaces'
import { SourceLinks } from '../../guide/SourceLinks'

const fmt = (v: number) => formatCoefficient(v).text
const W = 560
const H = 380

/* ---------- Plot ---------- */

function Plot({ state, view, show, h }: { state: FunctionsState; view: { cx: number; cy: number; span: number }; show: { tangent: boolean; secant: boolean; integral: boolean }; h: number }) {
  const fn = getFunction(state.fn)
  const p = state.params
  const x0 = view.cx - view.span / 2
  const x1 = view.cx + view.span / 2
  const ySpan = (view.span * H) / W
  const y0 = view.cy - ySpan / 2
  const y1 = view.cy + ySpan / 2
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W
  const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H
  const segments = useMemo(() => plotSegments(fn, p, x0, x1, 800, Math.max(Math.abs(y0), Math.abs(y1)) * 4), [fn, p, x0, x1, y0, y1])
  const tick = view.span > 20 ? 5 : view.span > 8 ? 2 : 1
  const ticks = (from: number, to: number) => Array.from({ length: Math.floor(to / tick) - Math.ceil(from / tick) + 1 }, (_, i) => (Math.ceil(from / tick) + i) * tick)
  const defined = fn.inDomain(p, state.x)
  const fx = defined ? fn.f(p, state.x) : null
  const slope = defined ? fn.df(p, state.x) : null
  const sec = secantSlope(fn, p, state.x, h)
  const line = (m: number, ax: number, ay: number) => `M ${sx(x0)} ${sy(ay + m * (x0 - ax))} L ${sx(x1)} ${sy(ay + m * (x1 - ax))}`
  const [ia, ib] = state.a <= state.b ? [state.a, state.b] : [state.b, state.a]
  const areaPath = (positive: boolean) => {
    if (!fn.inDomain(p, ia) || !fn.inDomain(p, ib)) return ''
    const n = 200
    const pts: string[] = [`M ${sx(ia)} ${sy(0)}`]
    for (let i = 0; i <= n; i++) {
      const x = ia + ((ib - ia) * i) / n
      const y = fn.f(p, x)
      pts.push(`L ${sx(x)} ${sy(positive ? Math.max(0, y) : Math.min(0, y))}`)
    }
    pts.push(`L ${sx(ib)} ${sy(0)} Z`)
    return pts.join(' ')
  }
  return (
    <svg className="fn-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Graph of ${fn.formula} for x from ${fmt(x0)} to ${fmt(x1)}.`}>
      <defs>
        <pattern id="neg-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" className="fn-hatch" />
        </pattern>
      </defs>
      {ticks(x0, x1).map((t) => (
        <g key={`x${t}`}>
          <line x1={sx(t)} x2={sx(t)} y1={0} y2={H} className="fn-grid" />
          {t !== 0 && (
            <text x={sx(t) + 2} y={Math.min(H - 4, Math.max(12, sy(0) + 12))} className="fn-tick">
              {t}
            </text>
          )}
        </g>
      ))}
      {ticks(y0, y1).map((t) => (
        <g key={`y${t}`}>
          <line x1={0} x2={W} y1={sy(t)} y2={sy(t)} className="fn-grid" />
          {t !== 0 && (
            <text x={Math.min(W - 24, Math.max(2, sx(0) + 4))} y={sy(t) - 2} className="fn-tick">
              {t}
            </text>
          )}
        </g>
      ))}
      <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} className="fn-axis" />
      <line x1={sx(0)} x2={sx(0)} y1={0} y2={H} className="fn-axis" />
      {show.integral && (
        <>
          <path d={areaPath(true)} className="fn-area is-positive" />
          <path d={areaPath(false)} className="fn-area is-negative" fill="url(#neg-hatch)" />
          <line x1={sx(state.a)} x2={sx(state.a)} y1={0} y2={H} className="fn-bound" />
          <line x1={sx(state.b)} x2={sx(state.b)} y1={0} y2={H} className="fn-bound" />
        </>
      )}
      {segments.map((s, i) => (
        <polyline key={i} points={s.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} className="fn-curve" />
      ))}
      {show.tangent && fx !== null && slope !== null && <path d={line(slope, state.x, fx)} className="fn-tangent" />}
      {show.secant && fx !== null && sec !== null && (
        <>
          <path d={line(sec, state.x, fx)} className="fn-secant" />
          <circle cx={sx(state.x + h)} cy={sy(fn.f(p, state.x + h))} r={4.5} className="fn-secant-point" />
        </>
      )}
      {fx !== null && <circle cx={sx(state.x)} cy={sy(fx)} r={6} className="fn-point" />}
    </svg>
  )
}

/* ---------- Lab ---------- */

export function FunctionsLab({ sectionSwitch, guidePanel }: { sectionSwitch: ReactNode; guidePanel: ReactNode }) {
  const [state, setState] = useState(() => parseFunctionsState(window.location.search).state)
  const [view, setView] = useState({ cx: 0, cy: 0, span: 16 })
  const [show, setShow] = useState({ tangent: true, secant: false, integral: false })
  const [h, setH] = useState(1)
  const [tab, setTab] = useState<'inputs' | 'calculus'>('inputs')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const fn = getFunction(state.fn)
  const entries = functionsEntries(state)
  const entriesKey = JSON.stringify(entries)

  useEffect(() => {
    const search = withMathSection(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'mathematics', params: entries })

  const choose = (id: FunctionId) => {
    const def = getFunction(id)
    // ln needs x > 0: move the inspected point and interval into the domain when switching to it.
    setState((s) => ({ fn: id, params: defaultFnParams(def), x: def.inDomain({}, s.x) ? s.x : 1, a: def.inDomain({}, s.a) ? s.a : 1, b: def.inDomain({}, s.b) && s.b !== s.a ? s.b : 3 }))
  }
  const setX = (key: 'x' | 'a' | 'b', v: number) => setState((s) => ({ ...s, [key]: v }))
  const defined = fn.inDomain(state.params, state.x)
  const fx = defined ? fn.f(state.params, state.x) : null
  const slope = defined ? fn.df(state.params, state.x) : null
  const sec = secantSlope(fn, state.params, state.x, h)
  const integral = integrate(fn, state.params, state.a, state.b)
  const xSpec = (label: string) => ({ label, min: X_RANGE.min, max: X_RANGE.max, step: 0.01, decimals: 2 })

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="fn-inputs-heading">
      <h2 id="fn-inputs-heading" className="panel-title">
        Function
      </h2>
      <label className="param-label" htmlFor="fn-choice">
        Function family
      </label>
      <select id="fn-choice" className="select fn-select" value={state.fn} onChange={(e) => choose(e.target.value as FunctionId)}>
        {FUNCTIONS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}: {f.formula}
          </option>
        ))}
      </select>
      <p className="small">
        <strong>Domain:</strong> {fn.domainText}
      </p>
      <div className="params">
        {fn.params.map((s) => (
          <RangeField key={s.key} spec={s} value={state.params[s.key]} onChange={(v) => setState((st) => ({ ...st, params: { ...st.params, [s.key]: v } }))} />
        ))}
        <RangeField spec={xSpec('Inspected x')} value={state.x} onChange={(v) => setX('x', v)} />
      </div>
      <button type="button" className="tool-button bordered" onClick={() => setState((s) => ({ ...s, params: defaultFnParams(fn) }))}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore parameters</span>
      </button>
      <ShareActions subject="mathematics" params={entries} restores="this function, point and interval" />
    </section>
  )

  const calculus = (
    <div className="info-body">
      <dl className="readout">
        <div className="is-wide">
          <dt>Point</dt>
          <dd className="fn-point-value">{fx === null ? `undefined: x = ${state.x} is outside the domain` : `(${fmt(state.x)}, ${fmt(fx)})`}</dd>
        </div>
        <div className="is-wide">
          <dt>Derivative {fn.derivativeFormula}</dt>
          <dd className="fn-slope-value">{slope === null ? '—' : `f′(${fmt(state.x)}) = ${fmt(slope)} (exact)`}</dd>
        </div>
      </dl>
      <div className="header-actions">
        <button type="button" className="tool-button" aria-pressed={show.tangent} onClick={() => setShow((s) => ({ ...s, tangent: !s.tangent }))}>
          Tangent line
        </button>
        <button type="button" className="tool-button" aria-pressed={show.secant} onClick={() => setShow((s) => ({ ...s, secant: !s.secant }))}>
          Secant line
        </button>
        <button type="button" className="tool-button" aria-pressed={show.integral} onClick={() => setShow((s) => ({ ...s, integral: !s.integral }))}>
          Definite integral
        </button>
      </div>
      {show.tangent && slope !== null && fx !== null && (
        <p className="small">
          Tangent at x = {fmt(state.x)}: <code>y = {fmt(fx)} + {fmt(slope)}·(x − {fmt(state.x)})</code>
        </p>
      )}
      {show.secant && (
        <section className="info-section">
          <RangeField spec={{ label: 'Secant step h', min: -2, max: 2, step: 0.01, decimals: 2 }} value={h} onChange={setH} note="Move h toward 0: the secant approaches the tangent." />
          <p className="small fn-secant-value">
            {sec === null
              ? h === 0
                ? 'h = 0 gives no secant (the two points coincide); the limit as h → 0 is the derivative.'
                : 'The second point is outside the domain.'
              : `Secant slope [f(x+h) − f(x)] / h = ${fmt(sec)}${slope !== null ? `; difference from f′(x): ${fmt(sec - slope)}` : ''}`}
          </p>
          <p className="muted small">
            The secant lines approach the tangent line as the second point moves toward the first.
            <SourceLinks ids={['calc1-3-1']} />
          </p>
        </section>
      )}
      {show.integral && (
        <section className="info-section">
          <RangeField spec={xSpec('Lower limit a')} value={state.a} onChange={(v) => setX('a', v)} />
          <RangeField spec={xSpec('Upper limit b')} value={state.b} onChange={(v) => setX('b', v)} />
          {integral.ok ? (
            <dl className="readout">
              <div className="is-wide">
                <dt>Signed integral ∫ₐᵇ f(x) dx = F(b) − F(a)</dt>
                <dd className="fn-signed-value">{fmt(integral.signed)} (exact, from the antiderivative)</dd>
              </div>
              <div className="is-wide">
                <dt>Geometric (total) area ∫ₐᵇ |f(x)| dx</dt>
                <dd className="fn-area-value">≈ {fmt(integral.totalArea)}</dd>
              </div>
            </dl>
          ) : (
            <p className="small status-error">{integral.reason}</p>
          )}
          <p className="small">
            The signed integral counts area above the x-axis as positive (solid shading) and below as negative (hatched), so they can cancel; the total area adds both.
            The total area here is a numerical estimate: {integral.ok ? integral.areaMethod : 'Simpson’s rule on |f|'}.
            <SourceLinks ids={['calc1-5-2', 'calc1-5-3']} />
          </p>
        </section>
      )}
      <p className="muted small">
        <SourceLinks ids={fn.sources} />
      </p>
    </div>
  )

  const zoom = (factor: number) => setView((v) => ({ ...v, span: Math.min(40, Math.max(2, v.span * factor)) }))
  const stage = (
    <section className="panel circuit-stage" aria-labelledby="fn-stage-heading">
      <div className="atomic-head">
        <h2 id="fn-stage-heading" className="panel-title">
          {fn.formula}
        </h2>
        <div className="share-row">
          <button type="button" className="icon-button bordered" aria-label="Zoom in" onClick={() => zoom(0.7)}>
            <Plus size={16} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button bordered" aria-label="Zoom out" onClick={() => zoom(1 / 0.7)}>
            <Minus size={16} aria-hidden="true" />
          </button>
          <button type="button" className="tool-button bordered" onClick={() => setView({ cx: 0, cy: 0, span: 16 })}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>Reset view</span>
          </button>
          <button type="button" className="tool-button bordered" onClick={() => setView((v) => ({ ...v, cx: state.x, cy: fx ?? 0 }))}>
            Center on point
          </button>
        </div>
      </div>
      <Plot state={state} view={view} show={show} h={h} />
      <p className="muted small">
        View: x from {fmt(view.cx - view.span / 2)} to {fmt(view.cx + view.span / 2)}. The curve is drawn only where the function is defined and stays in view; it is never
        joined across a gap.
      </p>
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {sectionSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Function panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Function', content: inputs },
            { id: 'calculus', label: 'Calculus', content: <div className="panel">{calculus}</div> },
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
        <section className="panel info">{calculus}</section>
      </aside>
    </div>
  )
}
