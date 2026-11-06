import type { SubjectId } from '../../data/subjects'

/**
 * Each subject's card heading, and four of its sections (names as on its left menu). The modules and their contents come from the topic map
 * (src/data/topics.ts), so Home lists what exists rather than a hand-written description.
 */
export const SUBJECT_CARDS: Record<SubjectId, { title: string; summary: string; action: string; sections: readonly string[] }> = {
  anatomy: { title: 'Body atlas and heart', summary: 'The human body and how it works.', action: 'Open anatomy', sections: ['Bones', 'Muscles', 'Heart', 'Breathing'] },
  chemistry: { title: 'Atoms, molecules and bonds', summary: 'Atoms, reactions, and everyday questions.', action: 'Explore chemistry', sections: ['Molecules', 'Atoms', 'Bonds', 'Periodic table'] },
  biology: { title: 'Cells and life processes', summary: 'Cells, life processes, and living systems.', action: 'Open biology', sections: ['Cells', 'DNA', 'Enzymes', 'Diffusion'] },
  physics: { title: 'Physics labs', summary: 'Motion, energy, forces, and waves.', action: 'Open the labs', sections: ['Throwing', 'Circuits', 'Waves', 'Lenses'] },
  mathematics: { title: 'Functions, surfaces and vectors', summary: 'Patterns, structures, and problem solving.', action: 'Open mathematics', sections: ['Graphs', 'Vectors', '3D surfaces', 'Statistics'] },
}

/** Example queries under the Home search; each one must have results (checked by a unit test). */
export const SEARCH_EXAMPLES = ['mitral valve', 'H₂O', 'Golgi', 'saddle', 'spring']
