import { describe, expect, it } from 'vitest'
import { criticalAngle, effectiveIncidence, normalizeOpticsParam, principalRays, refract, SIN_TOLERANCE, thinLens } from './optics'

const DEG = Math.PI / 180

describe('reflection and refraction', () => {
  it('reflects at the angle of incidence and refracts by Snell’s law (air to water bends toward the normal)', () => {
    const r = refract(1.000293, 1.333, 30)!
    expect(r.reflected).toBe(30)
    expect(1.000293 * Math.sin(30 * DEG)).toBeCloseTo(1.333 * Math.sin(r.transmitted! * DEG), 12)
    expect(r.transmitted!).toBeCloseTo(22.04, 2)
    expect(r.bend).toBe('toward')
    expect(r.critical).toBeNull()
  })

  it('reproduces the textbook example: air to diamond at 30° gives about 12.0°', () => {
    expect(refract(1.0, 2.419, 30)!.transmitted!).toBeCloseTo(11.92, 1)
  })

  it('normal incidence does not bend; equal indices do not bend', () => {
    expect(refract(1.333, 1.52, 0)).toMatchObject({ transmitted: 0, normal: true, bend: 'none' })
    const same = refract(1.333, 1.333, 55)!
    expect(same.transmitted!).toBeCloseTo(55, 10)
    expect(same).toMatchObject({ equalIndices: true, bend: 'none', critical: null, totalInternalReflection: false })
  })

  it('has a critical angle only from higher to lower index, with total internal reflection beyond it', () => {
    const below = refract(1.333, 1.000293, 48)!
    expect(below.critical!).toBeCloseTo(Math.asin(1.000293 / 1.333) / DEG, 12)
    expect(below.critical!).toBeCloseTo(48.63, 2)
    expect(below).toMatchObject({ totalInternalReflection: false, bend: 'away' })
    expect(refract(1.333, 1.000293, 49)).toMatchObject({ totalInternalReflection: true, transmitted: null, bend: null })
    // Never from lower to higher index, at any angle.
    expect(refract(1.000293, 1.333, 89.99)!.totalInternalReflection).toBe(false)
  })

  it('classifies from the calculation, not from display rounding: the 41.14° reproduction is total internal reflection', () => {
    const c = criticalAngle(1.52, 1)!
    expect(c).toBeCloseTo(41.1395104, 6)
    // 41.14° is 0.0005° above θc. Both show as 41.14° to two decimals, but sin θ2 would exceed 1.
    const r = refract(1.52, 1, 41.14)!
    expect(r).toMatchObject({ totalInternalReflection: true, transmitted: null, atCritical: false })
    expect((1.52 * Math.sin(41.14 * DEG)) / 1).toBeGreaterThan(1)
  })

  it('below, at and above the critical angle', () => {
    const c = criticalAngle(1.52, 1)!
    const below = refract(1.52, 1, c - 1e-6)!
    expect(below.totalInternalReflection).toBe(false)
    expect(below.transmitted!).toBeLessThan(90)
    expect(below.transmitted!).toBeGreaterThan(89)
    // Exactly at θc (full precision) the transmitted ray grazes at 90°.
    expect(refract(1.52, 1, c)).toMatchObject({ atCritical: true, transmitted: 90, totalInternalReflection: false })
    expect(refract(1.52, 1, c + 1e-6)).toMatchObject({ totalInternalReflection: true, atCritical: false })
    // The same holds for other media pairs.
    for (const [n1, n2] of [
      [1.333, 1.000293],
      [2.419, 1.0003],
      [1.66, 1.52],
    ]) {
      const k = criticalAngle(n1, n2)!
      expect(refract(n1, n2, k)!.atCritical, `${n1}/${n2}`).toBe(true)
      expect(refract(n1, n2, k + 1e-7)!.totalInternalReflection).toBe(true)
      expect(refract(n1, n2, k - 1e-7)!.totalInternalReflection).toBe(false)
    }
  })

  it('the tolerance is a floating-point allowance far smaller than the input step', () => {
    expect(SIN_TOLERANCE).toBeLessThan(1e-9)
    // 0.01° (one slider step) away from θc is never treated as "at" the critical angle.
    const c = criticalAngle(1.52, 1)!
    expect(refract(1.52, 1, c - 0.01)!.atCritical).toBe(false)
    expect(refract(1.52, 1, c + 0.01)!.atCritical).toBe(false)
  })

  it('critical mode uses the exact critical angle, and only when one exists', () => {
    expect(effectiveIncidence({ n1: 1.52, n2: 1, incidence: 30, atCritical: true })).toBe(criticalAngle(1.52, 1))
    expect(effectiveIncidence({ n1: 1, n2: 1.52, incidence: 30, atCritical: true })).toBe(30)
    expect(effectiveIncidence({ n1: 1.52, n2: 1, incidence: 30, atCritical: false })).toBe(30)
  })

  it('rejects invalid input', () => {
    expect(refract(0.9, 1, 10)).toBeNull()
    expect(refract(1, 1, -1)).toBeNull()
    expect(refract(1, 1, 90)).toBeNull()
    expect(refract(Number.NaN, 1, 10)).toBeNull()
  })
})

