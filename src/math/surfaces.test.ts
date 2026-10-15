import { describe, expect, it } from 'vitest'
import { fromWorld, toWorld } from './coordinates'
import { heightColor, heightFraction, HEIGHT_STOPS } from './heightColor'
import {
  clampToDomain,
  defaultParams,
  getSurface,
  heightRange,
  isValidParamValue,
  linearCombination,
  normalizeParamValue,
  num,
  SURFACES,
  type Params,
  type SurfaceId,
} from './surfaces'

const f = (id: SurfaceId, p: Params, x: number, y: number) => getSurface(id).evaluate(p, x, y)

describe('known surface values', () => {
  it('plane z = a·x + b·y + c', () => {
    const p = { a: 0.5, b: -0.25, c: 1 }
    expect(f('plane', p, 0, 0)).toBe(1) // the z-intercept
    expect(f('plane', p, 2, 4)).toBe(1) // 1 − 1 + 1
    expect(f('plane', p, -2, 0)).toBe(0)
  })

  it('paraboloid z = a·x² + b·y²', () => {
    expect(f('paraboloid', { a: 1, b: 1 }, 0, 0)).toBe(0)
    expect(f('paraboloid', { a: 1, b: 1 }, 1, -1)).toBe(2)
    expect(f('paraboloid', { a: 0.5, b: 0.25 }, -2, 1)).toBe(2.25)
  })

  it('saddle z = a·x² − b·y²: up along x, down along y, zero on the diagonals when a = b', () => {
    const p = { a: 1, b: 1 }
    expect(f('saddle', p, 1, 0)).toBe(1)
    expect(f('saddle', p, 0, 1)).toBe(-1)
    expect(f('saddle', p, 1.5, 1.5)).toBe(0)
    expect(f('saddle', p, 1.5, -1.5)).toBe(0)
  })

  it('sinusoidal z = A·sin(k·x)·cos(k·y)', () => {
    const p = { A: 2, k: 1 }
    expect(f('sine', p, Math.PI / 2, 0)).toBeCloseTo(2, 12)
    expect(f('sine', p, Math.PI / 2, Math.PI)).toBeCloseTo(-2, 12)
    expect(f('sine', p, Math.PI / 4, Math.PI / 4)).toBeCloseTo(1, 12) // 2·(√2/2)·(√2/2)
    expect(f('sine', p, 0, 1.234)).toBeCloseTo(0, 12)
    expect(f('sine', { A: 1, k: 2 }, Math.PI / 4, 0)).toBeCloseTo(1, 12) // sin(π/2)
  })

  it('has zero amplitude when A = 0 or k = 0', () => {
    for (const p of [{ A: 0, k: 1.5 }, { A: 1.7, k: 0 }]) {
      expect(heightRange(getSurface('sine'), p)).toEqual({ min: 0, max: 0 })
    }
  })
})

describe('coordinate mapping', () => {
  it('puts mathematical z on the Three.js up axis and round-trips', () => {
    expect(toWorld([0, 0, 1])).toEqual([0, 1, -0])
    expect(toWorld([1, 0, 0])).toEqual([1, 0, -0])
    expect(toWorld([0, 1, 0])).toEqual([0, 0, -1])
    for (const p of [[1.5, -2, 3], [0, 0, 0], [-1, 4, -2.5]] as const) {
      expect(fromWorld(toWorld(p)).map((v) => v + 0)).toEqual([...p])
    }
  })

  it('is a rotation (keeps the right-hand rule): x̂ × ŷ maps to ẑ', () => {
    const [ex, ey, ez] = [toWorld([1, 0, 0]), toWorld([0, 1, 0]), toWorld([0, 0, 1])]
    const cross = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]]
    expect(cross.map((v) => v + 0)).toEqual(ez.map((v) => v + 0))
  })
})

