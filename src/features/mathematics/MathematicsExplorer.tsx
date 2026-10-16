import { Box, Crosshair, Grid3x3, Maximize, RotateCcw } from 'lucide-react'
import { lazy, useEffect, useMemo, useReducer, useState } from 'react'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { useMediaQuery } from '../../lib/hooks'
import { mathParamEntries, parseMathParams, shareUrl, withMathParams } from '../../lib/urlState'
import { heightGradientCss } from '../../math/heightColor'
import { getSurface, heightRange, normalizeParamValue, num, type SurfaceDef, type SurfaceId } from '../../math/surfaces'
import { FormulaPanel, ParameterPanel, PointInspector, SliceControls, SourcesPanel, SurfaceLibrary } from './MathPanels'
import type { MathView } from './scene/SurfaceScene'
import { SliceGraph } from './SliceGraph'
import { initialMathState, mathReducer } from './state'

// Three.js loads on demand; formulas, inspection and the cross-section graph work without it.
const SurfaceScene = lazy(() => import('./scene/SurfaceScene'))

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

export function MathematicsExplorer() {
  const [state, dispatch] = useReducer(mathReducer, undefined, initFromUrl)
  const [view, setView] = useState<MathView>('perspective')
  const [showWireframe, setShowWireframe] = useState(true)
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
    <CopyLinkButton
      restores="this surface, its parameters and the cross-section"
      getUrl={() => shareUrl(window.location, 'mathematics', mathParamEntries({ surfaceId: state.surfaceId, params, slice }))}
    />
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
        <div className="chem-stage">{viewer}</div>
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
