import { describe, expect, it } from 'vitest'
import { formulaCounts } from '../../lib/chemistry'
import { angleAt, distance } from '../../lib/measurement'
import { ELEMENTS } from './elements'
import { getMolecule, MOLECULES } from './molecules'

const pos = (moleculeId: string, atomId: string) => {
  const atom = getMolecule(moleculeId).atoms.find((a) => a.id === atomId)
  if (!atom) throw new Error(`${moleculeId} has no atom ${atomId}`)
  return atom.position
}

describe('molecule data integrity', () => {
  it('contains the twelve expected molecules with unique IDs', () => {
    expect(MOLECULES.map((m) => m.id)).toEqual([
      'water',
      'carbon-dioxide',
      'methane',
      'ammonia',
      'ethanol',
      'benzene',
      'oxygen',
      'nitrogen',
      'hydrogen-peroxide',
      'formaldehyde',
      'acetylene',
      'ethene',
    ])
  })

  describe.each(MOLECULES.map((m) => [m.name, m] as const))('%s', (_, molecule) => {
    it('has atom counts matching its formula', () => {
      const counts: Record<string, number> = {}
      for (const a of molecule.atoms) counts[a.element] = (counts[a.element] ?? 0) + 1
      expect(counts).toEqual(formulaCounts(molecule.formula))
    })

    it('has unique atom IDs and known elements', () => {
      const ids = molecule.atoms.map((a) => a.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const a of molecule.atoms) expect(ELEMENTS[a.element]).toBeDefined()
    })

    it('has bonds that reference existing, distinct atoms without duplicates', () => {
      const ids = new Set(molecule.atoms.map((a) => a.id))
      const seen = new Set<string>()
      for (const { atoms: [a, b] } of molecule.bonds) {
        expect(ids.has(a), `${a} exists`).toBe(true)
        expect(ids.has(b), `${b} exists`).toBe(true)
        expect(a).not.toBe(b)
        const key = [a, b].sort().join('-')
        expect(seen.has(key), `duplicate bond ${key}`).toBe(false)
        seen.add(key)
      }
    })

    it('is a single connected structure', () => {
      const reached = new Set([molecule.atoms[0].id])
      let grew = true
      while (grew) {
        grew = false
        for (const { atoms: [a, b] } of molecule.bonds) {
          if (reached.has(a) !== reached.has(b)) {
            reached.add(a)
            reached.add(b)
            grew = true
          }
        }
      }
      expect(reached.size).toBe(molecule.atoms.length)
    })

    it('has every listed bond within a plausible covalent length (0.9–1.6 Å)', () => {
      for (const { atoms: [a, b] } of molecule.bonds) {
        const d = distance(pos(molecule.id, a), pos(molecule.id, b))
        expect(d, `${a}–${b}`).toBeGreaterThan(0.9)
        expect(d, `${a}–${b}`).toBeLessThan(1.6)
      }
    })

    it('cites the source its coordinates come from', () => {
      expect(molecule.sources.some((s) => s.id === molecule.coordinates.sourceId)).toBe(true)
      for (const p of molecule.parameters) {
        expect(molecule.sources.some((s) => s.id === p.sourceId)).toBe(true)
      }
    })
  })
})

