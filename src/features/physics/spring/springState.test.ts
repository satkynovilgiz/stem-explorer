import { describe, expect, it } from 'vitest'
import { DEFAULT_SPRING } from '../../../physics/spring'
import { initialSpringState, springReducer, springTimeEffect } from './springState'

describe('spring lab state', () => {
  it('opens paused at t = 0 and never auto-launches', () => {
    expect(initialSpringState().status).toBe('ready')
  })

  it('launch, pause, resume, end and reset', () => {
    let s = springReducer(initialSpringState(), { type: 'launch' })
    expect(s.status).toBe('playing')
    s = springReducer(s, { type: 'pause', t: 0.5 })
    expect([s.status, s.announcement]).toEqual(['paused', 'Paused at t = 0.500 s.'])
    s = springReducer(s, { type: 'resume' })
    s = springReducer(s, { type: 'ended' })
    expect(s.status).toBe('landed')
    expect(s.announcement).toMatch(/End of the .* s window \(3 periods/)
    s = springReducer(s, { type: 'reset' })
    expect(s.status).toBe('ready')
  })

  it('edits and restoring defaults return to t = 0; scrubbing pauses', () => {
    expect(springTimeEffect({ type: 'setParam', key: 'k', value: 30 })).toBe('zero')
    expect(springTimeEffect({ type: 'setRate', rate: 2 })).toBe('keep')
    let s = springReducer(springReducer(initialSpringState(), { type: 'launch' }), { type: 'setParam', key: 'mass', value: 2.04 })
    expect([s.status, s.params.mass]).toEqual(['ready', 2])
    s = springReducer(s, { type: 'scrub' })
    expect(s.status).toBe('paused')
    expect(springReducer(s, { type: 'restoreDefaults' }).params).toEqual(DEFAULT_SPRING)
  })

  it('announces the zero-displacement case honestly', () => {
    const s = springReducer(springReducer(initialSpringState(), { type: 'setParam', key: 'x0', value: 0 }), { type: 'launch' })
    expect(s.announcement).toMatch(/stays at rest/)
  })
})
