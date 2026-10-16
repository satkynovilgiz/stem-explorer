import { BIOLOGY_SOURCES, findOrganelle } from '../../data/biology/organelles'
import type { ActivityDef } from '../activities/types'
import type { BiologyState } from './state'

/** Setup: cutaway (the Golgi is internal), nothing selected, all structures shown. */
export const golgiSetup = (): BiologyState => ({ view: 'cutaway', selection: null, isolated: false, announcement: '' })

const selected = (s: BiologyState, id: string) => s.selection?.organelleId === id

export const BIOLOGY_ACTIVITY: ActivityDef<BiologyState> = {
  id: 'golgi-relationships',
  subject: 'biology',
  title: 'Find the Golgi apparatus and trace its cargo',
  goal: 'Locate the Golgi apparatus and connect it to where its proteins come from and where they go.',
  setup: 'The cell opens in cutaway view, because the Golgi is inside the cell, with nothing selected and every structure shown.',
  changes: (s) => [
    `View → Cutaway${s.view === 'cutaway' ? ' (already)' : ' (now whole cell)'}`,
    s.selection ? `Selection cleared (now ${findOrganelle(s.selection.organelleId)?.name})` : 'No structure selected (already)',
    ...(s.isolated ? ['Isolation turned off, showing all structures'] : []),
  ],
  steps: [
    {
      title: 'Find the Golgi apparatus',
      text: 'Look for a stack of flattened, curved sacs near the nucleus. Click it in the model or choose it in the Structures list.',
      hint: 'It is drawn in yellow. You can also type “Golgi” in the Structures search box.',
      done: (s) => selected(s, 'golgi'),
      waitingFor: 'the Golgi apparatus to be selected',
    },
    {
      title: 'Isolate the stack',
      text: 'With the Golgi selected, choose Isolate in the toolbar. On its own, the stack shows a receiving (cis) face and a shipping (trans) face.',
      done: (s) => selected(s, 'golgi') && s.isolated,
      waitingFor: 'the Golgi to be isolated',
      needs3D: true,
      fallback:
        'Isolating needs the 3D view, which isn’t available here. Read the Structure section in Details instead: a stack of flattened sacs with a receiving (cis) face and a shipping (trans) face.',
    },
    {
      title: 'Follow its cargo upstream',
      text: 'In Details, open Structure & relationships and follow the link to the structure that sends the Golgi its proteins and lipids.',
      hint: 'Transport vesicles arrive from the rough endoplasmic reticulum.',
      done: (s) => selected(s, 'rough-er'),
      waitingFor: 'the rough ER to be selected',
    },
    {
      title: 'Where do the products go?',
      text: 'Back on the Golgi’s relationships: vesicles leaving the trans face can fuse with the plasma membrane, and the Golgi belongs to the endomembrane system with lysosomes and the ER. Not every protein passes through it.',
    },
  ],
  conclusion:
    'The Golgi apparatus sits in the middle of the endomembrane system. Proteins and lipids arrive from the ER in transport vesicles at its cis face. The Golgi modifies them, for example by adding short sugar chains, sorts them and ships them in vesicles from its trans face. Some vesicles fuse with the plasma membrane and release their contents outside the cell. Proteins with other signal sequences, such as those bound for mitochondria, never pass through the Golgi.',
  sources: ['bio-4-4', 'ap-3-2'].map((id) => ({ label: BIOLOGY_SOURCES[id].label, url: BIOLOGY_SOURCES[id].url })),
}