describe('coordinates reproduce the reported experimental geometry', () => {
  // [molecule, atoms, reported value, tolerance]. Coordinates are listed to 0.0001 Å.
  const distances: [string, string, string, number, number][] = [
    ['water', 'O1', 'H1', 0.958, 0.001],
    ['carbon-dioxide', 'C1', 'O1', 1.162, 0.001],
    ['methane', 'C1', 'H3', 1.087, 0.001],
    ['ammonia', 'N1', 'H2', 1.012, 0.001],
    ['ethanol', 'C1', 'C2', 1.512, 0.001],
    ['ethanol', 'C2', 'O1', 1.431, 0.001],
    ['ethanol', 'O1', 'H6', 0.971, 0.001],
    ['ethanol', 'C2', 'H4', 1.086, 0.001],
    ['benzene', 'C1', 'H1', 1.084, 0.001],
    ['oxygen', 'O1', 'O2', 1.208, 0.001],
    ['nitrogen', 'N1', 'N2', 1.098, 0.001],
    ['hydrogen-peroxide', 'O1', 'O2', 1.475, 0.001],
    ['hydrogen-peroxide', 'O1', 'H1', 0.95, 0.001],
    ['formaldehyde', 'C1', 'O1', 1.205, 0.001],
    ['formaldehyde', 'C1', 'H1', 1.111, 0.001],
    ['acetylene', 'C1', 'C2', 1.203, 0.001],
    ['acetylene', 'C1', 'H1', 1.063, 0.001],
    ['ethene', 'C1', 'C2', 1.339, 0.001],
    ['ethene', 'C1', 'H1', 1.086, 0.001],
  ]
  it.each(distances)('%s %s–%s ≈ %f Å', (m, a, b, expected, tol) => {
    expect(Math.abs(distance(pos(m, a), pos(m, b)) - expected)).toBeLessThanOrEqual(tol)
  })

  const angles: [string, string, string, string, number, number][] = [
    ['water', 'H1', 'O1', 'H2', 104.4776, 0.05],
    ['carbon-dioxide', 'O1', 'C1', 'O2', 180, 0.001],
    ['methane', 'H1', 'C1', 'H4', 109.471, 0.05],
    ['ammonia', 'H1', 'N1', 'H3', 106.67, 0.05],
    ['ethanol', 'C1', 'C2', 'O1', 107.8, 0.05],
    ['ethanol', 'C2', 'O1', 'H6', 105.4, 0.05],
    ['benzene', 'C1', 'C2', 'C3', 120, 0.01],
    ['hydrogen-peroxide', 'H1', 'O1', 'O2', 94.8, 0.05],
    ['formaldehyde', 'H1', 'C1', 'H2', 116.133, 0.05],
    ['acetylene', 'H1', 'C1', 'C2', 180, 0.001],
    ['ethene', 'H1', 'C1', 'H2', 117.6, 0.05],
  ]
  it.each(angles)('%s %s–%s–%s ≈ %f°', (m, a, b, c, expected, tol) => {
    expect(Math.abs(angleAt(pos(m, a), pos(m, b), pos(m, c))! - expected)).toBeLessThanOrEqual(tol)
  })

  it('gives benzene six equal C–C ring bonds, all marked aromatic, in one plane', () => {
    const benzene = getMolecule('benzene')
    const ring = benzene.bonds.filter((b) => b.order === 'aromatic')
    expect(ring).toHaveLength(6)
    for (const { atoms: [a, b] } of ring) {
      expect(distance(pos('benzene', a), pos('benzene', b))).toBeCloseTo(1.397, 3)
    }
    for (const a of benzene.atoms) expect(a.position[2]).toBe(0)
  })

  it('shows ethanol in the anti conformation (H6 in the C1–C2–O1 plane, opposite C1)', () => {
    const [c1, c2, o1, h6] = ['C1', 'C2', 'O1', 'H6'].map((id) => pos('ethanol', id))
    for (const p of [c1, c2, o1, h6]) expect(p[2]).toBe(0)
    // H6 and C1 lie on opposite sides of the C2–O1 axis.
    const side = (p: readonly number[]) =>
      (o1[0] - c2[0]) * (p[1] - c2[1]) - (o1[1] - c2[1]) * (p[0] - c2[0])
    expect(Math.sign(side(c1))).toBe(-Math.sign(side(h6)))
  })
})

describe('new molecules: bond orders and shapes', () => {
  /** Dihedral angle a–b–c–d in degrees. */
  function dihedral(a: readonly number[], b: readonly number[], c: readonly number[], d: readonly number[]) {
    const sub = (p: readonly number[], q: readonly number[]) => p.map((v, i) => v - q[i])
    const cross = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
    const dot = (u: number[], v: number[]) => u.reduce((s, x, i) => s + x * v[i], 0)
    const n1 = cross(sub(b, a), sub(c, b))
    const n2 = cross(sub(c, b), sub(d, c))
    return (Math.acos(dot(n1, n2) / Math.sqrt(dot(n1, n1) * dot(n2, n2))) * 180) / Math.PI
  }

  it('uses the bond orders CCCBDB lists (O=O, N≡N, C=O, C≡C, C=C)', () => {
    const order = (m: string, a: string, b: string) => getMolecule(m).bonds.find((x) => x.atoms.includes(a) && x.atoms.includes(b))!.order
    expect(order('oxygen', 'O1', 'O2')).toBe(2)
    expect(order('nitrogen', 'N1', 'N2')).toBe(3)
    expect(order('formaldehyde', 'C1', 'O1')).toBe(2)
    expect(order('acetylene', 'C1', 'C2')).toBe(3)
    expect(order('ethene', 'C1', 'C2')).toBe(2)
    expect(order('hydrogen-peroxide', 'O1', 'O2')).toBe(1)
  })

  it('hydrogen peroxide is non-planar with the reported H–O–O–H dihedral; ethene and formaldehyde are planar', () => {
    const [h1, o1, o2, h2] = ['H1', 'O1', 'O2', 'H2'].map((id) => pos('hydrogen-peroxide', id))
    expect(Math.abs(dihedral(h1, o1, o2, h2) - 119.8)).toBeLessThan(0.1)
    for (const m of ['ethene', 'formaldehyde']) for (const a of getMolecule(m).atoms) expect(a.position[0]).toBe(0)
  })
})
