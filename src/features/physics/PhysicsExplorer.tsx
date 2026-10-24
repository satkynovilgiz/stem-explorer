import { GitCompare, RotateCcw, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { ShareActions } from '../../components/ShareActions'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { pushHistoryEntry } from '../../lib/location'
import { useMediaQuery } from '../../lib/hooks'
import { parsePhysicsExperiment, parsePhysicsParams, physicsParamEntries, withoutSpringParams, withPhysicsParams, type PhysicsExperiment } from '../../lib/urlState'
import { useRecordVisit } from '../../lib/useExplorationLibrary'
import {
  advanceTime,
  DEFAULT_PARAMS,
  formatSig,
  isValidParam,
  normalizeParam,
  PARAM_KEYS,
  solveTrajectory,
  type ParamKey,
} from '../../physics/projectile'
import { ActivityPanel } from '../activities/ActivityPanel'
import { SubjectGuidePanel } from '../guide/SubjectGuidePanel'
import { ACTIVITY_ENDED, replaceUrlSearch, useActivity } from '../activities/useActivity'
import { anglesSetup, PHYSICS_ACTIVITY } from './activity'
import { AboutPanel } from './AboutPanel'
import { createClock } from './clock'
import { SCENE_COLORS } from './colors'
import { ParamControl } from './ParamControl'
import { PlaybackBar } from './PlaybackBar'
import { ResultsPanel } from './ResultsPanel'
import type { CameraView } from './scene/PhysicsScene'
import { sceneBounds, vectorScales } from './sceneMath'
import { SceneToolbar } from './SceneToolbar'
import { initialPhysicsState, physicsReducer, timeEffect, type PhysicsAction } from './state'
import { TimeGraph } from './TimeGraph'

// Three.js is loaded on demand; controls, readouts and graphs work without it.
const PhysicsScene = lazy(() => import('./scene/PhysicsScene'))

type MobileTab = 'inputs' | 'results' | 'graphs' | 'about'
type SideTab = 'results' | 'about'

function initFromUrl() {
  const { params } = parsePhysicsParams(window.location.search, DEFAULT_PARAMS, isValidParam)
  // Snap shared values to the input step so the URL, the stored value and the fields agree
  // (e.g. gravity=9.806 becomes 9.81 and the address is rewritten to match).
  for (const key of PARAM_KEYS) params[key] = normalizeParam(key, params[key]) ?? DEFAULT_PARAMS[key]
  // Shared experiments always open paused at t = 0.
  return initialPhysicsState(params)
}

/**
 * Physics has two experiments. `?experiment=spring` opens the spring–mass lab; links without it are
 * projectile links, so every existing link opens as before. Each lab keeps its own state and keys.
 */
// The spring–mass lab (and its scene) load only when that experiment is opened.
const SpringLab = lazy(() => import('./spring/SpringLab').then((m) => ({ default: m.SpringLab })))
const CircuitLab = lazy(() => import('./circuit/CircuitLab').then((m) => ({ default: m.CircuitLab })))
const WaveLab = lazy(() => import('./wave/WaveLab').then((m) => ({ default: m.WaveLab })))
const OpticsLab = lazy(() => import('./optics/OpticsLab').then((m) => ({ default: m.OpticsLab })))
const EXPERIMENT_LABEL: Record<PhysicsExperiment, string> = { projectile: 'Projectile', spring: 'Spring–mass', circuit: 'DC circuit', wave: 'Wave', optics: 'Optics' }

export function PhysicsExplorer() {
  const [experiment, setExperiment] = useState<PhysicsExperiment>(() => parsePhysicsExperiment(window.location.search).experiment)
  const guidePanel = <SubjectGuidePanel subject="physics" />
  const choose = (next: PhysicsExperiment) => {
    if (next === experiment) return
    // Each switch drops the other experiments' keys; a projectile link has none.
    pushHistoryEntry()
    replaceUrlSearch(withoutSpringParams(window.location.search))
    setExperiment(next)
  }
  const experimentSwitch = (
    <div className="module-switch">
      <span className="module-switch-label" aria-hidden="true">
        Module
      </span>
      <div className="segmented section-switch section-switch--grid" role="group" aria-label="Experiment">
        {(['projectile', 'spring', 'circuit', 'wave', 'optics'] as const).map((e) => (
          <button key={e} type="button" className="segmented-option" aria-pressed={experiment === e} onClick={() => choose(e)}>
            {EXPERIMENT_LABEL[e]}
          </button>
        ))}
      </div>
    </div>
  )
  if (experiment === 'circuit' || experiment === 'wave' || experiment === 'optics') {
    return (
      <Suspense fallback={<p className="muted small panel">Loading the {EXPERIMENT_LABEL[experiment].toLowerCase()} lab…</p>}>
        {experiment === 'circuit' ? (
          <CircuitLab experimentSwitch={experimentSwitch} guidePanel={guidePanel} />
        ) : experiment === 'wave' ? (
          <WaveLab experimentSwitch={experimentSwitch} guidePanel={guidePanel} />
        ) : (
          <OpticsLab experimentSwitch={experimentSwitch} guidePanel={guidePanel} />
        )}
      </Suspense>
    )
  }
  return experiment === 'spring' ? (
    <Suspense fallback={<p className="muted small panel">Loading the spring–mass lab…</p>}>
      <SpringLab experimentSwitch={experimentSwitch} guidePanel={guidePanel} />
    </Suspense>
  ) : (
    <ProjectileLab experimentSwitch={experimentSwitch} />
  )
}

function ProjectileLab({ experimentSwitch }: { experimentSwitch: ReactNode }) {
  const [state, rawDispatch] = useReducer(physicsReducer, undefined, initFromUrl)
  const clock = useMemo(() => createClock(0), [])
  const [view, setView] = useState<CameraView>('side')
  const [showPreview, setShowPreview] = useState(true)
  const [showVectors, setShowVectors] = useState(true)
  const [showComponents, setShowComponents] = useState(false)
  const [cameraToken, setCameraToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('inputs')
  const [sideTab, setSideTab] = useState<SideTab>('results')
  const isMobile = useMediaQuery('(max-width: 899px)')

  const trajectory = useMemo(() => solveTrajectory(state.params), [state.params])
  const runA = useMemo(() => (state.runA ? solveTrajectory(state.runA) : null), [state.runA])

  // Set synchronously by Pause/Reset/scrub/edits so no extra frame advances time after the click,
  // before React has cleaned up the playback effect.
  const running = useRef(false)

  const dispatch = (action: PhysicsAction) => {
    if (action.type !== 'resume' && action.type !== 'setRate' && action.type !== 'launch') running.current = false
    if (timeEffect(action) === 'zero') clock.set(0)
    rawDispatch(action)
  }

  // Playback: time advances by the (capped) real frame interval × playback rate; positions are
  // always evaluated analytically from that time.
  useEffect(() => {
    if (state.status !== 'playing') return
    let frame = 0
    let last = performance.now()
    running.current = true
    const tick = (now: number) => {
      if (!running.current) return
      const next = advanceTime(clock.get(), (now - last) / 1000, state.rate, trajectory.flightTime)
      last = now
      clock.set(next)
      if (next >= trajectory.flightTime) {
        rawDispatch({ type: 'landed' })
        return
      }
      frame = requestAnimationFrame(tick)
    }
    // After a background tab becomes visible again, restart the frame interval instead of jumping.
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
  }, [state.status, state.rate, trajectory.flightTime, clock])

  // Keep the address shareable without adding history entries; other subjects' keys are untouched.
  useEffect(() => {
    const search = withPhysicsParams(window.location.search, state.params)
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.params])

  const shareParams = physicsParamEntries(state.params)
  useRecordVisit({ subject: 'physics', params: shareParams })

  // Activity snapshots include simulation time, which lives outside React state. A flight that is
  // playing is paused first; Exit restores the configuration paused and never resumes playback.
  const activity = useActivity(PHYSICS_ACTIVITY, state, {
    capture: () => ({ state: { ...state, status: state.status === 'playing' ? ('paused' as const) : state.status }, t: clock.get() }),
    apply: () => {
      running.current = false
      clock.set(0)
      rawDispatch({ type: 'replace', state: anglesSetup(state), announcement: 'Activity started: 20 m/s at 30°, height 0 m, gravity 9.81 m/s², paused at t = 0.' })
    },
    restore: (snap) => {
      running.current = false
      clock.set(snap.t)
      rawDispatch({ type: 'replace', state: snap.state, announcement: ACTIVITY_ENDED })
    },
    restoreUrl: (snap) => replaceUrlSearch(withPhysicsParams(window.location.search, snap.state.params)),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="physics" />

  const setParam = (key: ParamKey, value: number) => dispatch({ type: 'setParam', key, value })
  const scrub = (t: number) => {
    running.current = false
    clock.set(Math.min(Math.max(t, 0), trajectory.flightTime))
    rawDispatch({ type: 'scrub' })
  }

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="inputs-heading">
      <h2 id="inputs-heading" className="panel-title">
        Launch inputs {state.runA && <span className="run-tag is-active">Run B (active)</span>}
      </h2>
      <div className="params">
        {PARAM_KEYS.map((key) => (
          <ParamControl
            key={key}
            paramKey={key}
            value={state.params[key]}
            onChange={setParam}
            note={key === 'gravity' ? '9.81 m/s² is an approximate near-Earth value.' : undefined}
          />
        ))}
      </div>
      <button type="button" className="tool-button bordered" onClick={() => dispatch({ type: 'restoreDefaults' })}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>

      <div className="info-section compare-actions">
        <h3 className="section-title">Compare two launches</h3>
        <p className="muted small">
          {state.runA
            ? 'Run A is saved as a dotted reference. Change the inputs above to set up Run B.'
            : 'Save the current inputs as Run A, then change them to try Run B.'}
        </p>
        <div className="header-actions">
          <button type="button" className="tool-button bordered" onClick={() => dispatch({ type: 'saveRunA' })}>
            <GitCompare size={16} aria-hidden="true" />
            <span>{state.runA ? 'Replace Run A with current' : 'Save as Run A'}</span>
          </button>
          {state.runA && (
            <button type="button" className="tool-button bordered" onClick={() => dispatch({ type: 'clearComparison' })}>
              <X size={16} aria-hidden="true" />
              <span>Clear comparison</span>
            </button>
          )}
        </div>
      </div>

      <ShareActions subject="physics" params={shareParams} restores="these launch inputs (opened paused at t = 0)" />
    </section>
  )

  const results = <ResultsPanel trajectory={trajectory} runA={state.runA} clock={clock} status={state.status} />
  const about = <AboutPanel trajectory={trajectory} runA={runA} />
  const graphs = (
    <div className="graphs">
      <TimeGraph quantity="height" trajectory={trajectory} runA={runA} clock={clock} />
      <TimeGraph quantity="vy" trajectory={trajectory} runA={runA} clock={clock} />
    </div>
  )

  const viewer = (
    <ViewportShell
      label="3D view of the launch plane. Drag to pan, scroll or pinch to zoom; in perspective view, drag to rotate."
      fallbackNote="The inputs, playback controls, readouts and graphs below still work"
      renderScene={(callbacks) => (
        <PhysicsScene
          trajectory={trajectory}
          runA={runA}
          clock={clock}
          view={view}
          showPreview={showPreview}
          showVectors={showVectors}
          showComponents={showComponents}
          cameraToken={cameraToken}
          {...callbacks}
        />
      )}
      overlay={
        <SceneLegend trajectory={trajectory} runA={runA} showVectors={showVectors} showComponents={showComponents} view={view} />
      }
      controls={
        <SceneToolbar
          view={view}
          showPreview={showPreview}
          showVectors={showVectors}
          showComponents={showComponents}
          onViewChange={setView}
          onResetCamera={() => setCameraToken((n) => n + 1)}
          onTogglePreview={() => setShowPreview((v) => !v)}
          onToggleVectors={() => setShowVectors((v) => !v)}
          onToggleComponents={() => setShowComponents((v) => !v)}
        />
      }
    />
  )

  const playback = (
    <PlaybackBar
      clock={clock}
      flightTime={trajectory.flightTime}
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
        {activityPanel}
        {guidePanel}
        <Tabs
          label="Physics panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'results', label: 'Results', content: <div className="panel">{results}</div> },
            { id: 'graphs', label: 'Graphs', content: <div className="panel">{graphs}</div> },
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
        {graphs}
      </div>
      <aside className="chem-side chem-side--right">
        {activityPanel}
        {guidePanel}
        <section className="panel info" aria-labelledby="physics-heading">
          <header className="info-header">
            <p className="eyebrow">Physics</p>
            <h2 id="physics-heading" className="info-title">
              Projectile motion lab
            </h2>
            <p className="info-summary">
              Ideal motion with no air resistance:{' '}
              {trajectory.flightTime > 0
                ? `this launch flies for ${formatSig(trajectory.flightTime)} s and lands ${formatSig(trajectory.range)} m away.`
                : 'this launch lands immediately.'}
            </p>
          </header>
          <Tabs
            label="Physics information"
            className="info-tabs"
            active={sideTab}
            onChange={setSideTab}
            tabs={[
              { id: 'results', label: 'Results', content: results },
              { id: 'about', label: 'Assumptions & equations', content: about },
            ]}
          />
        </section>
      </aside>
    </div>
  )
}

/** Legend for line styles and the separate vector display scales. */
function SceneLegend({
  trajectory,
  runA,
  showVectors,
  showComponents,
  view,
}: {
  trajectory: ReturnType<typeof solveTrajectory>
  runA: ReturnType<typeof solveTrajectory> | null
  showVectors: boolean
  showComponents: boolean
  view: CameraView
}) {
  const bounds = sceneBounds(runA ? [trajectory, runA] : [trajectory])
  const scales = vectorScales(trajectory, bounds.extent)
  return (
    <>
      <div className="viewport-badge physics-badge">
        <span className="viewport-badge-name">Launch plane (x–y)</span>
        <span className="viewport-badge-mode">
          {view === 'side' ? 'Side view · equal scale on both axes' : 'Perspective · the motion stays in one plane'}
        </span>
      </div>
      <ul className="physics-legend" aria-label="Legend">
        <li>
          <span className="legend-line" style={{ borderColor: SCENE_COLORS.path }} aria-hidden="true" /> Path so far
        </li>
        <li>
          <span className="legend-line is-dashed" style={{ borderColor: SCENE_COLORS.preview }} aria-hidden="true" /> Predicted
        </li>
        {runA && (
          <li>
            <span className="legend-line is-dotted" style={{ borderColor: SCENE_COLORS.runA }} aria-hidden="true" /> Run A (saved)
          </li>
        )}
        {showVectors && (
          <>
            <li>
              <span className="legend-line" style={{ borderColor: SCENE_COLORS.velocity }} aria-hidden="true" /> v: 1 m/s ={' '}
              {formatSig(scales.velocity)} m
            </li>
            {showComponents && (
              <li>
                <span className="legend-line is-dashed" style={{ borderColor: SCENE_COLORS.component }} aria-hidden="true" /> vₓ, vᵧ
                components (same scale)
              </li>
            )}
            <li>
              <span className="legend-line" style={{ borderColor: SCENE_COLORS.acceleration }} aria-hidden="true" /> a: 1 m/s² ={' '}
              {formatSig(scales.acceleration)} m
            </li>
          </>
        )}
      </ul>
    </>
  )
}
