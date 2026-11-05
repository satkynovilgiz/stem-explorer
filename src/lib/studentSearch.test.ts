import { describe, expect, it } from 'vitest'
import manifest from '../reference/generated/manifest.json'
import type { ManifestRow } from '../reference/types'
import { searchManifest } from '../features/reference/search'
import { baseItems, referenceItems } from '../features/chemistry/home/chemIndex'
import { CHEM_QUESTIONS } from '../features/chemistry/home/questions'
import { resultId, searchTopics } from '../features/chemistry/home/topicSearch'
import { OVERVIEW_QUESTIONS, OVERVIEW_SUBJECTS } from '../features/subjects/overview'
import { contentWords, containsTerm, spellingSuggestions } from './queryMatch'
import { resultTypeOf } from './resultType'
import { searchAll, searchVocabulary } from './searchIndex'

const rows = manifest as ManifestRow[]
const chemItems = [...baseItems(), ...referenceItems(rows)]
const chemTop = (q: string) => resultId(searchTopics(chemItems, q)[0])
const refTop = (q: string) => searchManifest(rows, q)[0]?.id

describe('Chemistry search finds the right topic', () => {
  it.each([
    ['what is a mole', 'topic:mole'],
    ['how do I calculate molarity', 'topic:molarity'],
    ['dilute a solution', 'topic:dilution'],
    ['balance an equation', 'topic:balancing'],
    ['why is water bent', 'topic:water'],
    ['H2O', 'topic:water'],
    ['H₂O', 'topic:water'],
  ])('%s → %s', (q, id) => expect(chemTop(q)).toBe(id))

  it('every question on the Chemistry overview leads to the entry it links to', () => {
    for (const question of CHEM_QUESTIONS) {
      const first = searchTopics(chemItems, question.question)[0]
      const covered = first.kind === 'topic' ? first.topic.members : [first.item.id]
      expect(covered.some((m) => question.targets.includes(m)), question.question).toBe(true)
    }
  })
})

describe('Explanations are found from questions', () => {
  it.each([
    ['what is a mole', 'the-mole'],
    ['how do I calculate molarity', 'molarity'],
    ['dilute a solution', 'dilution'],
    ['why is water bent', 'water'],
  ])('%s → %s', (q, id) => expect(refTop(q)).toBe(id))
})

describe('all-subject search', () => {
  it('how do I add vectors opens a vector tool, as "vectors" does', () => {
    const results = searchAll('how do I add vectors')
    expect(results[0].subject).toBe('mathematics')
    expect(results[0].href).toMatch(/vector/i)
    expect(searchAll('vectors').map((r) => r.id)).toContain(results[0].id)
  })

  it('where is the kidney opens a kidney in Anatomy, first', () => {
    const [first] = searchAll('where is the kidney')
    expect(first.subject).toBe('anatomy')
    expect(first.name).toMatch(/kidney/i)
  })

  it('photosynthesis opens the Biology process, first', () => {
    const [first] = searchAll('photosynthesis')
    expect(first.subject).toBe('biology')
    expect(first.name).toMatch(/photosynthesis/i)
  })

  it('a whole-name match ranks ahead of text that merely mentions it', () => {
    const results = searchAll('mitochondria')
    expect(results[0].name).toMatch(/mitochondri/i)
  })

  it('a query about nothing here finds nothing, and question words alone find nothing', () => {
    expect(searchAll('zzzqqq')).toEqual([])
    expect(searchAll('how do I build a zeppelin')).toEqual([])
    expect(searchAll('what is the')).toEqual([])
    expect(searchManifest(rows, 'how do I build a zeppelin')).toEqual([])
  })

  it('"mole" stays distinct from "molecule"', () => {
    for (const r of searchAll('mole')) expect(`${r.name} ${r.terms.join(' ')} ${r.description}`).toMatch(/\bmoles?\b|\bmol\b/i)
    expect(searchManifest(rows, 'mole')[0].id).toBe('the-mole')
    expect(contentWords('moles')).toEqual(['mole'])
    expect(containsTerm('molecule shape', 'mole')).toBe(false)
    expect(containsTerm('one mole of water', 'mole')).toBe(true)
  })

  it('keeps symbols, formulas and short terms', () => {
    expect(searchAll('Fe')[0].name).toBe('Iron')
    expect(searchAll('I')[0].name).toBe('Iodine')
    expect(searchAll('He')[0].name).toBe('Helium')
    expect(searchAll('H₂O').map((r) => r.id)).toEqual(searchAll('H2O').map((r) => r.id))
    expect(searchAll('CO2')[0].name).toMatch(/carbon dioxide/i)
    expect(searchManifest(rows, 'pH')[0].id).toBe('ph-scale')
    // A short query does not match inside a longer word.
    expect(containsTerm('motion of a sphere', 'ion')).toBe(false)
    expect(containsTerm('motion of a sphere', 'ph')).toBe(false)
  })

  it('every question on a subject overview finds the page its link opens', () => {
    for (const subject of OVERVIEW_SUBJECTS) {
      for (const { q, search } of OVERVIEW_QUESTIONS[subject]) {
        const linked = searchAll(search, { subject })[0]
        const top = searchAll(q, { subject }).slice(0, 5).map((r) => r.id)
        expect(top, q).toContain(linked.id)
      }
    }
  })
})

describe('result labels and suggestions', () => {
  it('labels calculators, models and definitions', () => {
    const type = (q: string, id: string) => resultTypeOf(searchAll(q).find((r) => r.id === id)!)
    expect(type('molar mass', 'calc:molar-mass')).toBe('Calculator')
    expect(type('molarity', 'section:solutions')).toBe('Calculator')
    expect(resultTypeOf({ id: 'molecule:water', kind: 'molecule' })).toBe('Interactive model')
    expect(resultTypeOf({ id: 'term:mole', kind: 'term' })).toBe('Explanation')
  })

  it('offers close spellings, without inventing any for an unrelated query', () => {
    expect(spellingSuggestions('photosynthsis', searchVocabulary())).toContain('photosynthesis')
    expect(spellingSuggestions('zzzqqq', searchVocabulary())).toEqual([])
  })
})
