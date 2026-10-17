import { describe, expect, it } from 'vitest'
import { configurationOf, electronegativityOf, ISOTOPES, isotopesOf, neutronCount, shellCounts, subshellsOf } from './atomic'
import { findElement } from './periodicTable'

describe('electron configurations (as listed by PubChem)', () => {
  it('every element expands to exactly Z electrons', () => {
    for (let z = 1; z <= 118; z++) {
      const total = subshellsOf(z).reduce((a, s) => a + s.electrons, 0)
      expect(total, `Z = ${z}`).toBe(z)
    }
  })

  it('shell counts for familiar cases, including filling exceptions', () => {
    expect(shellCounts(1)).toEqual([1])
    expect(shellCounts(8)).toEqual([2, 6])
    expect(shellCounts(11)).toEqual([2, 8, 1])
    expect(shellCounts(20)).toEqual([2, 8, 8, 2])
    expect(shellCounts(26)).toEqual([2, 8, 14, 2]) // [Ar]4s2 3d6
    expect(shellCounts(24)).toEqual([2, 8, 13, 1]) // [Ar]3d5 4s1, an exception to the simple order
    expect(subshellsOf(17).at(-1)).toEqual({ n: 3, type: 'p', electrons: 5 })
  })

  it('keeps PubChem’s “predicted” / “calculated” notes separate from the configuration text', () => {
    expect(configurationOf(8)).toEqual({ text: '[He]2s2 2p4', note: null })
    expect(configurationOf(118).note).toBe('predicted')
    expect(configurationOf(109).note).toBe('calculated')
    expect(configurationOf(118).text).not.toMatch(/predicted/)
  })

  it('electronegativity values are PubChem’s, null where none is listed', () => {
    expect(electronegativityOf(9)).toBe(3.98)
    expect(electronegativityOf(2)).toBeNull()
  })
})

describe('isotopes and neutrons', () => {
  it('neutrons = mass number − atomic number', () => {
    expect(neutronCount(12, 6)).toBe(6)
    expect(neutronCount(14, 6)).toBe(8)
    expect(neutronCount(3, 1)).toBe(2)
    expect(neutronCount(238, 92)).toBe(146)
  })

  it('the library has distinct entries for real elements with plausible mass numbers', () => {
    const keys = ISOTOPES.map((i) => `${i.z}-${i.massNumber}`)
    expect(new Set(keys).size).toBe(keys.length)
    for (const i of ISOTOPES) {
      expect(findElement(i.z), `Z ${i.z}`).toBeDefined()
      expect(i.massNumber).toBeGreaterThanOrEqual(i.z)
    }
    expect(isotopesOf(1).map((i) => i.name)).toEqual([undefined, 'deuterium', 'tritium'])
    expect(isotopesOf(10)).toEqual([])
  })
})
