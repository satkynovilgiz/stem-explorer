import { MousePointerClick } from 'lucide-react'
import { lazy, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { Tabs } from '../../../components/Tabs'
import { ViewportShell } from '../../../components/ViewportShell'
import { findStructure, getSystem } from '../../../data/anatomy/atlas'
import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { useMediaQuery, usePrefersReducedMotion } from '../../../lib/hooks'
import { atlasParamEntries, parseAtlasParams, withAtlasParams } from '../../../lib/urlState'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { MODULE_GUIDES } from '../../../data/guides'
import { SubjectGuidePanel } from '../../guide/SubjectGuidePanel'
import { AtlasDetails, AtlasInventory, AtlasNavigator, AtlasToolbar, LayerPanel } from './AtlasPanels'
import { atlasReducer, atlasShareState, initialAtlasState, VIEW_TEXT } from './atlasState'
import { drawnStructures } from './visibility'

// Three.js loads on demand; the list, details, layers and inventory work without it.
const AtlasScene = lazy(() => import('./scene/AtlasScene'))

type MobileTab = 'details' | 'structures' | 'layers'

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
    />
  )
  const inventory = <AtlasInventory onSelect={select} />
  const details = (
    <AtlasDetails
      state={state}
      onSelect={select}
      onClear={() => dispatch({ type: 'clearSelection' })}
      onOpenHeart={onOpenHeart}
      extra={isMobile ? inventory : (
        <>
          {layers}
          {inventory}
        </>
      )}
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
            <span className="viewport-badge-name">Body atlas · {state.view === 'front' ? 'anterior' : state.view === 'back' ? 'posterior' : 'left lateral'} view</span>
            <span className="viewport-badge-mode">
              {state.isolated && state.selected ? `Isolated: ${findStructure(state.selected)!.name} · ` : ''}
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
        <div className="chem-stage">{viewer}</div>
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
      <div className="chem-stage physics-stage">{viewer}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        {details}
      </aside>
    </div>
  )
}
