/*
 * A small schematic DNA segment and a transcription example (OpenStax Biology 2e §14.2, 15.1, 15.2).
 * - A pairs with T (two hydrogen bonds) and G with C (three); A and G are purines, C and T pyrimidines.
 * - The two strands are antiparallel: the 3′ end of one faces the 5′ end of the other.
 * - RNA is made 5′→3′, complementary to the template strand; it matches the coding (nontemplate)
 *   strand with U in place of T.
 */

export type DnaBase = 'A' | 'T' | 'G' | 'C'
export type RnaBase = 'A' | 'U' | 'G' | 'C'

export const BASE_NAMES: Record<DnaBase | 'U', string> = { A: 'adenine', T: 'thymine', G: 'guanine', C: 'cytosine', U: 'uracil' }
export const BASE_CLASS: Record<DnaBase, 'purine' | 'pyrimidine'> = { A: 'purine', G: 'purine', C: 'pyrimidine', T: 'pyrimidine' }

const COMPLEMENT: Record<DnaBase, DnaBase> = { A: 'T', T: 'A', G: 'C', C: 'G' }
const RNA_PAIR: Record<DnaBase, RnaBase> = { A: 'U', T: 'A', G: 'C', C: 'G' }

export const complement = (b: DnaBase): DnaBase => COMPLEMENT[b]
export const isComplementary = (a: DnaBase, b: DnaBase) => COMPLEMENT[a] === b
export const hydrogenBonds = (a: DnaBase, b: DnaBase): 2 | 3 | null => (!isComplementary(a, b) ? null : a === 'A' || a === 'T' ? 2 : 3)

/**
 * The example segment. `coding` is written 5′→3′, left to right; the template strand under it runs
 * 3′→5′ left to right (antiparallel). A schematic of 12 base pairs, not a real gene.
 */
export const CODING_5_TO_3: readonly DnaBase[] = ['A', 'T', 'G', 'G', 'C', 'A', 'T', 'T', 'C', 'G', 'A', 'C']
export const TEMPLATE_3_TO_5: readonly DnaBase[] = CODING_5_TO_3.map(complement)

/** Every pair in a double strand is complementary (strands given position by position). */
export function validateDuplex(top: readonly DnaBase[], bottom: readonly DnaBase[]): { valid: boolean; mismatches: number[] } {
  const mismatches = top.flatMap((b, i) => (bottom[i] && isComplementary(b, bottom[i]) ? [] : [i]))
  return { valid: top.length === bottom.length && mismatches.length === 0, mismatches }
}

/**
 * Transcribes a template strand given 3′→5′ (left to right). Each RNA nucleotide pairs with the
 * template base, so the RNA reads 5′→3′ left to right — the same direction as the coding strand.
 */
export function transcribe(template3to5: readonly DnaBase[]): RnaBase[] {
  return template3to5.map((b) => RNA_PAIR[b])
}

/** The coding strand with U for T: what the RNA should equal. */
export const codingAsRna = (coding5to3: readonly DnaBase[]): RnaBase[] => coding5to3.map((b) => (b === 'T' ? 'U' : b))
