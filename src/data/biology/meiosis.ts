/*
 * Meiosis in an illustrative animal cell with 2n = 4 (two homologous pairs), the same example
 * OpenStax Biology 2e uses (§11.1, Figure 11.7) and the same cell as this app's mitosis module.
 * Chromosomes are data, not pictures: every stage is built from them, so the counts in the text
 * are computed and tested against the drawing. Diagrams are conceptual: stage boundaries are not
 * sharp, and no timing or scale is implied.
 */

export type Origin = 'maternal' | 'paternal'
export type PairId = 'A' | 'B'

/** A piece of a chromatid inherited from one parent; `from`/`to` are fractions of its length. */
export interface Segment {
  origin: Origin
  from: number
  to: number
}

export interface Chromatid {
  segments: readonly Segment[]
}

export interface Chromosome {
  /** Stable label, e.g. "A-maternal"; after anaphase II a suffix marks each former sister. */
  id: string
  pair: PairId
  /** The parent this chromosome (its centromere) came from. */
  origin: Origin
  /** 2 sister chromatids joined at the centromere, or 1 after they separate. */
  chromatids: readonly Chromatid[]
}

export type Arrangement = 'loose' | 'paired' | 'pairs-at-plate' | 'homologs-separating' | 'at-poles' | 'condensed' | 'at-plate' | 'sisters-separating'

export interface CellState {
  chromosomes: readonly Chromosome[]
  arrangement: Arrangement
}

export interface MeiosisOptions {
  /** One crossover between nonsister chromatids of pair A in prophase I. */
  crossover: boolean
  /** Metaphase I orientation of pair B relative to pair A (independent assortment). */
  orientation: 'same' | 'swapped'
}

export interface MeiosisStage {
  id: string
  name: string
  division: 'before' | 'I' | 'II'
  summary: string
  cells: readonly CellState[]
  sources: readonly string[]
}

export const ILLUSTRATIVE_2N = 4
export const CROSSOVER_POINT = 0.55

const whole = (origin: Origin): Chromatid => ({ segments: [{ origin, from: 0, to: 1 }] })
const replicated = (pair: PairId, origin: Origin): Chromosome => ({ id: `${pair}-${origin}`, pair, origin, chromatids: [whole(origin), whole(origin)] })

/** Swaps the distal part (beyond CROSSOVER_POINT) of two nonsister chromatids. */
function crossOver(m: Chromosome, p: Chromosome): [Chromosome, Chromosome] {
  const recombinant = (base: Origin, other: Origin): Chromatid => ({
    segments: [
      { origin: base, from: 0, to: CROSSOVER_POINT },
      { origin: other, from: CROSSOVER_POINT, to: 1 },
    ],
  })
  return [
    { ...m, chromatids: [m.chromatids[0], recombinant('maternal', 'paternal')] },
    { ...p, chromatids: [recombinant('paternal', 'maternal'), p.chromatids[1]] },
  ]
}

const cell = (chromosomes: readonly Chromosome[], arrangement: Arrangement): CellState => ({ chromosomes, arrangement })

/** Sister chromatids separate: each becomes a chromosome of its own (suffixes 1 and 2). */
const splitSisters = (chromosomes: readonly Chromosome[]): Chromosome[] =>
  chromosomes.flatMap((c) => c.chromatids.map((t, i) => ({ ...c, id: `${c.id}.${i + 1}`, chromatids: [t] })))

