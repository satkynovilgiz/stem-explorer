import { describe, expect, it } from 'vitest'
import { DEFAULT_PARAMS } from '../../physics/projectile'
import { initialPhysicsState, physicsReducer, timeEffect, type PhysicsAction, type PhysicsState } from './state'

const run = (state: PhysicsState, ...actions: PhysicsAction[]) => actions.reduce(physicsReducer, state)
const start = () => initialPhysicsState(DEFAULT_PARAMS)

describe('physicsReducer', () => {
  it('does not launch on its own', () => {
    expect(start().status).toBe('ready')
  })

  it('editing an input returns to the ready state at t = 0 and keeps other inputs', () => {
    const playing = run(start(), { type: 'launch' })
    const edited = physicsReducer(playing, { type: 'setParam', key: 'angleDeg', value: 30 })
    expect(edited.status).toBe('ready')
    expect(edited.params).toEqual({ ...DEFAULT_PARAMS, angleDeg: 30 })
    expect(timeEffect({ type: 'setParam', key: 'angleDeg', value: 30 })).toBe('zero')
  })

  it('clamps out-of-range inputs and ignores non-finite ones', () => {
    expect(run(start(), { type: 'setParam', key: 'gravity', value: 0 }).params.gravity).toBe(1)
    const s = start()
    expect(physicsReducer(s, { type: 'setParam', key: 'speed', value: Number.NaN })).toBe(s)
  })

  it('reset keeps the inputs; Restore defaults replaces them', () => {
    const edited = run(start(), { type: 'setParam', key: 'speed', value: 31 }, { type: 'launch' })
    const reset = physicsReducer(edited, { type: 'reset' })
    expect(reset.params.speed).toBe(31)
    expect(reset.status).toBe('ready')
    expect(physicsReducer(edited, { type: 'restoreDefaults' }).params).toEqual(DEFAULT_PARAMS)
  })

  it('pauses, resumes, lands and announces completed results', () => {
    const paused = run(start(), { type: 'launch' }, { type: 'pause', t: 1.234 })
    expect(paused.status).toBe('paused')
    expect(paused.announcement).toBe('Paused at t = 1.23 s.')
    const landed = run(paused, { type: 'resume' }, { type: 'landed' })
    expect(landed.status).toBe('landed')
    // Default flight: 20 m/s at 45° with g = 9.81 m/s² → 2.88 s and 40.8 m.
    expect(landed.announcement).toBe('Landed after 2.88 s, 40.8 m from the launch point.')
  })

  it('scrubbing pauses playback', () => {
    expect(run(start(), { type: 'launch' }, { type: 'scrub' }).status).toBe('paused')
    expect(run(start(), { type: 'scrub' }).status).toBe('paused')
  })

  it('an immediate impact lands without playing', () => {
    const s = run(start(), { type: 'setParam', key: 'speed', value: 0 }, { type: 'launch' })
    expect(s.status).toBe('landed')
    expect(s.announcement).toMatch(/lands immediately/)
  })

  it('changing playback speed changes neither inputs nor status', () => {
    const playing = run(start(), { type: 'launch' })
    const faster = physicsReducer(playing, { type: 'setRate', rate: 2 })
    expect(faster.params).toBe(playing.params)
    expect(faster.status).toBe('playing')
    expect(timeEffect({ type: 'setRate', rate: 2 })).toBe('keep')
  })

  it('saves inputs (not results) as Run A and keeps them when Run B changes', () => {
    const saved = run(start(), { type: 'saveRunA' }, { type: 'setParam', key: 'angleDeg', value: 60 })
    expect(saved.runA).toEqual(DEFAULT_PARAMS)
    expect(Object.keys(saved.runA!)).toEqual(['speed', 'angleDeg', 'height', 'gravity'])
    expect(saved.params.angleDeg).toBe(60)
    expect(physicsReducer(saved, { type: 'clearComparison' }).runA).toBeNull()
  })
})
