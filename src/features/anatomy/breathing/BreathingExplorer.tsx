import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AppLink } from '../../../components/AppLink'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { airflow, alveolarPressure, breathingSummary, describeStage, expansion } from '../../../data/anatomy/breathing'
import { structureLink } from '../../../data/topics'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { linkTo } from '../../../lib/links'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { breathingParamEntries, DEFAULT_BREATHING, parseBreathingParams, withAtlasParams, type BreathingUrlState } from '../../../lib/urlState'
import { SourceLinks } from '../../guide/SourceLinks'
import { SubjectGuidePanel } from '../../guide/SubjectGuidePanel'

const GAS_LAB_LINK = linkTo('physics', { experiment: 'gas', gp: '101.3', gv1: '2', gv2: '2.2' })

/* ---------- Schematic (front view, not to scale) ---------- */

function Schematic({ state }: { state: BreathingUrlState }) {
  const e = expansion(state.phase, state.position)
  const flow = airflow(state.phase, state.position)
  const pressure = alveolarPressure(state.phase, state.position)
  const cx = 200
  const half = 112 + 14 * e // thoracic half-width: ribs move out
  const edgeY = 330
  const domeY = 262 + 44 * e // diaphragm dome moves down (inferiorly) and flattens
  const ribLift = 10 * e
  const lungBottom = (x: number) => {
    // y of the diaphragm curve at x (quadratic Bézier from edge to edge through the dome)
    const t = (x - (cx - half)) / (2 * half)
    return (1 - t) ** 2 * edgeY + 2 * (1 - t) * t * (2 * domeY - edgeY) + t ** 2 * edgeY
  }
  const lung = (side: -1 | 1) => {
    const inner = cx + side * 26
    const outer = cx + side * (half - 12)
    const topY = 112 - 4 * e
    const bIn = lungBottom(inner) - 6
    const bOut = lungBottom(outer) - 8
    return `M ${inner} ${topY + 34} Q ${inner} ${topY} ${(inner + outer) / 2} ${topY} Q ${outer} ${topY + 10} ${outer} ${(topY + bOut) / 2} L ${outer} ${bOut} Q ${(inner + outer) / 2} ${(bIn + bOut) / 2 + 6} ${inner} ${bIn} Z`
  }
  const arrows = flow === 'none' ? [] : [70, 100, 130]
  return (
    <svg className="breath-svg" viewBox="0 0 400 400" role="img" aria-label={breathingSummary(state.phase, state.position)}>
      {/* Thoracic wall with ribs */}
      <path d={`M ${cx - half} ${edgeY} L ${cx - half + 6} 120 Q ${cx} 70 ${cx + half - 6} 120 L ${cx + half} ${edgeY}`} className="breath-wall" />
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 140 + i * 36
        return (
          <g key={i}>
            <path d={`M ${cx - 10} ${y - 6} Q ${cx - half / 2} ${y - 14 - ribLift} ${cx - half + 4} ${y + 18 - ribLift}`} className="breath-rib" />
            <path d={`M ${cx + 10} ${y - 6} Q ${cx + half / 2} ${y - 14 - ribLift} ${cx + half - 4} ${y + 18 - ribLift}`} className="breath-rib" />
          </g>
        )
      })}
      {/* Lungs */}
      <path d={lung(-1)} className="breath-lung" />
      <path d={lung(1)} className="breath-lung" />
      {/* Airways: trachea and main bronchi */}
      <path d={`M ${cx} 20 L ${cx} 150 M ${cx} 150 L ${cx - 38} 186 M ${cx} 150 L ${cx + 38} 186`} className="breath-airway" />
      {/* Diaphragm */}
      <path d={`M ${cx - half} ${edgeY} Q ${cx} ${2 * domeY - edgeY} ${cx + half} ${edgeY}`} className="breath-diaphragm" />
      <text x={cx} y={edgeY + 26} textAnchor="middle" className="breath-label">
        Diaphragm {state.phase === 'inspiration' && flow === 'in' ? '(contracting, moving down)' : flow === 'out' ? '(relaxing, moving up)' : ''}
      </text>
      <text x={cx} y={edgeY + 48} textAnchor="middle" className="breath-label muted-label">
        Abdominal cavity
      </text>
      <text x={cx - half + 18} y={208} className="breath-label">
        Lung
      </text>
      <text x={cx + 12} y={120} className="breath-label">
        Trachea
      </text>
      {/* Airflow arrows (direction also written as text) */}
      {arrows.map((y) => (
        <path key={y} d={flow === 'in' ? `M ${cx - 14} ${y - 8} L ${cx - 14} ${y + 8} M ${cx - 19} ${y + 2} L ${cx - 14} ${y + 8} L ${cx - 9} ${y + 2}` : `M ${cx - 14} ${y + 8} L ${cx - 14} ${y - 8} M ${cx - 19} ${y - 2} L ${cx - 14} ${y - 8} L ${cx - 9} ${y - 2}`} className="breath-arrow" />
      ))}
      <text x={cx - 24} y={40} textAnchor="end" className="breath-flow-label">
        {flow === 'in' ? 'Air in ↓' : flow === 'out' ? 'Air out ↑' : 'No airflow'}
      </text>
      <text x={20} y={392} className="breath-label">
        Alveolar pressure {pressure === 'below' ? '<' : pressure === 'above' ? '>' : '='} atmospheric
      </text>
      {state.show === 'exchange' && (
        <g className="breath-inset">
          <rect x={268} y={6} width={126} height={96} rx={8} className="breath-inset-box" />
          <circle cx={300} cy={52} r={22} className="breath-alveolus" />
          <rect x={334} y={14} width={18} height={76} rx={9} className="breath-capillary" />
          <path d="M 318 42 L 338 42 M 333 37 L 338 42 L 333 47" className="breath-arrow" />
          <path d="M 338 64 L 318 64 M 323 59 L 318 64 L 323 69" className="breath-arrow" />
          <text x={276} y={22} className="breath-inset-label">
            Alveolus
          </text>
          <text x={356} y={42} className="breath-inset-label">
            O₂ →
          </text>
          <text x={356} y={68} className="breath-inset-label">
            ← CO₂
          </text>
          <text x={276} y={96} className="breath-inset-label">
            Diffusion (not airflow)
          </text>
        </g>
      )}
    </svg>
  )
}

