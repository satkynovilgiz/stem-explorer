import { MousePointerClick } from 'lucide-react'
import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { ViewportShell } from '../../components/ViewportShell'
import { CELL_STRUCTURES, findOrganelle, isInternal } from '../../data/biology/organelles'
import type { OrganelleId } from '../../data/biology/types'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { pushHistoryEntry } from '../../lib/location'
import { biologySectionEntries, parseBiologyParams, parseBiologySection, withBiologyParams, withBiologySection, type BiologySection } from '../../lib/urlState'
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
// The process sections are plain HTML and SVG, loaded when first opened.
const DnaView = lazy(() => import('./processes/DnaView').then((m) => ({ default: m.DnaView })))
const DnaPanel = lazy(() => import('./processes/DnaView').then((m) => ({ default: m.DnaPanel })))
const DivisionView = lazy(() => import('./processes/DivisionView').then((m) => ({ default: m.DivisionView })))
const DivisionPanel = lazy(() => import('./processes/DivisionView').then((m) => ({ default: m.DivisionPanel })))
const EnergyView = lazy(() => import('./processes/EnergyView').then((m) => ({ default: m.EnergyView })))
const EnergyPanel = lazy(() => import('./processes/EnergyView').then((m) => ({ default: m.EnergyPanel })))

const SECTION_LABEL: Record<BiologySection, string> = { cells: 'Cells', dna: 'DNA and RNA', division: 'Cell division', energy: 'Energy processes' }

type MobileTab = 'details' | 'structures'

function initFromUrl() {
  const { structureId, cellView, cellType } = parseBiologyParams(window.location.search, (t) => CELL_STRUCTURES[t], {
    structureId: null,
    cellView: 'cutaway',
  })
  return initialBiologyState(structureId, cellView, cellType)
}

