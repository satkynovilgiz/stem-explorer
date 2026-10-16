import { describe, expect, it } from 'vitest'
import { CATEGORIES, ELEMENTS, findElement, moleculesWith, searchElements } from './periodicTable'

describe('periodic table data', () => {
  it('has 118 elements with unique, contiguous atomic numbers and unique symbols', () => {
    expect(ELEMENTS).toHaveLength(118)
    expect(ELEMENTS.map((e) => e.number)).toEqual(Array.from({ length: 118 }, (_, i) => i + 1))
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118)
    expect(new Set(ELEMENTS.map((e) => e.name)).size).toBe(118)
    for (const e of ELEMENTS) {
      expect(e.symbol).toMatch(/^[A-Z][a-z]?$/)
      expect(CATEGORIES).toContain(e.category)
    }
  })

  it('places elements in the right period and group', () => {
    const at = (s: string) => {
      const e = findElement(s)!
      return [e.period, e.group, e.row, e.column]
    }
    expect(at('H')).toEqual([1, 1, 'main', 1])
    expect(at('He')).toEqual([1, 18, 'main', 18])
    expect(at('B')).toEqual([2, 13, 'main', 13])
    expect(at('Ne')).toEqual([2, 18, 'main', 18])
    expect(at('Al')).toEqual([3, 13, 'main', 13])
    expect(at('Sc')).toEqual([4, 3, 'main', 3])
    expect(at('Zn')).toEqual([4, 12, 'main', 12])
    expect(at('Kr')).toEqual([4, 18, 'main', 18])
    expect(at('Ba')).toEqual([6, 2, 'main', 2])
    expect(at('La')).toEqual([6, null, 'lanthanoids', 3])
    expect(at('Lu')).toEqual([6, null, 'lanthanoids', 17])
    expect(at('Hf')).toEqual([6, 4, 'main', 4])
    expect(at('Au')).toEqual([6, 11, 'main', 11])
    expect(at('Rn')).toEqual([6, 18, 'main', 18])
    expect(at('Ac')).toEqual([7, null, 'actinoids', 3])
    expect(at('Lr')).toEqual([7, null, 'actinoids', 17])
    expect(at('Rf')).toEqual([7, 4, 'main', 4])
    expect(at('Og')).toEqual([7, 18, 'main', 18])
  })

  it('never puts two elements in the same cell', () => {
    const cells = ELEMENTS.map((e) => `${e.row}:${e.row === 'main' ? e.period : ''}:${e.column}`)
    expect(new Set(cells).size).toBe(118)
  })

  it('assigns blocks consistently (s 14, p 36, d 38, f 30 in this layout)', () => {
    const count = (b: string) => ELEMENTS.filter((e) => e.block === b).length
    expect([count('s'), count('p'), count('d'), count('f')]).toEqual([14, 36, 38, 30])
    expect(findElement('He')!.block).toBe('s')
    expect(findElement('Fe')!.block).toBe('d')
    expect(findElement('U')!.block).toBe('f')
  })

  it('agrees with PubChem’s categories for the f rows', () => {
    for (const e of ELEMENTS.filter((x) => x.row === 'lanthanoids')) expect(e.category).toBe('Lanthanide')
    for (const e of ELEMENTS.filter((x) => x.row === 'actinoids')) expect(e.category).toBe('Actinide')
  })
})

describe('search and molecule links', () => {
  it('finds by atomic number, symbol or name prefix, case-insensitively', () => {
    expect(searchElements('8').map((e) => e.symbol)).toEqual(['O'])
    expect(searchElements('fe').map((e) => e.name)).toEqual(['Iron', 'Fermium']) // exact symbol first
    expect(searchElements('carb').map((e) => e.symbol)).toEqual(['C'])
    expect(searchElements('  NITRO ').map((e) => e.symbol)).toEqual(['N'])
    expect(searchElements('999')).toEqual([])
    expect(searchElements('')).toHaveLength(118)
  })

  it('lists the app’s molecules containing an element', () => {
    expect(moleculesWith('O').map((m) => m.id).sort()).toEqual(['carbon-dioxide', 'ethanol', 'water'])
    expect(moleculesWith('N').map((m) => m.id)).toEqual(['ammonia'])
    expect(moleculesWith('C').map((m) => m.id).sort()).toEqual(['benzene', 'carbon-dioxide', 'ethanol', 'methane'])
    expect(moleculesWith('Fe')).toEqual([])
  })
})
