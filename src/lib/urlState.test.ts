import { describe, expect, it } from 'vitest'
import {
  parseAnatomyParams,
  parseBiologyParams,
  parseChemistryParams,
  parseMathParams,
  parsePhysicsParams,
  shareUrl,
  withBiologyParams,
  withAnatomyParams,
  withChemistryParams,
  withMathParams,
  withPhysicsParams,
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
      cellType: 'animal',
      invalid: [],
    })
  })

  it('falls back for unknown values and reports them', () => {
    expect(parseBiologyParams('?structure=chloroplast&cell=xray&type=fungus', structures, bioDefaults)).toEqual({
      ...bioDefaults,
      cellType: 'animal',
      invalid: ['type', 'structure', 'cell'],
    })
  })

  it('ignores Chemistry parameters entirely', () => {
    expect(parseBiologyParams('?molecule=benzene&view=space-filling', structures, bioDefaults)).toEqual({
      ...bioDefaults,
      cellType: 'animal',
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
    expect(parseBiologyParams(withBiologyParams('', state), structures, bioDefaults)).toEqual({ ...state, cellType: 'animal', invalid: [] })
  })

  it('reads type=plant, validates structures per cell type, and omits type for animal cells', () => {
    const byType = (t: 'animal' | 'plant') => (t === 'plant' ? ['chloroplast', 'nucleus'] : ['lysosome', 'nucleus'])
    expect(parseBiologyParams('?structure=chloroplast&type=plant', byType, bioDefaults)).toMatchObject({ structureId: 'chloroplast', cellType: 'plant', invalid: [] })
    expect(parseBiologyParams('?structure=chloroplast', byType, bioDefaults)).toMatchObject({ structureId: null, cellType: 'animal', invalid: ['structure'] })
    expect(parseBiologyParams('?structure=lysosome&type=plant', byType, bioDefaults)).toMatchObject({ structureId: null, invalid: ['structure'] })
    expect(new URLSearchParams(withBiologyParams('?type=plant', { structureId: null, cellView: 'whole', cellType: 'animal' })).has('type')).toBe(false)
    expect(new URLSearchParams(withBiologyParams('', { structureId: 'nucleus', cellView: 'whole', cellType: 'plant' })).get('type')).toBe('plant')
    // An existing animal-cell link is unchanged by a round trip.
    expect(withBiologyParams('?structure=golgi&cell=cutaway', { structureId: 'golgi', cellView: 'cutaway' })).toBe('?structure=golgi&cell=cutaway')
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

describe('parsePhysicsParams', () => {
  const physicsDefaults = { speed: 20, angleDeg: 45, height: 0, gravity: 9.81 }
  const ranges = { speed: [0, 50], angleDeg: [0, 90], height: [0, 50], gravity: [1, 25] } as const
  const isValid = (key: keyof typeof ranges, v: number) =>
    Number.isFinite(v) && v >= ranges[key][0] && v <= ranges[key][1]

  it('restores valid launch parameters', () => {
    expect(parsePhysicsParams('?speed=12.5&angle=60&height=3&gravity=1.62', physicsDefaults, isValid)).toEqual({
      params: { speed: 12.5, angleDeg: 60, height: 3, gravity: 1.62 },
      invalid: [],
    })
  })

  it('falls back per parameter for invalid, out-of-range or non-numeric values', () => {
    const r = parsePhysicsParams('?speed=abc&angle=120&height=-1&gravity=0', physicsDefaults, isValid)
    expect(r.params).toEqual(physicsDefaults)
    expect(r.invalid).toEqual(['speed', 'angle', 'height', 'gravity'])
    expect(parsePhysicsParams('?gravity=Infinity&speed=1e2', physicsDefaults, isValid).invalid).toEqual(['speed', 'gravity'])
  })

  it('ignores other subjects’ parameters and does not change them', () => {
    expect(parsePhysicsParams('?molecule=benzene&view=space-filling&structure=golgi&cell=whole', physicsDefaults, isValid)).toEqual({
      params: physicsDefaults,
      invalid: [],
    })
    const search = withPhysicsParams('?molecule=benzene&structure=golgi', physicsDefaults)
    const q = new URLSearchParams(search)
    expect(q.get('molecule')).toBe('benzene')
    expect(q.get('structure')).toBe('golgi')
    expect(q.get('angle')).toBe('45')
    expect(parseChemistryParams(search, ['water', 'benzene'], defaults).moleculeId).toBe('benzene')
  })

  it('round-trips and never stores time', () => {
    const p = { speed: 33.5, angleDeg: 12, height: 7.5, gravity: 3.71 }
    const search = withPhysicsParams('', p)
    expect(new URLSearchParams(search).has('t')).toBe(false)
    expect(parsePhysicsParams(search, physicsDefaults, isValid).params).toEqual(p)
  })
})

describe('parseMathParams', () => {
  it('restores preset, parameters and slice', () => {
    expect(parseMathParams('?surface=sine&amp=1.5&k=2&slice=y&at=-1.25')).toEqual({
      surfaceId: 'sine',
      params: { A: 1.5, k: 2 },
      slice: { axis: 'y', value: -1.25 },
      invalid: [],
    })
  })

  it('uses the default preset and its defaults when nothing is given', () => {
    expect(parseMathParams('')).toEqual({ surfaceId: 'paraboloid', params: { a: 0.5, b: 0.5 }, slice: null, invalid: [] })
  })

  it('falls back for unknown presets, out-of-range or non-numeric values, and bad slices', () => {
    const r = parseMathParams('?surface=torus&a=0&b=abc&slice=z')
    expect(r.surfaceId).toBe('paraboloid')
    expect(r.params).toEqual({ a: 0.5, b: 0.5 })
    expect(r.slice).toBeNull()
    expect(r.invalid).toEqual(['surface', 'a', 'b', 'slice'])
    expect(parseMathParams('?surface=saddle&slice=x&at=9').slice).toEqual({ axis: 'x', value: 0 })
  })

  it('ignores parameters that belong to a different preset', () => {
    expect(parseMathParams('?surface=paraboloid&amp=2&k=3&c=1').params).toEqual({ a: 0.5, b: 0.5 })
  })

  it('does not read or change other subjects’ parameters', () => {
    const other = '?molecule=benzene&view=space-filling&structure=golgi&cell=whole&speed=12&angle=30'
    expect(parseMathParams(other).surfaceId).toBe('paraboloid')
    const q = new URLSearchParams(withMathParams(other, { surfaceId: 'plane', params: { a: 1, b: 0, c: -1 }, slice: null }))
    expect([q.get('molecule'), q.get('structure'), q.get('speed'), q.get('angle')]).toEqual(['benzene', 'golgi', '12', '30'])
    // Chemistry, Biology and Physics parsers are unaffected by Mathematics keys.
    const math = '?surface=sine&amp=2&k=3&a=1&slice=x&at=1'
    expect(parseChemistryParams(math, ['water'], defaults).moleculeId).toBe('water')
    expect(parseBiologyParams(math, ['golgi'], { structureId: null, cellView: 'cutaway' }).structureId).toBeNull()
  })

  it('removes the previous preset’s keys and round-trips', () => {
    const search = withMathParams('?surface=plane&a=1&b=1&c=2', { surfaceId: 'sine', params: { A: -1, k: 0.5 }, slice: { axis: 'x', value: 1 } })
    const q = new URLSearchParams(search)
    expect([q.has('a'), q.has('c')]).toEqual([false, false])
    expect(parseMathParams(search)).toEqual({ surfaceId: 'sine', params: { A: -1, k: 0.5 }, slice: { axis: 'x', value: 1 }, invalid: [] })
  })
})

describe('parseAnatomyParams', () => {
  const parts = ['right-atrium', 'mitral-valve']
  const d = { partId: null, heartView: 'whole' } as const

  it('restores a valid structure and view', () => {
    expect(parseAnatomyParams('?part=mitral-valve&heart=cutaway', parts, d)).toEqual({ partId: 'mitral-valve', heartView: 'cutaway', invalid: [] })
  })

  it('falls back for unknown values', () => {
    expect(parseAnatomyParams('?part=spleen&heart=xray', parts, d)).toEqual({ ...d, invalid: ['part', 'heart'] })
  })

  it('keeps subjects independent', () => {
    const others = '?molecule=benzene&structure=golgi&cell=whole&speed=12&surface=sine&amp=1'
    expect(parseAnatomyParams(others, parts, d)).toEqual({ ...d, invalid: [] })
    const q = new URLSearchParams(withAnatomyParams(others, { partId: 'right-atrium', heartView: 'cutaway' }))
    expect([q.get('structure'), q.get('cell'), q.get('surface'), q.get('part'), q.get('heart')]).toEqual(['golgi', 'whole', 'sine', 'right-atrium', 'cutaway'])
    expect(parseBiologyParams(q.toString(), ['golgi'], { structureId: null, cellView: 'cutaway' })).toMatchObject({ structureId: 'golgi', cellView: 'whole' })
    expect(parseMathParams(q.toString()).surfaceId).toBe('sine')
  })

  it('removes the part key when nothing is selected', () => {
    expect(new URLSearchParams(withAnatomyParams('?part=right-atrium', { partId: null, heartView: 'whole' })).has('part')).toBe(false)
  })
})