export function BiologyExplorer() {
  const [state, dispatch] = useReducer(biologyReducer, undefined, initFromUrl)
  const [query, setQuery] = useState('')
  const [showLabels, setShowLabels] = useState(true)
  const [resetToken, setResetToken] = useState(0)
  const [focusToken, setFocusToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')
  const [section, setSection] = useState<BiologySection>(() => parseBiologySection(window.location.search).section)

  // Switching module adds a history entry, so Back returns to the previous module.
  const goSection = (next: BiologySection) => {
    if (next !== section) pushHistoryEntry()
    setSection(next)
  }
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const { cellType, view, selection, isolated } = state
  const selected = selection ? findOrganelle(selection.organelleId) : undefined
  const selectionHidden = view === 'whole' && !isolated && !!selected && isInternal(cellType, selected.id)

  // Keep the address shareable (?structure=…&cell=…) without adding history entries;
  // Chemistry's molecule/view keys are left untouched.
  useEffect(() => {
    const search = withBiologySection(
      withBiologyParams(window.location.search, {
        structureId: selection?.organelleId ?? null,
        cellView: view,
        cellType,
      }),
      section,
    )
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [selection?.organelleId, view, cellType, section])

  // Process sections are shared and saved as the section alone (see canonicalize).
  const sectionParams = { cell: view, ...biologySectionEntries(section) }
  useRecordVisit({
    subject: 'biology',
    params:
      section === 'cells'
        ? { ...(selection ? { structure: selection.organelleId } : {}), cell: view, ...(cellType !== 'animal' ? { type: cellType } : {}) }
        : sectionParams,
  })

  const activity = useActivity(BIOLOGY_ACTIVITY, state, {
    capture: () => state,
    apply: () => dispatch({ type: 'replace', state: golgiSetup(state), announcement: 'Activity started: cutaway view, nothing selected.' }),
    restore: (snap) => dispatch({ type: 'replace', state: snap, announcement: ACTIVITY_ENDED }),
    restoreUrl: (snap) =>
      replaceUrlSearch(
        withBiologyParams(window.location.search, { structureId: snap.selection?.organelleId ?? null, cellView: snap.view, cellType: snap.cellType }),
      ),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="biology" />

  const select = (organelleId: OrganelleId, instance: number | null = null) => {
    dispatch({ type: 'select', organelleId, instance })
    if (isMobile) setMobileTab('details')
  }

  const sectionSwitch = (
    <div className="module-switch">
      <span className="module-switch-label" aria-hidden="true">
        Module
      </span>
      <div className="segmented section-switch section-switch--grid" role="group" aria-label="Biology section">
        {(['cells', 'dna', 'division', 'energy'] as const).map((s) => (
          <button key={s} type="button" className="segmented-option" aria-pressed={section === s} onClick={() => goSection(s)}>
            {SECTION_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
  const openStructure = (t: typeof cellType, id: OrganelleId) => {
    goSection('cells')
    if (t !== cellType) dispatch({ type: 'setCellType', cellType: t })
    dispatch({ type: 'setView', view: 'cutaway' })
    dispatch({ type: 'select', organelleId: id, instance: null })
  }
  const loading = <p className="muted small panel">Loading {SECTION_LABEL[section].toLowerCase()}…</p>
  const processStage =
    section === 'dna' ? <DnaView /> : section === 'division' ? <DivisionView /> : section === 'energy' ? <EnergyView onOpenStructure={openStructure} /> : null
  const processPanel =
    section === 'dna' ? (
      <DnaPanel shareParams={sectionParams} />
    ) : section === 'division' ? (
      <DivisionPanel shareParams={sectionParams} />
    ) : section === 'energy' ? (
      <EnergyPanel shareParams={sectionParams} />
    ) : null

  const typeSwitch = (
    <div className="segmented section-switch" role="group" aria-label="Cell type">
      {(['animal', 'plant', 'bacterium'] as const).map((t) => (
        <button key={t} type="button" className="segmented-option" aria-pressed={cellType === t} onClick={() => dispatch({ type: 'setCellType', cellType: t })}>
          {t === 'animal' ? 'Animal' : t === 'plant' ? 'Plant' : 'Bacterium'}
        </button>
      ))}
    </div>
  )
  const list = (
    <StructureList
      cellType={cellType}
      query={query}
      onQueryChange={setQuery}
      selectedId={selection?.organelleId ?? null}
      onSelect={(id) => select(id)}
    />
  )
  const details = (
    <StructureDetails
      cellType={cellType}
      selection={selection}
      view={view}
      onSelect={(id, instance) => dispatch({ type: 'select', organelleId: id, instance })}
      onClear={() => dispatch({ type: 'clearSelection' })}
    />
  )

  const viewer = (
    <ViewportShell
      label={`3D model of a generalized ${cellType} cell. Drag to rotate, scroll or pinch to zoom.`}
      fallbackNote="Every structure, its description and its sources remain available in the panels"
      renderScene={(callbacks) => (
        <CellScene
          cellType={cellType}
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
            <span className="viewport-badge-name">{cellType === 'bacterium' ? 'Representative bacterial cell' : `Generalized ${cellType} cell`}</span>
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
        {sectionSwitch}
        {section !== 'cells' ? (
          <Suspense fallback={loading}>
            <div className="chem-stage process-stage">{processStage}</div>
            {guidePanel}
            {processPanel}
          </Suspense>
        ) : (
          <>
        {typeSwitch}
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
          </>
        )}
      </div>
    )
  }

  return (
    <div className="chem">
      {announcer}
      <aside className="chem-side chem-side--left">
        <div className="section-switch-wrap">{sectionSwitch}</div>
        {section === 'cells' ? (
          <>
            <div className="section-switch-wrap">{typeSwitch}</div>
            {list}
          </>
        ) : (
          <p className="muted small panel">
            {section === 'dna'
              ? 'A small schematic DNA segment and a transcription example.'
              : section === 'division'
                ? 'A step-by-step mitosis sequence, with interphase and cytokinesis shown separately.'
                : 'Photosynthesis and cellular respiration, linked to the chloroplast and mitochondrion.'}
          </p>
        )}
      </aside>
      <Suspense fallback={loading}>
        <div className={`chem-stage${section !== 'cells' ? ' process-stage' : ''}`}>{section === 'cells' ? viewer : processStage}</div>
        <aside className="chem-side chem-side--right">
          {section === 'cells' && activityPanel}
          {guidePanel}
          {section === 'cells' ? details : processPanel}
        </aside>
      </Suspense>
    </div>
  )
}
