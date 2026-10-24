import { Box, Crosshair, Grid3x3, Maximize, RotateCcw } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { ShareActions } from '../../components/ShareActions'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { pushHistoryEntry } from '../../lib/location'
import { useMediaQuery } from '../../lib/hooks'
import { parseMathSection, withMathSection, type MathSection } from '../../lib/mathSections'
import { mathParamEntries, parseMathParams, withMathParams } from '../../lib/urlState'
import { useRecordVisit } from '../../lib/useExplorationLibrary'
import { heightGradientCss } from '../../math/heightColor'
import { getSurface, heightRange, normalizeParamValue, num, type SurfaceDef, type SurfaceId } from '../../math/surfaces'
import { ActivityPanel } from '../activities/ActivityPanel'
import { SubjectGuidePanel } from '../guide/SubjectGuidePanel'
import { ACTIVITY_ENDED, replaceUrlSearch, useActivity } from '../activities/useActivity'
import { MATHEMATICS_ACTIVITY, saddleSetup } from './activity'
import { FormulaPanel, LocalSlope, ParameterPanel, PointInspector, SliceControls, SourcesPanel, SurfaceLibrary } from './MathPanels'
import type { MathView } from './scene/SurfaceScene'
import { SliceGraph } from './SliceGraph'
import { initialMathState, mathReducer } from './state'

// Three.js loads on demand; formulas, inspection and the cross-section graph work without it.
const SurfaceScene = lazy(() => import('./scene/SurfaceScene'))
// The 2D sections are HTML/SVG and load when first opened.
const FunctionsLab = lazy(() => import('./functions/FunctionsLab').then((m) => ({ default: m.FunctionsLab })))
const VectorsLab = lazy(() => import('./vectors/VectorsLab').then((m) => ({ default: m.VectorsLab })))
const StatisticsLab = lazy(() => import('./statistics/StatisticsLab').then((m) => ({ default: m.StatisticsLab })))

const SECTION_LABEL: Record<MathSection, string> = { functions: '2D functions', surfaces: '3D surfaces', vectors: 'Vectors and transformations', statistics: 'Statistics and probability' }

/**
 * Mathematics has four sections. Links without `msec` are surface links, so every older link
 * opens as before.
 */
