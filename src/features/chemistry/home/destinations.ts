/*
 * Chemistry's Visualizations and Tools: only what exists, each with what it demonstrates or
 * calculates and what it simplifies. Links to labs in other subjects say so.
 */
export interface Destination {
  title: string
  href: string
  /** What it shows or calculates, in one sentence. */
  text: string
  /** What you can change. */
  inputs: string
  /** Its main simplification, or where it lives if outside Chemistry. */
  note: string
}

export const VISUALIZATIONS: readonly Destination[] = [
  {
    title: 'Molecule viewer',
    href: '?molecule=water&view=ball-and-stick#/chemistry',
    text: 'Turn a molecule in 3D and measure its bond lengths and bond angles.',
    inputs: '27 molecules (12 experimental, 15 computed) · ball-and-stick or space-filling · distance and angle tools',
    note: 'Each molecule says where its shape comes from: experimental (NIST CCCBDB) or computed (PubChem3D). Atom colours are a labelling convention.',
  },
  {
    title: 'Atomic structure',
    href: '?csec=atomic&el=6#/chemistry',
    text: 'See the protons, neutrons and electrons of any element, and how isotopes differ.',
    inputs: 'Any element (its natural isotopes are listed)',
    note: 'Electrons are drawn on simple shells (Bohr-style), not as orbitals.',
  },
  {
    title: 'Periodic table',
    href: '?csec=periodic#/chemistry',
    text: 'All 118 elements by group and period. Colour the table by a property to see its trend, and compare elements side by side.',
    inputs: 'Any element · colour by 7 properties (electronegativity, radius, ionization energy…) · compare up to 4 elements',
    note: 'Property values from PubChem; where PubChem has no value, the table says so.',
  },
  {
    title: 'Bonding and molecular shape',
    href: '?csec=bonding#/chemistry',
    text: 'Compare ionic and covalent bonding and see how electron pairs set a molecule’s shape.',
    inputs: 'A side-by-side comparison; open each example molecule in 3D',
    note: 'The VSEPR shapes are idealised; real bond angles are in the molecule viewer.',
  },
  {
    title: 'Gas pressure and volume (Boyle’s law)',
    href: '?experiment=gas#/physics',
    text: 'Squeeze a gas at constant temperature and watch pressure and volume change together.',
    inputs: 'Starting pressure · starting volume · new volume (temperature and amount fixed)',
    note: 'A Physics lab; it models an ideal gas.',
  },
  {
    title: 'Enzyme catalysis and reaction rate',
    href: '?bsec=enzymes#/biology',
    text: 'How an enzyme speeds a reaction, and how the rate depends on substrate concentration.',
    inputs: '[S] · Vmax · Km',
    note: 'A Biology lab (Michaelis–Menten kinetics, illustrative values).',
  },
]

export const TOOLS: readonly Destination[] = [
  {
    title: 'Molarity calculator',
    href: '?csec=solutions&st=molarity#/chemistry',
    text: 'Concentration from moles of solute and volume of solution, or work backwards from either.',
    inputs: 'Moles (mol or mmol) · volume (L or mL) · molarity (M)',
    note: 'Shows each step; volumes are converted to litres first.',
  },
  {
    title: 'Dilution calculator',
    href: '?csec=solutions&st=dilution#/chemistry',
    text: 'How much stock to use, or the concentration or volume after dilution (C₁V₁ = C₂V₂).',
    inputs: 'C₁ · V₁ · C₂ · V₂',
    note: 'V₂ is the final total volume, not the solvent added.',
  },
  {
    title: 'Equation balancer',
    href: '?csec=reactions&rx=methane-combustion#/chemistry',
    text: 'Balance a chemical equation step by step, with atom counts on both sides.',
    inputs: 'Coefficients for 10 textbook reactions',
    note: 'The reactions come from a fixed list; you cannot type your own equation yet.',
  },
  {
    title: 'Stoichiometry and limiting reactant',
    href: '?csec=reactions&rx=ammonia-synthesis#/chemistry',
    text: 'Use a balanced equation to turn moles or grams of one substance into another, and find what runs out first.',
    inputs: 'Amounts of reactants (mol or g)',
    note: 'Molar masses use standard atomic weights (CIAAW).',
  },
]
