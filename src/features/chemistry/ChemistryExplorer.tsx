import { useEffect, useReducer, useState } from 'react'
import { Tabs } from '../../components/Tabs'
import { DEFAULT_MOLECULE_ID, getMolecule, MOLECULES } from '../../data/chemistry/molecules'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { parseChemistryParams, withChemistryParams } from '../../lib/urlState'
import { InfoPanel } from './InfoPanel'
import { MeasurementPanel } from './MeasurementPanel'
import { MoleculeLibrary } from './MoleculeLibrary'
import { MoleculeViewer } from './MoleculeViewer'
import { SceneControls } from './SceneControls'
import { chemistryReducer, initialChemistryState } from './state'

type MobileTab = 'details' | 'library'

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

  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const molecule = getMolecule(state.moleculeId)
  const { mode, representation } = state
  const measuring = mode !== 'inspect'

  // Keep the address shareable: ?molecule=…&view=… (also replaces invalid values with valid ones).
  useEffect(() => {
    const search = withChemistryParams(window.location.search, {
      moleculeId: state.moleculeId,
      representation,
    })
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    }
  }, [state.moleculeId, representation])

  const selectMolecule = (id: string) => {
    dispatch({ type: 'selectMolecule', moleculeId: id })
    if (isMobile) setMobileTab('details')
  }
  const pickAtom = (atomId: string) => dispatch({ type: 'pickAtom', atomId })

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
        <div className="chem-stage">{viewer}</div>
        <Tabs
          label="Chemistry panels"
          className="mobile-tabs"
          active={mobileTab}
          onChange={setMobileTab}
          tabs={[
            { id: 'details', label: 'Details', content: info },
            { id: 'library', label: 'Molecule library', content: library },
          ]}
        />
      </div>
    )
  }

  return (
    <div className="chem">
      {announcer}
      <aside className="chem-side chem-side--left">{library}</aside>
      <div className="chem-stage">{viewer}</div>
      <aside className="chem-side chem-side--right">{info}</aside>
    </div>
  )
}
