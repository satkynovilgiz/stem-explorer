import { describe, expect, it } from 'vitest'
import { biologyReducer, initialBiologyState, type BiologyAction, type BiologyState } from './state'

const run = (state: BiologyState, ...actions: BiologyAction[]) => actions.reduce(biologyReducer, state)

describe('initialBiologyState', () => {
  it('restores a valid structure and opens the cutaway for internal structures', () => {
    const s = initialBiologyState('golgi', 'whole')
    expect(s.selection).toEqual({ organelleId: 'golgi', instance: null })
    expect(s.view).toBe('cutaway')
  })

  it('keeps the whole-cell view for the plasma membrane', () => {
    expect(initialBiologyState('plasma-membrane', 'whole').view).toBe('whole')
  })

  it('ignores unknown structures (e.g. state left over from another subject)', () => {
    expect(initialBiologyState('benzene', 'cutaway').selection).toBeNull()
  })
})

describe('biologyReducer', () => {
  const start = () => initialBiologyState(null, 'cutaway')

  it('selects a structure type, or one copy of a repeated structure', () => {
    expect(run(start(), { type: 'select', organelleId: 'nucleus' }).selection).toEqual({
      organelleId: 'nucleus',
      instance: null,
    })
    const s = run(start(), { type: 'select', organelleId: 'mitochondrion', instance: 2 })
    expect(s.selection).toEqual({ organelleId: 'mitochondrion', instance: 2 })
    expect(s.announcement).toBe('Mitochondrion 3 of 4 selected.')
  })

  it('drops instance numbers that do not exist', () => {
    expect(run(start(), { type: 'select', organelleId: 'mitochondrion', instance: 9 }).selection?.instance).toBeNull()
    expect(run(start(), { type: 'select', organelleId: 'nucleus', instance: 1 }).selection?.instance).toBeNull()
  })

  it('ignores unknown IDs', () => {
    const s = start()
    expect(biologyReducer(s, { type: 'select', organelleId: 'chloroplast' })).toBe(s)
  })

  it('switches from whole cell to cutaway when an internal structure is selected', () => {
    const s = run(initialBiologyState(null, 'whole'), { type: 'select', organelleId: 'nucleolus' })
    expect(s.view).toBe('cutaway')
    expect(s.announcement).toMatch(/cutaway/)
  })

  it('isolates only with a selection, and Show all exits isolation but keeps the selection', () => {
    expect(run(start(), { type: 'isolate' }).isolated).toBe(false)
    const isolated = run(start(), { type: 'select', organelleId: 'golgi' }, { type: 'isolate' })
    expect(isolated.isolated).toBe(true)
    const all = biologyReducer(isolated, { type: 'showAll' })
    expect(all.isolated).toBe(false)
    expect(all.selection?.organelleId).toBe('golgi')
  })

  it('keeps isolation when another structure is selected, showing the new one', () => {
    const s = run(start(), { type: 'select', organelleId: 'golgi' }, { type: 'isolate' }, { type: 'select', organelleId: 'lysosome' })
    expect(s.isolated).toBe(true)
    expect(s.selection?.organelleId).toBe('lysosome')
  })

  it('clearing the selection also exits isolation', () => {
    const s = run(start(), { type: 'select', organelleId: 'golgi' }, { type: 'isolate' }, { type: 'clearSelection' })
    expect(s.selection).toBeNull()
    expect(s.isolated).toBe(false)
  })

  it('changing the view exits isolation and explains when the selection becomes hidden', () => {
    const s = run(start(), { type: 'select', organelleId: 'nucleus' }, { type: 'isolate' }, { type: 'setView', view: 'whole' })
    expect(s.isolated).toBe(false)
    expect(s.selection?.organelleId).toBe('nucleus')
    expect(s.announcement).toMatch(/hidden/)
  })
})
