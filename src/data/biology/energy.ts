import type { OrganelleId } from './types'

/*
 * Photosynthesis and cellular respiration, as connected overviews. The simplified net equations
 * (OpenStax Concepts of Biology §4.1) summarize many steps; the stages below are the pathway as
 * described in Biology 2e §7.2–7.4 and §8.1–8.3. No ATP yields are given.
 */

export interface ProcessStage {
  id: string
  name: string
  location: string
  /** Opens this structure in the cell model. */
  link?: { organelle: OrganelleId; cellType: 'plant' | 'animal'; label: string }
  summary: string
  deeper: string
  sources: readonly string[]
}

export interface EnergyProcess {
  id: 'photosynthesis' | 'respiration'
  name: string
  netEquation: { reactants: string; products: string; note: string; sources: readonly string[] }
  stages: readonly ProcessStage[]
}

export const ENERGY_PROCESSES: readonly EnergyProcess[] = [
  {
    id: 'photosynthesis',
    name: 'Photosynthesis',
    netEquation: {
      reactants: '6CO₂ + 6H₂O',
      products: 'C₆H₁₂O₆ + 6O₂',
      note: 'Powered by light. A summary of the overall change, not the pathway: the equation looks simple, but the steps are many and complex.',
      sources: ['cob-4-1', 'bio-8-1'],
    },
    stages: [
      {
        id: 'light',
        name: 'Light-dependent reactions',
        location: 'Thylakoid membranes of the chloroplast',
        link: { organelle: 'chloroplast', cellType: 'plant', label: 'Chloroplast in the plant cell' },
        summary: 'Chlorophyll absorbs energy from sunlight, which is converted into stored chemical energy (ATP and NADPH).',
        deeper: 'Light energy is converted to chemical energy in photosystems II and I, embedded in the thylakoid membrane; the pigments and electron transport chain sit in that membrane.',
        sources: ['bio-8-1', 'bio-8-2'],
      },
      {
        id: 'calvin',
        name: 'Calvin cycle (light-independent reactions)',
        location: 'Stroma of the chloroplast',
        link: { organelle: 'chloroplast', cellType: 'plant', label: 'Chloroplast in the plant cell' },
        summary: 'The chemical energy from the light-dependent reactions drives the assembly of sugar from carbon dioxide.',
        deeper: 'The cycle has three stages: fixation, reduction and regeneration. Its product, G3P, is used to build sugars.',
        sources: ['bio-8-1', 'bio-8-3'],
      },
    ],
  },
  {
    id: 'respiration',
    name: 'Cellular respiration',
    netEquation: {
      reactants: 'C₆H₁₂O₆ + 6O₂',
      products: '6H₂O + 6CO₂',
      note: 'Oxygen is consumed and carbon dioxide released, with energy captured in ATP. Like the photosynthesis equation, it summarizes many steps.',
      sources: ['cob-4-1'],
    },
    stages: [
      {
        id: 'glycolysis',
        name: 'Glycolysis',
        location: 'Cytoplasm',
        summary: 'Glucose is broken down into pyruvate. Glycolysis takes place in the cytoplasm of both prokaryotic and eukaryotic cells.',
        deeper: 'Its second half produces NADH and ATP while forming pyruvate.',
        sources: ['bio-7-2'],
      },
      {
        id: 'pyruvate',
        name: 'Pyruvate oxidation and the citric acid cycle',
        location: 'Matrix of the mitochondrion',
        link: { organelle: 'mitochondrion', cellType: 'animal', label: 'Mitochondrion in the animal cell' },
        summary: 'In the mitochondrial matrix, pyruvate is converted to acetyl CoA, which enters the citric acid cycle; carbon dioxide is released.',
        deeper: 'The cycle forms NADH and FADH₂, which carry electrons to the next stage.',
        sources: ['bio-7-3'],
      },
      {
        id: 'oxphos',
        name: 'Oxidative phosphorylation',
        location: 'Inner mitochondrial membrane (in eukaryotes)',
        link: { organelle: 'mitochondrion', cellType: 'animal', label: 'Mitochondrion in the animal cell' },
        summary: 'The electron transport chain passes electrons along to oxygen, which becomes water; it is the only part of glucose metabolism that uses atmospheric oxygen.',
        deeper: 'The chain sits in the inner mitochondrial membrane in eukaryotes and in the plasma membrane in prokaryotes; the proton gradient it builds drives ATP synthesis.',
        sources: ['bio-7-4'],
      },
    ],
  },
]

export const CONNECTION =
  'The two processes are linked: the products of photosynthesis (sugar and oxygen) are the reactants of cellular respiration, whose products (carbon dioxide and water) are the reactants of photosynthesis. Plant cells have both chloroplasts and mitochondria.'