describe('thin lens', () => {
  it('converging lens beyond 2f: real, inverted, reduced', () => {
    const r = thinLens(10, 30)!
    expect(r.di).toBeCloseTo(15, 12)
    expect(r.magnification!).toBeCloseTo(-0.5, 12)
    expect(r).toMatchObject({ type: 'real', orientation: 'inverted', atInfinity: false })
    expect(1 / 30 + 1 / r.di).toBeCloseTo(1 / 10, 12)
  })

  it('converging lens inside f: virtual, upright, enlarged (a magnifier)', () => {
    const r = thinLens(10, 5)!
    expect(r.di).toBeCloseTo(-10, 12)
    expect(r.magnification!).toBeCloseTo(2, 12)
    expect(r).toMatchObject({ type: 'virtual', orientation: 'upright' })
  })

  it('diverging lens: always virtual, upright and reduced', () => {
    for (const d of [1, 5, 10, 30, 60]) {
      const r = thinLens(-10, d)!
      expect(r.type).toBe('virtual')
      expect(r.orientation).toBe('upright')
      expect(r.magnification!).toBeGreaterThan(0)
      expect(r.magnification!).toBeLessThan(1)
    }
  })

  it('object at the focal plane: image at infinity, no finite image or magnification', () => {
    expect(thinLens(10, 10)).toMatchObject({ atInfinity: true, di: Number.POSITIVE_INFINITY, magnification: null, type: null, orientation: null })
  })

  it('as the object approaches the focal plane the image distance grows without bound', () => {
    const ds = [12, 11, 10.5, 10.1].map((d) => thinLens(10, d)!.di)
    for (let i = 1; i < ds.length; i++) expect(ds[i]).toBeGreaterThan(ds[i - 1])
    expect(thinLens(10, 10.1)!.di).toBeCloseTo(1010, 6)
    expect(thinLens(10, 9.9)!.di).toBeCloseTo(-990, 6)
  })

  it('rejects zero focal length and non-positive object distance', () => {
    expect(thinLens(0, 10)).toBeNull()
    expect(thinLens(10, 0)).toBeNull()
    expect(thinLens(10, -5)).toBeNull()
  })

  it('principal rays meet at the image (real) or their extensions do (virtual); none meet at infinity', () => {
    const line = (a: readonly [number, number], b: readonly [number, number], x: number) => a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])
    const real = thinLens(10, 30)!
    for (const ray of principalRays(10, 30)) expect(line(ray.outgoing[0], ray.outgoing[1], real.di)).toBeCloseTo(real.imageHeight!, 9)
    const virt = thinLens(10, 5)!
    for (const ray of principalRays(10, 5)) {
      expect(ray.extension).toBeDefined()
      expect(ray.extension![1][0]).toBeCloseTo(virt.di, 9)
      expect(line(ray.outgoing[0], ray.outgoing[1], virt.di)).toBeCloseTo(virt.imageHeight!, 9)
    }
    for (const ray of principalRays(-10, 20)) expect(line(ray.outgoing[0], ray.outgoing[1], thinLens(-10, 20)!.di)).toBeCloseTo(thinLens(-10, 20)!.imageHeight!, 9)
    // At the focal plane only rays 1 and 2 are drawn, and they leave parallel.
    const atF = principalRays(10, 10)
    expect(atF.map((r) => r.id)).toEqual([1, 2])
    const slope = (r: (typeof atF)[number]) => (r.outgoing[1][1] - r.outgoing[0][1]) / (r.outgoing[1][0] - r.outgoing[0][0])
    expect(slope(atF[0])).toBeCloseTo(slope(atF[1]), 12)
    expect(atF.every((r) => r.extension === undefined)).toBe(true)
  })
})

describe('parameter normalization', () => {
  it('keeps values in the supported domain and rounds to the input precision', () => {
    expect(normalizeOpticsParam('n1', 1.33333)).toBe(1.3333)
    expect(normalizeOpticsParam('n1', 0.99)).toBeNull()
    expect(normalizeOpticsParam('incidence', 90)).toBeNull()
    expect(normalizeOpticsParam('objectDistance', 0.5)).toBeNull()
    expect(normalizeOpticsParam('focal', 25)).toBeNull()
  })
})
