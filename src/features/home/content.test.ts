import { describe, expect, it } from 'vitest'
import { searchExplorations } from '../../lib/searchIndex'
import { SEARCH_EXAMPLES } from './content'

describe('Home search examples', () => {
  it('every example query finds something real', () => {
    for (const q of SEARCH_EXAMPLES) expect(searchExplorations(q).length, q).toBeGreaterThan(0)
  })
})
