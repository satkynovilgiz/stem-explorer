import { describe, expect, it } from 'vitest'
import { getMolecule } from '../data/chemistry/molecules'
import {
  angleAt,
  distance,
  formatAngle,
  formatDistance,
  measure,
  measurementLabel,
  pickAtom,
} from './measurement'

describe('distance', () => {
  it('matches a 3-4-5 right triangle', () => {
    expect(distance([0, 0, 0], [3, 4, 0])).toBe(5)
  })

  it('works in three dimensions and is symmetric', () => {
    expect(distance([1, 2, 3], [3, 5, 9])).toBeCloseTo(7, 12)
    expect(distance([3, 5, 9], [1, 2, 3])).toBeCloseTo(7, 12)
  })
})

describe('angleAt', () => {
  it('returns 90° for perpendicular arms', () => {
    expect(angleAt([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(90, 12)
  })

  it('returns 60° in an equilateral triangle', () => {
    expect(angleAt([0, 0, 0], [1, 0, 0], [0.5, Math.sqrt(3) / 2, 0])).toBeCloseTo(60, 10)
  })

  it('returns exactly 180° (not NaN) for collinear points where rounding pushes cos below -1', () => {
    // For these points the unclamped cosine evaluates to -1.0000000000000002.
    const t = 0.000137
    const value = angleAt([t, 2 * t, 3 * t], [0, 0, 0], [-0.7 * t, -1.4 * t, -2.1 * t])
    expect(Number.isNaN(value)).toBe(false)
    expect(value).toBeCloseTo(180, 10)
  })

  it('returns 0° for identical directions', () => {
    expect(angleAt([2, 0, 0], [0, 0, 0], [1, 0, 0])).toBeCloseTo(0, 10)
  })

  it('returns null when an arm has zero length', () => {
    expect(angleAt([0, 0, 0], [0, 0, 0], [1, 0, 0])).toBeNull()
    expect(angleAt([1, 0, 0], [0, 0, 0], [0, 0, 0])).toBeNull()
  })
})

describe('pickAtom', () => {
  it('adds distinct atoms in order', () => {
    expect(pickAtom([], 'O1', 'angle')).toEqual({ selection: ['O1'], outcome: 'added' })
    expect(pickAtom(['H1'], 'O1', 'angle')).toEqual({ selection: ['H1', 'O1'], outcome: 'added' })
  })

  it('ignores an atom that is already selected', () => {
    expect(pickAtom(['H1', 'O1'], 'H1', 'angle')).toEqual({ selection: ['H1', 'O1'], outcome: 'duplicate' })
    expect(pickAtom(['H1'], 'H1', 'distance')).toEqual({ selection: ['H1'], outcome: 'duplicate' })
  })

  it('starts a new measurement after a complete one', () => {
    expect(pickAtom(['H1', 'O1'], 'H2', 'distance')).toEqual({ selection: ['H2'], outcome: 'restarted' })
    expect(pickAtom(['H1', 'O1', 'H2'], 'O1', 'angle')).toEqual({ selection: ['O1'], outcome: 'restarted' })
  })
})

describe('measure', () => {
  const water = getMolecule('water')

  it('calls a bonded pair a bond length and matches the reported O–H length', () => {
    const r = measure(water, ['O1', 'H1'], 'distance')
    expect(r?.kind).toBe('distance')
    expect(r && measurementLabel(r)).toBe('Bond length')
    expect(r!.value).toBeCloseTo(0.958, 3)
  })

  it('calls a non-bonded pair an interatomic distance', () => {
    const r = measure(water, ['H1', 'H2'], 'distance')
    expect(r && measurementLabel(r)).toBe('Interatomic distance')
    expect(r!.value).toBeCloseTo(1.5144, 4)
  })

  it('uses the second atom as the vertex and reports a bond angle only for two bonds', () => {
    const bond = measure(water, ['H1', 'O1', 'H2'], 'angle')
    expect(bond && measurementLabel(bond)).toBe('Bond angle')
    expect(bond!.value).toBeCloseTo(104.48, 1)

    const notBond = measure(water, ['O1', 'H1', 'H2'], 'angle')
    expect(notBond && measurementLabel(notBond)).toBe('Angle')
    expect(notBond!.value).not.toBeCloseTo(104.48, 0)
  })

  it('measures the linear CO₂ angle as 180°', () => {
    const r = measure(getMolecule('carbon-dioxide'), ['O1', 'C1', 'O2'], 'angle')
    expect(r!.value).toBeCloseTo(180, 6)
  })

  it('returns null for incomplete, duplicated or unknown selections', () => {
    expect(measure(water, ['O1'], 'distance')).toBeNull()
    expect(measure(water, ['O1', 'O1'], 'distance')).toBeNull()
    expect(measure(water, ['H1', 'O1', 'H1'], 'angle')).toBeNull()
    expect(measure(water, ['O1', 'X9'], 'distance')).toBeNull()
  })
})

describe('formatting', () => {
  it('rounds distances to 0.001 Å and angles to 0.1°', () => {
    expect(formatDistance(1.01244)).toBe('1.012 Å')
    expect(formatAngle(104.4776)).toBe('104.5°')
  })
})
