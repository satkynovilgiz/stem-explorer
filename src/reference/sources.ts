import { SOURCES, type SourceRef } from '../data/sources'

/*
 * Sources cited by the reference library: the app's registry (each page was read when it was
 * registered) plus pages added for the library. A page is added here only after it has been read;
 * entries cite it with a locator (section, example or table) so a reader can find the passage.
 * No source text is copied: explanations are written for this app.
 */

const BOOKS = {
  'university-physics-volume-1': 'University Physics Volume 1',
  'university-physics-volume-2': 'University Physics Volume 2',
  'university-physics-volume-3': 'University Physics Volume 3',
  'chemistry-2e': 'Chemistry 2e',
  'biology-2e': 'Biology 2e',
  'anatomy-and-physiology-2e': 'Anatomy and Physiology 2e',
  'calculus-volume-1': 'Calculus Volume 1',
  'calculus-volume-2': 'Calculus Volume 2',
  'calculus-volume-3': 'Calculus Volume 3',
  'college-algebra-2e': 'College Algebra 2e',
  'algebra-and-trigonometry-2e': 'Algebra and Trigonometry 2e',
  'precalculus-2e': 'Precalculus 2e',
  'introductory-statistics-2e': 'Introductory Statistics 2e',
  'microbiology': 'Microbiology',
  'concepts-biology': 'Concepts of Biology',
} as const

/** An OpenStax section page; `page` is the slug after /pages/. */
export const openstax = (book: keyof typeof BOOKS, page: string, title: string): SourceRef => ({
  label: `OpenStax ${BOOKS[book]} — ${title}`,
  url: `https://openstax.org/books/${book}/pages/${page}`,
})

/** Pages added for the reference library (each read before being cited). */
export const LIBRARY_SOURCES: Record<string, SourceRef> = {
  'up1-3-4': openstax('university-physics-volume-1', '3-4-motion-with-constant-acceleration', '3.4 Motion with Constant Acceleration'),
}

export const REFERENCE_SOURCES: Record<string, SourceRef> = { ...SOURCES, ...LIBRARY_SOURCES }
export const REFERENCE_SOURCE_IDS: ReadonlySet<string> = new Set(Object.keys(REFERENCE_SOURCES))
