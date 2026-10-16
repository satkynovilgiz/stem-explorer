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

describe('cell types', () => {
  it('starts as an animal cell by default and opens a plant-cell structure from a plant link', () => {
    expect(initialBiologyState(null, 'whole').cellType).toBe('animal')
    const plant = initialBiologyState('chloroplast', 'whole', 'plant')
    expect([plant.cellType, plant.selection?.organelleId, plant.view]).toEqual(['plant', 'chloroplast', 'cutaway'])
    // A plant-only structure in an animal link is ignored.
    expect(initialBiologyState('chloroplast', 'whole').selection).toBeNull()
    // The cell wall is outside, so it stays in the whole-cell view.
    expect(initialBiologyState('cell-wall', 'whole', 'plant').view).toBe('whole')
  })

  it('keeps a shared selection when switching, clears one the new model lacks, and ends isolation', () => {
    let s = biologyReducer(initialBiologyState(null, 'cutaway'), { type: 'select', organelleId: 'mitochondrion', instance: 3 })
    s = biologyReducer(s, { type: 'isolate' })
    s = biologyReducer(s, { type: 'setCellType', cellType: 'plant' })
    expect([s.cellType, s.selection, s.isolated]).toEqual(['plant', { organelleId: 'mitochondrion', instance: null }, false])

    let a = biologyReducer(initialBiologyState(null, 'cutaway'), { type: 'select', organelleId: 'lysosome' })
    a = biologyReducer(a, { type: 'setCellType', cellType: 'plant' })
    expect(a.selection).toBeNull()
    expect(a.announcement).toMatch(/not part of this model/)

    let p = biologyReducer(initialBiologyState(null, 'cutaway', 'plant'), { type: 'select', organelleId: 'chloroplast', instance: 4 })
    expect(p.selection).toEqual({ organelleId: 'chloroplast', instance: 4 })
    p = biologyReducer(p, { type: 'setCellType', cellType: 'animal' })
    expect(p.selection).toBeNull()
  })

  it('rejects structures that are not in the current model and validates copies per model', () => {
    const plant = initialBiologyState(null, 'cutaway', 'plant')
    expect(biologyReducer(plant, { type: 'select', organelleId: 'lysosome' })).toBe(plant)
    // The plant model has 3 mitochondria, so copy 3 (the fourth) falls back to the whole type.
    expect(biologyReducer(plant, { type: 'select', organelleId: 'mitochondrion', instance: 3 }).selection?.instance).toBeNull()
    const animal = initialBiologyState(null, 'cutaway')
    expect(biologyReducer(animal, { type: 'select', organelleId: 'cell-wall' })).toBe(animal)
  })

  it('selecting the plasma membrane in a whole plant cell opens the cutaway (it lies inside the wall)', () => {
    const s = biologyReducer(initialBiologyState(null, 'whole', 'plant'), { type: 'select', organelleId: 'plasma-membrane' })
    expect(s.view).toBe('cutaway')
  })
})
