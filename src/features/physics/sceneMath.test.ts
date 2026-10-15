import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS, solveTrajectory } from '../../physics/projectile'
import { formatTick, niceStep, sceneBounds, ticks, vectorScales } from './sceneMath'

describe('axis ticks', () => {
  it('picks 1, 2 or 5 × 10ⁿ steps', () => {
    expect(niceStep(40.8, 6)).toBe(5)
    expect(niceStep(100, 5)).toBe(20)
    expect(niceStep(0.9, 5)).toBe(0.2)
    expect(niceStep(0)).toBe(1)
  })

  it('covers the data from zero', () => {
    expect(ticks(40.8, 5)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45])
    expect(ticks(10, 5)).toEqual([0, 5, 10])
  })
})

describe('sceneBounds', () => {
  it('uses one step on both axes so the path is not distorted', () => {
    const b = sceneBounds([solveTrajectory(DEFAULT_PARAMS)])
    expect(b.xStep).toBe(b.yStep)
    expect(b.xMax).toBeGreaterThanOrEqual(40.77)
    expect(b.yMax).toBeGreaterThanOrEqual(10.19)
  })

  it('frames all compared runs together', () => {
    const a = solveTrajectory({ ...DEFAULT_PARAMS, angleDeg: 80 })
    const b = solveTrajectory({ ...DEFAULT_PARAMS, angleDeg: 20 })
    const bounds = sceneBounds([a, b])
    expect(bounds.yMax).toBeGreaterThanOrEqual(a.maxHeight)
    expect(bounds.xMax).toBeGreaterThanOrEqual(b.range)
  })

  it('keeps a minimum frame for immediate impacts', () => {
    const b = sceneBounds([solveTrajectory({ ...DEFAULT_PARAMS, speed: 0 })])
    expect(b.xMax).toBeGreaterThanOrEqual(1)
    expect(b.yMax).toBeGreaterThanOrEqual(1)
  })
})

describe('vectorScales', () => {
  it('uses separate scales for velocity and acceleration', () => {
    const t = solveTrajectory(DEFAULT_PARAMS)
    const s = vectorScales(t, 40)
    // The fastest velocity arrow and the gravity arrow get fixed fractions of the scene.
    expect(20 * s.velocity).toBeCloseTo(10, 10)
    expect(9.81 * s.acceleration).toBeCloseTo(4.8, 10)
  })
})

describe('formatTick', () => {
  it('uses only the decimals the step needs', () => {
    expect(formatTick(5, 5)).toBe('5')
    expect(formatTick(10, 5)).toBe('10')
    expect(formatTick(1.5, 0.5)).toBe('1.5')
    expect(formatTick(0.25, 0.05)).toBe('0.25')
    expect(formatTick(-10, 5)).toBe('-10')
    expect(formatTick(-0.0000001, 0.5)).toBe('0')
  })
})
