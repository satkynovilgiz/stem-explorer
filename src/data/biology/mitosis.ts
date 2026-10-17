/*
 * A user-controlled mitosis sequence (OpenStax Biology 2e §10.1, 10.2, 11.1). The illustration uses
 * a cell with 4 chromosomes (two homologous pairs) — an illustrative number chosen for clarity, not a
 * human cell (human somatic cells have 46).
 *
 * Terminology: after S phase each chromosome consists of two identical sister chromatids joined at
 * the centromere. In anaphase the sister chromatids separate, and each chromatid is then called a
 * chromosome.
 */

export const ILLUSTRATIVE_CHROMOSOMES = 4

export type StageKind = 'interphase' | 'mitosis' | 'cytokinesis'

export interface DivisionStage {
  id: string
  name: string
  kind: StageKind
  summary: string
  /** Chromosome count and structure at this stage, for the illustrative cell. */
  chromosomes: string
  deeper: string
  /** Drawing state for the schematic. */
  draw: {
    nuclearEnvelope: 'intact' | 'breaking' | 'absent' | 'reforming'
    chromatids: 1 | 2
    arrangement: 'loose' | 'condensed' | 'aligned' | 'separating' | 'poles'
    spindle: boolean
    cells: 1 | 2
  }
  sources: readonly string[]
}

export const DIVISION_STAGES: readonly DivisionStage[] = [
  {
    id: 'interphase',
    name: 'Interphase (before mitosis)',
    kind: 'interphase',
    summary: 'The cell grows and its DNA is replicated. Interphase is not part of mitosis: in G₁ the cell prepares, in S phase each chromosome is replicated, and in G₂ it prepares to divide.',
    chromosomes: 'Before S phase: 4 chromosomes, each one DNA molecule. After S phase: still 4 chromosomes, each now made of 2 identical sister chromatids (8 chromatids). Not yet condensed.',
    deeper: 'In the S phase, DNA replication forms identical pairs of DNA molecules — sister chromatids — firmly attached at the centromeric region.',
    draw: { nuclearEnvelope: 'intact', chromatids: 2, arrangement: 'loose', spindle: false, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'prophase',
    name: 'Prophase',
    kind: 'mitosis',
    summary: 'The first stage of mitosis. Chromosomes condense and become visible, the nuclear envelope starts to break down, and the mitotic spindle begins to form as the centrosomes move apart.',
    chromosomes: '4 chromosomes, each of 2 sister chromatids.',
    deeper: 'The nuclear envelope dissociates into small vesicles, and membranous organelles such as the Golgi apparatus and ER fragment and disperse.',
    draw: { nuclearEnvelope: 'breaking', chromatids: 2, arrangement: 'condensed', spindle: true, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'prometaphase',
    name: 'Prometaphase',
    kind: 'mitosis',
    summary: 'Chromosomes continue to condense. Kinetochores appear at the centromeres and spindle microtubules attach to them.',
    chromosomes: '4 chromosomes, each of 2 sister chromatids, now attached to spindle fibers.',
    deeper: 'The remnants of the nuclear envelope fragment further while the spindle stretches across the former nuclear area.',
    draw: { nuclearEnvelope: 'absent', chromatids: 2, arrangement: 'condensed', spindle: true, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'metaphase',
    name: 'Metaphase',
    kind: 'mitosis',
    summary: 'The spindle is fully developed. The chromosomes line up at the metaphase plate, with the sister chromatids of each facing opposite poles.',
    chromosomes: '4 chromosomes, each of 2 sister chromatids, aligned at the metaphase plate.',
    deeper: 'Apart from the metaphase-to-anaphase transition, the stages of mitosis are not discrete: they happen as a continuous process.',
    draw: { nuclearEnvelope: 'absent', chromatids: 2, arrangement: 'aligned', spindle: true, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'anaphase',
    name: 'Anaphase',
    kind: 'mitosis',
    summary: 'The sister chromatids separate at the centromere and are pulled to opposite poles. Each chromatid is now called a chromosome.',
    chromosomes: '8 chromosomes in total, each a single chromatid: 4 moving to each pole.',
    deeper: 'The cohesin proteins holding the sister chromatids together break down, and the microtubules pull the chromosomes toward the centrosomes.',
    draw: { nuclearEnvelope: 'absent', chromatids: 1, arrangement: 'separating', spindle: true, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'telophase',
    name: 'Telophase',
    kind: 'mitosis',
    summary: 'The chromosomes reach the poles and begin to decondense. A nuclear envelope reassembles around each set. Mitosis — the division of the nucleus — ends here.',
    chromosomes: 'Two nuclei, each with 4 chromosomes (single chromatids).',
    deeper: 'The chromosomes relax back into a stretched-out chromatin configuration.',
    draw: { nuclearEnvelope: 'reforming', chromatids: 1, arrangement: 'poles', spindle: false, cells: 1 },
    sources: ['bio-10-2'],
  },
  {
    id: 'cytokinesis',
    name: 'Cytokinesis (after mitosis)',
    kind: 'cytokinesis',
    summary: 'A separate process that divides the cytoplasm, usually after mitosis, giving two genetically identical daughter cells. In animal cells a cleavage furrow pinches the cell in two; in plant cells a cell plate forms a new wall.',
    chromosomes: 'Two daughter cells, each with 4 chromosomes — the same number as the starting cell.',
    deeper: 'Mitosis can occur without cytokinesis, producing cells with several nuclei.',
    draw: { nuclearEnvelope: 'intact', chromatids: 1, arrangement: 'loose', spindle: false, cells: 2 },
    sources: ['bio-10-2'],
  },
]

export const NOT_GAMETES =
  'Mitosis produces two nuclei with the same chromosomes as the original: it does not make gametes. Gametes (eggs and sperm) are haploid and are made by meiosis, a different nuclear division that halves the chromosome number.'
