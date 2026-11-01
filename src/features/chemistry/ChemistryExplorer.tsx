import { lazy, Suspense, useEffect, useReducer, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
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
const ReactionShare = lazy(() => import('./reactions/ReactionLab').then((m) => ({ default: m.ReactionShare })))
const ReactionPanel = lazy(() => import('./reactions/ReactionLab').then((m) => ({ default: m.ReactionPanel })))
const SolutionsLab = lazy(() => import('./solutions/SolutionsLab').then((m) => ({ default: m.SolutionsLab })))
const ChemLearnPage = lazy(() => import('./learn/ChemLearnPage').then((m) => ({ default: m.ChemLearnPage })))
const DestinationPage = lazy(() => import('./home/DestinationPage').then((m) => ({ default: m.DestinationPage })))
const ChemistryHome = lazy(() => import('./home/ChemistryHome').then((m) => ({ default: m.ChemistryHome })))

const SECTION_LABEL: Record<ChemistrySection, string> = {
  topics: 'Overview',
  contents: 'Topics',
  library: 'Molecules',
  visual: 'Visualizations',
  tools: 'Tools',
  learn: 'Explanation',
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
      <ReactionPanel reactionId={reactionId} shareParams={shareParams} withShare={false} />
    </Suspense>
  )

  const solutionsView = (
    <Suspense fallback={loading}>
      <SolutionsLab baseParams={shareParams} />
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
  const details = section === 'periodic' ? elementPanel : section === 'atomic' ? atomPanel : section === 'bonding' ? bondingPanel : info
  // Explore pages are model workspaces; Learn and Calculate pages are single reading columns.
  const isWorkspace = section === 'molecules' || section === 'periodic' || section === 'atomic' || section === 'bonding'

  // One polite live region for meaningful changes only (never per animation frame).
  const announcer = (
    <>
      {/* Workspaces name the page here; topics, reading and calculator pages show their own H1. */}
      {(section === 'molecules' || section === 'periodic' || section === 'atomic' || section === 'bonding') && <h1 className="visually-hidden">Chemistry: {SECTION_LABEL[section]}</h1>}
      <p className="visually-hidden" role="status" aria-live="polite">
        {state.announcement}
      </p>
    </>
  )

  // The Chemistry home page is a reading page: no side panels, the same on phones and desktops.
  if (section === 'topics' || section === 'contents' || section === 'library' || section === 'visual' || section === 'tools')
    return (
      <div className="chem-landing">
        {announcer}
        <Suspense fallback={loading}>
          {section === 'visual' || section === 'tools' ? <DestinationPage kind={section} /> : <ChemistryHome page={section === 'contents' ? 'contents' : section === 'library' ? 'library' : 'overview'} />}
        </Suspense>
      </div>
    )

  // Learn and Calculate: one column, only what the task needs (no molecule library, activity or layout controls).
  if (!isWorkspace)
    return (
      <div className="chem-landing">
        {announcer}
        {section === 'learn' ? (
          <Suspense fallback={loading}>
            <ChemLearnPage />
          </Suspense>
        ) : section === 'solutions' ? (
          solutionsView
        ) : (
          <article className="chem-page" aria-labelledby="rx-page-title">
            <header className="chem-page-head">
              <h1 id="rx-page-title" className="chem-page-title">
                Balance equations and calculate amounts
              </h1>
              <p className="chem-page-lead">Change the coefficients until both sides have the same atoms, then use the balanced equation to work out amounts.</p>
              <AppLink href="?csec=learn&lt=balancing-equations#/chemistry" className="chem-text-link">
                Read the explanation, with a worked example <ArrowRight size={15} aria-hidden="true" />
              </AppLink>
            </header>
            {reactionView}
            <details className="sol-more">
              <summary>About this reaction</summary>
              {reactionPanel}
            </details>
            <Suspense fallback={null}>
              <ReactionShare shareParams={shareParams} />
            </Suspense>
          </article>
        )}
      </div>
    )

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {announcer}
        <p className="chem-mobile-topic">
          <span className="muted small">Topic:</span> <strong>{SECTION_LABEL[section]}</strong> <span className="muted small">(change it with All chemistry topics above)</span>
        </p>
        <div className="chem-stage">{stage}</div>
        {section === 'molecules' && activityPanel}
        {guidePanel}
        <Tabs
          label="Chemistry panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={(t) => setMobileTab(t as MobileTab)}
          tabs={[
            { id: 'details', label: section === 'molecules' ? 'Details' : section === 'bonding' ? 'Summary' : 'Element', content: details },
            ...(section === 'molecules' ? [{ id: 'library', label: 'Molecule library', content: library }] : []),
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem">
      {announcer}
      <aside className="chem-side chem-side--left">
        {section === 'molecules' && library}
      </aside>
      <div className="chem-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {section === 'molecules' && activityPanel}
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
