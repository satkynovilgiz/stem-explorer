import { spellingSuggestions } from '../../lib/queryMatch'
import { searchVocabulary } from '../../lib/searchIndex'

/**
 * For a search with no results: close spellings the student can choose. The query is never changed
 * on their behalf, and nothing is shown when no word is close.
 */
export function SearchSuggestions({ query, onPick }: { query: string; onPick: (q: string) => void }) {
  const suggestions = spellingSuggestions(query, searchVocabulary())
  if (suggestions.length === 0) return null
  return (
    <p className="search-suggestions" data-testid="search-suggestions">
      <span>Did you mean:</span>{' '}
      {suggestions.map((s) => (
        <button key={s} type="button" className="example-chip" onClick={() => onPick(s)}>
          {s}
        </button>
      ))}
    </p>
  )
}
