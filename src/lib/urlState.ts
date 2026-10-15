import type { Representation } from '../data/chemistry/types'

export const REPRESENTATIONS: readonly Representation[] = ['ball-and-stick', 'space-filling']

export interface ChemistryUrlState {
  moleculeId: string
  representation: Representation
}

/**
 * Reads `?molecule=<id>&view=<representation>`. Unknown or missing values fall back to
 * the defaults; `invalid` lists the parameters that were ignored.
 */
export function parseChemistryParams(
  search: string,
  validMoleculeIds: readonly string[],
  defaults: ChemistryUrlState,
): ChemistryUrlState & { invalid: string[] } {
  const params = new URLSearchParams(search)
  const invalid: string[] = []

  const molecule = params.get('molecule')
  const moleculeId = molecule && validMoleculeIds.includes(molecule) ? molecule : defaults.moleculeId
  if (molecule !== null && moleculeId !== molecule) invalid.push('molecule')

  const view = params.get('view')
  const representation = REPRESENTATIONS.find((r) => r === view) ?? defaults.representation
  if (view !== null && representation !== view) invalid.push('view')

  return { moleculeId, representation, invalid }
}

/** Returns `search` with the chemistry parameters set, keeping any unrelated parameters. */
export function withChemistryParams(search: string, state: ChemistryUrlState): string {
  const params = new URLSearchParams(search)
  params.set('molecule', state.moleculeId)
  params.set('view', state.representation)
  return `?${params.toString()}`
}
