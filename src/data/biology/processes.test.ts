import { describe, expect, it } from 'vitest'
import { BIOLOGY_SOURCES, findOrganelle, hasStructure } from './organelles'
import { BASE_CLASS, CODING_5_TO_3, codingAsRna, complement, hydrogenBonds, isComplementary, TEMPLATE_3_TO_5, transcribe, validateDuplex } from './dna'
import { DIVISION_STAGES, ILLUSTRATIVE_CHROMOSOMES, NOT_GAMETES } from './mitosis'
import { ENERGY_PROCESSES } from './energy'

describe('DNA pairing and transcription', () => {
  it('pairs A–T (2 hydrogen bonds) and G–C (3), purine with pyrimidine', () => {
    expect([complement('A'), complement('T'), complement('G'), complement('C')]).toEqual(['T', 'A', 'C', 'G'])
    expect(hydrogenBonds('A', 'T')).toBe(2)
    expect(hydrogenBonds('C', 'G')).toBe(3)
    expect(hydrogenBonds('A', 'G')).toBeNull()
    for (const b of CODING_5_TO_3) expect(BASE_CLASS[b]).not.toBe(BASE_CLASS[complement(b)])
  })

  it('the example duplex is fully complementary, and a mismatch is reported', () => {
    expect(validateDuplex(CODING_5_TO_3, TEMPLATE_3_TO_5)).toEqual({ valid: true, mismatches: [] })
    const broken = [...TEMPLATE_3_TO_5]
    broken[3] = broken[3] === 'A' ? 'G' : 'A'
    expect(validateDuplex(CODING_5_TO_3, broken)).toMatchObject({ valid: false, mismatches: [3] })
    expect(isComplementary('G', 'T')).toBe(false)
  })

  it('RNA made from the template equals the coding strand with U for T, and contains no T', () => {
    const rna = transcribe(TEMPLATE_3_TO_5)
    expect(rna).toEqual(codingAsRna(CODING_5_TO_3))
    expect(rna).not.toContain('T')
    expect(rna.join('')).toBe('AUGGCAUUCGAC')
  })
})

describe('mitosis sequence', () => {
  it('keeps interphase and cytokinesis separate from the five stages of mitosis', () => {
    expect(DIVISION_STAGES.filter((s) => s.kind === 'mitosis').map((s) => s.id)).toEqual(['prophase', 'prometaphase', 'metaphase', 'anaphase', 'telophase'])
    expect(DIVISION_STAGES[0].kind).toBe('interphase')
    expect(DIVISION_STAGES.at(-1)!.kind).toBe('cytokinesis')
  })

  it('uses consistent chromosome and chromatid terms for the illustrative 4-chromosome cell', () => {
    expect(ILLUSTRATIVE_CHROMOSOMES).toBe(4)
    for (const s of DIVISION_STAGES.slice(1, 4)) expect(s.chromosomes).toMatch(/4 chromosomes, each of 2 sister chromatids/)
    expect(DIVISION_STAGES.find((s) => s.id === 'anaphase')!.chromosomes).toMatch(/8 chromosomes.*single chromatid/)
    expect(DIVISION_STAGES.find((s) => s.id === 'cytokinesis')!.chromosomes).toMatch(/each with 4 chromosomes/)
    // Chromatid counts in the drawing match the text: 2 before anaphase, 1 from anaphase on.
    const idx = DIVISION_STAGES.findIndex((s) => s.id === 'anaphase')
    DIVISION_STAGES.forEach((s, i) => expect(s.draw.chromatids, s.id).toBe(i < idx ? 2 : 1))
  })

  it('says mitosis does not make gametes', () => {
    expect(NOT_GAMETES).toMatch(/does not make gametes/)
    expect(NOT_GAMETES).toMatch(/meiosis/)
  })
})

describe('energy processes', () => {
  it('cite known sources and link to structures the models contain', () => {
    for (const p of ENERGY_PROCESSES) {
      for (const id of p.netEquation.sources) expect(BIOLOGY_SOURCES[id], id).toBeDefined()
      for (const s of p.stages) {
        for (const id of s.sources) expect(BIOLOGY_SOURCES[id], `${s.id}: ${id}`).toBeDefined()
        if (s.link) expect(hasStructure(s.link.cellType, s.link.organelle) && findOrganelle(s.link.organelle)).toBeTruthy()
      }
    }
  })

  it('the net equations balance atoms and are reverses of each other', () => {
    const count = (side: string) => {
      const totals: Record<string, number> = {}
      const sub = (t: string) => t.replace(/[₀-₉]/g, (d) => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)))
      for (const term of sub(side).split('+').map((x) => x.trim())) {
        const m = term.match(/^(\d*)(.*)$/)!
        const k = m[1] ? Number(m[1]) : 1
        for (const [, el, n] of m[2].matchAll(/([A-Z][a-z]?)(\d*)/g)) totals[el] = (totals[el] ?? 0) + k * (n ? Number(n) : 1)
      }
      return totals
    }
    for (const p of ENERGY_PROCESSES) expect(count(p.netEquation.reactants)).toEqual(count(p.netEquation.products))
    const [ps, cr] = ENERGY_PROCESSES
    expect(count(ps.netEquation.products)).toEqual(count(cr.netEquation.reactants))
  })
})
