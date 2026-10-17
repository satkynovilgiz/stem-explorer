import { MousePointerClick } from 'lucide-react'
import { lazy, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { Tabs } from '../../../components/Tabs'
import { ViewportShell } from '../../../components/ViewportShell'
import { boundsOf, findStructure, getSystem, type Vec3 } from '../../../data/anatomy/atlas'
import { findTour } from '../../../data/anatomy/atlas/tours'
import { demoPivot, findMovement } from '../../../data/anatomy/atlas/movements'
import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { atlasParamEntries, parseAtlasParams, withAtlasParams } from '../../../lib/urlState'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { MODULE_GUIDES } from '../../../data/guides'
import { SubjectGuidePanel } from '../../guide/SubjectGuidePanel'
import { AtlasDetails, AtlasInventory, AtlasNavigator, AtlasToolbar, LayerPanel } from './AtlasPanels'
import { LimbComparison, MovementPanel } from './MusculoskeletalPanels'
import { AlveolusView, NephronView } from './SchematicViews'
import { AtlasModules, AtlasTourBar, type CloseUp } from './TourPanels'
import { atlasReducer, atlasShareState, initialAtlasState, VIEW_TEXT } from './atlasState'
import { drawnStructures } from './visibility'

// Three.js loads on demand; the list, details, layers and inventory work without it.
const AtlasScene = lazy(() => import('./scene/AtlasScene'))

type MobileTab = 'details' | 'structures' | 'layers' | 'movement'

function initFromUrl() {
  return initialAtlasState(parseAtlasParams(window.location.search, ATLAS_CONFIG))
}

export function AtlasExplorer({ moduleSwitch, onOpenHeart }: { moduleSwitch: ReactNode; onOpenHeart: () => void }) {
  const [state, dispatch] = useReducer(atlasReducer, undefined, initFromUrl)
  const [showLabels, setShowLabels] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const [focusToken, setFocusToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const [playing, setPlaying] = useState(false)
  const [closeUp, setCloseUp] = useState<CloseUp | null>(null)
  const rightPanel = useRef<HTMLElement>(null)
  // Opening or closing a close-up replaces the right panel's content: start it at the top.
  useEffect(() => {
    rightPanel.current?.scrollTo({ top: 0 })
  }, [closeUp])
  const playStart = useRef<{ time: number; t: number } | null>(null)

  // Play sweeps the demonstration out and back (4 s per cycle) until paused; never under reduced
  // motion, and it pauses while the tab is hidden.
  const demoActive = !!state.demo
  useEffect(() => {
    if (!playing || !demoActive || reducedMotion) return
    let frame = 0
    playStart.current = null
    const tick = (now: number) => {
      if (document.visibilityState === 'hidden') {
        playStart.current = null
      } else {
        if (!playStart.current) playStart.current = { time: now, t: 0 }
        const phase = ((now - playStart.current.time) / 4000) % 1
        dispatch({ type: 'setDemoT', t: phase < 0.5 ? phase * 2 : 2 - phase * 2 })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, demoActive, reducedMotion])

  const share = atlasShareState(state)
  const entries = atlasParamEntries(share, ATLAS_CONFIG.defaultLayers)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    const search = withAtlasParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'anatomy', params: entries })

  const drawn = useMemo(() => drawnStructures(state), [state])
  const selectedDrawn = !!state.selected && drawn.some((d) => d.structure.id === state.selected || findStructure(d.structure.id)?.parent === state.selected)

  const select = (id: string) => {
    dispatch({ type: 'select', id })
    if (isMobile) setMobileTab('details')
  }

  const navigator = <AtlasNavigator state={state} onSelect={select} onRegion={(region) => dispatch({ type: 'setRegion', region })} />
  const layers = (
    <LayerPanel
      state={state}
      onToggle={(system) => dispatch({ type: 'toggleLayer', system })}
      onOpacity={(system, value) => dispatch({ type: 'setOpacity', system, value })}
      onVariant={(variant) => dispatch({ type: 'setVariant', variant })}
      onPreset={(l) => dispatch({ type: 'setLayers', layers: l })}
      onMusculoskeletal={() => dispatch({ type: 'toggleMusculoskeletal' })}
    />
  )
  const inventory = <AtlasInventory onSelect={select} />
  const movement = (
    <MovementPanel
      state={state}
      reducedMotion={reducedMotion}
      playing={playing && !reducedMotion}
      onStart={(id, side) => {
        setPlaying(false)
        dispatch({ type: 'startDemo', id, side })
      }}
      onSide={(side) => dispatch({ type: 'setDemoSide', side })}
      onT={(t) => dispatch({ type: 'setDemoT', t })}
      onPlay={setPlaying}
      onExit={() => {
        setPlaying(false)
        dispatch({ type: 'exitDemo' })
      }}
      onSelect={select}
    />
  )
  const compare = <LimbComparison onSelect={select} />
  const modules = (
    <AtlasModules
      onShowSystem={(system) => dispatch({ type: 'showSystem', system })}
      onStartTour={(id) => {
        setPlaying(false)
        dispatch({ type: 'startTour', id })
      }}
      onCloseUp={setCloseUp}
      onOpenHeart={onOpenHeart}
    />
  )

  // Tour framing and marker for the current step.
  const tour = state.tour ? findTour(state.tour.id)! : null
  const tourStep = tour && state.tour ? tour.steps[state.tour.step] : null
  const frame = useMemo(() => {
    if (!tourStep || !state.tour) return null
    const boxes = tourStep.focus.map((id) => boundsOf(id)).filter((b) => b !== null)
    if (boxes.length === 0) return null
    const min = [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b!.min[i]))) as unknown as Vec3
    const max = [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b!.max[i]))) as unknown as Vec3
    const center: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]
    return { key: `${state.tour.id}:${state.tour.step}`, center, size: Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) }
  }, [tourStep, state.tour])
  const marker =
    tourStep?.path && state.tour && tourStep.kind !== 'process'
      ? { key: `${state.tour.id}:${state.tour.step}`, points: tourStep.path, kind: tourStep.kind }
      : null
  const tourBar =
    state.tour && tour ? (
      <AtlasTourBar
        tourId={tour.id}
        step={state.tour.step}
        reducedMotion={reducedMotion}
        onPrevious={() => dispatch({ type: 'tourPrevious' })}
        onNext={() => dispatch({ type: 'tourNext' })}
        onGoTo={(index) => dispatch({ type: 'tourGoTo', index })}
        onExit={() => dispatch({ type: 'exitTour' })}
        onCloseUp={setCloseUp}
        onOpenHeart={onOpenHeart}
      />
    ) : null
  const closeUpPanel = closeUp === 'alveolus' ? <AlveolusView onClose={() => setCloseUp(null)} /> : closeUp === 'nephron' ? <NephronView onClose={() => setCloseUp(null)} /> : null
  const details = (
    <AtlasDetails
      state={state}
      onSelect={select}
      onClear={() => dispatch({ type: 'clearSelection' })}
      onIsolatePair={() => dispatch({ type: 'isolatePair' })}
      onOpenHeart={onOpenHeart}
      extra={
        isMobile ? (
          <>
            {modules}
            {compare}
            {inventory}
          </>
        ) : (
          <>
            {modules}
            {movement}
            {layers}
            {compare}
            {inventory}
          </>
        )
      }
    />
  )
  const guidePanel = <SubjectGuidePanel subject="anatomy" guide={MODULE_GUIDES['anatomy-atlas']} />

  const visibleNames = state.layers.map((l) => getSystem(l).name)
  const viewer = (
    <ViewportShell
      label={`3D schematic of the whole body. ${VIEW_TEXT[state.view]} Drag to rotate, scroll or pinch to zoom.`}
      fallbackNote="The structure list, search, layers, descriptions, sources and the inventory still work"
      renderScene={(callbacks) => (
        <AtlasScene
          drawn={drawn}
          selected={state.selected}
          demo={state.demo ? { id: state.demo.id, side: state.demo.side, pivot: demoPivot(findMovement(state.demo.id)!, state.demo.side) } : null}
          frame={frame}
          marker={marker}
          view={state.view}
          region={state.region}
          showLabels={showLabels}
          reducedMotion={reducedMotion}
          resetToken={resetToken}
          focusToken={focusToken}
          onSelect={select}
          onBackgroundClick={() => dispatch({ type: 'clearSelection' })}
          {...callbacks}
        />
      )}
      overlay={
        <>
          <div className="viewport-badge">
            <span className="viewport-badge-name">
              Body atlas ·{' '}
              {state.demo
                ? `${state.demo.side} lateral view of the ${state.demo.id === 'knee-flexion' ? 'leg' : 'arm'}`
                : `${state.view === 'front' ? 'anterior' : state.view === 'back' ? 'posterior' : 'left lateral'} view`}
            </span>
            <span className="viewport-badge-mode">
              {tour
                ? `Tour: ${tour.title} · conceptual route, not timed · `
                : state.demo
                ? `${findMovement(state.demo.id)!.name} (${state.demo.side}) · conceptual motion, not a measured range · `
                : state.isolated && state.selected
                  ? `Isolated: ${findStructure(state.selected)!.name}${state.isolatePair ? ' and the other side' : ''} · `
                  : ''}
              Schematic shapes, not to scale
            </span>
          </div>
          <p className="viewport-hint">
            <MousePointerClick size={14} aria-hidden="true" />
            Drag to rotate · Scroll or pinch to zoom · Click a structure
          </p>
        </>
      }
      controls={
        <AtlasToolbar
          view={state.view}
          showLabels={showLabels}
          canAct={selectedDrawn}
          isolated={state.isolated}
          onView={(view) => dispatch({ type: 'setView', view })}
          onReset={() => setResetToken((n) => n + 1)}
          onLabels={() => setShowLabels((v) => !v)}
          onFocus={() => setFocusToken((n) => n + 1)}
          onIsolate={() => dispatch({ type: 'isolate' })}
          onShowAll={() => dispatch({ type: 'showAll' })}
        />
      }
    />
  )

  const announcer = (
    <p className="visually-hidden" role="status" aria-live="polite">
      {state.announcement}
    </p>
  )
  const layerNote = <p className="visually-hidden">{visibleNames.length ? `Visible layers: ${visibleNames.join(', ')}.` : 'No layers visible.'}</p>

  if (isMobile) {
    return (
      <div className="chem chem--mobile anatomy atlas">
        {announcer}
        {layerNote}
        {moduleSwitch}
        <div className="chem-stage">
          {viewer}
          {tourBar}
        </div>
        {closeUpPanel}
        {guidePanel}
        <Tabs
          label="Body atlas panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'details', label: 'Details', content: details },
            { id: 'structures', label: 'Structures', content: navigator },
            { id: 'layers', label: 'Layers', content: <div className="panel">{layers}</div> },
            { id: 'movement', label: 'Movement', content: <div className="panel">{movement}</div> },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem anatomy atlas">
      {announcer}
      {layerNote}
      <aside className="chem-side chem-side--left">
        {moduleSwitch}
        {navigator}
      </aside>
      <div className="chem-stage physics-stage">
        {viewer}
        {tourBar}
      </div>
      <aside ref={rightPanel} className="chem-side chem-side--right">
        {guidePanel}
        {closeUpPanel ?? details}
      </aside>
    </div>
  )
}
