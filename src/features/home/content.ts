import type { SubjectId } from '../../data/subjects'

/**
 * What each explorer offers today. Keep this in step with the explorers: Home must never describe
 * features that don't exist.
 */
export const SUBJECT_CARDS: Record<SubjectId, { title: string; summary: string; capabilities: string[]; action: string }> = {
  anatomy: {
    title: 'Body atlas and heart',
    summary: 'A schematic whole-body atlas with eleven organ-system layers, plus a detailed heart.',
    capabilities: [
      'Front, back and side views; layers with adjustable opacity; regions and search',
      'Selectable structures with functions, sources and model limitations',
      'Detailed heart: cutaway, a 14-step blood-flow tour and vessel comparison',
    ],
    action: 'Open anatomy',
  },
  chemistry: {
    title: 'Atoms, molecules and bonds',
    summary: 'Twelve molecules built from experimental geometry, the periodic table, atomic structure and bonding.',
    capabilities: [
      'Measure bond lengths and angles in ball-and-stick or space-filling models',
      'All 118 elements: protons, electrons, configurations and isotopes',
      'Covalent, ionic and metallic bonding; shape and polarity',
    ],
    action: 'Open chemistry',
  },
  biology: {
    title: 'Cells and life processes',
    summary: 'Animal, plant and bacterial cells, plus DNA, cell division and energy processes.',
    capabilities: [
      'Three cell models with whole and cutaway views and a comparison',
      'Inspect paired DNA strands and step through transcription',
      'Step through mitosis, photosynthesis and cellular respiration',
    ],
    action: 'Open biology',
  },

  physics: {
    title: 'Motion labs',
    summary: 'Two ideal experiments: projectile motion and a spring–mass oscillator.',
    capabilities: [
      'Launch projectiles; compare two runs with live readouts and graphs',
      'Oscillate a mass on a spring: period, forces and energy',
      'Scrub through time; values come from exact equations',
    ],
    action: 'Open the labs',
  },
  mathematics: {
    title: 'Surfaces z = f(x, y)',
    summary: 'Four surfaces with adjustable parameters.',
    capabilities: [
      'Reshape a plane, paraboloid, saddle or sine surface',
      'Inspect a point: exact value, tangent plane and gradient',
      'Cut vertical cross-sections with a graph and table',
    ],
    action: 'Open surfaces',
  },
}

/** Example queries under the Home search; each one must have results (checked by a unit test). */
export const SEARCH_EXAMPLES = ['mitral valve', 'H₂O', 'Golgi', 'saddle', 'spring']
