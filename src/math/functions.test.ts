import { describe, expect, it } from 'vitest'
import { defaultFnParams, FUNCTIONS, getFunction, integrate, plotSegments, secantSlope } from './functions'
import { add, angleBetween, apply, collapse, det, dot, inverse, parallelogramArea, PRESETS, scale } from './linear'

describe('2D function library', () => {
  it('exact derivatives agree with finite differences and antiderivatives differentiate back to f', () => {
    for (const fn of FUNCTIONS) {
      const p = defaultFnParams(fn)
      for (const x of [0.4, 1.3, 2.7]) {
        const h = 1e-5
        expect(fn.df(p, x), `${fn.id} f′`).toBeCloseTo((fn.f(p, x + h) - fn.f(p, x - h)) / (2 * h), 5)
        expect(fn.f(p, x), `${fn.id} F′`).toBeCloseTo((fn.F(p, x + h) - fn.F(p, x - h)) / (2 * h), 4)
      }
    }
  })

  it('signed integrals are exact for known cases and differ from total area when f changes sign', () => {
    const sine = getFunction('sine')
    const r = integrate(sine, { A: 1, k: 1 }, 0, 2 * Math.PI)
    if (!r.ok) throw new Error()
    expect(r.signed).toBeCloseTo(0, 12) // equal areas above and below cancel
    expect(r.totalArea).toBeCloseTo(4, 6) // but the geometric area is 4
    const lin = integrate(getFunction('linear'), { m: 1, b: 0 }, -2, 2)
    if (!lin.ok) throw new Error()
    expect(lin.signed).toBeCloseTo(0, 12)
    expect(lin.totalArea).toBeCloseTo(4, 6)
    const q = integrate(getFunction('quadratic'), { a: 1, b: 0, c: 0 }, 0, 3)
    if (!q.ok) throw new Error()
    expect(q.signed).toBeCloseTo(9, 12)
    // Reversed limits flip the sign.
    const rev = integrate(getFunction('quadratic'), { a: 1, b: 0, c: 0 }, 3, 0)
    if (!rev.ok) throw new Error()
    expect(rev.signed).toBeCloseTo(-9, 12)
  })

  it('respects the logarithm’s domain: no value, no plot and no integral at x ≤ 0', () => {
    const ln = getFunction('logarithmic')
    expect(ln.inDomain({ A: 1 }, 0)).toBe(false)
    expect(integrate(ln, { A: 1 }, -1, 2)).toMatchObject({ ok: false })
    const r = integrate(ln, { A: 1 }, 1, Math.E)
    if (!r.ok) throw new Error()
    expect(r.signed).toBeCloseTo(1, 12) // ∫₁ᵉ ln x dx = 1
    const segs = plotSegments(ln, { A: 1 }, -3, 3, 600, 10)
    expect(segs.length).toBe(1)
    expect(segs[0][0][0]).toBeGreaterThan(0)
  })

  it('never joins a curve across a gap where it leaves the visible band', () => {
    const exp = getFunction('exponential')
    const segs = plotSegments(exp, { A: 1, k: 1.5 }, -5, 5, 400, 6)
    for (const s of segs) for (const [, y] of s) expect(Math.abs(y)).toBeLessThanOrEqual(6)
  })

  it('secant slopes approach the derivative as h shrinks; degenerate h = 0 is refused', () => {
    const cubic = getFunction('cubic')
    const p = { a: 0.2, b: -1 }
    const errs = [1, 0.1, 0.01].map((h) => Math.abs(secantSlope(cubic, p, 1, h)! - cubic.df(p, 1)))
    expect(errs[1]).toBeLessThan(errs[0])
    expect(errs[2]).toBeLessThan(errs[1])
    expect(secantSlope(cubic, p, 1, 0)).toBeNull()
    expect(secantSlope(getFunction('logarithmic'), { A: 1 }, 0.5, -1)).toBeNull()
  })

  it('exponential with k = 0 is a constant and still integrates', () => {
    const r = integrate(getFunction('exponential'), { A: 2, k: 0 }, 0, 3)
    if (!r.ok) throw new Error()
    expect(r.signed).toBe(6)
  })
})

describe('2D vectors and matrices', () => {
  it('addition, scalar multiplication, dot product and angle', () => {
    expect(add([1, 2], [3, -1])).toEqual([4, 1])
    expect(scale(-2, [1, 2])).toEqual([-2, -4])
    expect(dot([1, 0], [0, 1])).toBe(0)
    expect(angleBetween([1, 0], [0, 3])).toBeCloseTo(90, 12)
    expect(angleBetween([1, 1], [-1, -1])).toBeCloseTo(180, 4) // acos near −1 loses precision
    expect(angleBetween([0, 0], [1, 0])).toBeNull()
  })

  it('determinant = area scale of the unit square’s image, with sign for orientation', () => {
    for (const { m } of PRESETS) {
      const e1 = apply(m, [1, 0])
      const e2 = apply(m, [0, 1])
      expect(parallelogramArea(e1, e2)).toBeCloseTo(Math.abs(det(m)), 12)
    }
    expect(det([-1, 0, 0, 1])).toBe(-1)
    expect(det([2, 0, 0, 0.5])).toBe(1)
  })

  it('inverse undoes the matrix; singular matrices have none and collapse the plane', () => {
    const m = [2, 1, 1, 1] as const
    const inv = inverse(m)!
    const back = apply(inv, apply(m, [3, -2]))
    expect(back[0]).toBeCloseTo(3, 12)
    expect(back[1]).toBeCloseTo(-2, 12)
    expect(inverse([1, 2, 0.5, 1])).toBeNull()
    expect(collapse([1, 2, 0.5, 1])).toBe('line')
    expect(collapse([0, 0, 0, 0])).toBe('point')
    expect(collapse([1, 0, 0, 1])).toBe('none')
    // Every image of a singular matrix lies on one line through the origin.
    const s = [1, 2, 0.5, 1] as const
    const a = apply(s, [1, 0])
    const b = apply(s, [-3, 5])
    expect(a[0] * b[1] - a[1] * b[0]).toBeCloseTo(0, 12)
  })
})
