import { findHeartPart, FLOW_STEPS, HEART_SOURCES } from '../../data/anatomy/heart'
import type { ActivityDef } from '../activities/types'
import type { AnatomyState } from './state'

/** Setup: cutaway, nothing selected, no isolation, no tour. */
export const pulmonarySetup = (): AnatomyState => ({
  view: 'cutaway',
  selected: null,
  isolated: false,
  tourStep: null,
  beforeTour: null,
  compare: null,
  announcement: '',
})

/**
 * The exploration state to restore on exit. If a tour was running when the activity started, the
 * activity ends it, and Exit returns to the view from before that tour (what the tour itself restores).
 */
export function anatomySnapshot(s: AnatomyState): AnatomyState {
  if (s.tourStep === null || !s.beforeTour) return s
  return { ...s, ...s.beforeTour, tourStep: null, beforeTour: null, compare: null }
}

const LUNGS = FLOW_STEPS.findIndex((step) => step.id === 'lungs')

export const ANATOMY_ACTIVITY: ActivityDef<AnatomyState> = {
  id: 'right-ventricle-to-lungs',
  subject: 'anatomy',
  title: 'Trace blood from the right ventricle to the lungs',
  goal: 'Follow oxygen-poor blood out of the right ventricle to the lungs, and name each structure it passes.',
  setup: 'The heart opens in cutaway view so the chambers and valves are visible, with nothing selected. The tour is then used for the last steps.',
  changes: (s) => [
    ...(s.tourStep !== null ? ['Ends the blood-flow tour in progress. Exit returns to your view from before that tour.'] : []),
    ...(s.compare ? ['Ends the vessel comparison.'] : []),
    `View → Cutaway${s.view === 'cutaway' ? ' (already)' : ' (now whole heart)'}`,
    s.selected ? `Selection cleared (now ${findHeartPart(s.selected)?.name})` : 'No structure selected (already)',
    ...(s.isolated ? ['Isolation turned off, showing every structure'] : []),
  ],
  steps: [
    {
      title: 'Find the right ventricle',
      text: 'Select the right ventricle in the model or the Structures list. In this front (anterior) view, the body’s right side is on your left.',
      hint: 'It is the lower chamber on your left, coloured for the oxygen-poor pathway.',
      done: (s) => s.tourStep === null && s.selected === 'right-ventricle',
      waitingFor: 'the right ventricle to be selected',
    },
    {
      title: 'Find its exit valve',
      text: 'Blood leaves the right ventricle through a valve. Use the Connections tab in Details, or select the pulmonary valve directly.',
      done: (s) => s.tourStep === null && s.selected === 'pulmonary-valve',
      waitingFor: 'the pulmonary valve to be selected',
    },
    {
      title: 'Start the blood-flow tour',
      text: 'Choose Start blood-flow tour in the Structures panel. While the tour runs, selection is locked to the tour’s steps.',
      done: (s) => s.tourStep !== null,
      waitingFor: 'the tour to start',
    },
    {
      title: 'Follow the blood to the lungs',
      text: 'Use Next to go from the right ventricle through the pulmonary valve and the pulmonary trunk to the lungs.',
      done: (s) => s.tourStep !== null && s.tourStep >= LUNGS,
      waitingFor: 'the tour to reach “Lungs (outside the heart)”',
    },
  ],
  conclusion:
    'The right ventricle pumps oxygen-poor blood through the pulmonary valve into the pulmonary trunk. The trunk divides into the left and right pulmonary arteries, which carry the blood to the lungs. There it takes up oxygen, then returns through the pulmonary veins to the left atrium. The pulmonary arteries carry oxygen-poor blood, so the model colours vessels by oxygen pathway, not by artery or vein.',
  sources: Object.values(HEART_SOURCES)
    .filter((s) => s.url.includes('19-1'))
    .map((s) => ({ label: s.label, url: s.url })),
}
