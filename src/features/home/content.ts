import type { SubjectId } from '../../data/subjects'

/**
 * What each explorer offers today. Keep this in step with the explorers: Home must never describe
 * features that don't exist.
 */
export const SUBJECT_CARDS: Record<SubjectId, { title: string; summary: string; capabilities: string[]; action: string }> = {
  anatomy: {
    title: 'The human heart',
    summary: 'A schematic adult heart, seen from the front.',
    capabilities: [
      'Chambers, valves and great vessels in whole or cutaway view',
      'A 14-step blood-flow tour through both circuits',
      'Compare two vessels: direction, circuit, oxygenation and function',
    ],
    action: 'Open the heart',
  },
  chemistry: {
    title: 'Molecules and elements',
    summary: 'Six molecules built from experimental geometry, plus the periodic table.',
    capabilities: [
      'Ball-and-stick and space-filling views',
      'Measure bond lengths and bond angles between atoms',
      'A periodic table of all 118 elements with search and filters',
    ],
    action: 'Open chemistry',
  },
  biology: {
    title: 'Inside a cell',
    summary: 'Generalized animal and plant cells, side by side.',
    capabilities: [
      'Animal cell (10 structures) and plant cell (13), with a comparison',
      'Whole-cell and cutaway views; isolate and focus',
      'Functions, structure and relationships of each part',
    ],
    action: 'Open the cells',
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
