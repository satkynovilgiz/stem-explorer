import { ATOMIC_ROWS } from './atomic.data'

/*
 * Atomic structure helpers. Proton count is the atomic number Z; a neutral atom has Z electrons
 * (OpenStax Chemistry 2e §2.3). Neutron count depends on the isotope: N = A − Z, where A is the
 * mass number of a specific isotope. It is never inferred from an element's atomic weight.
 */

export type SubshellType = 's' | 'p' | 'd' | 'f'
export interface Subshell {
  n: number
  type: SubshellType
  electrons: number
}

const NOBLE_CORES: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 }
const BY_Z = new Map(ATOMIC_ROWS.map(([z, config, en]) => [z, { config, en }]))

/**
 * PubChem's configuration text for an element, and PubChem's note on it: some heavy elements are
 * marked "(predicted)" or "(calculated)" rather than measured.
 */
export function configurationOf(z: number): { text: string; note: 'predicted' | 'calculated' | null } {
  const raw = BY_Z.get(z)?.config ?? ''
  const note = raw.match(/\((predicted|calculated)\)\s*$/)?.[1] as 'predicted' | 'calculated' | undefined
  return { text: raw.replace(/\s*\((predicted|calculated)\)\s*$/, ''), note: note ?? null }
}

/** Pauling electronegativity as listed by PubChem, or null when it lists none. */
export const electronegativityOf = (z: number): number | null => BY_Z.get(z)?.en ?? null

/** Expands noble-gas cores ("[Ne]3s2 3p5") into the full list of occupied subshells, in listed order. */
export function subshellsOf(z: number): Subshell[] {
  const expand = (text: string): Subshell[] =>
    text
      .trim()
      .split(/\s+|(?=\[)|(?<=\])/)
      .filter(Boolean)
      .flatMap((part) => {
        const core = part.match(/^\[([A-Z][a-z]?)\]$/)
        if (core) return subshellsOf(NOBLE_CORES[core[1]])
        const m = part.match(/^(\d)([spdf])(\d+)$/)
        if (!m) throw new Error(`Unrecognised configuration part "${part}" for Z = ${z}`)
        return [{ n: Number(m[1]), type: m[2] as SubshellType, electrons: Number(m[3]) }]
      })
  return expand(configurationOf(z).text)
}

/** Electrons per principal shell n = 1, 2, 3… (the simplified shell diagram). */
export function shellCounts(z: number): number[] {
  const counts: number[] = []
  for (const s of subshellsOf(z)) counts[s.n - 1] = (counts[s.n - 1] ?? 0) + s.electrons
  return Array.from({ length: counts.length }, (_, i) => counts[i] ?? 0)
}

export const neutronCount = (massNumber: number, z: number) => massNumber - z

/* ---------- A verified initial isotope library ---------- */

export interface IsotopeEntry {
  z: number
  massNumber: number
  /** Special names used in OpenStax (deuterium, tritium). */
  name?: string
}

/**
 * Isotopes listed by NIST's "Atomic Weights and Isotopic Compositions" for these elements
 * (physics.nist.gov, retrieved 2026-10-16). Only mass numbers are used; abundances and masses are
 * not shown. Elements not listed here have no isotope in this app's library.
 */
export const ISOTOPES: readonly IsotopeEntry[] = [
  { z: 1, massNumber: 1 },
  { z: 1, massNumber: 2, name: 'deuterium' },
  { z: 1, massNumber: 3, name: 'tritium' },
  { z: 6, massNumber: 12 },
  { z: 6, massNumber: 13 },
  { z: 6, massNumber: 14 },
  { z: 7, massNumber: 14 },
  { z: 7, massNumber: 15 },
  { z: 8, massNumber: 16 },
  { z: 8, massNumber: 17 },
  { z: 8, massNumber: 18 },
  { z: 12, massNumber: 24 },
  { z: 12, massNumber: 25 },
  { z: 12, massNumber: 26 },
  { z: 17, massNumber: 35 },
  { z: 17, massNumber: 37 },
  { z: 26, massNumber: 54 },
  { z: 26, massNumber: 56 },
  { z: 26, massNumber: 57 },
  { z: 26, massNumber: 58 },
  { z: 92, massNumber: 233 },
  { z: 92, massNumber: 234 },
  { z: 92, massNumber: 235 },
  { z: 92, massNumber: 236 },
  { z: 92, massNumber: 238 },
]

export const isotopesOf = (z: number) => ISOTOPES.filter((i) => i.z === z)

export const NIST_ISOTOPES_URL = (symbol: string) => `https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl?ele=${symbol}&isotype=some`
