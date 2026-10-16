import { MousePointerClick } from 'lucide-react'
import { lazy, useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { findOrganelle } from '../../data/biology/organelles'
import { ORGANELLE_IDS, type OrganelleId } from '../../data/biology/types'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { parseBiologyParams, withBiologyParams } from '../../lib/urlState'
import { ActivityPanel } from '../activities/ActivityPanel'
import { SubjectGuidePanel } from '../guide/SubjectGuidePanel'
import { ACTIVITY_ENDED, replaceUrlSearch, useActivity } from '../activities/useActivity'
import { BIOLOGY_ACTIVITY, golgiSetup } from './activity'
import { useRecordVisit } from '../../lib/useExplorationLibrary'
import { CellToolbar } from './CellToolbar'
import { biologyReducer, initialBiologyState } from './state'
import { StructureDetails } from './StructureDetails'
import { StructureList } from './StructureList'

// Three.js is loaded on demand so the list and descriptions render immediately.
const CellScene = lazy(() => import('./scene/CellScene'))

type MobileTab = 'details' | 'structures'

function initFromUrl() {
  const { structureId, cellView } = parseBiologyParams(window.location.search, ORGANELLE_IDS, {
    structureId: null,
    cellView: 'cutaway',
  })
  return initialBiologyState(structureId, cellView)
}

export function BiologyExplorer() {
  const [state, dispatch] = useReducer(biologyReducer, undefined, initFromUrl)
  const [query, setQuery] = useState('')
  const [showLabels, setShowLabels] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const [focusToken, setFocusToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')

  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const { view, selection, isolated } = state
  const selected = selection ? findOrganelle(selection.organelleId) : undefined
  const selectionHidden = view === 'whole' && !isolated && !!selected?.internal

  // Keep the address shareable (?structure=…&cell=…) without adding history entries;
  // Chemistry's molecule/view keys are left untouched.
  useEffect(() => {
    const search = withBiologyParams(window.location.search, {
      structureId: selection?.organelleId ?? null,
      cellView: view,
    })
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [selection?.organelleId, view])

  useRecordVisit({ subject: 'biology', params: { ...(selection ? { structure: selection.organelleId } : {}), cell: view } })

  const activity = useActivity(BIOLOGY_ACTIVITY, state, {
    capture: () => state,
    apply: () => dispatch({ type: 'replace', state: golgiSetup(), announcement: 'Activity started: cutaway view, nothing selected.' }),
    restore: (snap) => dispatch({ type: 'replace', state: snap, announcement: ACTIVITY_ENDED }),
    restoreUrl: (snap) =>
      replaceUrlSearch(withBiologyParams(window.location.search, { structureId: snap.selection?.organelleId ?? null, cellView: snap.view })),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="biology" />

  const select = (organelleId: OrganelleId, instance: number | null = null) => {
    dispatch({ type: 'select', organelleId, instance })
    if (isMobile) setMobileTab('details')
  }

  const list = (
    <StructureList query={query} onQueryChange={setQuery} selectedId={selection?.organelleId ?? null} onSelect={(id) => select(id)} />
  )
  const details = (
    <StructureDetails
      selection={selection}
      view={view}
      onSelect={(id, instance) => dispatch({ type: 'select', organelleId: id, instance })}
      onClear={() => dispatch({ type: 'clearSelection' })}
    />
  )

  const viewer = (
    <ViewportShell
      label="3D model of a generalized animal cell. Drag to rotate, scroll or pinch to zoom."
      fallbackNote="Every structure, its description and its sources remain available in the panels"
      renderScene={(callbacks) => (
        <CellScene
          view={view}
          selection={selection}
          isolated={isolated}
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
            <span className="viewport-badge-name">Generalized animal cell</span>
            <span className="viewport-badge-mode">
              {isolated && selected ? `Isolated: ${selected.name}` : view === 'whole' ? 'Whole cell' : 'Cutaway'} ·
              schematic, not to scale
            </span>
          </div>
          <p className="viewport-hint">
            <MousePointerClick size={14} aria-hidden="true" />
            Drag to rotate · Scroll or pinch to zoom ·{' '}
            {view === 'whole' && !isolated ? 'Choose Cutaway to look inside' : 'Click a structure'}
          </p>
        </>
      }
      controls={
        <CellToolbar
          view={view}
          showLabels={showLabels}
          hasSelection={!!selection}
          selectionHidden={selectionHidden}
          isolated={isolated}
          onViewChange={(v) => dispatch({ type: 'setView', view: v })}
          onReset={() => setResetToken((n) => n + 1)}
          onToggleLabels={() => setShowLabels((v) => !v)}
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

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {announcer}
        <div className="chem-stage">{viewer}</div>
        {activityPanel}
        {guidePanel}
        <Tabs
          label="Biology panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'details', label: 'Details', content: details },
            { id: 'structures', label: 'Structures', content: list },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem">
      {announcer}
      <aside className="chem-side chem-side--left">{list}</aside>
      <div className="chem-stage">{viewer}</div>
      <aside className="chem-side chem-side--right">
        {activityPanel}
        {guidePanel}
        {details}
      </aside>
    </div>
  )
}
