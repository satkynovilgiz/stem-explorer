import { fmt, isBlank, problem, read, solve, type Calculator } from './types'

const pct = (x: number) => `${fmt(x * 100, 3)}%`

export const hardyWeinberg: Calculator = {
  id: 'hardy-weinberg',
  keywords: ['hardy weinberg', 'allele frequency', 'genotype frequency', 'carrier', 'population genetics'],
  subject: 'biology',
  title: 'Hardy–Weinberg equilibrium',
  summary: 'Allele and genotype frequencies of a two-allele gene, from the share of individuals with the recessive trait.',
  formula: 'p + q = 1;  p² + 2pq + q² = 1',
  fields: [
    { kind: 'choice', id: 'known', label: 'You know', initial: 'q2', options: [{ value: 'q2', label: 'Recessive phenotype (q²)' }, { value: 'p', label: 'Dominant allele (p)' }] },
    { kind: 'number', id: 'q2', label: 'Share showing the recessive trait, q² (0 to 1)', initial: '0.16', showIf: (v) => v.known !== 'p' },
    { kind: 'number', id: 'p', label: 'Frequency of the dominant allele, p (0 to 1)', initial: '0.6', showIf: (v) => v.known === 'p' },
    { kind: 'number', id: 'N', label: 'Population size (optional, for expected counts)', initial: '500', optional: true },
  ],
  compute: (v) =>
    solve(() => {
      const steps: string[] = []
      let p: number, q: number
      if (v.known === 'p') {
        p = read(v, 'p', 'p', 'nonNegative')
        if (p > 1) problem('A frequency is between 0 and 1 (write 60% as 0.6).')
        q = 1 - p
        steps.push(`q = 1 − p = 1 − ${fmt(p)} = ${fmt(q)}`)
      } else {
        const q2 = read(v, 'q2', 'q²', 'nonNegative')
        if (q2 > 1) problem('A frequency is between 0 and 1 (write 16% as 0.16).')
        q = Math.sqrt(q2)
        p = 1 - q
        steps.push(`q = √q² = √${fmt(q2)} = ${fmt(q)}`, `p = 1 − q = ${fmt(p)}`)
      }
      steps.push(`p² = ${fmt(p * p)};  2pq = 2(${fmt(p)})(${fmt(q)}) = ${fmt(2 * p * q)};  q² = ${fmt(q * q)}`)
      const answers = [
        { label: 'Allele frequencies p, q', value: `${fmt(p)}, ${fmt(q)}` },
        { label: 'Homozygous dominant (p²)', value: pct(p * p) },
        { label: 'Heterozygous carriers (2pq)', value: pct(2 * p * q) },
        { label: 'Homozygous recessive (q²)', value: pct(q * q) },
      ]
      if (!isBlank(v, 'N')) {
        const N = read(v, 'N', 'the population size')
        if (!Number.isInteger(N)) problem('The population size is a whole number.')
        answers.push({ label: `Expected in ${N}`, value: `${Math.round(p * p * N)} AA, ${Math.round(2 * p * q * N)} Aa, ${Math.round(q * q * N)} aa` })
        steps.push(`Counts = frequency × ${N}, rounded to whole individuals`)
      }
      return { answers, steps }
    }),
  assumptions: 'A population at Hardy–Weinberg equilibrium: large, randomly mating, with no selection, mutation or migration. Real populations depart from it; the comparison shows where.',
  sourceIds: ['bio-19-1'],
  related: { label: 'Inheritance: Punnett squares', href: '?bsec=inheritance#/biology' },
}

export const michaelisMenten: Calculator = {
  id: 'michaelis-menten',
  keywords: ['michaelis menten', 'enzyme kinetics', 'Km', 'Vmax', 'reaction rate'],
  subject: 'biology',
  title: 'Enzyme rate (Michaelis–Menten)',
  summary: 'The initial reaction rate at a substrate concentration, and how close it is to the maximum rate.',
  formula: 'v₀ = Vmax [S] / (Km + [S])',
  fields: [
    { kind: 'number', id: 'vmax', label: 'Vmax', unit: 'µmol/min', initial: '50' },
    { kind: 'number', id: 'km', label: 'Km', unit: 'mM', initial: '2' },
    { kind: 'number', id: 's', label: 'Substrate concentration [S]', unit: 'mM', initial: '6' },
  ],
  compute: (v) =>
    solve(() => {
      const vmax = read(v, 'vmax', 'Vmax')
      const km = read(v, 'km', 'Km')
      const s = read(v, 's', 'the substrate concentration', 'nonNegative')
      const v0 = (vmax * s) / (km + s)
      return {
        answers: [
          { label: 'Initial rate v₀', value: `${fmt(v0)} µmol/min` },
          { label: 'Share of Vmax', value: pct(v0 / vmax) },
        ],
        steps: [`v₀ = ${fmt(vmax)} × ${fmt(s)} / (${fmt(km)} + ${fmt(s)}) = ${fmt(v0)} µmol/min`, `v₀ / Vmax = ${fmt(s)} / (${fmt(km)} + ${fmt(s)}) = ${pct(v0 / vmax)}`],
        note: s === km ? 'At [S] = Km the rate is exactly half of Vmax: that is what Km means.' : undefined,
      }
    }),
  assumptions: 'Initial rates, with substrate in large excess over enzyme and no inhibitor. Km and [S] must be in the same unit; v₀ comes out in the unit of Vmax.',
  sourceIds: ['mm-derivation', 'bio-6-5'],
  related: { label: 'Enzyme lab', href: '?bsec=enzymes#/biology' },
}

