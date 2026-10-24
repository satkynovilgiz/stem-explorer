import { describe, expect, it } from 'vitest'
import { BIOLOGY_SOURCES } from './organelles'
import { COMPARISON, countsOf, ILLUSTRATIVE_2N, meiosisStages, signature, type MeiosisOptions } from './meiosis'
import { ILLUSTRATIVE_CHROMOSOMES } from './mitosis'
import { alleles, fractionText, fractionValue, GENOTYPES, genotypeProbabilities, phenotypeProbabilities, punnett, simulateOffspring, type Genotype } from './inheritance'
import { isValidSeed, mulberry32 } from '../../lib/random'

const ALL: MeiosisOptions[] = [
  { crossover: true, orientation: 'same' },
  { crossover: true, orientation: 'swapped' },
  { crossover: false, orientation: 'same' },
  { crossover: false, orientation: 'swapped' },
]

/** Expected [chromosomes, chromatids, sets] per cell at each stage of a 2n = 4 meiosis. */
const EXPECTED: Record<string, [number, number, number][]> = {
  interphase: [[4, 8, 2]],
  'prophase-1': [[4, 8, 2]],
  'metaphase-1': [[4, 8, 2]],
  'anaphase-1': [[4, 8, 2]],
  'telophase-1': [
    [2, 4, 1],
    [2, 4, 1],
  ],
  'prophase-2': [
    [2, 4, 1],
    [2, 4, 1],
  ],
  'metaphase-2': [
    [2, 4, 1],
    [2, 4, 1],
  ],
  'anaphase-2': [
    [4, 4, 1],
    [4, 4, 1],
  ],
  'telophase-2': [
    [2, 2, 1],
    [2, 2, 1],
    [2, 2, 1],
    [2, 2, 1],
  ],
}

describe('meiosis model (2n = 4)', () => {
  it('uses the same illustrative cell as the mitosis module', () => {
    expect(ILLUSTRATIVE_2N).toBe(ILLUSTRATIVE_CHROMOSOMES)
  })

  it('has the defined chromosome, chromatid and set counts at every stage, whatever the options', () => {
    for (const o of ALL) {
      const stages = meiosisStages(o)
      expect(stages.map((s) => s.id)).toEqual(Object.keys(EXPECTED))
      for (const s of stages) {
        expect(countsOf(s).map((c) => [c.chromosomes, c.chromatids, c.sets]), `${s.id} ${JSON.stringify(o)}`).toEqual(EXPECTED[s.id])
      }
    }
  })

  it('the text states the computed counts', () => {
    const stages = meiosisStages(ALL[0])
    const text = (id: string) => stages.find((s) => s.id === id)!.summary
    expect(text('interphase')).toContain('4 chromosomes')
    expect(text('interphase')).toContain('2 identical sister chromatids')
    expect(text('telophase-1')).toContain('2 chromosomes, still of 2 sister chromatids each')
    expect(text('anaphase-2')).toContain('4 single-chromatid chromosomes in each cell, 2 going to each pole')
    expect(text('telophase-2')).toContain('Four haploid cells, each with 2 single-chromatid chromosomes')
    expect(text('metaphase-1')).toContain('2² = 4')
  })

  it('homologous chromosomes separate in anaphase I, sister chromatids in anaphase II', () => {
    const stages = meiosisStages(ALL[2])
    const t1 = stages.find((s) => s.id === 'telophase-1')!
    // Each meiosis I product has one chromosome of each pair.
    for (const c of t1.cells) expect(c.chromosomes.map((x) => x.pair).sort()).toEqual(['A', 'B'])
    const t2 = stages.find((s) => s.id === 'telophase-2')!
    for (const c of t2.cells) expect(c.chromosomes.every((x) => x.chromatids.length === 1)).toBe(true)
  })

  it('crossing over makes all four products distinct; without it they come in identical pairs', () => {
    const distinct = (o: MeiosisOptions) => new Set(meiosisStages(o).at(-1)!.cells.map(signature)).size
    expect(distinct(ALL[0])).toBe(4)
    expect(distinct(ALL[2])).toBe(2)
    // Only nonsister chromatids exchange: before crossing over every chromatid is from one parent.
    const pro = meiosisStages(ALL[0])[1].cells[0]
    const recombinant = pro.chromosomes.flatMap((c) => c.chromatids).filter((t) => new Set(t.segments.map((s) => s.origin)).size > 1)
    expect(recombinant).toHaveLength(2)
    for (const c of pro.chromosomes) expect(c.chromatids.filter((t) => t.segments.length > 1).length).toBeLessThanOrEqual(1)
  })

  it('independent assortment: the metaphase I orientation changes which chromosomes end up together', () => {
    const products = (o: MeiosisOptions) => meiosisStages(o).find((s) => s.id === 'telophase-1')!.cells.map((c) => c.chromosomes.map((x) => `${x.pair}${x.origin[0]}`).join(''))
    expect(products(ALL[2])).toEqual(['Am Bm', 'Ap Bp'].map((s) => s.replace(' ', '')))
    expect(products(ALL[3])).toEqual(['AmBp', 'ApBm'])
  })

  it('the comparison cites registered sources and states its context and limits', () => {
    for (const s of COMPARISON.sources) expect(BIOLOGY_SOURCES[s], s).toBeTruthy()
    expect(COMPARISON.context).toContain('2n = 4')
    expect(COMPARISON.rows.find((r) => r.aspect === 'Nuclear divisions')).toMatchObject({ mitosis: 'One', meiosis: 'Two (meiosis I and meiosis II)' })
  })
})

