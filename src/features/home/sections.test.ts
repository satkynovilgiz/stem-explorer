import { describe, expect, it } from 'vitest'
import { canonicalize, hrefFor } from '../../lib/explorations'
import { INTEREST_LINKS } from './interests'
import { relativeTime } from './time'

describe('Home starting points', () => {
  it('every interest link opens a real, canonical state', () => {
    expect(INTEREST_LINKS.length).toBeGreaterThanOrEqual(12)
    for (const href of INTEREST_LINKS) {
      const [search, subject] = href.split('#/')
      const state = canonicalize(subject, Object.fromEntries(new URLSearchParams(search)))
      expect(state, href).not.toBeNull()
      expect(hrefFor(state!)).toBe(href)
    }
  })

  it('relative times read naturally', () => {
    const now = Date.parse('2026-10-24T12:00:00Z')
    expect(relativeTime('2026-10-24T11:59:30Z', now)).toBe('just now')
    expect(relativeTime('2026-10-24T11:55:00Z', now)).toBe('5 minutes ago')
    expect(relativeTime('2026-10-24T09:00:00Z', now)).toBe('3 hours ago')
    expect(relativeTime('2026-10-23T12:00:00Z', now)).toBe('yesterday')
    expect(relativeTime('not a date', now)).toBe('')
  })
})