export const populationGrowth: Calculator = {
  id: 'population-growth',
  keywords: ['exponential growth', 'doubling time', 'population', 'bacteria growth', 'growth rate'],
  subject: 'biology',
  title: 'Exponential population growth',
  summary: 'Population size after a time at a constant per-capita growth rate, and the doubling time.',
  formula: 'dN/dt = rN  ⇒  N(t) = N₀ e^(rt);  doubling time = ln 2 / r',
  fields: [
    { kind: 'number', id: 'n0', label: 'Starting population N₀', initial: '1000' },
    { kind: 'number', id: 'r', label: 'Growth rate r (per unit time; negative if declining)', unit: 'per hour', initial: '0.3' },
    { kind: 'number', id: 't', label: 'Time t', unit: 'hours', initial: '10' },
  ],
  compute: (v) =>
    solve(() => {
      const n0 = read(v, 'n0', 'the starting population')
      const r = read(v, 'r', 'the growth rate', 'any')
      const t = read(v, 't', 'the time', 'nonNegative')
      const n = n0 * Math.exp(r * t)
      const answers = [{ label: 'Population N(t)', value: fmt(n) }]
      const steps = [`N = N₀ e^(rt) = ${fmt(n0)} × e^(${fmt(r)} × ${fmt(t)}) = ${fmt(n0)} × ${fmt(Math.exp(r * t))} = ${fmt(n)}`]
      if (r !== 0) {
        const d = Math.log(2) / Math.abs(r)
        answers.push({ label: r > 0 ? 'Doubling time' : 'Halving time', value: `${fmt(d)} hours` })
        steps.push(`${r > 0 ? 'Doubling' : 'Halving'} time = ln 2 / |r| = 0.6931 / ${fmt(Math.abs(r))} = ${fmt(d)} hours`)
      }
      return { answers, steps }
    }),
  assumptions: 'Unlimited resources, so r stays constant. Real populations slow as they approach the carrying capacity (logistic growth). r and t must use the same time unit.',
  sourceIds: ['bio-45-3', 'calc1-1-5'],
}

export const magnification: Calculator = {
  id: 'magnification',
  keywords: ['magnification', 'microscope', 'actual size', 'image size', 'scale'],
  subject: 'biology',
  title: 'Microscope magnification and real size',
  summary: 'The real size of a specimen from its image size and the magnification, or the magnification from both sizes.',
  formula: 'magnification = image size / actual size',
  fields: [
    { kind: 'choice', id: 'find', label: 'Find', initial: 'actual', options: [{ value: 'actual', label: 'Actual size' }, { value: 'mag', label: 'Magnification' }] },
    { kind: 'number', id: 'image', label: 'Image size (measured with a ruler)', unit: 'mm', initial: '30' },
    { kind: 'number', id: 'mag', label: 'Magnification', unit: '×', initial: '400', showIf: (v) => v.find !== 'mag' },
    { kind: 'number', id: 'actual', label: 'Actual size', unit: 'µm', initial: '75', showIf: (v) => v.find === 'mag' },
  ],
  compute: (v) =>
    solve(() => {
      const image = read(v, 'image', 'the image size')
      const imageUm = image * 1000
      if (v.find === 'mag') {
        const actual = read(v, 'actual', 'the actual size')
        const m = imageUm / actual
        return {
          answers: [{ label: 'Magnification', value: `×${fmt(m, 3)}` }],
          steps: [`Image size = ${fmt(image)} mm × 1000 = ${fmt(imageUm)} µm (use the same unit for both)`, `Magnification = ${fmt(imageUm)} µm / ${fmt(actual)} µm = ×${fmt(m, 3)}`],
        }
      }
      const m = read(v, 'mag', 'the magnification')
      const actual = imageUm / m
      return {
        answers: [
          { label: 'Actual size', value: `${fmt(actual, 3)} µm` },
          { label: 'In millimetres', value: `${fmt(actual / 1000, 3)} mm` },
        ],
        steps: [`Image size = ${fmt(image)} mm × 1000 = ${fmt(imageUm)} µm`, `Actual size = image size / magnification = ${fmt(imageUm)} µm / ${fmt(m)} = ${fmt(actual, 3)} µm`],
      }
    }),
  assumptions: 'Sizes are measured along the same line in the image and the specimen. 1 mm = 1000 µm. Magnification says nothing about resolution: detail smaller than about 0.2 µm cannot be resolved with a light microscope.',
  sourceIds: ['bio-4-1'],
  related: { label: 'Cell models', href: '?cell=cutaway#/biology' },
}

export const BIOLOGY_CALCULATORS: readonly Calculator[] = [magnification, hardyWeinberg, michaelisMenten, populationGrowth]
