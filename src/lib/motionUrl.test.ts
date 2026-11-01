import { describe, expect, it } from 'vitest'
import { defaultParams, getMotion, MOTIONS, type MotionState } from '../math/motion'
import { LEGACY_TIME_TOLERANCE, motionEntries, parseMotionState } from './motionUrl'

const roundTrip = (st: MotionState) => parseMotionState('?' + new URLSearchParams(motionEntries(st)).toString())
const throwState = (y0: number, v0: number, t?: number): MotionState => {
  const m = getMotion('vertical-throw')
  const params = { y0, v0 }
  return { motion: 'vertical-throw', params, t: t ?? m.tEnd(params), dt: 0.5, view: 'phys' }
}

describe('motion links: serialize → parse restores the same state', () => {
  it('the reviewed reproduction: y₀ = 1 m, v₀ = 5 m/s at landing (≈ 1.190603502 s)', () => {
    const st = throwState(1, 5)
    expect(st.t).toBeCloseTo(1.190603502, 9)
    const back = roundTrip(st)
    expect(back.invalid).toEqual([])
    expect(back.state).toEqual(st)
  })

  it('small valid values are not rounded to zero (y₀ = 0.001 m)', () => {
    const st = throwState(0.001, 0, 0.01)
    expect(motionEntries(st).my0).toBe('0.001')
    const back = roundTrip(st)
    expect(back.invalid).toEqual([])
    expect(back.state.params.y0).toBe(0.001)
    expect(back.state.t).toBe(0.01)
  })

  it('every parameter boundary, Δt boundary and the end time survive, for every motion', () => {
    for (const m of MOTIONS) {
      for (const s of m.params) {
        for (const v of [s.min, s.max, s.min + (s.max - s.min) / 3]) {
          const params = { ...defaultParams(m), [s.key]: v }
          if (m.id === 'vertical-throw' && params.y0 === 0 && params.v0 === 0) continue
          for (const dt of [0.001, -0.001, 5, -5, 1 / 3]) {
            for (const t of [0, m.tEnd(params) / 7, m.tEnd(params)]) {
              const st: MotionState = { motion: m.id, params, t, dt, view: 'math' }
              const back = roundTrip(st)
              expect(back.invalid, `${m.id} ${s.key}=${v} t=${t} dt=${dt}`).toEqual([])
              expect(back.state).toEqual(st)
            }
          }
        }
      }
    }
  })

  it('a link with a landing time rounded to 3 decimals (older links) opens at the landing, not at a default', () => {
    const end = getMotion('vertical-throw').tEnd({ y0: 1, v0: 5 })
    const back = parseMotionState('?msec=motion&mo=vertical-throw&my0=1&mv0=5&mt=1.191')
    expect(back.invalid).toEqual([])
    expect(back.state.t).toBe(end)
    // Further past the end than rounding explains: rejected and reported.
    const far = parseMotionState(`?msec=motion&mo=vertical-throw&my0=1&mv0=5&mt=${end + LEGACY_TIME_TOLERANCE * 4}`)
    expect(far.invalid).toContain('mt')
  })

  it('accepts exponent notation that String() writes for very small values, and rejects junk', () => {
    expect(parseMotionState('?mo=vertical-throw&my0=1e-7&mv0=1').state.params.y0).toBe(1e-7)
    expect(parseMotionState('?mo=vertical-throw&my0=1e&mv0=1').invalid).toContain('my0')
    expect(parseMotionState('?mo=vertical-throw&my0=0x10&mv0=1').invalid).toContain('my0')
  })

  it('never writes -0', () => {
    const st: MotionState = { motion: 'constant-velocity', params: { x0: -0, v: 1 }, t: 0, dt: 0.5, view: 'math' }
    expect(motionEntries(st).mx0).toBe('0')
  })
})

describe('saved explorations and collections keep the same settings', () => {
  it('canonicalize (used by saves, collections and pasted links) is lossless for precise motion states', async () => {
    const { canonicalize } = await import('./explorations')
    for (const st of [throwState(1, 5), throwState(0.001, 0, 0.01), throwState(19.99, 0.05)]) {
      const params = { ...motionEntries(st) }
      const c = canonicalize('mathematics', params)
      expect(c).not.toBeNull()
      expect(c!.params).toEqual(params)
      expect(parseMotionState('?' + new URLSearchParams(c!.params).toString()).state).toEqual(st)
    }
  })
})