/* ---------- Explorer ---------- */

const STEP = 25

export function BreathingExplorer({ moduleSwitch }: { moduleSwitch: ReactNode }) {
  const [state, setState] = useState<BreathingUrlState>(() => {
    const r = parseBreathingParams(window.location.search)
    return { phase: r.phase, position: r.position, show: r.show }
  })
  // Opens paused, always; playback is never stored.
  const [playing, setPlaying] = useState(false)
  const [tab, setTab] = useState<'controls' | 'explain'>('controls')
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const entries = breathingParamEntries(state)
  const entriesKey = JSON.stringify(entries)

  useEffect(() => {
    const search = withAtlasParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'anatomy', params: entries })

  // Play advances through each phase at an arbitrary slow pace (4 s per phase), not a breathing rate.
  useEffect(() => {
    if (!playing || reducedMotion) return
    let frame = 0
    let last = performance.now()
    let acc = 0
    const tick = (now: number) => {
      acc += Math.min(0.1, (now - last) / 1000) * 25
      last = now
      if (acc >= 1 && document.visibilityState !== 'hidden') {
        const n = Math.floor(acc)
        acc -= n
        setState((s) => (s.position + n >= 100 ? (s.position === 100 ? { ...s, phase: s.phase === 'inspiration' ? 'expiration' : 'inspiration', position: 0 } : { ...s, position: 100 }) : { ...s, position: s.position + n }))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, reducedMotion])

  const step = (dir: 1 | -1) => {
    setPlaying(false)
    setState((s) => {
      const next = s.position + dir * STEP
      if (next > 100) return { ...s, phase: s.phase === 'inspiration' ? 'expiration' : 'inspiration', position: 0 }
      if (next < 0) return { ...s, phase: s.phase === 'inspiration' ? 'expiration' : 'inspiration', position: 100 }
      return { ...s, position: next }
    })
  }

  const stage = describeStage(state.phase, state.position)
  const controls = (
    <section className="panel" aria-labelledby="breath-controls-heading">
      <h2 id="breath-controls-heading" className="panel-title">
        Breathing controls
      </h2>
      <div className="segmented" role="group" aria-label="Phase">
        {(['inspiration', 'expiration'] as const).map((p) => (
          <button
            key={p}
            type="button"
            className="segmented-option"
            aria-pressed={state.phase === p}
            onClick={() => {
              setPlaying(false)
              setState((s) => ({ ...s, phase: p }))
            }}
          >
            {p === 'inspiration' ? 'Inspiration' : 'Expiration'}
          </button>
        ))}
      </div>
      <label className="param-label" htmlFor="breath-pos">
        Progress through {state.phase}: {state.position}%
      </label>
      <input
        id="breath-pos"
        type="range"
        min={0}
        max={100}
        step={1}
        value={state.position}
        aria-valuetext={`${state.position}% through ${state.phase}`}
        onChange={(e) => {
          setPlaying(false)
          setState((s) => ({ ...s, position: Number(e.target.value) }))
        }}
      />
      <div className="share-row">
        <button type="button" className="tool-button bordered" onClick={() => step(-1)}>
          <ChevronLeft size={15} aria-hidden="true" />
          <span>Previous step</span>
        </button>
        <button type="button" className="tool-button bordered" onClick={() => step(1)}>
          <span>Next step</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
        {!reducedMotion && (
          <button type="button" className="tool-button bordered" aria-pressed={playing} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
        )}
        <button
          type="button"
          className="tool-button bordered"
          onClick={() => {
            setPlaying(false)
            setState(DEFAULT_BREATHING)
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>
      <p className="muted small">
        Opens paused. Play moves slowly through both phases at an arbitrary pace, not a real breathing rate.
        {reducedMotion && ' Play is not offered because reduced motion is on; use the steps or the slider.'}
      </p>
      <div className="segmented" role="group" aria-label="Show">
        <button type="button" className="segmented-option" aria-pressed={state.show === 'airflow'} onClick={() => setState((s) => ({ ...s, show: 'airflow' }))}>
          Airflow
        </button>
        <button type="button" className="segmented-option" aria-pressed={state.show === 'exchange'} onClick={() => setState((s) => ({ ...s, show: 'exchange' }))}>
          Airflow + gas exchange
        </button>
      </div>
      <ShareActions subject="anatomy" params={entries} restores="this breathing phase and position (opened paused)" />
    </section>
  )

  const explain = (
    <section className="panel info" aria-labelledby="breath-now-heading">
      <h2 id="breath-now-heading" className="panel-title">
        {stage.title}
      </h2>
      <div className="info-body breath-now" role="status" aria-live="polite">
        <p className="small">{stage.muscles}</p>
        <p className="small">{stage.pressure}</p>
        {stage.air && <p className="small">{stage.air}</p>}
      </div>
      <p className="small">
        Air moves from higher to lower pressure. Changing the volume of the thoracic cavity changes the pressure in the alveoli (Boyle’s law). Quiet inspiration uses the
        diaphragm and external intercostals; quiet expiration is passive elastic recoil.
        <SourceLinks ids={['ap-22-3']} />
      </p>
      <h3 className="section-title">Airflow is not gas exchange</h3>
      <p className="small">
        <strong>Airflow (ventilation)</strong> is bulk movement of air in and out through the airways, driven by the pressure difference shown here. The conducting airways
        (such as the trachea and bronchi) carry, warm and humidify air but do not exchange gases.
        <SourceLinks ids={['ap-22-1']} />
      </p>
      <p className="small">
        <strong>Gas exchange</strong> happens in the respiratory zone: oxygen diffuses from the alveoli into the capillary blood and carbon dioxide diffuses the other way,
        each from higher to lower partial pressure, across the respiratory membrane.
        <SourceLinks ids={['ap-22-4']} />
      </p>
      <h3 className="section-title">What moves, and what is simplified</h3>
      <ul className="guide-list small">
        <li>Moves: the diaphragm (down when it contracts), the ribs (up and out), the thoracic wall and, following it, the lungs.</li>
        <li>The lungs are not drawn as sealed bags: they open to the air through the airways, and the amount of air in them changes with each breath.</li>
        <li>
          The lungs do not pull themselves open. Pleural fluid makes them follow the thoracic wall, and their elasticity makes them recoil.
          <SourceLinks ids={['ap-22-3']} />
        </li>
        <li>Simplified: a flat front view, not to scale. No lobes, pleura, blood vessels or heart. Movement sizes are exaggerated. No volumes, rates or timings are shown, and nothing here describes or predicts anyone’s breathing.</li>
      </ul>
      <h3 className="section-title">Related views</h3>
      <ul className="guide-list small">
        <li>
          <AppLink href={GAS_LAB_LINK}>Boyle’s law lab (Physics)</AppLink>: the same inverse pressure–volume relationship, in a sealed cylinder. The lab explains why that is
          not a model of the lungs.
        </li>
        <li>
          <AppLink href={structureLink('diaphragm')}>Diaphragm in the body atlas</AppLink> · <AppLink href={structureLink('lung-left')}>Lungs in the body atlas</AppLink>
        </li>
      </ul>
    </section>
  )

  const view = (
    <section className="panel circuit-stage" aria-labelledby="breath-stage-heading">
      <h2 id="breath-stage-heading" className="panel-title">
        Breathing mechanics · {stage.title} ({state.position}%)
      </h2>
      <Schematic state={state} />
      <p className="muted small">{breathingSummary(state.phase, state.position)}</p>
    </section>
  )

  const guide = <SubjectGuidePanel subject="anatomy" />
  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {moduleSwitch}
        <div className="chem-stage process-stage">{view}</div>
        {guide}
        <Tabs
          label="Breathing panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'controls', label: 'Controls', content: controls },
            { id: 'explain', label: 'Explanation', content: explain },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem">
      <aside className="chem-side chem-side--left">
        {moduleSwitch}
        {controls}
      </aside>
      <div className="chem-stage process-stage">{view}</div>
      <aside className="chem-side chem-side--right">
        {guide}
        {explain}
      </aside>
    </div>
  )
}
