import type { SearchItem } from './searchIndex'

/** What opening a search result gives a student, in the same three words everywhere. */
export type ResultType = 'Explanation' | 'Calculator' | 'Interactive model'

export function resultTypeOf(item: Pick<SearchItem, 'id' | 'kind'>): ResultType {
  // The Solutions page is Chemistry's molarity and dilution calculator.
  if (item.id.startsWith('calc:') || item.id === 'section:solutions') return 'Calculator'
  return item.kind === 'term' || item.kind === 'subject' ? 'Explanation' : 'Interactive model'
}
