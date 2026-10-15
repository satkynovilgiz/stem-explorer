import { describe, expect, it } from 'vitest'
import { FLOW_STEPS, HEART_PART_IDS, HEART_PARTS, HEART_SOURCES } from './heart'

describe('heart content', () => {
  it('covers exactly the required structures with unique, URL-safe IDs', () => {
    expect(HEART_PARTS.map((p) => p.id)).toEqual([...HEART_PART_IDS])
    for (const p of HEART_PARTS) expect(p.id).toMatch(/^[a-z]+(-[a-z]+)*$/)
  })

  it('cites only known sources and connects only to other existing structures', () => {
    for (const p of HEART_PARTS) {
      expect(p.sourceIds.length).toBeGreaterThan(0)
      for (const s of p.sourceIds) expect(HEART_SOURCES[s]?.url).toMatch(/^https:\/\/openstax\.org\//)
      for (const c of p.connections) {
        expect(HEART_PART_IDS).toContain(c.targetId)
        expect(c.targetId).not.toBe(p.id)
      }
    }
  })

  it('has reciprocal connections along the main pathway', () => {
    const linked = (a: string, b: string) => HEART_PARTS.find((p) => p.id === a)!.connections.some((c) => c.targetId === b)
    for (const [a, b] of [
      ['right-atrium', 'tricuspid-valve'],
      ['right-ventricle', 'pulmonary-valve'],
      ['left-atrium', 'mitral-valve'],
      ['left-ventricle', 'aortic-valve'],
    ]) {
      expect(linked(a, b), `${a} → ${b}`).toBe(true)
      expect(linked(b, a), `${b} → ${a}`).toBe(true)
    }
  })

  it('marks the pathway colours by side: right heart and pulmonary trunk oxygen-poor, left heart and pulmonary veins oxygen-rich', () => {
    const ox = (id: string) => HEART_PARTS.find((p) => p.id === id)!.oxygenation
    for (const id of ['right-atrium', 'right-ventricle', 'pulmonary-trunk', 'superior-vena-cava', 'inferior-vena-cava']) expect(ox(id)).toBe('poor')
    for (const id of ['left-atrium', 'left-ventricle', 'pulmonary-veins', 'aorta']) expect(ox(id)).toBe('rich')
  })

  it('describes valve cusp counts from the source', () => {
    const text = (id: string) => HEART_PARTS.find((p) => p.id === id)!.details.join(' ')
    expect(text('tricuspid-valve')).toMatch(/three flaps/)
    expect(text('mitral-valve')).toMatch(/two cusps/)
  })
})

describe('blood-flow pathway', () => {
  it('follows the verified order, with the lungs and body as external destinations', () => {
    expect(FLOW_STEPS.map((s) => s.id)).toEqual([
      'systemic-veins',
      'right-atrium',
      'tricuspid',
      'right-ventricle',
      'pulmonary-valve',
      'pulmonary-arteries',
      'lungs',
      'pulmonary-veins',
      'left-atrium',
      'mitral',
      'left-ventricle',
      'aortic-valve',
      'aorta',
      'body',
    ])
    const lungs = FLOW_STEPS.find((s) => s.id === 'lungs')!
    expect(lungs.parts).toEqual([])
    expect(lungs.external).toBe('lungs')
    expect(FLOW_STEPS.at(-1)!.external).toBe('body')
  })

  it('only highlights structures that exist', () => {
    for (const s of FLOW_STEPS) for (const p of s.parts) expect(HEART_PART_IDS).toContain(p)
  })

  it('passes through each valve after its chamber and before the next', () => {
    const order = FLOW_STEPS.flatMap((s) => s.parts)
    const at = (id: string) => order.indexOf(id as never)
    expect(at('right-atrium')).toBeLessThan(at('tricuspid-valve'))
    expect(at('tricuspid-valve')).toBeLessThan(at('right-ventricle'))
    expect(at('right-ventricle')).toBeLessThan(at('pulmonary-valve'))
    expect(at('pulmonary-valve')).toBeLessThan(at('pulmonary-trunk'))
    expect(at('pulmonary-trunk')).toBeLessThan(at('pulmonary-veins'))
    expect(at('left-atrium')).toBeLessThan(at('mitral-valve'))
    expect(at('mitral-valve')).toBeLessThan(at('left-ventricle'))
    expect(at('left-ventricle')).toBeLessThan(at('aortic-valve'))
    expect(at('aortic-valve')).toBeLessThan(at('aorta'))
  })
})
