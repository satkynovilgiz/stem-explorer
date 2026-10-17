import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { DEFAULT_MOLECULE_ID, getMolecule, MOLECULES } from '../../data/chemistry/molecules'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { chemistrySectionEntries, parseChemistryParams, parseChemistrySection, withChemistryParams, withChemistrySection, type ChemistrySection } from '../../lib/urlState'
import { useRecordVisit } from '../../lib/useExplorationLibrary'
import { ActivityPanel } from '../activities/ActivityPanel'
import { SubjectGuidePanel } from '../guide/SubjectGuidePanel'
import { ACTIVITY_ENDED, replaceUrlSearch, useActivity } from '../activities/useActivity'
import { CHEMISTRY_ACTIVITY, waterSetup } from './activity'
import { InfoPanel } from './InfoPanel'
import { MeasurementPanel } from './MeasurementPanel'
import { MoleculeLibrary } from './MoleculeLibrary'
import { MoleculeViewer } from './MoleculeViewer'
import { SceneControls } from './SceneControls'
import { chemistryReducer, initialChemistryState } from './state'

type MobileTab = 'details' | 'library'

// The periodic table, atomic structure and bonding sections load only when opened.
const PeriodicTableView = lazy(() => import('./periodic/PeriodicTableView'))
const ElementPanel = lazy(() => import('./periodic/PeriodicTableView').then((m) => ({ default: m.ElementPanel })))
const AtomicStructureView = lazy(() => import('./atomic/AtomicStructure').then((m) => ({ default: m.AtomicStructureView })))
const AtomPanel = lazy(() => import('./atomic/AtomicStructure').then((m) => ({ default: m.AtomPanel })))
const BondingView = lazy(() => import('./bonding/Bonding').then((m) => ({ default: m.BondingView })))
const BondingPanel = lazy(() => import('./bonding/Bonding').then((m) => ({ default: m.BondingPanel })))

const SECTION_LABEL: Record<ChemistrySection, string> = {
  periodic: 'Periodic table',
  atomic: 'Atomic structure',
  molecules: 'Molecules',
  bonding: 'Bonding and geometry',
}

const URL_DEFAULTS = { moleculeId: DEFAULT_MOLECULE_ID, representation: 'ball-and-stick' } as const

function initFromUrl() {
  const { moleculeId, representation } = parseChemistryParams(
    window.location.search,
    MOLECULES.map((m) => m.id),
    URL_DEFAULTS,
  )
  return initialChemistryState(moleculeId, representation)
}

