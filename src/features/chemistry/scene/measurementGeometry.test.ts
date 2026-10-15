import { describe, expect, it } from 'vitest'
import { angleGeometry } from './measurementGeometry'

describe('angleGeometry', () => {
  it('draws an arc whose ends lie on the two arms, at a fixed radius from the vertex', () => {
    const { arc } = angleGeometry([2, 0, 0], [0, 0, 0], [0, 2, 0])
    const first = arc[0]
    const last = arc[arc.length - 1]
    expect(first.y).toBeCloseTo(0, 10)
    expect(last.x).toBeCloseTo(0, 10)
    for (const p of arc) expect(p.length()).toBeCloseTo(first.length(), 10)
  })

  it('anchors the label on the angle bisector', () => {
    const { labelAnchor } = angleGeometry([2, 0, 0], [0, 0, 0], [0, 2, 0])
    expect(labelAnchor.x).toBeCloseTo(labelAnchor.y, 10)
    expect(labelAnchor.x).toBeGreaterThan(0)
  })

  it('skips the arc for a straight (180°) angle, where the bisector is undefined', () => {
    const { arc, labelAnchor } = angleGeometry([1, 0, 0], [0, 0, 0], [-1, 0, 0])
    expect(arc).toHaveLength(0)
    expect(labelAnchor.toArray()).toEqual([0, 0, 0])
  })

  it('does not produce NaN points when an arm has zero length', () => {
    const { arc, labelAnchor } = angleGeometry([0, 0, 0], [0, 0, 0], [1, 0, 0])
    expect(arc).toHaveLength(0)
    expect(labelAnchor.toArray().some(Number.isNaN)).toBe(false)
  })
})
