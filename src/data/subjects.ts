export type SubjectId = 'anatomy' | 'chemistry' | 'physics' | 'mathematics' | 'biology'

export interface Subject {
  id: SubjectId
  name: string
  available: boolean
  tagline: string
  planned: readonly string[]
}

export const SUBJECTS: readonly Subject[] = [
  {
    id: 'anatomy',
    name: 'Anatomy',
    available: false,
    tagline: 'Human body structures: organs, bones, muscles and body systems.',
    planned: [
      'Rotatable models of major bones and organs',
      'Toggle body systems on and off to see how they overlap',
      'Select a structure to read its name, location and function',
    ],
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    available: true,
    tagline: 'Atoms, molecules, chemical bonds, structures and formulas.',
    planned: [],
  },
  {
    id: 'physics',
    name: 'Physics',
    available: false,
    tagline: 'Motion, forces, energy, waves and electricity.',
    planned: [
      'Simulations with adjustable parameters such as mass, angle and speed',
      'Live plots of position, velocity and energy over time',
      'Wave and circuit explorers with readable formulas',
    ],
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    available: false,
    tagline: 'Graphs, vectors, geometric solids and surfaces.',
    planned: [
      'Function graphs with sliders for each parameter',
      'Vectors you can drag in 2D and 3D',
      'Geometric solids and surfaces with cross-sections',
    ],
  },
  {
    id: 'biology',
    name: 'Biology',
    available: true,
    tagline: 'Cells, organelles, DNA, microorganisms and biological processes.',
    planned: [
      'Explorable animal and plant cell models with labelled organelles',
      'A DNA double-helix model showing base pairing',
      'Step-through views of processes such as mitosis',
    ],
  },
]

export const DEFAULT_SUBJECT: SubjectId = 'chemistry'

export function isSubjectId(value: string): value is SubjectId {
  return SUBJECTS.some((s) => s.id === value)
}
