import { describe, expect, it } from 'vitest'
import { findDataset, SAMPLE_DATASETS } from '../data/mathematics/datasets'
import { SOURCES } from '../data/sources'
import { binomialMoments, binomialPmf, histogram, MAX_TRIALS, parseValues, quartiles, simulateBinomial, suggestedBins, summarize } from './statistics'

describe('parsing values', () => {
  it('accepts commas, semicolons, spaces and new lines, negatives, decimals and exponents', () => {
    expect(parseValues('1, 2;3 4\n-5.5\t+6 1e2 −7').values).toEqual([1, 2, 3, 4, -5.5, 6, 100, -7])
  })
  it('reports invalid and too-large tokens with their positions, and caps the count', () => {
    const r = parseValues('1 abc 2 3,5 1e12 NaN')
    expect(r.values).toEqual([1, 2, 3, 5])
    expect(r.invalid).toEqual([
      { token: 'abc', position: 2 },
      { token: 'NaN', position: 7 },
    ])
    expect(r.tooLarge).toEqual([{ token: '1e12', position: 6 }])
    const many = parseValues(Array.from({ length: 1005 }, (_, i) => i).join(' '))
    expect(many.values).toHaveLength(1000)
    expect(many.truncated).toBe(true)
  })
  it('handles empty input', () => {
    expect(parseValues('   ').values).toEqual([])
    expect(summarize([])).toBeNull()
  })
})

describe('descriptive statistics', () => {
  it('reproduces the textbook quartiles (median of halves)', () => {
    const heights = summarize(findDataset('heights')!.values)!
    expect([heights.q1, heights.median, heights.q3]).toEqual([64.5, 66, 70])
    expect(heights.range).toBe(18)
    expect(heights.iqr).toBe(5.5)
    const loc = summarize(findDataset('location-example')!.values)!
    expect([loc.q1, loc.median, loc.q3]).toEqual([2, 7, 9])
  })

  it('leaves the median out of both halves for an odd count, and handles one and two values', () => {
    expect(quartiles([1, 2, 3, 4, 5])).toEqual({ q1: 1.5, q2: 3, q3: 4.5 })
    expect(quartiles([7])).toEqual({ q1: 7, q2: 7, q3: 7 })
    expect(quartiles([2, 8])).toEqual({ q1: 2, q2: 5, q3: 8 })
  })

  it('distinguishes population and sample variance and standard deviation', () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])!
    expect(s.mean).toBe(5)
    expect(s.populationVariance).toBe(4)
    expect(s.populationSd).toBe(2)
    expect(s.sampleVariance).toBeCloseTo(32 / 7, 12)
    expect(s.sampleSd).toBeCloseTo(Math.sqrt(32 / 7), 12)
  })

  it('a single value has zero spread and no sample variance; repeated values have zero variance', () => {
    expect(summarize([3.5])).toMatchObject({ n: 1, mean: 3.5, median: 3.5, range: 0, populationVariance: 0, sampleVariance: null, sampleSd: null })
    expect(summarize([4, 4, 4, 4])).toMatchObject({ populationVariance: 0, sampleVariance: 0, iqr: 0, potentialOutliers: [] })
  })

  it('works with negative values and flags potential outliers by the 1.5 × IQR rule', () => {
    const neg = summarize(findDataset('synthetic-negative')!.values)!
    expect(neg.min).toBe(-4)
    expect(neg.mean).toBeCloseTo(15 / 11, 12)
    expect(summarize(findDataset('synthetic-outlier')!.values)!.potentialOutliers).toEqual([45])
  })

  it('stays accurate with large offsets (two-pass variance)', () => {
    const base = 1e8
    const s = summarize([base + 1, base + 2, base + 3, base + 4])!
    expect(s.populationVariance).toBeCloseTo(1.25, 9)
    expect(s.mean).toBe(base + 2.5)
  })
})

