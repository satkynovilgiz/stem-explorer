import { useState } from 'react'
import { getMolecule, MOLECULES } from '../../data/chemistry/molecules'
import type { Representation } from '../../data/chemistry/types'
import { useMediaQuery, usePrefersReducedMotion } from '../../lib/hooks'
import { InfoPanel } from './InfoPanel'
import { MobileTabs } from './MobileTabs'
import { MoleculeLibrary } from './MoleculeLibrary'
import { MoleculeViewer } from './MoleculeViewer'
import { SceneControls } from './SceneControls'

type MobileTab = 'details' | 'library'

export function ChemistryExplorer() {
  const [moleculeId, setMoleculeId] = useState(MOLECULES[0].id)
  const [selectedAtomId, setSelectedAtomId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [representation, setRepresentation] = useState<Representation>('ball-and-stick')
  const [resetToken, setResetToken] = useState(0)
  const [mobileTab, setMobileTab] = useState<MobileTab>('details')

  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 899px)')
  const molecule = getMolecule(moleculeId)

  const selectMolecule = (id: string) => {
    setMoleculeId(id)
    setSelectedAtomId(null)
    if (isMobile) setMobileTab('details')
  }

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
      selectedAtomId={selectedAtomId}
      onSelectAtom={setSelectedAtomId}
    />
  )

  const viewer = (
    <MoleculeViewer
      molecule={molecule}
      representation={representation}
      showLabels={showLabels}
      autoRotate={autoRotate}
      reducedMotion={reducedMotion}
      selectedAtomId={selectedAtomId}
      resetToken={resetToken}
      onSelectAtom={setSelectedAtomId}
      controls={
        <SceneControls
          showLabels={showLabels}
          autoRotate={autoRotate}
          representation={representation}
          onReset={() => setResetToken((n) => n + 1)}
          onToggleLabels={() => setShowLabels((v) => !v)}
          onToggleAutoRotate={() => setAutoRotate((v) => !v)}
          onRepresentationChange={setRepresentation}
        />
      }
    />
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        <div className="chem-stage">{viewer}</div>
        <MobileTabs
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
      <aside className="chem-side chem-side--left">{library}</aside>
      <div className="chem-stage">{viewer}</div>
      <aside className="chem-side chem-side--right">{info}</aside>
    </div>
  )
}
