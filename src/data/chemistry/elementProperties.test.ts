import { describe, expect, it } from 'vitest'
import { PROPERTIES, findProperty, formatProperty, propertiesOf, propertyRange, scalePosition } from './elementProperties'

describe('element properties (PubChem)', () => {
  it('has a row for every element', () => {
    for (let z = 1; z <= 118; z++) expect(propertiesOf(z).state).not.toBe('')
    expect(() => propertiesOf(119)).toThrow()
  })

  it('matches PubChem values for spot-checked elements', () => {
    expect(propertiesOf(26)).toMatchObject({ electronegativity: 1.83, radius: 194, ionization: 7.902, melting: 1811, boiling: 3134, density: 7.874 })
    expect(propertiesOf(1)).toMatchObject({ electronegativity: 2.2, radius: 120, ionization: 13.598, affinity: 0.754, state: 'Gas' })
    // PubChem gives no electronegativity or electron affinity for helium.
    expect(propertiesOf(2)).toMatchObject({ electronegativity: null, affinity: null })
    expect(propertiesOf(118).state).toBe('Expected to be a Gas')
  })

  it('reports the true extremes of each scale', () => {
    expect(propertyRange('electronegativity')).toMatchObject({ max: 3.98 })
    expect(propertyRange('ionization').max).toBe(24.587) // helium
    expect(propertyRange('melting').min).toBe(0.95) // helium (under pressure)
  })

  it('places values on the scale and leaves missing values off it', () => {
    const en = findProperty('electronegativity')!
    expect(scalePosition(en, 3.98)).toBe(1)
    expect(scalePosition(en, null)).toBeNull()
    const density = findProperty('density')!
    const { min, max } = propertyRange('density')
    expect(scalePosition(density, min)).toBe(0)
    expect(scalePosition(density, max)).toBeCloseTo(1)
    // A log scale puts water-like densities near the middle, not crushed against the gases.
    expect(scalePosition(density, 1)).toBeGreaterThan(0.4)
  })

  it('formats values with units students can read', () => {
    const byId = (id: string) => findProperty(id)!
    expect(formatProperty(byId('radius'), 194)).toBe('194 pm')
    expect(formatProperty(byId('melting'), 1811)).toBe('1811 K (1537.85 °C)')
    expect(formatProperty(byId('electronegativity'), 1.83)).toBe('1.83')
    expect(formatProperty(byId('density'), 7.874)).toBe('7.874 g/cm³')
    expect(formatProperty(byId('density'), 0.00008988)).toBe('0.00008988 g/cm³')
    expect(formatProperty(byId('affinity'), null)).toBe('No PubChem value')
    expect(PROPERTIES.every((p) => p.definition.length > 20)).toBe(true)
  })
})