describe('histograms', () => {
  it('uses equal-width bins from min to max, with the maximum in the last bin', () => {
    const h = histogram([0, 1, 2, 3, 4, 5, 6, 7, 8, 10], 5)!
    expect(h.width).toBe(2)
    expect(h.counts).toEqual([2, 2, 2, 2, 2])
    expect(h.counts.reduce((a, b) => a + b, 0)).toBe(10)
    expect(h.edges).toEqual([0, 2, 4, 6, 8, 10])
  })
  it('different bin counts change the picture but never the total', () => {
    const v = findDataset('heights')!.values
    for (const b of [1, 3, 8, 30]) expect(histogram(v, b)!.counts.reduce((a, c) => a + c, 0)).toBe(v.length)
    expect(histogram(v, 3)!.counts).not.toEqual(histogram(v, 4)!.counts.slice(0, 3))
  })
  it('handles identical values, invalid bin counts and empty data', () => {
    expect(histogram([5, 5, 5], 8)).toMatchObject({ counts: [3], start: 4.5, width: 1 })
    expect(histogram([1, 2], 0)).toBeNull()
    expect(histogram([1, 2], 31)).toBeNull()
    expect(histogram([], 5)).toBeNull()
    expect(suggestedBins(40)).toBe(6)
    expect(suggestedBins(4)).toBe(5)
    expect(suggestedBins(10000)).toBe(15)
  })
})

describe('binomial distribution', () => {
  it('matches hand values and sums to 1', () => {
    const pmf = binomialPmf(4, 0.5)!
    expect(pmf.map((x) => x * 16)).toEqual([1, 4, 6, 4, 1].map((x) => expect.closeTo(x, 10)))
    for (const [n, p] of [
      [1, 0.3],
      [10, 0.25],
      [100, 0.01],
      [MAX_TRIALS, 0.5],
      [MAX_TRIALS, 0.999],
    ])
      expect(binomialPmf(n, p)!.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
  })

  it('handles p = 0 and p = 1 exactly, and stays finite at the supported bounds', () => {
    expect(binomialPmf(5, 0)).toEqual([1, 0, 0, 0, 0, 0])
    expect(binomialPmf(5, 1)).toEqual([0, 0, 0, 0, 0, 1])
    const big = binomialPmf(MAX_TRIALS, 0.5)!
    expect(big.every((x) => Number.isFinite(x) && x >= 0)).toBe(true)
    expect(big[250]).toBeCloseTo(0.0356, 3)
    expect(binomialPmf(0, 0.5)).toBeNull()
    expect(binomialPmf(MAX_TRIALS + 1, 0.5)).toBeNull()
    expect(binomialPmf(10, 1.2)).toBeNull()
  })

  it('has mean np and variance npq (a Bernoulli trial is n = 1)', () => {
    expect(binomialMoments(20, 0.25)).toEqual({ mean: 5, variance: 3.75, sd: Math.sqrt(3.75) })
    const pmf = binomialPmf(20, 0.25)!
    const mean = pmf.reduce((a, p, k) => a + k * p, 0)
    expect(mean).toBeCloseTo(5, 10)
    expect(pmf.reduce((a, p, k) => a + (k - mean) ** 2 * p, 0)).toBeCloseTo(3.75, 10)
    expect(binomialPmf(1, 0.3)).toEqual([expect.closeTo(0.7, 12), expect.closeTo(0.3, 12)])
  })

  it('the simulation repeats for a seed, counts every repetition, respects p = 0 and p = 1, and is independent of the exact values', () => {
    const a = simulateBinomial(10, 0.25, 1000, 99)!
    expect(simulateBinomial(10, 0.25, 1000, 99)).toEqual(a)
    expect(a.reduce((x, y) => x + y, 0)).toBe(1000)
    expect(simulateBinomial(10, 0.25, 1000, 100)).not.toEqual(a)
    expect(simulateBinomial(6, 0, 50, 1)).toEqual([50, 0, 0, 0, 0, 0, 0])
    expect(simulateBinomial(6, 1, 50, 1)).toEqual([0, 0, 0, 0, 0, 0, 50])
    // Large runs come close to the exact probabilities.
    const big = simulateBinomial(10, 0.25, 10000, 2026)!
    const pmf = binomialPmf(10, 0.25)!
    for (let k = 0; k <= 10; k++) expect(Math.abs(big[k] / 10000 - pmf[k])).toBeLessThan(0.02)
    expect(simulateBinomial(10, 0.25, 0, 1)).toBeNull()
  })
})

describe('sample datasets', () => {
  it('state their provenance; cited ones name registered sources; synthetic ones say so', () => {
    for (const d of SAMPLE_DATASETS) {
      expect(d.provenance.length).toBeGreaterThan(20)
      if (d.synthetic) expect(d.provenance).toMatch(/Synthetic/)
      else expect(SOURCES[d.source!], d.id).toBeTruthy()
    }
  })
})
