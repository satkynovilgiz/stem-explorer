import { describe, expect, it } from 'vitest'
import { checkValue, curve, CYCLE, DEFAULT_ENZYME, ENZYME_LIMITS, fmt, fractionOfVmax, INVESTIGATIONS, niceMax, rate, sRange, substrateFor } from './enzymes'

const A = { vmax: 10, km: 2 }

describe('Michaelis–Menten rate', () => {
  it('[S] = 0 gives v = 0', () => {
    expect(rate(0, A)).toBe(0)
    expect(rate(0, { vmax: 1000, km: 0.01 })).toBe(0)
  })

  it('[S] = Km gives exactly Vmax / 2, for any Vmax and Km', () => {
    for (const p of [A, { vmax: 0.1, km: 0.01 }, { vmax: 1000, km: 100 }, { vmax: 3.7, km: 42 }]) expect(rate(p.km, p)).toBeCloseTo(p.vmax / 2, 12)
  })

  it('never exceeds Vmax for valid non-negative inputs, and approaches it at high [S]', () => {
    for (const p of [A, { vmax: 0.1, km: 0.01 }, { vmax: 1000, km: 100 }])
      for (const s of [0, 1e-6, 0.5, 2, 10, 100, 1e6, 1e12]) {
        const v = rate(s, p)
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(p.vmax)
      }
    expect(rate(1e9, A) / A.vmax).toBeGreaterThan(0.999999)
  })

  it('rises steadily: a larger [S] never gives a smaller v', () => {
    const pts = curve(A, 50)
    for (let i = 1; i < pts.length; i++) expect(pts[i][1]).toBeGreaterThanOrEqual(pts[i - 1][1])
  })

  it('is nearly proportional to [S] far below Km', () => {
    expect(rate(0.002, A) / rate(0.001, A)).toBeCloseTo(2, 2)
  })

  it('works with hand-computed values', () => {
    // 10 × 6 / (2 + 6) = 7.5
    expect(rate(6, A)).toBeCloseTo(7.5, 12)
    expect(fractionOfVmax(18, 2)).toBeCloseTo(0.9, 12)
    expect(substrateFor(0.9, 2)).toBeCloseTo(18, 12)
    expect(substrateFor(0.5, 2)).toBeCloseTo(2, 12)
  })

  it('returns NaN, never Infinity, outside the model', () => {
    for (const v of [rate(1, { vmax: 10, km: 0 }), rate(1, { vmax: 10, km: -1 }), rate(-1, A), rate(Number.NaN, A), rate(Infinity, A), substrateFor(1, 2), substrateFor(0.5, 0)]) expect(v).toBeNaN()
  })
})

describe('inputs', () => {
  it('requires Km > 0 and explains why', () => {
    expect(checkValue('km', '0')).toMatch(/greater than zero/)
    expect(checkValue('km', '-2')).toMatch(/greater than zero/)
    expect(checkValue('vmax', '0')).toMatch(/greater than zero/)
    expect(checkValue('s', '-1')).toMatch(/negative/)
    expect(checkValue('s', '0')).toBeNull()
    expect(checkValue('s', 'abc')).toMatch(/not a number/)
    expect(checkValue('s', String(ENZYME_LIMITS.s.max + 1))).toMatch(/from 0 to 100/)
    expect(checkValue('km', '1e-3')).toMatch(/from 0.01 to 100/)
  })

  it('formats with three significant figures and an axis maximum that contains the data', () => {
    expect(fmt(7.5)).toBe('7.5')
    expect(fmt(1 / 3)).toBe('0.333')
    expect(niceMax(7.3)).toBe(10)
    expect(niceMax(21)).toBe(25)
    expect(sRange(DEFAULT_ENZYME)).toBeGreaterThanOrEqual(8)
  })
})

describe('investigations and the cycle', () => {
  it('low, half-maximal and saturation set [S] relative to Km and explain with computed numbers', () => {
    const at = (id: string) => {
      const inv = INVESTIGATIONS.find((i) => i.id === id)!
      const st = { ...DEFAULT_ENZYME, s: inv.sOverKm * DEFAULT_ENZYME.a.km }
      return inv.explain(st)
    }
    expect(at('low')).toContain('9.1% of Vmax')
    expect(at('low')).toContain('1.83')
    expect(at('half')).toContain('v = 5 µM/s, exactly half of Vmax = 10 µM/s')
    expect(at('saturation')).toContain('95.2% of Vmax')
    expect(at('saturation')).toContain('2.4%')
  })

  it('the catalytic cycle has the four named stages and says the enzyme is unchanged', () => {
    expect(CYCLE.map((c) => c.title)).toEqual(['Enzyme and substrate', 'Enzyme–substrate complex', 'Reaction at the active site', 'Products released'])
    expect(CYCLE[3].text).toContain('unchanged')
  })
})
