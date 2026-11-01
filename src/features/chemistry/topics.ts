import type { ChemistrySection } from '../../lib/urlState'

/** Chemistry's topics in reading order (the same names as the breadcrumb), with one plain sentence each. */
export const CHEMISTRY_TOPICS: { id: ChemistrySection; label: string; blurb: string }[] = [
  { id: 'topics', label: 'Chemistry home', blurb: 'Search, topic groups and common questions' },
  { id: 'periodic', label: 'Periodic table', blurb: 'All 118 elements and their properties' },
  { id: 'atomic', label: 'Atomic structure', blurb: 'Protons, neutrons, electrons and isotopes' },
  { id: 'molecules', label: 'Molecules', blurb: 'Turn molecules in 3D and measure bonds and angles' },
  { id: 'bonding', label: 'Bonding and geometry', blurb: 'Why molecules have the shapes they do' },
  { id: 'reactions', label: 'Reactions and stoichiometry', blurb: 'Balance equations and work with moles' },
  { id: 'solutions', label: 'Solutions and dilution', blurb: 'Molarity and diluting a solution' },
]
