import { describe, expect, it } from 'vitest'
import { FLOW_STEPS } from '../../data/anatomy/heart'
import { anatomyReducer, initialAnatomyState, type AnatomyAction, type AnatomyState } from './state'

const run = (s: AnatomyState, ...a: AnatomyAction[]) => a.reduce(anatomyReducer, s)
const start = () => initialAnatomyState(null, 'whole')

describe('selection and isolation', () => {
  it('opens the cutaway for internal structures, from the URL or the list', () => {
    expect(initialAnatomyState('mitral-valve', 'whole').view).toBe('cutaway')
    expect(initialAnatomyState('aorta', 'whole').view).toBe('whole')
    expect(run(start(), { type: 'select', partId: 'interventricular-septum' }).view).toBe('cutaway')
  })

  it('ignores unknown structures', () => {
    const s = start()
    expect(anatomyReducer(s, { type: 'select', partId: 'spleen' })).toBe(s)
    expect(initialAnatomyState('spleen', 'whole').selected).toBeNull()
  })

  it('isolates only with a selection; Show all keeps the selection; clearing exits isolation', () => {
    expect(run(start(), { type: 'isolate' }).isolated).toBe(false)
    const iso = run(start(), { type: 'select', partId: 'aorta' }, { type: 'isolate' })
    expect(iso.isolated).toBe(true)
    expect(anatomyReducer(iso, { type: 'showAll' })).toMatchObject({ isolated: false, selected: 'aorta' })
    expect(anatomyReducer(iso, { type: 'clearSelection' })).toMatchObject({ isolated: false, selected: null })
  })

  it('changing view exits isolation and explains hidden structures', () => {
    const s = run(start(), { type: 'select', partId: 'tricuspid-valve' }, { type: 'isolate' }, { type: 'setView', view: 'whole' })
    expect(s.isolated).toBe(false)
    expect(s.announcement).toMatch(/hidden/)
  })
})

describe('blood-flow tour', () => {
  it('starts at step 1 in the cutaway view and navigates within bounds', () => {
    let s = run(start(), { type: 'startTour' })
    expect(s.tourStep).toBe(0)
    expect(s.view).toBe('cutaway')
    s = anatomyReducer(s, { type: 'previousStep' })
    expect(s.tourStep).toBe(0)
    s = run(s, { type: 'nextStep' }, { type: 'nextStep' })
    expect(s.tourStep).toBe(2)
    expect(s.announcement).toBe(`Step 3 of ${FLOW_STEPS.length}: Tricuspid valve. ${FLOW_STEPS[2].text}`)
    s = anatomyReducer(s, { type: 'goToStep', index: FLOW_STEPS.length - 1 })
    expect(s.tourStep).toBe(FLOW_STEPS.length - 1)
    expect(anatomyReducer(s, { type: 'nextStep' })).toBe(s)
    expect(anatomyReducer(s, { type: 'goToStep', index: 99 })).toBe(s)
  })

  it('locks selection and isolation during the tour', () => {
    const s = run(start(), { type: 'startTour' })
    expect(anatomyReducer(s, { type: 'select', partId: 'aorta' })).toBe(s)
    expect(anatomyReducer(s, { type: 'isolate' })).toBe(s)
  })

  it('restores the previous view, selection and isolation when it ends', () => {
    const before = run(start(), { type: 'select', partId: 'aorta' }, { type: 'isolate' })
    const after = run(before, { type: 'startTour' }, { type: 'nextStep' }, { type: 'exitTour' })
    expect(after).toMatchObject({ view: 'whole', selected: 'aorta', isolated: true, tourStep: null, beforeTour: null })
  })
})
