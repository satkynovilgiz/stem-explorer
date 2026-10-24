import { mulberry32 } from '../../lib/random'

/*
 * One-gene Mendelian inheritance with complete dominance, using Mendel's pea seed colour: the Y
 * allele (yellow) is dominant over y (green) (OpenStax Biology 2e §12.2). The model and its
 * assumptions are stated in ASSUMPTIONS; probabilities are exact fractions, kept separate from
 * the sampling simulation.
 */

export type Allele = 'Y' | 'y'
export type Genotype = 'YY' | 'Yy' | 'yy'
export const GENOTYPES: readonly Genotype[] = ['YY', 'Yy', 'yy']

export const TRAIT = {
  organism: 'Garden pea (Pisum sativum)',
  character: 'seed colour',
  dominant: { allele: 'Y' as const, phenotype: 'Yellow seeds' },
  recessive: { allele: 'y' as const, phenotype: 'Green seeds' },
}

export const ASSUMPTIONS = [
  'One gene controls the trait, with two alleles (Y and y).',
  'Complete dominance: one Y allele is enough for yellow seeds, so YY and Yy look the same.',
  'Each parent is diploid and passes on one of its two alleles, each with probability ½.',
  'Gametes combine at random, independently of which allele they carry.',
  'Every offspring genotype is equally likely to survive and be counted.',
] as const

export const LIMITS =
  'Many traits do not follow this model. OpenStax describes incomplete dominance, codominance, multiple alleles, recessive lethal alleles and sex-linked traits, and characteristics such as human height that vary continuously because many genes act on them.'

/** Alleles a parent can pass on, each with its probability. */
export function gametes(g: Genotype): { allele: Allele; p: number }[] {
  if (g === 'YY') return [{ allele: 'Y', p: 1 }]
  if (g === 'yy') return [{ allele: 'y', p: 1 }]
  return [
    { allele: 'Y', p: 0.5 },
    { allele: 'y', p: 0.5 },
  ]
}

/** The two alleles each parent carries, as Punnett-square row/column headings (each ½). */
export const alleles = (g: Genotype): [Allele, Allele] => [g[0] as Allele, g[1] as Allele]

export const combine = (a: Allele, b: Allele): Genotype => (a === 'Y' && b === 'Y' ? 'YY' : a === 'y' && b === 'y' ? 'yy' : 'Yy')

export const phenotypeOf = (g: Genotype) => (g === 'yy' ? TRAIT.recessive.phenotype : TRAIT.dominant.phenotype)

/** An exact fraction num/den in lowest terms. */
export interface Fraction {
  num: number
  den: number
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const frac = (num: number, den: number): Fraction => {
  const g = gcd(num, den) || 1
  return { num: num / g, den: den / g }
}
export const fractionText = (f: Fraction) => (f.num === 0 ? '0' : f.den === 1 ? String(f.num) : `${f.num}/${f.den}`)
export const fractionValue = (f: Fraction) => f.num / f.den

/** The 2 × 2 Punnett square: each cell has probability ¼ (cells may repeat a genotype). */
export function punnett(p1: Genotype, p2: Genotype): Genotype[][] {
  return alleles(p1).map((a) => alleles(p2).map((b) => combine(a, b)))
}

/** Exact genotype probabilities, counted from the four equally likely Punnett-square cells. */
export function genotypeProbabilities(p1: Genotype, p2: Genotype): Record<Genotype, Fraction> {
  const counts: Record<Genotype, number> = { YY: 0, Yy: 0, yy: 0 }
  for (const row of punnett(p1, p2)) for (const g of row) counts[g]++
  return { YY: frac(counts.YY, 4), Yy: frac(counts.Yy, 4), yy: frac(counts.yy, 4) }
}

/** Exact phenotype probabilities: dominant = P(YY) + P(Yy) (sum rule), recessive = P(yy). */
export function phenotypeProbabilities(p1: Genotype, p2: Genotype): { dominant: Fraction; recessive: Fraction } {
  const g = genotypeProbabilities(p1, p2)
  const quarters = (f: Fraction) => (f.num * 4) / f.den
  return { dominant: frac(quarters(g.YY) + quarters(g.Yy), 4), recessive: frac(quarters(g.yy), 4) }
}

export const SAMPLE_SIZES = [4, 20, 100, 1000] as const
export const MAX_SAMPLE = 10000

/**
 * Simulates `n` offspring: each parent passes on one of its two alleles with probability ½,
 * drawn from the seeded generator, so the same seed and inputs repeat exactly.
 */
export function simulateOffspring(p1: Genotype, p2: Genotype, n: number, seed: number): Record<Genotype, number> {
  const rand = mulberry32(seed)
  const counts: Record<Genotype, number> = { YY: 0, Yy: 0, yy: 0 }
  const [a1, a2] = alleles(p1)
  const [b1, b2] = alleles(p2)
  for (let i = 0; i < n; i++) counts[combine(rand() < 0.5 ? a1 : a2, rand() < 0.5 ? b1 : b2)]++
  return counts
}

export const INHERITANCE_SOURCES = ['bio-12-1', 'bio-12-2'] as const
