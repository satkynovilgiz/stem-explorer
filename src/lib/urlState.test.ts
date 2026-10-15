import { describe, expect, it } from 'vitest'
import {
  parseBiologyParams,
  parseChemistryParams,
  shareUrl,
  withBiologyParams,
  withChemistryParams,
} from './urlState'

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

describe('parseBiologyParams', () => {
  const structures = ['nucleus', 'mitochondrion', 'golgi']
  const bioDefaults = { structureId: null, cellView: 'cutaway' } as const

  it('restores a valid structure and cell view', () => {
    expect(parseBiologyParams('?structure=golgi&cell=whole', structures, bioDefaults)).toEqual({
      structureId: 'golgi',
      cellView: 'whole',
      invalid: [],
    })
  })

  it('falls back for unknown values and reports them', () => {
    expect(parseBiologyParams('?structure=chloroplast&cell=xray', structures, bioDefaults)).toEqual({
      ...bioDefaults,
      invalid: ['structure', 'cell'],
    })
  })

  it('ignores Chemistry parameters entirely', () => {
    expect(parseBiologyParams('?molecule=benzene&view=space-filling', structures, bioDefaults)).toEqual({
      ...bioDefaults,
      invalid: [],
    })
  })

  it('does not let Biology parameters change Chemistry state', () => {
    const chem = parseChemistryParams('?structure=nucleus&cell=whole', ['water', 'benzene'], defaults)
    expect(chem).toEqual({ ...defaults, invalid: [] })
  })

  it('round-trips and removes the structure when nothing is selected', () => {
    const search = withBiologyParams('?molecule=benzene&structure=golgi', { structureId: null, cellView: 'whole' })
    const params = new URLSearchParams(search)
    expect(params.has('structure')).toBe(false)
    expect(params.get('cell')).toBe('whole')
    expect(params.get('molecule')).toBe('benzene')
    const state = { structureId: 'mitochondrion', cellView: 'cutaway' } as const
    expect(parseBiologyParams(withBiologyParams('', state), structures, bioDefaults)).toEqual({ ...state, invalid: [] })
  })
})

describe('shareUrl', () => {
  it('uses the given origin and only the subject’s own parameters', () => {
    const loc = { origin: 'https://stem-explorer-nine.vercel.app', pathname: '/' }
    expect(shareUrl(loc, 'biology', { structure: 'golgi', cell: 'cutaway' })).toBe(
      'https://stem-explorer-nine.vercel.app/?structure=golgi&cell=cutaway#/biology',
    )
    expect(shareUrl({ origin: 'http://localhost:5173', pathname: '/' }, 'chemistry', {})).toBe(
      'http://localhost:5173/#/chemistry',
    )
  })
})
