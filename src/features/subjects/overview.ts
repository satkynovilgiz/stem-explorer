import type { SubjectId } from '../../data/subjects'
import { modulesOf, type TopicModule } from '../../data/topics'
import { SEARCH_INDEX, searchAll, type SearchItem } from '../../lib/searchIndex'

/** Subjects with an overview page here (Chemistry has its own, richer one). */
export type OverviewSubject = Exclude<SubjectId, 'chemistry'>
export const OVERVIEW_SUBJECTS: readonly OverviewSubject[] = ['anatomy', 'biology', 'physics', 'mathematics']
export const isOverviewSubject = (s: SubjectId): s is OverviewSubject => s !== 'chemistry'


/** One sentence for a first-year college student: what the subject covers here. */
export const OVERVIEW_LEADS: Record<OverviewSubject, string> = {
  anatomy: 'Find any structure of the human body, see where it is in 3D, and read what it does, with sources.',
  biology: 'Cells, DNA, cell division, inheritance and the energy processes of life, as models you can explore step by step.',
  physics: 'Six labs for motion, oscillation, circuits, waves, optics and gases: change the inputs and watch the equations at work.',
  mathematics: 'Functions, 3D surfaces, statistics, motion and vectors you can graph, rotate and measure.',
}

/**
 * Questions students ask, each answered by the top search result in the subject. A question
 * whose search finds nothing is not shown (and a unit test fails), so every link opens real content.
 */
export const OVERVIEW_QUESTIONS: Record<OverviewSubject, readonly { q: string; search: string }[]> = {
  anatomy: [
    { q: 'Where is the mitral valve, and what does it do?', search: 'mitral valve' },
    { q: 'What does the diaphragm do when we breathe?', search: 'diaphragm' },
    { q: 'Where are the kidneys?', search: 'kidney' },
    { q: 'Which muscle bends the elbow?', search: 'biceps' },
    { q: 'Where is the femur?', search: 'femur' },
  ],
  biology: [
    { q: 'What do mitochondria do?', search: 'mitochondria' },
    { q: 'What happens in each stage of mitosis?', search: 'mitosis' },
    { q: 'How is meiosis different from mitosis?', search: 'meiosis' },
    { q: 'How do enzymes speed up reactions?', search: 'enzyme' },
    { q: 'What is photosynthesis?', search: 'photosynthesis' },
  ],
  physics: [
    { q: 'How far does a projectile travel?', search: 'projectile' },
    { q: 'What sets the period of a spring?', search: 'spring' },
    { q: 'How do current and voltage relate in a circuit?', search: 'circuit' },
    { q: 'How does a lens form an image?', search: 'lens' },
    { q: 'What happens to a gas when you squeeze it?', search: 'boyle' },
  ],
  mathematics: [
    { q: 'What does a saddle surface look like?', search: 'saddle' },
    { q: 'How do I read a function’s graph?', search: 'linear function' },
    { q: 'How are mean and standard deviation found?', search: 'standard deviation' },
    { q: 'What is a vector, and how do I add two?', search: 'vector' },
    { q: 'How are position, velocity and acceleration related?', search: 'velocity' },
  ],
}

export const answerFor = (s: OverviewSubject, search: string): SearchItem | undefined =>
  searchAll(search, { subject: s }).find((i) => i.kind !== 'subject' && i.kind !== 'term')

const queryOf = (href: string) => (href.startsWith('?') ? href.slice(0, href.indexOf('#') < 0 ? undefined : href.indexOf('#')) : '')

/** Everything indexed in a module: the items whose link opens that module (the module's contents). */
export function moduleContents(m: TopicModule): SearchItem[] {
  return SEARCH_INDEX.filter(
    (i) => i.subject === m.subject && i.kind !== 'subject' && i.kind !== 'term' && i.href.endsWith(`#/${m.subject}`) && m.matches(queryOf(i.href)),
  )
}

export const overviewModules = (s: OverviewSubject) => modulesOf(s)
