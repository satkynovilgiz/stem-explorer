import { describe, expect, it } from 'vitest'
import { parseChemistryParams, withChemistryParams } from './urlState'

const ids = ['water', 'benzene']
const defaults = { moleculeId: 'water', representation: 'ball-and-stick' } as const

describe('parseChemistryParams', () => {
  it('restores a valid molecule and view', () => {
    expect(parseChemistryParams('?molecule=benzene&view=space-filling', ids, defaults)).toEqual({
      moleculeId: 'benzene',
      representation: 'space-filling',
      invalid: [],
    })
  })

  it('uses defaults when parameters are missing, without reporting them as invalid', () => {
    expect(parseChemistryParams('', ids, defaults)).toEqual({ ...defaults, invalid: [] })
  })

  it('falls back safely for unknown values and reports them', () => {
    expect(parseChemistryParams('?molecule=gold&view=wireframe', ids, defaults)).toEqual({
      ...defaults,
      invalid: ['molecule', 'view'],
    })
  })

  it('keeps a valid value when the other one is invalid', () => {
    const r = parseChemistryParams('?molecule=benzene&view=%3Cscript%3E', ids, defaults)
    expect(r.moleculeId).toBe('benzene')
    expect(r.representation).toBe('ball-and-stick')
    expect(r.invalid).toEqual(['view'])
  })

  it('is case-sensitive and does not match partial IDs', () => {
    expect(parseChemistryParams('?molecule=Benzene', ids, defaults).moleculeId).toBe('water')
    expect(parseChemistryParams('?molecule=benz', ids, defaults).moleculeId).toBe('water')
  })
})

describe('withChemistryParams', () => {
  it('sets both parameters and keeps unrelated ones', () => {
    const search = withChemistryParams('?utm=x&view=old', { moleculeId: 'benzene', representation: 'space-filling' })
    const params = new URLSearchParams(search)
    expect(params.get('molecule')).toBe('benzene')
    expect(params.get('view')).toBe('space-filling')
    expect(params.get('utm')).toBe('x')
  })

  it('round-trips through the parser', () => {
    const state = { moleculeId: 'benzene', representation: 'space-filling' } as const
    expect(parseChemistryParams(withChemistryParams('', state), ids, defaults)).toEqual({ ...state, invalid: [] })
  })
})