describe('cross-sections', () => {
  const along = (id: SurfaceId, p: Params, axis: 'x' | 'y', v: number) => {
    const slice = getSurface(id).slice(p, axis, v)
    return { slice, at: (u: number) => slice.evaluate(u) }
  }

  it('match the surface itself at every sample', () => {
    for (const s of SURFACES) {
      const p = defaultParams(s)
      for (const axis of ['x', 'y'] as const) {
        const { at } = along(s.id, p, axis, 0.7)
        for (const u of [-1.3, 0, 0.4, 1.9]) {
          const expected = axis === 'x' ? s.evaluate(p, 0.7, u) : s.evaluate(p, u, 0.7)
          expect(at(u)).toBeCloseTo(expected, 12)
        }
      }
    }
  })

  it('of a plane are straight lines (equal steps give equal changes)', () => {
    const { slice, at } = along('plane', { a: 0.5, b: -0.25, c: 1 }, 'y', 2)
    expect(slice.kind).toBe('line')
    expect(at(1) - at(0)).toBeCloseTo(at(2) - at(1), 12)
    expect(slice.formula).toBe('z = 0.50·x + 0.50') // −0.25·2 + 1 = 0.5
  })

  it('of a plane with no slope in that direction are constant', () => {
    const { slice } = along('plane', { a: 0.5, b: 0, c: 1 }, 'x', 2)
    expect(slice.kind).toBe('constant')
    expect(slice.formula).toBe('z = 2.00') // 0.5·2 + 1
  })

  it('of a paraboloid are upward parabolas raised by the slice position', () => {
    const { slice, at } = along('paraboloid', { a: 0.5, b: 0.25 }, 'x', 2)
    expect(slice.kind).toBe('parabola-up')
    expect(at(0)).toBe(2) // 0.5·2²
    expect(at(1) - 2 * at(0) + at(-1)).toBeCloseTo(0.5, 12) // second difference 2b
    expect(slice.formula).toBe('z = 0.25·y² + 2.00')
  })

  it('of a saddle open down along y and up along x', () => {
    const p = { a: 0.5, b: 0.5 }
    const down = along('saddle', p, 'x', 0)
    const up = along('saddle', p, 'y', 0)
    expect(down.slice.kind).toBe('parabola-down')
    expect(up.slice.kind).toBe('parabola-up')
    expect(down.at(1) - 2 * down.at(0) + down.at(-1)).toBeCloseTo(-1, 12)
    expect(up.at(1) - 2 * up.at(0) + up.at(-1)).toBeCloseTo(1, 12)
    expect(along('saddle', p, 'y', 2).slice.formula).toBe('z = 0.50·x² − 2.00')
  })

  it('of the sinusoidal surface have position-dependent amplitude, and are flat where it vanishes', () => {
    const p = { A: 2, k: 1 }
    const peak = along('sine', p, 'x', Math.PI / 2)
    expect(peak.slice.kind).toBe('sinusoid')
    expect(peak.at(0)).toBeCloseTo(2, 12)
    expect(peak.slice.formula).toBe('z = 2.000·cos(1.00·y)')
    const flat = along('sine', p, 'x', 0)
    expect(flat.slice.kind).toBe('constant')
    expect(flat.slice.formula).toBe('z = 0')
    expect(along('sine', { A: 0, k: 1 }, 'y', 1).slice.kind).toBe('constant')
    expect(along('sine', { A: 1, k: 0 }, 'y', 1).slice.kind).toBe('constant')
  })
})

describe('parameters and domain', () => {
  const a = getSurface('paraboloid').params[0]

  it('keeps paraboloid and saddle coefficients positive', () => {
    for (const id of ['paraboloid', 'saddle'] as const) {
      for (const def of getSurface(id).params) expect(def.min).toBeGreaterThan(0)
    }
  })

  it('validates, clamps and rounds', () => {
    expect(isValidParamValue(a, 0.75)).toBe(true)
    expect(isValidParamValue(a, 0)).toBe(false)
    expect(isValidParamValue(a, Number.NaN)).toBe(false)
    expect(normalizeParamValue(a, -5)).toBe(0.1)
    expect(normalizeParamValue(a, 0.77)).toBe(0.75)
    expect(normalizeParamValue(a, Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('every default lies inside its range', () => {
    for (const s of SURFACES) for (const d of s.params) expect(isValidParamValue(d, d.default)).toBe(true)
  })

  it('clamps coordinates to the drawn domain and reports it', () => {
    expect(clampToDomain(getSurface('saddle'), 5)).toEqual({ value: 2, clamped: true })
    expect(clampToDomain(getSurface('saddle'), -1)).toEqual({ value: -1, clamped: false })
  })

  it('samples the sinusoidal surface finely enough at the highest frequency', () => {
    const s = getSurface('sine')
    const kMax = s.params.find((p) => p.key === 'k')!.max
    const samplesPerWave = (2 * Math.PI) / kMax / ((s.domain.max - s.domain.min) / s.segments)
    expect(samplesPerWave).toBeGreaterThanOrEqual(30)
  })
})

describe('height colours', () => {
  it('handles a constant-height surface without dividing by zero', () => {
    expect(heightFraction(3, 3, 3)).toBe(0.5)
    expect(heightColor(heightFraction(0, 0, 0)).every(Number.isFinite)).toBe(true)
  })

  it('maps the lowest and highest heights to the ends of the ramp', () => {
    expect(heightFraction(0, 0, 4)).toBe(0)
    expect(heightFraction(4, 0, 4)).toBe(1)
    expect(heightFraction(9, 0, 4)).toBe(1)
    expect(heightColor(0)).toEqual([...HEIGHT_STOPS[0][1]])
    expect(heightColor(1)).toEqual([...HEIGHT_STOPS.at(-1)![1]])
  })

  it('finds the paraboloid height range over its domain', () => {
    expect(heightRange(getSurface('paraboloid'), { a: 0.5, b: 0.5 })).toEqual({ min: 0, max: 4 })
  })
})

describe('formula formatting', () => {
  it('writes signs and drops zero terms', () => {
    expect(linearCombination([[0.5, 'x'], [-0.25, 'y'], [1, '']])).toBe('0.50·x − 0.25·y + 1.00')
    expect(linearCombination([[0, 'x'], [-2, '']])).toBe('−2.00')
    expect(linearCombination([[0, 'x'], [0, '']])).toBe('0')
    expect(num(-0.001)).toBe('0.00')
    expect(num(-1.5)).toBe('−1.50')
  })
})