export function ChemistryExplorer() {
  const [state, dispatch] = useReducer(chemistryReducer, undefined, initFromUrl)
  const [query, setQuery] = useState('')
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [resetToken, setResetToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')
  const [section, setSection] = useState<ChemistrySection>(() => parseChemistrySection(window.location.search).section)
  const [elementZ, setElementZ] = useState(() => parseChemistrySection(window.location.search).element)

  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const molecule = getMolecule(state.moleculeId)
  const { mode, representation } = state
  const measuring = mode !== 'inspect'

  // Keep the address shareable: ?molecule=…&view=… (also replaces invalid values with valid ones).
  // Sections other than Molecules add `csec` (and `el`); molecule links stay exactly as before.
  useEffect(() => {
    const search = withChemistrySection(withChemistryParams(window.location.search, { moleculeId: state.moleculeId, representation }), section, elementZ)
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.moleculeId, representation, section, elementZ])

  const shareParams = { molecule: state.moleculeId, view: representation, ...chemistrySectionEntries(section, elementZ) }
  useRecordVisit({ subject: 'chemistry', params: shareParams })

  const activity = useActivity(CHEMISTRY_ACTIVITY, state, {
    capture: () => state,
    apply: () => {
      setSection('molecules')
      dispatch({ type: 'replace', state: waterSetup(), announcement: 'Activity started: water in ball-and-stick view, Inspect tool.' })
    },
    restore: (snap) => dispatch({ type: 'replace', state: snap, announcement: ACTIVITY_ENDED }),
    restoreUrl: (snap) =>
      replaceUrlSearch(withChemistryParams(window.location.search, { moleculeId: snap.moleculeId, representation: snap.representation })),
  })
  const activityPanel = <ActivityPanel activity={activity} state={state} />
  const guidePanel = <SubjectGuidePanel subject="chemistry" />

  const selectMolecule = (id: string) => {
    setSection('molecules')
    dispatch({ type: 'selectMolecule', moleculeId: id })
    if (isMobile) setMobileTab('details')
  }
  const pickAtom = (atomId: string) => dispatch({ type: 'pickAtom', atomId })

  const sectionSwitch = (
    <div className="segmented section-switch section-switch--grid" role="group" aria-label="Chemistry section">
      {(['periodic', 'atomic', 'molecules', 'bonding'] as const).map((s) => (
        <button key={s} type="button" className="segmented-option" aria-pressed={section === s} onClick={() => setSection(s)}>
          {SECTION_LABEL[s]}
        </button>
      ))}
    </div>
  )
  const loading = <p className="muted small panel">Loading {SECTION_LABEL[section].toLowerCase()}…</p>
  const elementsView = (
    <Suspense fallback={loading}>
      <PeriodicTableView selected={elementZ} onSelect={setElementZ} />
    </Suspense>
  )
  const elementPanel = (
    <Suspense fallback={loading}>
      <ElementPanel z={elementZ} onOpenMolecule={selectMolecule} onOpenAtomic={() => setSection('atomic')} />
    </Suspense>
  )
  const atomicView = (
    <Suspense fallback={loading}>
      <AtomicStructureView z={elementZ} onChange={setElementZ} />
    </Suspense>
  )
  const atomPanel = (
    <Suspense fallback={loading}>
      <AtomPanel z={elementZ} shareParams={shareParams} onOpenMolecule={selectMolecule} onShowInTable={() => setSection('periodic')} />
    </Suspense>
  )
  const bondingView = (
    <Suspense fallback={loading}>
      <BondingView onOpenMolecule={selectMolecule} />
    </Suspense>
  )
  const bondingPanel = (
    <Suspense fallback={loading}>
      <BondingPanel shareParams={shareParams} />
    </Suspense>
  )

  const library = (
    <MoleculeLibrary
      molecules={MOLECULES}
      activeId={molecule.id}
      query={query}
      onQueryChange={setQuery}
      onSelect={selectMolecule}
    />
  )
  const info = (
    <InfoPanel
      molecule={molecule}
      representation={representation}
      mode={mode}
      inspectedAtomId={state.inspectedAtomId}
      onPickAtom={pickAtom}
    />
  )

  const viewer = (
    <MoleculeViewer
      molecule={molecule}
      representation={representation}
      showLabels={showLabels}
      autoRotate={autoRotate && !measuring}
      reducedMotion={reducedMotion}
      mode={mode}
      inspectedAtomId={state.inspectedAtomId}
      measureSelection={state.measureSelection}
      resetToken={resetToken}
      onPickAtom={pickAtom}
      // Clicking empty space clears an inspected atom but never discards a measurement in progress.
      onBackgroundClick={() => !measuring && dispatch({ type: 'clearSelection' })}
      controls={
        <>
          <SceneControls
            showLabels={showLabels}
            autoRotate={autoRotate}
            autoRotatePaused={measuring}
            representation={representation}
            mode={mode}
            onReset={() => setResetToken((n) => n + 1)}
            onToggleLabels={() => setShowLabels((v) => !v)}
            onToggleAutoRotate={() => setAutoRotate((v) => !v)}
            onRepresentationChange={(r) => dispatch({ type: 'setRepresentation', representation: r })}
            onModeChange={(m) => dispatch({ type: 'setMode', mode: m })}
          />
          {measuring && (
            <MeasurementPanel
              molecule={molecule}
              mode={mode}
              selection={state.measureSelection}
              autoRotatePaused={autoRotate}
              onPick={pickAtom}
              onClear={() => dispatch({ type: 'clearSelection' })}
              onDone={() => dispatch({ type: 'setMode', mode: 'inspect' })}
            />
          )}
        </>
      }
    />
  )

  const stage = section === 'periodic' ? elementsView : section === 'atomic' ? atomicView : section === 'bonding' ? bondingView : viewer
  const details = section === 'periodic' ? elementPanel : section === 'atomic' ? atomPanel : section === 'bonding' ? bondingPanel : info

  // One polite live region for meaningful changes only (never per animation frame).
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
        <div className="chem-stage">{stage}</div>
        {activityPanel}
        {guidePanel}
        <Tabs
          label="Chemistry panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'details', label: section === 'molecules' ? 'Details' : section === 'bonding' ? 'Summary' : 'Element', content: details },
            { id: 'library', label: 'Molecule library', content: library },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem">
      {announcer}
      <aside className="chem-side chem-side--left">
        <div className="section-switch-wrap">{sectionSwitch}</div>
        {library}
      </aside>
      <div className="chem-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {activityPanel}
        {guidePanel}
        {details}
      </aside>
    </div>
  )
}