describe('one-gene Mendelian model', () => {
  it('Punnett squares and exact probabilities for every pair of parents sum to 1', () => {
    for (const a of GENOTYPES)
      for (const b of GENOTYPES) {
        const g = genotypeProbabilities(a, b)
        expect(fractionValue(g.YY) + fractionValue(g.Yy) + fractionValue(g.yy)).toBeCloseTo(1, 12)
        const p = phenotypeProbabilities(a, b)
        expect(fractionValue(p.dominant) + fractionValue(p.recessive)).toBeCloseTo(1, 12)
        expect(fractionValue(p.dominant)).toBeCloseTo(fractionValue(g.YY) + fractionValue(g.Yy), 12)
        expect(punnett(a, b).flat()).toHaveLength(4)
      }
  })

  it('reproduces the monohybrid results: Yy × Yy gives 1:2:1 and 3:1; a test cross gives 1:1', () => {
    const g = genotypeProbabilities('Yy', 'Yy')
    expect([g.YY, g.Yy, g.yy].map(fractionText)).toEqual(['1/4', '1/2', '1/4'])
    expect(fractionText(phenotypeProbabilities('Yy', 'Yy').dominant)).toBe('3/4')
    expect(fractionText(phenotypeProbabilities('Yy', 'yy').recessive)).toBe('1/2')
    expect(fractionText(phenotypeProbabilities('YY', 'yy').dominant)).toBe('1')
    expect(fractionText(genotypeProbabilities('yy', 'yy').YY)).toBe('0')
    expect(alleles('Yy')).toEqual(['Y', 'y'])
  })
})

describe('sampling simulation', () => {
  it('is repeatable for a seed, counts every offspring, and varies between seeds', () => {
    const a = simulateOffspring('Yy', 'Yy', 100, 42)
    expect(simulateOffspring('Yy', 'Yy', 100, 42)).toEqual(a)
    expect(a.YY + a.Yy + a.yy).toBe(100)
    const others = [1, 2, 3, 4, 5].map((s) => JSON.stringify(simulateOffspring('Yy', 'Yy', 100, s)))
    expect(new Set(others).size).toBeGreaterThan(1)
  })

  it('never produces impossible genotypes and approaches the expected proportions for large samples', () => {
    const tc = simulateOffspring('YY', 'yy', 500, 7)
    expect(tc).toEqual({ YY: 0, Yy: 500, yy: 0 })
    const big = simulateOffspring('Yy', 'Yy', 10000, 2026)
    expect(big.yy / 10000).toBeGreaterThan(0.22)
    expect(big.yy / 10000).toBeLessThan(0.28)
  })

  it('the generator is deterministic, in [0, 1), and seeds are validated', () => {
    const r = mulberry32(123)
    const xs = Array.from({ length: 1000 }, r)
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(Array.from({ length: 1000 }, mulberry32(123))).toEqual(xs)
    expect(isValidSeed(0)).toBe(true)
    expect(isValidSeed(4294967295)).toBe(true)
    for (const bad of [-1, 1.5, 4294967296, Number.NaN]) expect(isValidSeed(bad)).toBe(false)
  })

  it('handles zero offspring', () => {
    const z: Record<Genotype, number> = simulateOffspring('Yy', 'Yy', 0, 1)
    expect(z).toEqual({ YY: 0, Yy: 0, yy: 0 })
  })
})
