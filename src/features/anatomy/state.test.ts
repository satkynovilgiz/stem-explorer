import { describe, expect, it } from 'vitest'
import { FLOW_STEPS } from '../../data/anatomy/heart'
import { anatomyReducer, anatomyShareState, initialAnatomyState, type AnatomyAction, type AnatomyState } from './state'

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

describe('anatomyShareState (review finding B)', () => {
  it('shares the pre-tour selection and view during the tour, never tour progress', () => {
    const touring = run(start(), { type: 'select', partId: 'aorta' }, { type: 'startTour' }, { type: 'nextStep' })
    expect(touring.view).toBe('cutaway')
    expect(anatomyShareState(touring)).toEqual({ partId: 'aorta', heartView: 'whole' })
  })

  it('shares no structure when the tour started without a selection', () => {
    const touring = run(start(), { type: 'startTour' })
    expect(anatomyShareState(touring)).toEqual({ partId: null, heartView: 'whole' })
  })

  it('shares the current state outside the tour', () => {
    expect(anatomyShareState(run(start(), { type: 'select', partId: 'mitral-valve' }))).toEqual({ partId: 'mitral-valve', heartView: 'cutaway' })
  })
})

describe('vessel comparison', () => {
  const start = () => initialAnatomyState(null, 'whole')

  it('entering keeps a selected vessel as A, ends isolation and the single selection', () => {
    let s = anatomyReducer(anatomyReducer(start(), { type: 'select', partId: 'aorta' }), { type: 'isolate' })
    s = anatomyReducer(s, { type: 'enterCompare' })
    expect([s.compare, s.selected, s.isolated]).toEqual([{ a: 'aorta', b: null }, null, false])
    // A selected chamber is not carried into the comparison.
    const c = anatomyReducer(anatomyReducer(start(), { type: 'select', partId: 'left-ventricle' }), { type: 'enterCompare' })
    expect(c.compare).toEqual({ a: null, b: null })
  })

  it('picks fill A then B, replace B when both are set, and refuse non-vessels and repeats', () => {
    let s = anatomyReducer(start(), { type: 'enterCompare' })
    s = anatomyReducer(s, { type: 'select', partId: 'pulmonary-trunk' })
    s = anatomyReducer(s, { type: 'select', partId: 'pulmonary-veins' })
    expect(s.compare).toEqual({ a: 'pulmonary-trunk', b: 'pulmonary-veins' })
    s = anatomyReducer(s, { type: 'select', partId: 'aorta' })
    expect(s.compare).toEqual({ a: 'pulmonary-trunk', b: 'aorta' })
    expect(s.announcement).toBe('Vessel B replaced with Aorta.')
    const refused = anatomyReducer(s, { type: 'select', partId: 'mitral-valve' })
    expect(refused.compare).toEqual(s.compare)
    expect(refused.announcement).toMatch(/not a vessel/)
    expect(anatomyReducer(s, { type: 'select', partId: 'aorta' }).announcement).toMatch(/already being compared/)
  })

  it('clearing one slot or both, and Clear selection clears both', () => {
    let s = anatomyReducer(start(), { type: 'comparePreset', a: 'aorta', b: 'pulmonary-trunk' })
    expect(anatomyReducer(s, { type: 'compareClear', slot: 'a' }).compare).toEqual({ a: 'pulmonary-trunk', b: null })
    expect(anatomyReducer(s, { type: 'compareClear', slot: 'b' }).compare).toEqual({ a: 'aorta', b: null })
    s = anatomyReducer(s, { type: 'clearSelection' })
    expect(s.compare).toEqual({ a: null, b: null })
  })

  it('leaving keeps vessel A selected; isolate is unavailable while comparing', () => {
    let s = anatomyReducer(start(), { type: 'comparePreset', a: 'superior-vena-cava', b: 'aorta' })
    expect(anatomyReducer(s, { type: 'isolate' })).toBe(s)
    s = anatomyReducer(s, { type: 'exitCompare' })
    expect([s.compare, s.selected]).toEqual([null, 'superior-vena-cava'])
  })

  it('Whole/Cutaway keeps the comparison (vessels are visible in both views)', () => {
    let s = anatomyReducer(start(), { type: 'comparePreset', a: 'aorta', b: 'pulmonary-veins' })
    s = anatomyReducer(s, { type: 'setView', view: 'cutaway' })
    expect([s.view, s.compare]).toEqual(['cutaway', { a: 'aorta', b: 'pulmonary-veins' }])
  })

  it('the tour ends the comparison; comparison cannot start during the tour; exit tour does not reopen it', () => {
    let s = anatomyReducer(start(), { type: 'comparePreset', a: 'aorta', b: 'pulmonary-trunk' })
    s = anatomyReducer(s, { type: 'startTour' })
    expect([s.compare, s.tourStep, s.beforeTour?.selected]).toEqual([null, 0, 'aorta'])
    expect(anatomyReducer(s, { type: 'enterCompare' })).toBe(s)
    expect(anatomyReducer(s, { type: 'comparePreset', a: 'aorta', b: 'pulmonary-veins' })).toBe(s)
    s = anatomyReducer(s, { type: 'exitTour' })
    expect([s.compare, s.selected]).toEqual([null, 'aorta'])
  })

  it('links share vessel A while comparing', () => {
    const s = anatomyReducer(start(), { type: 'comparePreset', a: 'pulmonary-veins', b: 'aorta' })
    expect(anatomyShareState(s)).toEqual({ partId: 'pulmonary-veins', heartView: 'whole' })
  })
})
