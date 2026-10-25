import { describe, expect, it } from 'vitest'
import { airflow, alveolarPressure, breathingSummary, describeStage, expansion } from './breathing'
import { canonicalize } from '../../lib/explorations'
import { anatomyModule, parseBreathingParams } from '../../lib/urlState'

describe('breathing mechanics (schematic)', () => {
  it('enlarges during inspiration and returns during expiration', () => {
    expect(expansion('inspiration', 0)).toBe(0)
    expect(expansion('inspiration', 50)).toBe(0.5)
    expect(expansion('inspiration', 100)).toBe(1)
    expect(expansion('expiration', 0)).toBe(1)
    expect(expansion('expiration', 100)).toBe(0)
    expect(expansion('inspiration', 150)).toBe(1)
  })

  it('air flows in while alveolar pressure is below atmospheric, out while above, and not at all at the ends', () => {
    expect([airflow('inspiration', 50), alveolarPressure('inspiration', 50)]).toEqual(['in', 'below'])
    expect([airflow('expiration', 50), alveolarPressure('expiration', 50)]).toEqual(['out', 'above'])
    for (const phase of ['inspiration', 'expiration'] as const)
      for (const pos of [0, 100]) expect([airflow(phase, pos), alveolarPressure(phase, pos)]).toEqual(['none', 'equal'])
  })

  it('describes quiet expiration as passive recoil and makes no medical or timing claims', () => {
    expect(describeStage('expiration', 40).muscles).toMatch(/passive/)
    expect(describeStage('inspiration', 40).muscles).toMatch(/diaphragm contracts/i)
    const all = [0, 30, 100].flatMap((p) => [breathingSummary('inspiration', p), breathingSummary('expiration', p)]).join(' ')
    expect(all).not.toMatch(/\d+\s*(s|seconds|mL|L|breaths)\b|healthy|disease|normal breathing|patient/i)
  })

  it('reads and canonicalizes breathing links; invalid values are rejected', () => {
    expect(anatomyModule('?breath=expiration')).toBe('breathing')
    expect(anatomyModule('?heart=whole')).toBe('heart')
    expect(parseBreathingParams('?breath=expiration&bpos=40&bshow=exchange')).toEqual({ phase: 'expiration', position: 40, show: 'exchange', invalid: [] })
    expect(canonicalize('anatomy', { breath: 'inspiration' })).toEqual({ subject: 'anatomy', params: { breath: 'inspiration', bpos: '0', bshow: 'airflow' } })
    expect(canonicalize('anatomy', { breath: 'holding' })).toBeNull()
    expect(canonicalize('anatomy', { breath: 'inspiration', bpos: '101' })).toBeNull()
    expect(canonicalize('anatomy', { breath: 'inspiration', bpos: '-1' })).toBeNull()
    expect(canonicalize('anatomy', { breath: 'inspiration', bpos: '2.5' })).toBeNull()
  })
})
