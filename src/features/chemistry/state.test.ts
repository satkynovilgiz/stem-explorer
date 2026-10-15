import { describe, expect, it } from 'vitest'
import { chemistryReducer, initialChemistryState, type ChemistryAction, type ChemistryState } from './state'

const run = (state: ChemistryState, ...actions: ChemistryAction[]) => actions.reduce(chemistryReducer, state)
const start = () => initialChemistryState('water', 'ball-and-stick')

describe('chemistryReducer', () => {
  it('clears an active measurement but keeps the mode when switching molecules', () => {
    const measuring = run(
      start(),
      { type: 'setMode', mode: 'angle' },
      { type: 'pickAtom', atomId: 'H1' },
      { type: 'pickAtom', atomId: 'O1' },
    )
    expect(measuring.measureSelection).toEqual(['H1', 'O1'])

    const switched = chemistryReducer(measuring, { type: 'selectMolecule', moleculeId: 'ammonia' })
    expect(switched.moleculeId).toBe('ammonia')
    expect(switched.mode).toBe('angle')
    expect(switched.measureSelection).toEqual([])
  })

  it('clears the inspected atom when switching molecules', () => {
    const s = run(start(), { type: 'pickAtom', atomId: 'O1' }, { type: 'selectMolecule', moleculeId: 'methane' })
    expect(s.inspectedAtomId).toBeNull()
  })

  it('ignores atom IDs that do not exist in the current molecule', () => {
    const s = run(start(), { type: 'setMode', mode: 'distance' }, { type: 'pickAtom', atomId: 'N1' })
    expect(s.measureSelection).toEqual([])
  })

  it('does not add the same atom twice and explains why', () => {
    const s = run(
      start(),
      { type: 'setMode', mode: 'distance' },
      { type: 'pickAtom', atomId: 'O1' },
      { type: 'pickAtom', atomId: 'O1' },
    )
    expect(s.measureSelection).toEqual(['O1'])
    expect(s.announcement).toMatch(/already selected/)
  })

  it('announces a completed measurement with its value', () => {
    const s = run(
      start(),
      { type: 'setMode', mode: 'distance' },
      { type: 'pickAtom', atomId: 'O1' },
      { type: 'pickAtom', atomId: 'H1' },
    )
    expect(s.announcement).toBe('Bond length O1–H1: 0.958 Å.')
  })

  it('clears the measurement on request and when changing mode', () => {
    const measuring = run(start(), { type: 'setMode', mode: 'distance' }, { type: 'pickAtom', atomId: 'O1' })
    expect(chemistryReducer(measuring, { type: 'clearSelection' }).measureSelection).toEqual([])
    expect(chemistryReducer(measuring, { type: 'setMode', mode: 'inspect' }).measureSelection).toEqual([])
  })

  it('ignores unknown molecule IDs', () => {
    const s = start()
    expect(chemistryReducer(s, { type: 'selectMolecule', moleculeId: 'gold' })).toBe(s)
  })
})
