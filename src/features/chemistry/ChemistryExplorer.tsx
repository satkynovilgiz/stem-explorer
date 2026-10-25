import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { DEFAULT_MOLECULE_ID, getMolecule, MOLECULES } from '../../data/chemistry/molecules'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { formatAngle, formatDistance, measure, measurementLabel } from '../../lib/measurement'
import { useExportNotes } from '../../lib/presentation'
import { pushHistoryEntry } from '../../lib/location'
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
const ReactionLab = lazy(() => import('./reactions/ReactionLab').then((m) => ({ default: m.ReactionLab })))
const ReactionPanel = lazy(() => import('./reactions/ReactionLab').then((m) => ({ default: m.ReactionPanel })))
const SolutionsLab = lazy(() => import('./solutions/SolutionsLab').then((m) => ({ default: m.SolutionsLab })))
const SolutionsPanel = lazy(() => import('./solutions/SolutionsLab').then((m) => ({ default: m.SolutionsPanel })))

const SECTION_LABEL: Record<ChemistrySection, string> = {
  periodic: 'Periodic table',
  atomic: 'Atomic structure',
  molecules: 'Molecules',
  bonding: 'Bonding and geometry',
  reactions: 'Reactions and stoichiometry',
  solutions: 'Solutions and dilution',
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
  const [reactionId, setReactionId] = useState(() => parseChemistrySection(window.location.search).reaction)

  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const molecule = getMolecule(state.moleculeId)
  const { mode, representation } = state
  const measuring = mode !== 'inspect'

  // Keep the address shareable: ?molecule=…&view=… (also replaces invalid values with valid ones).
  // Sections other than Molecules add `csec` (and `el`); molecule links stay exactly as before.
  useEffect(() => {
    const search = withChemistrySection(withChemistryParams(window.location.search, { moleculeId: state.moleculeId, representation }), section, elementZ, reactionId)
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.moleculeId, representation, section, elementZ, reactionId])

  const shareParams = { molecule: state.moleculeId, view: representation, ...chemistrySectionEntries(section, elementZ, reactionId) }
  useExportNotes('chemistry', ...chemistryExportNotes(section, molecule, state, showLabels, autoRotate))
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

  // Switching module adds a history entry, so Back returns to the previous module.
  const goSection = (next: ChemistrySection) => {
    if (next !== section) pushHistoryEntry()
    setSection(next)
  }
  const selectMolecule = (id: string) => {
    goSection('molecules')
    dispatch({ type: 'selectMolecule', moleculeId: id })
    if (isMobile) setMobileTab('details')
  }
  const pickAtom = (atomId: string) => dispatch({ type: 'pickAtom', atomId })

  const sectionSwitch = (
    <div className="module-switch">
      <span className="module-switch-label" aria-hidden="true">
        Module
      </span>
      <div className="segmented section-switch section-switch--grid" role="group" aria-label="Chemistry section">
        {(['periodic', 'atomic', 'molecules', 'bonding', 'reactions', 'solutions'] as const).map((s) => (
          <button key={s} type="button" className="segmented-option" aria-pressed={section === s} onClick={() => goSection(s)}>
            {SECTION_LABEL[s]}
          </button>
        ))}
      </div>
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
      <ElementPanel z={elementZ} onOpenMolecule={selectMolecule} onOpenAtomic={() => goSection('atomic')} />
    </Suspense>
  )
  const atomicView = (
    <Suspense fallback={loading}>
      <AtomicStructureView z={elementZ} onChange={setElementZ} />
    </Suspense>
  )
  const atomPanel = (
    <Suspense fallback={loading}>
      <AtomPanel z={elementZ} shareParams={shareParams} onOpenMolecule={selectMolecule} onShowInTable={() => goSection('periodic')} />
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

  const reactionView = (
    <Suspense fallback={loading}>
      <ReactionLab reactionId={reactionId} onReaction={setReactionId} />
    </Suspense>
  )
  const reactionPanel = (
    <Suspense fallback={loading}>
      <ReactionPanel reactionId={reactionId} shareParams={shareParams} />
    </Suspense>
  )

  const solutionsView = (
    <Suspense fallback={loading}>
      <SolutionsLab baseParams={shareParams} />
    </Suspense>
  )
  const solutionsPanel = (
    <Suspense fallback={loading}>
      <SolutionsPanel />
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

  const stage = section === 'periodic' ? elementsView : section === 'atomic' ? atomicView : section === 'bonding' ? bondingView : section === 'reactions' ? reactionView : section === 'solutions' ? solutionsView : viewer
  const details = section === 'periodic' ? elementPanel : section === 'atomic' ? atomPanel : section === 'bonding' ? bondingPanel : section === 'reactions' ? reactionPanel : section === 'solutions' ? solutionsPanel : info

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
            { id: 'details', label: section === 'molecules' ? 'Details' : section === 'bonding' || section === 'reactions' || section === 'solutions' ? 'Summary' : 'Element', content: details },
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

/** What a molecule export shows beyond its link: the measurement and selection are not stored in links. */
function chemistryExportNotes(
  section: ChemistrySection,
  molecule: ReturnType<typeof getMolecule>,
  state: ReturnType<typeof initialChemistryState>,
  showLabels: boolean,
  autoRotate: boolean,
): [string[], string[]] {
  if (section === 'reactions') return [[], ['the coefficients you entered and the calculator amounts (the link stores the reaction only)']]
  if (section !== 'molecules') return [[], []]
  const annotations: string[] = []
  const notRestored: string[] = []
  if (state.mode !== 'inspect') {
    const result = measure(molecule, state.measureSelection, state.mode)
    const atoms = state.measureSelection.join('–')
    if (result) {
      const value = result.kind === 'distance' ? formatDistance(result.value) : formatAngle(result.value)
      const qualifier = result.kind === 'distance' ? (result.bonded ? '' : ' (not bonded)') : result.bondAngle ? '' : ' (not a bond angle: an arm is not a bond)'
      annotations.push(`${measurementLabel(result)} ${atoms} = ${value}${qualifier}, from the model's source coordinates`)
      notRestored.push(`the ${result.kind} measurement ${atoms}`)
    } else if (state.measureSelection.length) {
      annotations.push(`Incomplete ${state.mode} measurement: ${atoms} picked`)
      notRestored.push('the incomplete measurement')
    }
  } else if (state.inspectedAtomId) {
    const atom = molecule.atoms.find((a) => a.id === state.inspectedAtomId)
    if (atom) annotations.push(`Selected atom ${atom.id} (${atom.element})`)
    notRestored.push('the selected atom')
  }
  if (!showLabels) notRestored.push('atom labels turned off')
  if (autoRotate && state.mode === 'inspect') notRestored.push('auto-rotate (the picture is one moment of the rotation)')
  return [annotations, notRestored]
}