export function MathematicsExplorer() {
  const [section, setSection] = useState<MathSection>(() => parseMathSection(window.location.search).section)
  const choose = (next: MathSection) => {
    if (next === section) return
    // Leaving a 2D section drops its keys; the surface keys stay (the surfaces section owns them).
    pushHistoryEntry()
    replaceUrlSearch(withMathSection(window.location.search, {}))
    setSection(next)
  }
  const sectionSwitch = (
    <div className="module-switch">
      <span className="module-switch-label" aria-hidden="true">
        Module
      </span>
      <div className="segmented section-switch section-switch--grid math-switch" role="group" aria-label="Mathematics section">
        {(['functions', 'surfaces', 'vectors', 'statistics'] as const).map((s) => (
          <button key={s} type="button" className="segmented-option" aria-pressed={section === s} onClick={() => choose(s)}>
            {SECTION_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
  const guidePanel = <SubjectGuidePanel subject="mathematics" />
  if (section === 'surfaces') return <SurfacesExplorer sectionSwitch={sectionSwitch} />
  return (
    <Suspense fallback={<p className="muted small panel">Loading {SECTION_LABEL[section].toLowerCase()}…</p>}>
      {section === 'functions' ? (
        <FunctionsLab sectionSwitch={sectionSwitch} guidePanel={guidePanel} />
      ) : section === 'statistics' ? (
        <StatisticsLab sectionSwitch={sectionSwitch} guidePanel={guidePanel} />
      ) : (
        <VectorsLab sectionSwitch={sectionSwitch} guidePanel={guidePanel} />
      )}
    </Suspense>
  )
}

type SideTab = 'explore' | 'formula' | 'sources'
type MobileTab = 'surface' | 'explore' | 'formula' | 'sources'

const VIEWS: { value: MathView; label: string; hint: string }[] = [
  { value: 'perspective', label: 'Perspective', hint: 'Rotatable 3D view' },
  { value: 'top', label: 'Top', hint: 'Orthographic view from above (xy-plane)' },
  { value: 'front', label: 'Front', hint: 'Orthographic view of the xz-plane' },
  { value: 'side', label: 'Side', hint: 'Orthographic view of the yz-plane' },
]

function initFromUrl() {
  const { surfaceId, params, slice } = parseMathParams(window.location.search)
  // Snap shared values to each parameter's step so the URL, stored values and fields agree.
  for (const def of getSurface(surfaceId).params) params[def.key] = normalizeParamValue(def, params[def.key]) ?? def.default
  return initialMathState(surfaceId, params, slice)
}

function SurfacesExplorer({ sectionSwitch }: { sectionSwitch: ReactNode }) {
  const [state, dispatch] = useReducer(mathReducer, undefined, initFromUrl)
  const [view, setView] = useState<MathView>('perspective')
  const [showWireframe, setShowWireframe] = useState(true)
  // Optional overlays at the inspected point; off by default so they never crowd the surface.
  const [showTangent, setShowTangent] = useState(false)
  const [showGradient, setShowGradient] = useState(false)
  const [cameraRequest, setCameraRequest] = useState({ id: 0, keep: false })
  const [sideTab, setSideTab] = useState<SideTab>('explore')
  const [mobileTab, setMobileTab] = useState<MobileTab>('surface')
  const isMobile = useMediaQuery('(max-width: 899px)')

  const surface = getSurface(state.surfaceId)
  const { params, point, slice } = state
  const sliceResult = slice ? surface.slice(params, slice.axis, slice.value) : null

  // Keep the address shareable without history entries; camera and point are not stored.
  useEffect(() => {
    const search = withMathParams(window.location.search, { surfaceId: state.surfaceId, params, slice })
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.surfaceId, params, slice])

  const shareParams = mathParamEntries({ surfaceId: state.surfaceId, params, slice })
  useRecordVisit({ subject: 'mathematics', params: shareParams })

  const activity = useActivity(MATHEMATICS_ACTIVITY, state, {
    capture: () => state,
    apply: () => dispatch({ type: 'replace', state: saddleSetup(), announcement: 'Activity started: saddle surface, cross-section at x = 1.' }),
    restore: (snap) => dispatch({ type: 'replace', state: snap, announcement: ACTIVITY_ENDED }),
    restoreUrl: (snap) =>
      replaceUrlSearch(withMathParams(window.location.search, { surfaceId: snap.surfaceId, params: snap.params, slice: snap.slice })),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="mathematics" />

  const selectSurface = (id: SurfaceId) => {
    dispatch({ type: 'selectSurface', surfaceId: id })
    // A newly opened preset is framed from the default direction.
    setCameraRequest((r) => ({ id: r.id + 1, keep: false }))
  }

  const library = <SurfaceLibrary selected={state.surfaceId} onSelect={selectSurface} />
  const parameters = (
    <ParameterPanel
      surface={surface}
      params={params}
      onChange={(key, value) => dispatch({ type: 'setParam', key, value })}
      onReset={() => dispatch({ type: 'resetParams' })}
    />
  )
  const copyLink = (
    <ShareActions subject="mathematics" params={shareParams} restores="this surface, its parameters and the cross-section" />
  )

  const explore = (
    <div className="info-body">
      <section className="info-section">
        <p className="prose">
          Drag to rotate, scroll or pinch to zoom. Change the parameters to reshape the surface, click it to read a point, and
          turn on a cross-section to see the curve cut by a vertical plane.
        </p>
      </section>
      <PointInspector
        surface={surface}
        params={params}
        point={point}
        note={state.pointNote}
        onSet={(x, y) => dispatch({ type: 'setPoint', x, y, source: 'input' })}
        onClear={() => dispatch({ type: 'clearPoint' })}
      />
      {point && (
        <LocalSlope
          surface={surface}
          params={params}
          point={point}
          showPlane={showTangent}
          showGradient={showGradient}
          onTogglePlane={() => setShowTangent((v) => !v)}
          onToggleGradient={() => setShowGradient((v) => !v)}
        />
      )}
      <SliceControls
        surface={surface}
        slice={slice}
        formula={sliceResult?.formula ?? null}
        onEnable={(enabled) => dispatch({ type: 'setSliceEnabled', enabled })}
        onAxis={(axis) => dispatch({ type: 'setSliceAxis', axis })}
        onValue={(value) => dispatch({ type: 'setSliceValue', value })}
      />
      {copyLink}
    </div>
  )
  const formula = <FormulaPanel surface={surface} params={params} />
  const sources = <SourcesPanel surface={surface} />
  const graph = slice ? <SliceGraph surface={surface} params={params} slice={slice} point={point} /> : null

  const viewer = (
    <ViewportShell
      label={`3D view of ${surface.name}, ${surface.formula}. Drag to rotate, scroll or pinch to zoom, click to inspect a point.`}
      fallbackNote="Only the 3D view is unavailable: parameters, formulas, point evaluation and the cross-section graph still work"
      renderScene={(callbacks) => (
        <SurfaceScene
          surface={surface}
          params={params}
          view={view}
          showWireframe={showWireframe}
          slice={slice}
          point={point}
          showTangent={showTangent}
          showGradient={showGradient}
          cameraRequest={cameraRequest}
          onPick={(x, y) => dispatch({ type: 'setPoint', x, y, source: 'click' })}
          {...callbacks}
        />
      )}
      overlay={<SceneOverlay surface={surface} params={params} view={view} />}
      controls={
        <div className="scene-controls" role="toolbar" aria-label="3D view controls">
          <div className="control-group" role="group" aria-label="Camera view">
            <div className="segmented segmented--modes">
              {VIEWS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  className="segmented-option"
                  aria-pressed={view === v.value}
                  title={v.hint}
                  onClick={() => {
                    setView(v.value)
                    setCameraRequest((r) => ({ id: r.id + 1, keep: false }))
                  }}
                >
                  {v.value === 'perspective' && <Box size={15} aria-hidden="true" />}
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group control-group--modes" role="group" aria-label="Camera and display">
            <button
              type="button"
              className="tool-button"
              title="Frame the whole surface, keeping the viewing direction"
              onClick={() => setCameraRequest((r) => ({ id: r.id + 1, keep: true }))}
            >
              <Maximize size={16} aria-hidden="true" />
              <span>Fit surface</span>
            </button>
            <button
              type="button"
              className="tool-button"
              aria-label="Reset camera"
              title="Return to the default camera for this view"
              onClick={() => setCameraRequest((r) => ({ id: r.id + 1, keep: false }))}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span className="tool-text">Reset camera</span>
            </button>
            <button type="button" className="tool-button" aria-pressed={showWireframe} onClick={() => setShowWireframe((v) => !v)}>
              <Grid3x3 size={16} aria-hidden="true" />
              <span>Grid lines</span>
            </button>
          </div>
        </div>
      }
    />
  )

  const announcer = (
    <p className="visually-hidden" role="status" aria-live="polite">
      {state.announcement}
    </p>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile mathematics">
        {announcer}
        {sectionSwitch}
        <div className="chem-stage">{viewer}</div>
        {activityPanel}
        {guidePanel}
        <Tabs
          label="Mathematics panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'surface', label: 'Surface', content: <div className="panel">{library}{parameters}</div> },
            { id: 'explore', label: 'Explore', content: <div className="panel">{explore}{graph}</div> },
            { id: 'formula', label: 'Formula', content: <div className="panel">{formula}</div> },
            { id: 'sources', label: 'Sources', content: <div className="panel">{sources}</div> },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem mathematics">
      {announcer}
      <aside className="chem-side chem-side--left">
        {sectionSwitch}
        <div className="panel math-left">
          {library}
          {parameters}
        </div>
      </aside>
      <div className="chem-stage physics-stage">
        {viewer}
        {graph}
      </div>
      <aside className="chem-side chem-side--right">
        {activityPanel}
        {guidePanel}
        <section className="panel info" aria-labelledby="math-heading">
          <header className="info-header">
            <p className="eyebrow">Mathematics</p>
            <h2 id="math-heading" className="info-title">
              {surface.name}
            </h2>
            <p className="formula-display">{surface.formula}</p>
          </header>
          <Tabs
            label="Surface information"
            className="info-tabs"
            active={sideTab}
            onChange={setSideTab}
            tabs={[
              { id: 'explore', label: 'Explore', content: explore },
              { id: 'formula', label: 'Formula & interpretation', content: formula },
              { id: 'sources', label: 'Sources', content: sources },
            ]}
          />
        </section>
      </aside>
    </div>
  )
}

/** Badge and numeric height-colour legend drawn over the viewport. */
function SceneOverlay({ surface, params, view }: { surface: SurfaceDef; params: Record<string, number>; view: MathView }) {
  const range = useMemo(() => heightRange(surface, params), [surface, params])
  const constant = range.max - range.min < 1e-9
  return (
    <>
      <div className="viewport-badge">
        <span className="viewport-badge-name">{surface.name}</span>
        <span className="viewport-badge-mode">
          {view === 'perspective' ? 'Perspective' : `Orthographic ${view} view`} · equal scale on x, y and z · mesh approximation
        </span>
      </div>
      <div className="height-legend" aria-label="Height colour legend">
        <span className="height-legend-title">
          <Crosshair size={12} aria-hidden="true" /> Height z
        </span>
        {constant ? (
          <span className="height-legend-constant">constant z = {num(range.min)}</span>
        ) : (
          <div className="height-legend-body">
            <span className="height-legend-bar" style={{ background: heightGradientCss() }} aria-hidden="true" />
            <span className="height-legend-ticks">
              <span>{num(range.max)}</span>
              <span>{num((range.max + range.min) / 2)}</span>
              <span>{num(range.min)}</span>
            </span>
          </div>
        )}
      </div>
    </>
  )
}
