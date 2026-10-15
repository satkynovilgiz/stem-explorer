import { describe, expect, it } from 'vitest'
import { defaultParams, getSurface } from '../../math/surfaces'
import { initialMathState, mathReducer, type MathAction, type MathState } from './state'

const run = (s: MathState, ...actions: MathAction[]) => actions.reduce(mathReducer, s)
const start = () => initialMathState('paraboloid', defaultParams(getSurface('paraboloid')), null)

describe('mathReducer', () => {
  it('switching preset restores that preset’s defaults and clears the point', () => {
    const s = run(start(), { type: 'setParam', key: 'a', value: 1.2 }, { type: 'setPoint', x: 1, y: 1, source: 'input' }, { type: 'selectSurface', surfaceId: 'sine' })
    expect(s.params).toEqual({ A: 1, k: 1 })
    expect(s.point).toBeNull()
  })

  it('ignores unknown presets and parameters that do not belong to the preset', () => {
    const s = start()
    expect(mathReducer(s, { type: 'selectSurface', surfaceId: 'torus' })).toBe(s)
    expect(mathReducer(s, { type: 'setParam', key: 'k', value: 2 })).toBe(s)
    expect(mathReducer(s, { type: 'setParam', key: 'a', value: Number.NaN })).toBe(s)
  })

  it('clamps parameters and resets them', () => {
    const s = run(start(), { type: 'setParam', key: 'a', value: 9 })
    expect(s.params.a).toBe(1.5)
    expect(mathReducer(s, { type: 'resetParams' }).params).toEqual({ a: 0.5, b: 0.5 })
  })

  it('clamps points to the domain with feedback, and rejects non-finite coordinates', () => {
    const s = run(start(), { type: 'setPoint', x: 5, y: -1, source: 'input' })
    expect(s.point).toEqual({ x: 2, y: -1 })
    expect(s.pointNote).toMatch(/Limited to the drawn domain/)
    // z = 0.5·2² + 0.5·(−1)² = 2.5
    expect(s.announcement).toBe('Point x = 2.00, y = −1.00, z ≈ 2.500. Limited to the drawn domain −2.00 ≤ x, y ≤ 2.00.')
    const bad = mathReducer(s, { type: 'setPoint', x: Number.NaN, y: 0, source: 'input' })
    expect(bad.point).toEqual({ x: 2, y: -1 })
    expect(bad.pointNote).toMatch(/Enter numbers/)
  })

  it('keeps the point’s (x, y) when parameters change, so its z follows the surface', () => {
    const s = run(start(), { type: 'setPoint', x: 1, y: 0, source: 'click' }, { type: 'setParam', key: 'a', value: 1 })
    expect(s.point).toEqual({ x: 1, y: 0 })
    expect(getSurface(s.surfaceId).evaluate(s.params, s.point!.x, s.point!.y)).toBe(1)
  })

  it('enables, re-orients and moves the cross-section, clamped to the domain', () => {
    const s = run(start(), { type: 'setSliceEnabled', enabled: true }, { type: 'setSliceAxis', axis: 'y' }, { type: 'setSliceValue', value: 7 })
    expect(s.slice).toEqual({ axis: 'y', value: 2 })
    expect(mathReducer(s, { type: 'setSliceEnabled', enabled: false }).slice).toBeNull()
  })

  it('keeps an enabled slice when switching preset, clamped to the new domain', () => {
    const s = run(start(), { type: 'setSliceEnabled', enabled: true }, { type: 'setSliceValue', value: 1.5 })
    const plane = mathReducer(s, { type: 'selectSurface', surfaceId: 'plane' })
    expect(plane.slice).toEqual({ axis: 'x', value: 1.5 })
  })
})
