import { describe, expect, it } from 'vitest'
import { canonicalize, hrefFor } from '../lib/explorations'
import { SUBJECTS } from './subjects'
import { availableQuestions, locate, MODULES, modulesOf } from './topics'

const parse = (href: string) => {
  const [search, hash] = href.split('#/')
  return { search, subject: hash, params: Object.fromEntries(new URLSearchParams(search)) }
}

describe('topic map', () => {
  it('has unique module ids and at least one module per subject', () => {
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length)
    for (const s of SUBJECTS) expect(modulesOf(s.id).length).toBeGreaterThan(0)
  })

  it('every module and topic link is canonical and opens its own module', () => {
    for (const m of MODULES) {
      for (const href of [m.href, ...m.topics.map((t) => t.href)]) {
        const { search, subject, params } = parse(href)
        expect(subject).toBe(m.subject)
        const state = canonicalize(subject, params)
        expect(state, href).not.toBeNull()
        expect(hrefFor(state!)).toBe(href)
        // Exactly one module of the subject claims the link, and it is this one.
        const claiming = modulesOf(m.subject).filter((x) => x.matches(search))
        expect(claiming.map((x) => x.id), href).toEqual([m.id])
      }
    }
  })

  it('the breadcrumb names each curated topic', () => {
    for (const m of MODULES)
      for (const t of m.topics) {
        const { module, topic } = locate(m.subject, parse(t.href).search)
        expect(module.id).toBe(m.id)
        expect(topic?.toLowerCase()).toBe(t.label.toLowerCase())
      }
  })

  it('old links without a module key fall into the original module', () => {
    expect(locate('chemistry', '?molecule=benzene').module.id).toBe('chemistry.molecules')
    expect(locate('chemistry', '?molecule=benzene').topic).toBe('Benzene')
    expect(locate('anatomy', '?part=aorta&heart=whole').module.id).toBe('anatomy.heart')
    expect(locate('biology', '?structure=golgi&cell=cutaway').topic).toBe('Golgi apparatus')
    expect(locate('physics', '').module.id).toBe('physics.projectile')
    expect(locate('mathematics', '?surface=saddle').topic).toBe('Saddle (hyperbolic paraboloid)')
  })

  it('summaries use counts from the data, not stale wording', () => {
    expect(MODULES.find((m) => m.id === 'chemistry.periodic')!.summary).toContain('118 elements')
    expect(modulesOf('physics').length).toBeGreaterThanOrEqual(4)
  })
})

describe('Explore by question', () => {
  it('lists only questions whose destination module exists, each with a canonical link', () => {
    const questions = availableQuestions()
    const ids = new Set(MODULES.map((m) => m.id))
    expect(questions.map((x) => x.question)).toContain('How does breathing work?')
    expect(questions.map((x) => x.question)).toContain('Why do molecules have different shapes?')
    if (!ids.has('physics.optics')) expect(questions.map((x) => x.question)).not.toContain('How does a lens form an image?')
    for (const x of questions) {
      const { subject, params } = parse(x.href)
      expect(canonicalize(subject, params)).not.toBeNull()
      expect(subject).toBe(x.subject)
    }
  })
})