export function meiosisStages(options: MeiosisOptions): MeiosisStage[] {
  const am = replicated('A', 'maternal')
  const ap = replicated('A', 'paternal')
  const bm = replicated('B', 'maternal')
  const bp = replicated('B', 'paternal')
  const [am2, ap2] = options.crossover ? crossOver(am, ap) : [am, ap]
  const before = [am, ap, bm, bp]
  const paired = [am2, ap2, bm, bp]
  // Metaphase I: pair A's maternal homolog faces pole 1; pair B faces the same way or the other.
  const pole1 = [am2, options.orientation === 'same' ? bm : bp]
  const pole2 = [ap2, options.orientation === 'same' ? bp : bm]
  const cross = options.crossover
  return [
    {
      id: 'interphase',
      name: 'Interphase (before meiosis)',
      division: 'before',
      summary:
        'DNA is replicated once, in S phase, before meiosis begins. Each of the 4 chromosomes now has 2 identical sister chromatids joined at the centromere. The cell is diploid: two sets, one inherited from each parent.',
      cells: [cell(before, 'loose')],
      sources: ['bio-11-1'],
    },
    {
      id: 'prophase-1',
      name: 'Prophase I',
      division: 'I',
      summary: cross
        ? 'Homologous chromosomes pair up (synapsis), forming tetrads of four chromatids. Here one crossover exchanges matching segments between nonsister chromatids of pair A, so two chromatids now carry DNA from both parents.'
        : 'Homologous chromosomes pair up (synapsis), forming tetrads of four chromatids. Crossing over is switched off in this view, so no segments are exchanged.',
      cells: [cell(paired, 'paired')],
      sources: ['bio-11-1'],
    },
    {
      id: 'metaphase-1',
      name: 'Metaphase I',
      division: 'I',
      summary:
        'The homologous pairs line up at the metaphase plate as pairs. Which homolog faces which pole is random and independent for each pair (independent assortment): with n = 2 there are 2² = 4 possible combinations in the gametes.',
      cells: [cell([...pole1, ...pole2], 'pairs-at-plate')],
      sources: ['bio-11-1'],
    },
    {
      id: 'anaphase-1',
      name: 'Anaphase I',
      division: 'I',
      summary: 'The homologous chromosomes of each pair are pulled to opposite poles. The sister chromatids stay together at the centromere.',
      cells: [cell([...pole1, ...pole2], 'homologs-separating')],
      sources: ['bio-11-1'],
    },
    {
      id: 'telophase-1',
      name: 'Telophase I and cytokinesis',
      division: 'I',
      summary:
        'Two cells form, each with one chromosome from each pair: 2 chromosomes, still of 2 sister chromatids each. Each cell has one chromosome set (haploid), although every chromosome is still duplicated.',
      cells: [cell(pole1, 'at-poles'), cell(pole2, 'at-poles')],
      sources: ['bio-11-1'],
    },
    {
      id: 'prophase-2',
      name: 'Prophase II',
      division: 'II',
      summary: 'There is no DNA replication between the divisions. In each of the two cells the chromosomes condense again and a new spindle forms.',
      cells: [cell(pole1, 'condensed'), cell(pole2, 'condensed')],
      sources: ['bio-11-1'],
    },
    {
      id: 'metaphase-2',
      name: 'Metaphase II',
      division: 'II',
      summary: 'In each cell the chromosomes line up singly at the plate, with their sister chromatids facing opposite poles, much as in mitosis.',
      cells: [cell(pole1, 'at-plate'), cell(pole2, 'at-plate')],
      sources: ['bio-11-1'],
    },
    {
      id: 'anaphase-2',
      name: 'Anaphase II',
      division: 'II',
      summary: 'The sister chromatids separate and move to opposite poles. Each chromatid is now called a chromosome: 4 single-chromatid chromosomes in each cell, 2 going to each pole.',
      cells: [cell(splitSisters(pole1), 'sisters-separating'), cell(splitSisters(pole2), 'sisters-separating')],
      sources: ['bio-11-1'],
    },
    {
      id: 'telophase-2',
      name: 'Telophase II and cytokinesis',
      division: 'II',
      summary: cross
        ? 'Four haploid cells, each with 2 single-chromatid chromosomes, one from each pair. Because of crossing over and independent assortment, all four are genetically different.'
        : 'Four haploid cells, each with 2 single-chromatid chromosomes, one from each pair. Without crossing over, each pair of cells from the same meiosis I cell is identical here.',
      cells: [
        ...[pole1, pole2].flatMap((p) => {
          const singles = splitSisters(p)
          return [cell(singles.filter((c) => c.id.endsWith('.1')), 'loose'), cell(singles.filter((c) => c.id.endsWith('.2')), 'loose')]
        }),
      ],
      sources: ['bio-11-1'],
    },
  ]
}

/** Counts computed from the drawing data, used in the text and checked by tests. */
export function countsOf(stage: MeiosisStage) {
  return stage.cells.map((c) => {
    const perPair = (p: PairId) => c.chromosomes.filter((x) => x.pair === p).length
    // Sets: copies of each pair in the cell, counted once per centromere before sisters separate.
    const sets = stage.id === 'anaphase-2' ? perPair('A') / 2 : perPair('A')
    return {
      chromosomes: c.chromosomes.length,
      chromatids: c.chromosomes.reduce((n, x) => n + x.chromatids.length, 0),
      sets,
      ploidy: sets === 2 ? 'diploid (2n)' : 'haploid (n)',
    }
  })
}

/** A cell's genetic make-up as text, for comparing products (identical cells give the same string). */
export const signature = (c: CellState) =>
  c.chromosomes
    .map((x) => `${x.pair}:${x.chromatids.map((t) => t.segments.map((s) => `${s.origin[0]}${s.from}-${s.to}`).join('+')).join('|')}`)
    .sort()
    .join(' ')

export const COMPARISON = {
  context:
    'Same illustrative animal cell for both: 2n = 4 (two homologous pairs). Human body cells have 46 chromosomes (23 pairs); the counts here are chosen for clarity, and only what changes with the division is shown.',
  rows: [
    { aspect: 'DNA replication before division', mitosis: 'Once, in S phase', meiosis: 'Once, in S phase (none between meiosis I and II)' },
    { aspect: 'Nuclear divisions', mitosis: 'One', meiosis: 'Two (meiosis I and meiosis II)' },
    { aspect: 'Homologous chromosomes', mitosis: 'Do not pair; line up individually', meiosis: 'Pair in prophase I (synapsis); cross over; separate in anaphase I' },
    { aspect: 'Chromosome sets', mitosis: 'Stay the same: 2n → 2n (4 → 4 here)', meiosis: 'Halved: 2n → n (4 → 2 here)' },
    { aspect: 'Products', mitosis: '2 cells, genetically identical to the parent cell', meiosis: '4 haploid cells, genetically distinct' },
    { aspect: 'Role in animals', mitosis: 'Growth, repair and replacing cells; making the body from the zygote', meiosis: 'Making gametes (eggs and sperm) for sexual reproduction' },
  ],
  limitation:
    'Roles differ between life cycles: animals make gametes by meiosis, while many fungi and algae make haploid spores by meiosis, and plants alternate diploid and haploid generations (§11.2).',
  sources: ['bio-11-1', 'bio-11-2', 'bio-10-2'],
} as const

export const MEIOSIS_SCALE_NOTE =
  'Conceptual diagram: chromosome sizes, positions and shapes are schematic, the stages run into each other rather than switching, and no timing is shown.'
