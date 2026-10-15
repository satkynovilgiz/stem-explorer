import { describe, expect, it } from 'vitest'
import { fromWorld } from '../../math/coordinates'
import { getSurface } from '../../math/surfaces'
import { axisFrame, buildSurfaceArrays, buildWireframe } from './sceneGeometry'

describe('buildSurfaceArrays', () => {
  it('places every vertex on the surface, in world coordinates, at 1:1 scale', () => {
    const s = getSurface('saddle')
    const p = { a: 0.5, b: 0.75 }
    const { positions } = buildSurfaceArrays(s, p)
    for (const k of [0, 123, positions.length / 3 - 1]) {
      const [x, y, z] = fromWorld([positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]])
      expect(z).toBeCloseTo(s.evaluate(p, x, y), 5)
      expect(Math.abs(x)).toBeLessThanOrEqual(2 + 1e-6)
    }
  })

  it('has (n + 1)² vertices and 2n² triangles', () => {
    const s = getSurface('plane')
    const { positions, indices } = buildSurfaceArrays(s, { a: 0, b: 0, c: 1 })
    expect(positions.length / 3).toBe((s.segments + 1) ** 2)
    expect(indices.length / 3).toBe(2 * s.segments ** 2)
  })

  it('colours a constant surface uniformly without NaN', () => {
    const { colors, zMin, zMax } = buildSurfaceArrays(getSurface('sine'), { A: 0, k: 1 })
    expect(zMin).toBe(zMax)
    expect([...colors].every(Number.isFinite)).toBe(true)
    expect(colors[0]).toBe(colors[colors.length - 3])
  })
})

describe('buildWireframe', () => {
  it('produces segment pairs lying on the surface', () => {
    const s = getSurface('paraboloid')
    const p = { a: 1, b: 0.5 }
    const w = buildWireframe(s, p, 4, 8)
    expect(w.length % 6).toBe(0)
    const [x, y, z] = fromWorld([w[0], w[1], w[2]])
    expect(z).toBeCloseTo(s.evaluate(p, x, y), 5)
  })
})

describe('axisFrame', () => {
  it('covers the height range and zero', () => {
    const f = axisFrame(getSurface('paraboloid'), 0, 4)
    expect(f.zFloor).toBe(0)
    expect(f.zCeil).toBeGreaterThanOrEqual(4)
    expect(f.zTicks[0]).toBe(0)
  })

  it('keeps a z axis for a constant surface', () => {
    const f = axisFrame(getSurface('sine'), 0, 0)
    expect(f.zCeil).toBeGreaterThan(f.zFloor)
  })

  it('keeps x/y ticks inside the domain', () => {
    const f = axisFrame(getSurface('sine'), -1, 1)
    expect(Math.min(...f.xyTicks)).toBeGreaterThanOrEqual(-Math.PI)
    expect(Math.max(...f.xyTicks)).toBeLessThanOrEqual(Math.PI)
  })
})
