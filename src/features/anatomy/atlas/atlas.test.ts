import { describe, expect, it } from 'vitest'
import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { atlasParamEntries, parseAtlasParams } from '../../../lib/urlState'
import { atlasReducer, atlasShareState, initialAtlasState, screenRight, VIEW_TEXT, type AtlasState } from './atlasState'
import { DIMMED_OPACITY, drawnStructures } from './visibility'

const fresh = (search = '') => initialAtlasState(parseAtlasParams(search, ATLAS_CONFIG))
const ids = (s: AtlasState) => drawnStructures(s).map((d) => d.structure.id)

describe('atlas view descriptions match the camera geometry', () => {
  it('front: the body’s left (+x) is on the screen’s right, so the body’s right is on your left', () => {
    expect(screenRight('front')).toEqual([1, 0, 0])
    expect(VIEW_TEXT.front).toContain('body’s right is on your left')
  })
  it('back: the body’s right is on your right', () => {
    expect(screenRight('back')).toEqual([-1, 0, 0])
    expect(VIEW_TEXT.back).toContain('body’s right is on your right')
  })
  it('left lateral: posterior (−z) is on the screen’s right, so anterior is on your left', () => {
    expect(screenRight('side')).toEqual([0, 0, -1])
    expect(VIEW_TEXT.side).toContain('anterior is on your left')
  })
})

describe('atlas state', () => {
  it('opens with the default layers, no reproductive variant and nothing selected', () => {
    const s = fresh()
    expect(s.layers).toEqual(ATLAS_CONFIG.defaultLayers)
    expect(s.variant).toBeNull()
    expect(ids(s)).not.toContain('uterus')
    expect(ids(s)).not.toContain('testis-left')
    expect(ids(s)).toContain('heart')
  })

  it('selecting a hidden structure shows its layer and says so', () => {
    const s = atlasReducer(fresh(), { type: 'select', id: 'thymus' })
    expect(s.layers).toContain('lymphatic')
    expect(s.announcement).toMatch(/Lymphatic and immune layer shown/)
    expect(ids(s)).toContain('thymus')
  })

  it('selecting a reproductive structure chooses its configuration explicitly', () => {
    const s = atlasReducer(fresh(), { type: 'select', id: 'uterus' })
    expect(s.variant).toBe('ovarian')
    expect(s.layers).toContain('reproductive')
    expect(s.announcement).toMatch(/typical ovarian configuration/)
    const switched = atlasReducer(s, { type: 'setVariant', variant: 'testicular' })
    expect(switched.selected).toBeNull()
    expect(ids(switched)).toContain('prostate')
    expect(ids(switched)).not.toContain('uterus')
  })

  it('the reproductive layer cannot be switched on without a configuration', () => {
    const s = fresh()
    expect(atlasReducer(s, { type: 'toggleLayer', system: 'reproductive' })).toBe(s)
    expect(atlasReducer(s, { type: 'setLayers', layers: ['reproductive', 'skeletal'] }).layers).toEqual(['skeletal'])
  })

  it('isolation draws only the selection (and a group’s members)', () => {
    let s = atlasReducer(fresh(), { type: 'select', id: 'liver' })
    s = atlasReducer(s, { type: 'isolate' })
    expect(ids(s)).toEqual(['liver'])
    s = atlasReducer(atlasReducer(s, { type: 'select', id: 'vertebral-column' }), { type: 'isolate' })
    expect(ids(s).sort()).toEqual(['cervical-vertebrae', 'coccyx', 'lumbar-vertebrae', 'sacrum', 'thoracic-vertebrae'])
    expect(atlasReducer(s, { type: 'showAll' }).isolated).toBe(false)
  })

  it('a region dims (and makes unclickable) structures elsewhere; selecting outside clears it', () => {
    let s = atlasReducer(fresh(), { type: 'setRegion', region: 'thorax' })
    const d = drawnStructures(s)
    expect(d.find((x) => x.structure.id === 'heart')!.dimmed).toBe(false)
    const kidney = d.find((x) => x.structure.id === 'kidney-left')!
    expect(kidney.dimmed).toBe(true)
    expect(kidney.opacity).toBeLessThanOrEqual(DIMMED_OPACITY)
    s = atlasReducer(s, { type: 'select', id: 'kidney-left' })
    expect(s.region).toBe('whole-body')
    expect(s.announcement).toMatch(/region filter cleared/)
  })

  it('opacity is clamped and layer opacity applies to drawn structures', () => {
    let s = atlasReducer(fresh(), { type: 'setOpacity', system: 'skeletal', value: 0.01 })
    expect(s.opacity.skeletal).toBe(0.1)
    s = atlasReducer(s, { type: 'setOpacity', system: 'skeletal', value: 0.5 })
    expect(drawnStructures(s).find((d) => d.structure.id === 'frontal-bone')!.opacity).toBe(0.5)
  })

  it('a structure in two systems is drawn when either layer is on', () => {
    const s = atlasReducer(fresh(), { type: 'setLayers', layers: ['endocrine'] })
    expect(ids(s)).toContain('pancreas')
    expect(ids(s)).toContain('thyroid-gland')
    expect(ids(s)).not.toContain('liver')
  })
})

describe('atlas links', () => {
  it('round-trip a selection, view, layers, region and variant', () => {
    let s = fresh()
    s = atlasReducer(s, { type: 'setVariant', variant: 'testicular' })
    s = atlasReducer(s, { type: 'select', id: 'prostate' })
    s = atlasReducer(s, { type: 'setView', view: 'side' })
    s = atlasReducer(s, { type: 'setRegion', region: 'pelvis' })
    const entries = atlasParamEntries(atlasShareState(s), ATLAS_CONFIG.defaultLayers)
    expect(entries).toMatchObject({ atlas: 'prostate', bview: 'side', region: 'pelvis', repro: 'testicular' })
    const back = fresh(`?${new URLSearchParams(entries)}`)
    expect(atlasShareState(back)).toEqual(atlasShareState(s))
  })

  it('reject invalid values and inconsistent reproductive settings', () => {
    expect(parseAtlasParams('?atlas=nope', ATLAS_CONFIG).invalid).toEqual(['atlas'])
    expect(parseAtlasParams('?bview=top', ATLAS_CONFIG).invalid).toEqual(['bview'])
    expect(parseAtlasParams('?layers=skeletal,skeletal', ATLAS_CONFIG).invalid).toEqual(['layers'])
    expect(parseAtlasParams('?layers=skeletal,reproductive', ATLAS_CONFIG)).toMatchObject({ layers: ['skeletal'], invalid: ['layers'] })
    expect(parseAtlasParams('?repro=ovarian', ATLAS_CONFIG)).toMatchObject({ variant: null, invalid: ['repro'] })
    expect(parseAtlasParams('?layers=', ATLAS_CONFIG)).toMatchObject({ layers: [], invalid: [] })
  })
})
