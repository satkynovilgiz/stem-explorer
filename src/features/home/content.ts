import type { SubjectId } from '../../data/subjects'

/**
 * Each subject's card heading. The modules and their contents come from the topic map
 * (src/data/topics.ts), so Home lists what exists rather than a hand-written description.
 */
export const SUBJECT_CARDS: Record<SubjectId, { title: string; summary: string; action: string }> = {
  anatomy: { title: 'Body atlas and heart', summary: 'Schematic body systems you can layer, rotate and search.', action: 'Open anatomy' },
  chemistry: { title: 'Atoms, molecules and bonds', summary: 'Elements, atomic structure and measurable 3D molecules.', action: 'Open chemistry' },
  biology: { title: 'Cells and life processes', summary: 'Cell models and step-by-step molecular processes.', action: 'Open biology' },
  physics: { title: 'Physics labs', summary: 'Ideal experiments with exact equations, readouts and graphs.', action: 'Open the labs' },
  mathematics: { title: 'Functions, surfaces and vectors', summary: 'Graphs and transformations you can inspect point by point.', action: 'Open mathematics' },
}

/** Example queries under the Home search; each one must have results (checked by a unit test). */
export const SEARCH_EXAMPLES = ['mitral valve', 'H₂O', 'Golgi', 'saddle', 'spring']
