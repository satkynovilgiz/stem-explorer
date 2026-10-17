import { describe, expect, it } from 'vitest'
import { defaultParams, formatCoefficient, getSurface, SURFACES } from './surfaces'
import { partials, tangentPlane } from './tangent'

/** Central finite difference, as an independent check on the hand-derived partials. */
function numeric(id: Parameters<typeof getSurface>[0], p: Record<string, number>, x: number, y: number) {
  const f = getSurface(id).evaluate
  const h = 1e-5
  return { fx: (f(p, x + h, y) - f(p, x - h, y)) / (2 * h), fy: (f(p, x, y + h) - f(p, x, y - h)) / (2 * h) }
}

describe('partial derivatives', () => {
  it('match known values for every surface', () => {
    expect(partials('plane', { a: 0.5, b: -1, c: 2 }, 1.3, -0.7)).toEqual({ fx: 0.5, fy: -1 })
    expect(partials('paraboloid', { a: 0.5, b: 0.25 }, 1, -2)).toEqual({ fx: 1, fy: -1 })
    expect(partials('saddle', { a: 0.5, b: 0.5 }, 1, 1)).toEqual({ fx: 1, fy: -1 })
    const sine = partials('sine', { A: 1, k: 1 }, 0, 0)
    expect([sine.fx, sine.fy]).toEqual([1, -0])
  })

  it('agree with finite differences across each domain and many parameter settings', () => {
    for (const s of SURFACES) {
      const p = defaultParams(s)
      for (const [x, y] of [[-1.7, 0.4], [0.3, -1.1], [1.9, 1.9], [0, 0]]) {
        const exact = partials(s.id, p, x, y)
        const approx = numeric(s.id, p, x, y)
        expect(exact.fx, `${s.id} fx at ${x},${y}`).toBeCloseTo(approx.fx, 6)
        expect(exact.fy, `${s.id} fy at ${x},${y}`).toBeCloseTo(approx.fy, 6)
      }
    }
  })
})

describe('tangent planes', () => {
  it('pass through the inspected point and match the surface’s slope there', () => {
    for (const s of SURFACES) {
      const p = defaultParams(s)
      const t = tangentPlane(s, p, 0.8, -1.2)
      expect(t.evaluate(0.8, -1.2)).toBeCloseTo(s.evaluate(p, 0.8, -1.2), 12)
      // First-order agreement: the error shrinks like h².
      const h = 1e-3
      expect(Math.abs(t.evaluate(0.8 + h, -1.2 + h) - s.evaluate(p, 0.8 + h, -1.2 + h))).toBeLessThan(10 * h * h)
    }
  })

  it('the plane surface is its own tangent plane', () => {
    const s = getSurface('plane')
    const p = { a: 0.5, b: -0.25, c: 1 }
    const t = tangentPlane(s, p, 1, 1)
    expect(t.evaluate(-2, 2)).toBeCloseTo(s.evaluate(p, -2, 2), 12)
  })

  it('saddle origin: zero gradient, horizontal plane z = 0', () => {
    const t = tangentPlane(getSurface('saddle'), { a: 0.5, b: 0.5 }, 0, 0)
    expect([t.fx, t.fy, t.zeroGradient, t.gradientDirectionDeg]).toEqual([0, 0, true, null])
    expect(t.equation).toBe('z = 0 + 0·x + 0·y')
    expect(t.evaluate(1.5, -1)).toBe(0)
  })

  it('degenerate cases: a flat plane and zero residue on the sine surface', () => {
    const flat = tangentPlane(getSurface('plane'), { a: 0, b: 0, c: 1.5 }, 0.5, 0.5)
    expect([flat.zeroGradient, flat.z0]).toEqual([true, 1.5])
    // sin(k·x) = 0 at x = π/k: residue like 1e-16 is reported as exactly 0.
    const sine = tangentPlane(getSurface('sine'), { A: 1, k: 1 }, Math.PI / 2, 0)
    expect(sine.fx).toBe(0)
  })

  it('gradient magnitude and direction', () => {
    const t = tangentPlane(getSurface('paraboloid'), { a: 0.5, b: 0.5 }, 1, 1)
    expect(t.gradientMagnitude).toBeCloseTo(Math.SQRT2, 12)
    expect(t.gradientDirectionDeg).toBeCloseTo(45, 10)
    expect(tangentPlane(getSurface('saddle'), { a: 0.5, b: 0.5 }, 0, 1).gradientDirectionDeg).toBeCloseTo(270, 10)
  })

  it('writes the substituted equation', () => {
    const t = tangentPlane(getSurface('saddle'), { a: 0.5, b: 0.5 }, 1, -1)
    expect(t.equation).toBe('z = 0 + 1·(x − 1) + 1·(y + 1)')
    expect(t.approximate).toBe(false)
  })
})

describe('tangent-plane display formatting (analytic values are never rounded)', () => {
  it('sine A = 0.05, k = 0.05 at (0, 0): fx = 0.0025 is shown, not 0', () => {
    const t = tangentPlane(getSurface('sine'), { A: 0.05, k: 0.05 }, 0, 0)
    expect(t.fx).toBe(0.05 * 0.05)
    expect(t.zeroGradient).toBe(false)
    // 0.05 × 0.05 is 0.0025000000000000005 in binary floating point, so the text is a rounding.
    expect(t.equation).toBe('z ≈ 0 + 0.00250·x + 0·y')
    expect(formatCoefficient(t.fx).text).toBe('0.00250')
  })

  it('small negative coefficients keep their sign and digits', () => {
    const t = tangentPlane(getSurface('sine'), { A: -0.05, k: 0.05 }, 0, 0)
    expect(t.fx).toBeCloseTo(-0.0025, 15)
    expect(t.equation).toBe('z ≈ 0 − 0.00250·x + 0·y')
    expect(formatCoefficient(-0.0004321).text).toBe('−4.32 × 10⁻⁴')
    expect(formatCoefficient(-0.0004321).approx).toBe(true)
  })

  it('tiny coefficients use scientific notation and mark the equation approximate', () => {
    const t = tangentPlane(getSurface('plane'), { a: 0.0001234, b: -0.00005, c: 0 }, 1, 1)
    expect(t.equation).toBe('z ≈ 7.34 × 10⁻⁵ + 1.23 × 10⁻⁴·(x − 1) − 5.00 × 10⁻⁵·(y − 1)')
    expect(t.approximate).toBe(true)
    expect(t.fx).toBe(0.0001234)
  })

  it('small coordinate offsets are written out instead of being dropped', () => {
    const t = tangentPlane(getSurface('paraboloid'), { a: 0.5, b: 0.5 }, 0.004, -0.003)
    expect(t.equation).toBe('z ≈ 1.25 × 10⁻⁵ + 0.004·(x − 0.004) − 0.003·(y + 0.003)')
    expect(t.evaluate(0.004, -0.003)).toBeCloseTo(0.5 * 0.004 ** 2 + 0.5 * 0.003 ** 2, 15)
  })

  it('rounded ordinary values are marked approximate', () => {
    const t = tangentPlane(getSurface('sine'), { A: 1, k: 1 }, 0.3, 0.2)
    expect(t.approximate).toBe(true)
    expect(t.equation.startsWith('z ≈ ')).toBe(true)
  })

  it('mantissa rounding renormalises (9.999 × 10⁻⁴ → 1.00 × 10⁻³)', () => {
    expect(formatCoefficient(0.0009999).text).toBe('1.00 × 10⁻³')
    expect(formatCoefficient(0.05).text).toBe('0.0500')
    expect(formatCoefficient(0.05).approx).toBe(false)
  })
})
