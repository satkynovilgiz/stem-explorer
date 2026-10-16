import { getMolecule } from '../../data/chemistry/molecules'
import type { ActivityDef } from '../activities/types'
import { initialChemistryState, type ChemistryState } from './state'

const WATER = getMolecule('water')
const REPRESENTATION_NAMES = { 'ball-and-stick': 'Ball and stick', 'space-filling': 'Space-filling' } as const

/** Setup: water, ball and stick, Inspect tool, nothing selected. */
export const waterSetup = (): ChemistryState => initialChemistryState('water', 'ball-and-stick')

function isHohAngle(s: ChemistryState): boolean {
  const [a, vertex, b] = s.measureSelection
  if (s.moleculeId !== 'water' || s.mode !== 'angle' || s.measureSelection.length !== 3) return false
  const element = (id: string) => WATER.atoms.find((atom) => atom.id === id)?.element
  return element(vertex) === 'O' && element(a) === 'H' && element(b) === 'H' && a !== b
}

const cccbdb = WATER.sources.find((s) => s.url.includes('cccbdb'))!

export const CHEMISTRY_ACTIVITY: ActivityDef<ChemistryState> = {
  id: 'water-angle',
  subject: 'chemistry',
  title: 'Measure the H–O–H angle in water',
  goal: 'Measure water’s bond angle and see why the molecule is bent rather than straight.',
  setup: 'Water opens in ball-and-stick view with the Inspect tool and no atoms picked, so all three atoms are easy to click.',
  changes: (s) => [
    `Molecule → Water${s.moleculeId === 'water' ? ' (already open)' : ` (now ${getMolecule(s.moleculeId).name})`}`,
    `Display → Ball and stick${s.representation === 'ball-and-stick' ? ' (already)' : ` (now ${REPRESENTATION_NAMES[s.representation]})`}`,
    'Tool → Inspect, clearing any picked atoms or measurement in progress',
  ],
  steps: [
    {
      title: 'Choose the Angle tool',
      text: 'In the toolbar over the 3D view, choose Angle. An angle needs three atoms: an end, the vertex, then the other end.',
      done: (s) => s.moleculeId === 'water' && s.mode === 'angle',
      waitingFor: 'the Angle tool to be selected',
      needs3D: true,
      fallback:
        'The Angle tool works in the 3D view, which isn’t available in this browser. In Details, open the Structure tab and find the Reported geometry table instead.',
    },
    {
      title: 'Pick H, then O, then H',
      text: 'Click one hydrogen, then the oxygen (the vertex), then the other hydrogen. The angle appears in the measurement panel.',
      hint: 'If the oxygen isn’t the second atom you pick, it isn’t the vertex. Choose Clear and start again with a hydrogen.',
      done: isHohAngle,
      waitingFor: 'an angle measured with the oxygen as the vertex',
      needs3D: true,
      fallback: 'Read the H–O–H angle in the Reported geometry table (Details → Structure). It is about 104.5°.',
    },
    {
      title: 'Compare with a tetrahedron',
      text: 'Oxygen has four electron domains (two bonds and two lone pairs). Pointing to the corners of a regular tetrahedron, they would be 109.5° apart. Your angle is smaller. Why might that be?',
      hint: 'The Shape section in Details explains what the lone pairs do.',
    },
  ],
  conclusion: `${WATER.shapeExplanation} The model uses experimental coordinates (NIST CCCBDB), so the angle you can measure is the experimental value, about 104.5°.`,
  sources: [
    { label: cccbdb.label, url: cccbdb.url },
    {
      label: 'OpenStax Chemistry 2e — 7.6 Molecular Structure and Polarity',
      url: 'https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity',
    },
  ],
}
