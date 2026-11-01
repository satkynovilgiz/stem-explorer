import { ATOMIC_ROWS } from './atomic.data'
import { PROPERTY_ROWS } from './elementProperties.data'

/** Numeric properties the periodic table can be coloured by. All values are PubChem's. */
export type PropertyId = 'electronegativity' | 'radius' | 'ionization' | 'affinity' | 'melting' | 'boiling' | 'density'

export interface PropertyDef {
  id: PropertyId
  label: string
  unit: string
  /** One sentence for students: what the number measures. */
  definition: string
  /** How the colour scale is spread; density spans six orders of magnitude, so it uses a log scale. */
  scale: 'linear' | 'log'
}

export const PROPERTIES: readonly PropertyDef[] = [
  {
    id: 'electronegativity',
    label: 'Electronegativity',
    unit: 'Pauling scale',
    definition: 'How strongly an atom pulls shared electrons toward itself in a bond. Unitless; fluorine is highest at 3.98.',
    scale: 'linear',
  },
  {
    id: 'radius',
    label: 'Atomic radius',
    unit: 'pm',
    definition: 'Van der Waals radius: half the closest distance between two non-bonded atoms. 1 pm = 10⁻¹² m.',
    scale: 'linear',
  },
  {
    id: 'ionization',
    label: 'First ionization energy',
    unit: 'eV',
    definition: 'The energy needed to remove the outermost electron from one gaseous atom. 1 eV per atom ≈ 96.485 kJ/mol.',
    scale: 'linear',
  },
  {
    id: 'affinity',
    label: 'Electron affinity',
    unit: 'eV',
    definition: 'The energy released when one gaseous atom gains an electron. Larger means the atom holds an extra electron more tightly.',
    scale: 'linear',
  },
  {
    id: 'melting',
    label: 'Melting point',
    unit: 'K',
    definition: 'The temperature at which the solid melts, as PubChem lists it. A few are measured under pressure: helium never freezes at 1 atm, and carbon and arsenic turn straight to gas. °C = K − 273.15.',
    scale: 'linear',
  },
  {
    id: 'boiling',
    label: 'Boiling point',
    unit: 'K',
    definition: 'The temperature at which the liquid boils at standard pressure. °C = K − 273.15.',
    scale: 'linear',
  },
  {
    id: 'density',
    label: 'Density',
    unit: 'g/cm³',
    definition: 'Mass per volume of the element in its standard state. Gases are about a thousand times less dense than solids, so colours use a log scale.',
    scale: 'log',
  },
]

export interface ElementProperties {
  electronegativity: number | null
  radius: number | null
  ionization: number | null
  affinity: number | null
  melting: number | null
  boiling: number | null
  density: number | null
  /** PubChem's standard state, e.g. "Solid" or "Expected to be a Gas". */
  state: string
  oxidation: string
  discovered: string
}

const BY_Z = new Map<number, ElementProperties>(
  PROPERTY_ROWS.map(([z, radius, ionization, affinity, melting, boiling, density, state, oxidation, discovered]) => [
    z,
    { electronegativity: ATOMIC_ROWS[z - 1][2], radius, ionization, affinity, melting, boiling, density, state, oxidation, discovered },
  ]),
)

export function propertiesOf(z: number): ElementProperties {
  const p = BY_Z.get(z)
  if (!p) throw new Error(`No properties for element ${z}`)
  return p
}

export const findProperty = (id: string): PropertyDef | undefined => PROPERTIES.find((p) => p.id === id)

/** Smallest and largest PubChem value of a property across all elements that have one. */
export function propertyRange(id: PropertyId): { min: number; max: number; count: number } {
  const values = [...BY_Z.values()].map((p) => p[id]).filter((v): v is number => v !== null)
  return { min: Math.min(...values), max: Math.max(...values), count: values.length }
}

/** Position 0–1 of a value on the property's colour scale, or null when PubChem gives no value. */
export function scalePosition(def: PropertyDef, value: number | null): number | null {
  if (value === null) return null
  const { min, max } = propertyRange(def.id)
  if (def.scale === 'log') return (Math.log10(value) - Math.log10(min)) / (Math.log10(max) - Math.log10(min))
  return (value - min) / (max - min)
}

/** A value with its unit as shown to students, e.g. "1.83" or "194 pm" or "1811 K (1537.85 °C)". */
export function formatProperty(def: PropertyDef, value: number | null): string {
  if (value === null) return 'No PubChem value'
  const n = def.id === 'density' && value >= 0.1 ? value.toFixed(3).replace(/\.?0+$/, '') : String(value)
  if (def.id === 'electronegativity') return n
  if (def.unit === 'K') return `${n} K (${(value - 273.15).toFixed(2).replace(/\.?0+$/, '')} °C)`
  return `${n} ${def.unit}`
}
