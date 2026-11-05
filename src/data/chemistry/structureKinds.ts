/*
 * How the app names the origin of a chemical picture, everywhere it says so. Experimental: atom
 * positions compiled from measurements. Computed: a conformer calculated by software, not measured.
 * Schematic: a drawing that shows an idea, with no measured positions.
 */
export const STRUCTURE_KINDS = {
  experimental: {
    tag: 'Experimental structure (NIST CCCBDB)',
    heading: 'Experimental structures',
    description: 'Atom positions from experimental measurements compiled by NIST CCCBDB, with the reported bond lengths and angles.',
  },
  computed: {
    tag: 'Computed conformer (PubChem3D)',
    heading: 'Computed conformers',
    description: 'One computed 3D shape from PubChem (OpenEye OMEGA with the MMFF94s force field), not a measurement. Measure it with the Distance and Angle tools.',
  },
  illustrative: {
    tag: 'Schematic illustration',
    heading: 'Schematic illustrations',
    description: 'A drawing that shows an idea. It is not to scale and contains no measured atom positions.',
  },
} as const
