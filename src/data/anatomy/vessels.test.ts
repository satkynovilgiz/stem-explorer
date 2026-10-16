import { describe, expect, it } from 'vitest'
import { findHeartPart } from './heart'
import { COMPARE_PRESETS, VESSEL_FACTS, VESSEL_IDS } from './vessels'

describe('vessel facts', () => {
  it('cover every vessel in the heart model and nothing else', () => {
    for (const id of VESSEL_IDS) expect(findHeartPart(id)?.kind, id).toBe('vessel')
  })

  it('name vessels by direction, not oxygen content', () => {
    for (const id of VESSEL_IDS) {
      const f = VESSEL_FACTS[id]
      expect(f.type, id).toBe(f.direction === 'away' ? 'artery' : 'vein')
    }
    // The pulmonary circuit reverses the usual oxygen pattern.
    expect([VESSEL_FACTS['pulmonary-trunk'].type, VESSEL_FACTS['pulmonary-trunk'].oxygenation]).toEqual(['artery', 'poor'])
    expect([VESSEL_FACTS['pulmonary-veins'].type, VESSEL_FACTS['pulmonary-veins'].oxygenation]).toEqual(['vein', 'rich'])
  })

  it('agree with the heart entries (oxygenation and connections)', () => {
    for (const id of VESSEL_IDS) {
      const part = findHeartPart(id)!
      expect(part.oxygenation, id).toBe(VESSEL_FACTS[id].oxygenation)
      const linked = part.connections.map((c) => c.targetId)
      expect(linked, id).toContain(VESSEL_FACTS[id].connectedChamber)
    }
  })

  it('presets pair two different vessels', () => {
    for (const p of COMPARE_PRESETS) expect(p.a).not.toBe(p.b)
  })
})
