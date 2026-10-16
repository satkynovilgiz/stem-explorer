import { RotateCcw } from 'lucide-react'
import { lazy, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { ViewportShell } from '../../../components/ViewportShell'
import { useMediaQuery } from '../../../lib/hooks'
import { parseSpringParams, springParamEntries, withSpringParams } from '../../../lib/urlState'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { advanceTime } from '../../../physics/projectile'
import { DEFAULT_SPRING, isValidSpringParam, normalizeSpringParam, solveSpring, SPRING_KEYS, SPRING_SPECS, type SpringKey } from '../../../physics/spring'
import { createClock } from '../clock'
import { PlaybackBar } from '../PlaybackBar'
import { EnergyBars, SpringAbout, SpringGraph, SpringReadouts, SpringSummary } from './SpringPanels'
import { initialSpringState, springReducer, springTimeEffect, type SpringAction } from './springState'

const SpringScene = lazy(() => import('./scene/SpringScene'))

type MobileTab = 'inputs' | 'values' | 'graph' | 'about'
type SideTab = 'values' | 'about'

function initFromUrl() {
  const { params } = parseSpringParams(window.location.search, DEFAULT_SPRING, isValidSpringParam)
  // Snap shared values to the input step; shared experiments always open paused at t = 0.
  for (const key of SPRING_KEYS) params[key] = normalizeSpringParam(key, params[key]) ?? DEFAULT_SPRING[key]
  return initialSpringState(params)
}

/** The spring–mass oscillation lab. Same shell as the projectile lab: one simulation clock, analytic values. */
export function SpringLab({ experimentSwitch, guidePanel }: { experimentSwitch: ReactNode; guidePanel: ReactNode }) {
  const [state, rawDispatch] = useReducer(springReducer, undefined, initFromUrl)
  const clock = useMemo(() => createClock(0), [])
  const [mobileTab, setMobileTab] = useState<MobileTab>('inputs')
  const [sideTab, setSideTab] = useState<SideTab>('values')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const solution = useMemo(() => solveSpring(state.params), [state.params])
  const running = useRef(false)

  const dispatch = (action: SpringAction) => {
    if (action.type !== 'resume' && action.type !== 'setRate' && action.type !== 'launch') running.current = false
    if (springTimeEffect(action) === 'zero') clock.set(0)
    rawDispatch(action)
  }

  // Playback: time advances by the capped real frame interval × rate; positions are analytic in t.
  useEffect(() => {
    if (state.status !== 'playing') return
    let frame = 0
    let last = performance.now()
    running.current = true
    const tick = (now: number) => {
      if (!running.current) return
      const next = advanceTime(clock.get(), (now - last) / 1000, state.rate, solution.duration)
      last = now
      clock.set(next)
      if (next >= solution.duration) {
        rawDispatch({ type: 'ended' })
        return
      }
      frame = requestAnimationFrame(tick)
    }
    // A background tab stops getting frames; when it returns, restart the interval instead of jumping.
    const onVisible = () => {
      if (document.visibilityState === 'visible') last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisible)
    frame = requestAnimationFrame(tick)
    return () => {
      running.current = false
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [state.status, state.rate, solution.duration, clock])

  useEffect(() => {
    const search = withSpringParams(window.location.search, state.params)
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.params])

  const shareParams = springParamEntries(state.params)
  useRecordVisit({ subject: 'physics', params: shareParams })

  const scrub = (t: number) => {
    running.current = false
    clock.set(Math.min(Math.max(t, 0), solution.duration))
    rawDispatch({ type: 'scrub' })
  }

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="spring-inputs-heading">
      <h2 id="spring-inputs-heading" className="panel-title">
        Oscillator inputs
      </h2>
      <div className="params">
        {SPRING_KEYS.map((key: SpringKey) => (
          <RangeField
            key={key}
            spec={SPRING_SPECS[key]}
            value={state.params[key]}
            onChange={(v) => dispatch({ type: 'setParam', key, value: v })}
            note={key === 'x0' ? 'Positive stretches the spring (block to the right); negative compresses it.' : undefined}
          />
        ))}
      </div>
      <p className="inline-note">Initial velocity: fixed at 0 m/s. The block is released from rest.</p>
      <button type="button" className="tool-button bordered" onClick={() => dispatch({ type: 'restoreDefaults' })}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>
      <ShareActions subject="physics" params={shareParams} restores="these oscillator inputs (opened paused at t = 0)" />
    </section>
  )

  const values = (
    <div className="info-body">
      <SpringReadouts solution={solution} clock={clock} status={state.status} />
      <EnergyBars solution={solution} clock={clock} />
      <SpringSummary solution={solution} />
    </div>
  )
  const about = <SpringAbout />
  const graph = (
    <div className="graphs graphs--single">
      <SpringGraph solution={solution} clock={clock} />
    </div>
  )

  const viewer = (
    <ViewportShell
      label="Side view of a block on a spring. The dashed line marks equilibrium, x = 0; +x is to the right."
      fallbackNote="The inputs, playback controls, readouts, energy bars and graph still work"
      renderScene={(callbacks) => <SpringScene solution={solution} clock={clock} {...callbacks} />}
      overlay={
        <>
          <div className="viewport-badge physics-badge">
            <span className="viewport-badge-name">Spring–mass oscillator</span>
            <span className="viewport-badge-mode">Side view · frictionless · ticks every 0.25 m</span>
          </div>
          <ul className="physics-legend" aria-label="Legend">
            <li>
              <span className="legend-line is-dashed" style={{ borderColor: '#6fe0dc' }} aria-hidden="true" /> Equilibrium, x = 0
            </li>
            <li>
              <span className="legend-line" style={{ borderColor: '#f5c26b' }} aria-hidden="true" /> Restoring force F (toward x = 0)
            </li>
            <li>+x → to the right</li>
          </ul>
        </>
      }
    />
  )

  const playback = (
    <PlaybackBar
      clock={clock}
      flightTime={solution.duration}
      status={state.status}
      rate={state.rate}
      onLaunch={() => dispatch({ type: 'launch' })}
      onPause={() => dispatch({ type: 'pause', t: clock.get() })}
      onResume={() => dispatch({ type: 'resume' })}
      onReset={() => dispatch({ type: 'reset' })}
      onScrub={scrub}
      onRateChange={(rate) => dispatch({ type: 'setRate', rate })}
    />
  )

  const announcer = (
    <p className="visually-hidden" role="status" aria-live="polite">
      {state.announcement}
    </p>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile physics">
        {announcer}
        {experimentSwitch}
        <div className="chem-stage">
          {viewer}
          {playback}
        </div>
        {guidePanel}
        <Tabs
          label="Spring lab panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'values', label: 'Values', content: <div className="panel">{values}</div> },
            { id: 'graph', label: 'Graph', content: <div className="panel">{graph}</div> },
            { id: 'about', label: 'About', content: <div className="panel">{about}</div> },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem physics">
      {announcer}
      <aside className="chem-side chem-side--left">
        <div className="section-switch-wrap">{experimentSwitch}</div>
        {inputs}
      </aside>
      <div className="chem-stage physics-stage">
        {viewer}
        {playback}
        {graph}
      </div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        <section className="panel info" aria-labelledby="spring-heading">
          <header className="info-header">
            <p className="eyebrow">Physics</p>
            <h2 id="spring-heading" className="info-title">
              Spring–mass oscillation lab
            </h2>
            <p className="info-summary">Ideal simple harmonic motion: no friction or damping, released from rest.</p>
          </header>
          <Tabs
            label="Spring lab information"
            className="info-tabs"
            active={sideTab}
            onChange={setSideTab}
            tabs={[
              { id: 'values', label: 'Values', content: values },
              { id: 'about', label: 'Assumptions & equations', content: about },
            ]}
          />
        </section>
      </aside>
    </div>
  )
}
