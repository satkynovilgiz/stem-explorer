/*
 * Where everything in Chemistry lives: four destinations, each with the existing pages under it.
 * Every module in data/topics.ts belongs to one (a unit test checks), so nothing becomes
 * unreachable, and the links are the existing addresses, so older links keep working.
 */
export type ChemDestinationId = 'concepts' | 'calculate' | 'explore' | 'periodic'

export interface ChemDestination {
  id: ChemDestinationId
  title: string
  text: string
  href: string
  /** Modules (data/topics.ts) shown as being inside this destination. */
  modules: readonly string[]
  /** Pages to list under it when browsing. */
  pages: readonly { label: string; href: string }[]
}

export const CHEM_OVERVIEW_HREF = '?csec=topics#/chemistry'

export const CHEM_DESTINATIONS: readonly ChemDestination[] = [
  {
    id: 'concepts',
    title: 'Understand concepts',
    text: 'Read simple explanations with worked examples.',
    href: '?csec=contents#/chemistry',
    modules: ['chemistry.contents', 'chemistry.learn'],
    pages: [
      { label: 'What is a mole?', href: '?csec=learn&lt=the-mole#/chemistry' },
      { label: 'Molarity', href: '?csec=learn&lt=molarity#/chemistry' },
      { label: 'Dilution', href: '?csec=learn&lt=dilution#/chemistry' },
      { label: 'Balancing a chemical equation', href: '?csec=learn&lt=balancing-equations#/chemistry' },
      { label: 'Why is water bent?', href: '?csec=learn&lt=water#/chemistry' },
    ],
  },
  {
    id: 'calculate',
    title: 'Calculate',
    text: 'Work through molarity, dilution, and chemical equations.',
    href: '?csec=tools#/chemistry',
    modules: ['chemistry.tools', 'chemistry.solutions', 'chemistry.reactions'],
    pages: [
      { label: 'Molarity calculator', href: '?csec=solutions&st=molarity#/chemistry' },
      { label: 'Dilution calculator', href: '?csec=solutions&st=dilution#/chemistry' },
      { label: 'Equation balancer', href: '?csec=reactions&rx=methane-combustion#/chemistry' },
      { label: 'Stoichiometry and limiting reactant', href: '?csec=reactions&rx=ammonia-synthesis#/chemistry' },
    ],
  },
  {
    id: 'explore',
    title: 'Molecules and atoms',
    text: 'Rotate molecules and investigate atoms and bonds.',
    href: '?csec=visual#/chemistry',
    modules: ['chemistry.visual', 'chemistry.library', 'chemistry.molecules', 'chemistry.atomic', 'chemistry.bonding'],
    pages: [
      { label: 'All molecules', href: '?csec=library#/chemistry' },
      { label: 'Water molecule', href: '?molecule=water&view=ball-and-stick#/chemistry' },
      { label: 'Atomic structure', href: '?csec=atomic&el=6#/chemistry' },
      { label: 'Bonding and molecular shape', href: '?csec=bonding#/chemistry' },
    ],
  },
  {
    id: 'periodic',
    title: 'Periodic table',
    text: 'Find elements and compare their properties.',
    href: '?csec=periodic#/chemistry',
    modules: ['chemistry.periodic'],
    pages: [],
  },
]

/** What the header calls each page when no more specific title (an element, a topic) is known. */
export const CHEM_PAGE_TITLES: Readonly<Record<string, string>> = {
  'chemistry.contents': 'Learn',
  'chemistry.tools': 'Calculators',
  'chemistry.visual': 'Molecules and atoms',
  'chemistry.library': 'Molecules',
  'chemistry.learn': 'Explanation',
  'chemistry.periodic': 'Periodic table',
  'chemistry.atomic': 'Atomic structure',
  'chemistry.molecules': 'Molecules',
  'chemistry.bonding': 'Bonding and geometry',
  'chemistry.reactions': 'Reactions and stoichiometry',
  'chemistry.solutions': 'Solutions and dilution',
}

export const destinationOf = (moduleId: string) => CHEM_DESTINATIONS.find((d) => d.modules.includes(moduleId))

/** Example searches on the Overview; each must find its topic (a unit test checks). */
export const CHEM_SEARCH_EXAMPLES = ['Molarity', 'Balance an equation', 'Water molecule'] as const
