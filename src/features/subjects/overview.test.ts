import { describe, expect, it } from 'vitest'
import { isOverviewHash, overviewHref } from '../../lib/overviewRoute'
import { answerFor, moduleContents, OVERVIEW_QUESTIONS, OVERVIEW_SUBJECTS, overviewModules } from './overview'

describe('subject overviews', () => {
  it.each(OVERVIEW_SUBJECTS)('%s: every common question opens real content in the subject', (s) => {
    for (const { q, search } of OVERVIEW_QUESTIONS[s]) {
      const a = answerFor(s, search)
      expect(a, q).toBeDefined()
      expect(a!.subject).toBe(s)
      expect(a!.href, q).toMatch(new RegExp(`#/${s}$`))
    }
  })

  it('answers questions with the content they ask about', () => {
    expect(answerFor('anatomy', 'mitral valve')?.name).toBe('Mitral valve')
    expect(answerFor('biology', 'mitochondria')?.name).toBe('Mitochondria')
    expect(answerFor('physics', 'boyle')?.name).toMatch(/Boyle/)
    expect(answerFor('mathematics', 'saddle')?.name).toMatch(/Saddle/)
  })

  it.each(OVERVIEW_SUBJECTS)('%s: every section lists only links that open that section', (s) => {
    for (const m of overviewModules(s)) {
      for (const item of moduleContents(m)) expect(item.subject).toBe(s)
    }
    expect(overviewModules(s).some((m) => moduleContents(m).length > 0)).toBe(true)
  })

  it('has an address for each overview that the router recognises', () => {
    for (const s of OVERVIEW_SUBJECTS) expect(isOverviewHash(overviewHref(s))).toBe(true)
    expect(isOverviewHash('#/chemistry/overview')).toBe(false)
    expect(isOverviewHash('#/physics')).toBe(false)
    expect(overviewHref('chemistry')).toBe('?csec=topics#/chemistry')
  })
})
