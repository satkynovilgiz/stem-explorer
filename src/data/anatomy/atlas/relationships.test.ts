import { describe, expect, it } from 'vitest'
import { boundsOf, findStructure } from '.'
import { SOURCES } from '../../sources'
import { DIRECTION_TERMS, RELATION_EXPLORATIONS, RELATIONSHIPS, relationshipsOf } from './relationships'

const center = (id: string) => boundsOf(id)!.center

describe('anatomical relationships', () => {
  it('name existing structures and registered sources, with the quoted basis', () => {
    expect(new Set(RELATIONSHIPS.map((r) => r.id)).size).toBe(RELATIONSHIPS.length)
    for (const r of RELATIONSHIPS) {
      expect(findStructure(r.subject), r.id).toBeTruthy()
      if (r.object) expect(findStructure(r.object), r.id).toBeTruthy()
      expect(SOURCES[r.source], r.id).toBeTruthy()
      expect(r.basis.length, r.id).toBeGreaterThan(20)
      if (r.term) expect(DIRECTION_TERMS[r.term]).toBeTruthy()
    }
  })

  it('every curated exploration lists existing structures and relationships', () => {
    expect(RELATION_EXPLORATIONS.map((e) => e.id)).toEqual(['breathing', 'urinary', 'elbow'])
    for (const e of RELATION_EXPLORATIONS) {
      for (const f of e.focus) expect(findStructure(f), f).toBeTruthy()
      for (const id of e.relationships) expect(RELATIONSHIPS.some((r) => r.id === id), id).toBe(true)
      expect(e.limits.length).toBeGreaterThan(20)
    }
  })

  it('applies one-side statements to both sides, except the right-kidney statement', () => {
    expect(relationshipsOf('ulna-right').map((r) => r.id)).toContain('ulna-medial-radius')
    expect(relationshipsOf('kidney-left').map((r) => r.id)).toContain('right-kidney-inferior')
    expect(relationshipsOf('kidney-right').map((r) => r.id)).toContain('right-kidney-inferior')
    expect(relationshipsOf('kidney-left').map((r) => r.id)).toContain('kidneys-lateral-spine')
    // A structure with no stated relationship gets none (nothing is read off the geometry).
    expect(relationshipsOf('femur-left')).toEqual([])
  })

  it('never states a position for the triceps, which the cited text does not give in words', () => {
    const triceps = relationshipsOf('triceps-brachii-left').filter((r) => r.subject.startsWith('triceps'))
    expect(triceps.every((r) => r.term === null)).toBe(true)
  })
})

/*
 * The relationships come from the text, not the shapes. These checks only confirm that the
 * schematic drawing does not contradict the stated direction (+x body's left, +y superior,
 * +z anterior). Passing them does not make the drawing accurate.
 */
describe('the schematic drawing does not contradict the stated directions', () => {
  it('breathing: lungs above the diaphragm', () => {
    expect(center('lung-left')[1]).toBeGreaterThan(center('diaphragm')[1])
    expect(center('lung-right')[1]).toBeGreaterThan(center('diaphragm')[1])
  })

  it('urinary: kidneys beside the spine, right kidney lower, adrenal above, bladder below the kidneys', () => {
    expect(center('kidney-left')[0]).toBeGreaterThan(0.1)
    expect(center('kidney-right')[0]).toBeLessThan(-0.1)
    expect(center('kidney-right')[1]).toBeLessThan(center('kidney-left')[1])
    expect(center('adrenal-gland-left')[1]).toBeGreaterThan(center('kidney-left')[1])
    expect(center('urinary-bladder')[1]).toBeLessThan(center('kidney-left')[1])
    expect(center('urethra')[1]).toBeLessThan(center('urinary-bladder')[1])
  })

  it('elbow: ulna medial to radius, biceps anterior to the humerus, brachialis deeper than biceps', () => {
    for (const side of ['left', 'right']) {
      expect(Math.abs(center(`ulna-${side}`)[0])).toBeLessThan(Math.abs(center(`radius-${side}`)[0]))
      expect(center(`biceps-brachii-${side}`)[2]).toBeGreaterThan(center(`humerus-${side}`)[2])
      expect(center(`brachialis-${side}`)[2]).toBeLessThan(center(`biceps-brachii-${side}`)[2])
      expect(center(`humerus-${side}`)[1]).toBeGreaterThan(center(`radius-${side}`)[1])
    }
  })
})
