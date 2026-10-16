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
      'Connections and sources for every structure',
    ],
    action: 'Open the heart',
  },
  chemistry: {
    title: 'Molecules in 3D',
    summary: 'Six molecules built from experimental geometry.',
    capabilities: [
      'Ball-and-stick and space-filling views',
      'Measure bond lengths and bond angles between atoms',
      'Composition, shape and reported geometry with sources',
    ],
    action: 'Open molecules',
  },
  biology: {
    title: 'Inside a cell',
    summary: 'A generalized animal cell with ten structures.',
    capabilities: [
      'Whole-cell and cutaway views; isolate and focus',
      'Functions, structure and relationships of each part',
      'Key terms and sources for every structure',
    ],
    action: 'Open the cell',
  },
  physics: {
    title: 'Projectile motion lab',
    summary: 'Ideal launches with no air resistance.',
    capabilities: [
      'Set speed, angle, height and gravity, then launch',
      'Scrub through time with live readouts and graphs',
      'Save Run A and compare it with a second launch',
    ],
    action: 'Open the lab',
  },
  mathematics: {
    title: 'Surfaces z = f(x, y)',
    summary: 'Four surfaces with adjustable parameters.',
    capabilities: [
      'Reshape a plane, paraboloid, saddle or sine surface',
      'Inspect exact values at a point',
      'Cut vertical cross-sections with a graph and table',
    ],
    action: 'Open surfaces',
  },
}
