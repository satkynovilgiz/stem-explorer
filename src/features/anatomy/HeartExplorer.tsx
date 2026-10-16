import { MousePointerClick } from 'lucide-react'
import { lazy, useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { findHeartPart, HEART_PART_IDS, type HeartPartId } from '../../data/anatomy/heart'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { anatomyParamEntries, parseAnatomyParams, withAnatomyParams } from '../../lib/urlState'
import { useRecordVisit } from '../../lib/useExplorationLibrary'
import { ActivityPanel } from '../activities/ActivityPanel'
import { SubjectGuidePanel } from '../guide/SubjectGuidePanel'
import { ACTIVITY_ENDED, replaceUrlSearch, useActivity } from '../activities/useActivity'
import { ANATOMY_ACTIVITY, anatomySnapshot, pulmonarySetup } from './activity'
import { ComparePanel } from './ComparePanel'
import { HEART_COLORS } from './colors'
import { HeartToolbar, PartDetails, PartList, TourBar } from './HeartPanels'
import { anatomyReducer, anatomyShareState, initialAnatomyState } from './state'

// Three.js loads on demand; the list, details and tour work without it.
const HeartScene = lazy(() => import('./scene/HeartScene'))

type MobileTab = 'details' | 'structures'

function initFromUrl() {
  const { partId, heartView } = parseAnatomyParams(window.location.search, HEART_PART_IDS, { partId: null, heartView: 'whole' })
  return initialAnatomyState(partId, heartView)
}

export function HeartExplorer() {
  const [state, dispatch] = useReducer(anatomyReducer, undefined, initFromUrl)
  const [showLabels, setShowLabels] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const [focusToken, setFocusToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const { view, selected, isolated, tourStep, compare } = state
  const touring = tourStep !== null
  const part = selected ? findHeartPart(selected) : undefined
  const canAct = !!part && !touring && (view === 'cutaway' || isolated || !part.internal)

  // One canonical share state for the address bar, Copy link and Save (see anatomyShareState):
  // during the tour it is the exploration state the tour will restore; tour progress is never stored.
  const share = anatomyShareState(state)
  useEffect(() => {
    const search = withAnatomyParams(window.location.search, { partId: share.partId, heartView: share.heartView })
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [share.partId, share.heartView])

  useRecordVisit({ subject: 'anatomy', params: anatomyParamEntries(share) })

  const activity = useActivity(ANATOMY_ACTIVITY, state, {
    // A tour in progress is ended by the activity; Exit returns to the view from before that tour.
    capture: () => anatomySnapshot(state),
    apply: () => dispatch({ type: 'replace', state: pulmonarySetup(), announcement: 'Activity started: cutaway view, nothing selected.' }),
    restore: (snap) => dispatch({ type: 'replace', state: snap, announcement: ACTIVITY_ENDED }),
    restoreUrl: (snap) => replaceUrlSearch(withAnatomyParams(window.location.search, anatomyShareState(snap))),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="anatomy" />

  const select = (id: HeartPartId) => {
    dispatch({ type: 'select', partId: id })
    if (isMobile) setMobileTab('details')
  }

  const list = (
    <PartList
      selected={touring ? null : selected}
      disabled={touring}
      touring={touring}
      onSelect={select}
      onStartTour={() => dispatch({ type: 'startTour' })}
      compare={compare}
      onToggleCompare={() => dispatch({ type: compare ? 'exitCompare' : 'enterCompare' })}
    />
  )
  const details = compare ? (
    <ComparePanel
      a={compare.a}
      b={compare.b}
      onClear={(slot) => dispatch({ type: 'compareClear', slot })}
      onPreset={(a, b) => dispatch({ type: 'comparePreset', a, b })}
      onExit={() => dispatch({ type: 'exitCompare' })}
    />
  ) : (
    <PartDetails
      selected={touring ? null : selected}
      view={view}
      share={share}
      onSelect={select}
      onClear={() => dispatch({ type: 'clearSelection' })}
    />
  )
  const tour = touring ? (
    <TourBar
      step={tourStep}
      reducedMotion={reducedMotion}
      onPrevious={() => dispatch({ type: 'previousStep' })}
      onNext={() => dispatch({ type: 'nextStep' })}
      onGoTo={(index) => dispatch({ type: 'goToStep', index })}
      onExit={() => dispatch({ type: 'exitTour' })}
    />
  ) : null

  const viewer = (
    <ViewportShell
      label="3D schematic of the human heart, anterior view: the body's right is on your left. Drag to rotate, scroll or pinch to zoom."
      fallbackNote="The structure list, descriptions, sources and the step-by-step blood-flow tour still work"
      renderScene={(callbacks) => (
        <HeartScene
          view={view}
          compared={compare}
          selected={selected}
          isolated={isolated}
          tourStep={tourStep}
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
            <span className="viewport-badge-name">Human heart · anterior view</span>
            <span className="viewport-badge-mode">
              {compare ? 'Comparing vessels · ' : ''}
              {isolated && part ? `Isolated: ${part.name}` : view === 'whole' ? 'Whole heart' : 'Cutaway'} · schematic, not to scale
            </span>
          </div>
          <ul className="heart-legend" aria-label="Colour legend">
            <li>
              <span className="legend-chip" style={{ background: HEART_COLORS.poor }} aria-hidden="true" /> Oxygen-poor pathway
            </li>
            <li>
              <span className="legend-chip" style={{ background: HEART_COLORS.rich }} aria-hidden="true" /> Oxygen-rich pathway
            </li>
            <li className="muted">Diagram colours — blood is never blue</li>
          </ul>
          <p className="viewport-hint">
            <MousePointerClick size={14} aria-hidden="true" />
            Drag to rotate · Scroll or pinch to zoom · {touring ? 'Use Previous / Next' : 'Click a structure'}
          </p>
        </>
      }
      controls={
        <HeartToolbar
          view={view}
          showLabels={showLabels}
          canAct={canAct}
          isolated={isolated}
          touring={touring}
          onView={(v) => dispatch({ type: 'setView', view: v })}
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

  if (isMobile) {
    return (
      <div className="chem chem--mobile anatomy">
        {announcer}
        <div className="chem-stage">
          {viewer}
          {tour}
        </div>
        {activityPanel}
        {guidePanel}
        <Tabs
          label="Anatomy panels"
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
    <div className="chem anatomy">
      {announcer}
      <aside className="chem-side chem-side--left">{list}</aside>
      <div className="chem-stage physics-stage">
        {viewer}
        {tour}
      </div>
      <aside className="chem-side chem-side--right">
        {activityPanel}
        {guidePanel}
        {details}
      </aside>
    </div>
  )
}
