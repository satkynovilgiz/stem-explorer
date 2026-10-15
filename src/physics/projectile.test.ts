import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  DEFAULT_PARAMS,
  formatSig,
  isValidParam,
  MAX_FRAME_DT,
  normalizeParam,
  parseNumber,
  samplePath,
  solveTrajectory,
  stateAt,
  type LaunchParams,
} from './projectile'

const launch = (p: Partial<LaunchParams>) => solveTrajectory({ ...DEFAULT_PARAMS, ...p })

describe('initial conditions', () => {
  it('starts at the launch point with the launch velocity split by the angle', () => {
    // 30°: cos = √3/2, sin = 1/2.
    const s = stateAt(launch({ speed: 20, angleDeg: 30, height: 5, gravity: 10 }), 0)
    expect(s.x).toBe(0)
    expect(s.y).toBe(5)
    expect(s.vx).toBeCloseTo(10 * Math.sqrt(3), 12)
    expect(s.vy).toBeCloseTo(10, 12)
    expect(s.speed).toBeCloseTo(20, 12)
    expect(s.ax).toBe(0)
    expect(s.ay).toBe(-10)
  })
})

describe('motion during flight', () => {
  const traj = launch({ speed: 25, angleDeg: 50, height: 3, gravity: 9.81 })

  it('keeps the horizontal velocity constant, so x grows by equal amounts in equal times', () => {
    const [a, b, c] = [0.4, 1.4, 2.4].map((t) => stateAt(traj, t))
    expect(a.vx).toBe(b.vx)
    expect(b.vx).toBe(c.vx)
    expect(b.x - a.x).toBeCloseTo(c.x - b.x, 10)
  })

  it('changes vertical velocity at the constant rate −g', () => {
    const a = stateAt(traj, 0.5)
    const b = stateAt(traj, 2.0)
    expect((b.vy - a.vy) / 1.5).toBeCloseTo(-9.81, 10)
  })

  it('has a vertical velocity consistent with the slope of the height curve', () => {
    const h = 1e-4
    const t = 1.2
    const slope = (stateAt(traj, t + h).y - stateAt(traj, t - h).y) / (2 * h)
    expect(slope).toBeCloseTo(stateAt(traj, t).vy, 6)
  })
})

describe('known flights', () => {
  it('straight up at 20 m/s with g = 10 m/s² rises for 2 s to 20 m and lands after 4 s', () => {
    const t = launch({ speed: 20, angleDeg: 90, height: 0, gravity: 10 })
    expect(t.v0x).toBe(0)
    expect(t.flightTime).toBeCloseTo(4, 12)
    expect(t.timeOfMaxHeight).toBeCloseTo(2, 12)
    expect(t.maxHeight).toBeCloseTo(20, 12)
    expect(t.range).toBe(0)
  })

  it('straight up at 10 m/s from 15 m with g = 10 m/s² lands at t = 3 s (15 + 10t − 5t² = 0)', () => {
    const t = launch({ speed: 10, angleDeg: 90, height: 15, gravity: 10 })
    expect(t.flightTime).toBeCloseTo(3, 12)
    expect(t.maxHeight).toBeCloseTo(20, 12)
  })

  it('horizontal launch at 10 m/s from 20 m with g = 10 m/s² falls for 2 s and lands 20 m away', () => {
    const t = launch({ speed: 10, angleDeg: 0, height: 20, gravity: 10 })
    expect(t.v0y).toBe(0)
    expect(t.flightTime).toBeCloseTo(2, 12)
    expect(t.range).toBeCloseTo(20, 12)
    expect(t.maxHeight).toBe(20)
    expect(t.timeOfMaxHeight).toBe(0)
    expect(t.impactSpeed).toBeCloseTo(Math.sqrt(10 ** 2 + 20 ** 2), 12)
  })

  it('30° at 20 m/s from the ground with g = 10 m/s²: 2 s flight, 5 m peak, 20√3 m range', () => {
    const t = launch({ speed: 20, angleDeg: 30, height: 0, gravity: 10 })
    expect(t.flightTime).toBeCloseTo(2, 12)
    expect(t.maxHeight).toBeCloseTo(5, 12)
    expect(t.range).toBeCloseTo(20 * Math.sqrt(3), 10)
  })

  it('matches the level-ground range formula R = v₀² sin 2θ / g and gives equal ranges for complementary angles', () => {
    for (const angleDeg of [15, 30, 45, 60, 75]) {
      const t = launch({ speed: 30, angleDeg, height: 0, gravity: 9.81 })
      expect(t.range).toBeCloseTo((30 ** 2 * Math.sin((2 * angleDeg * Math.PI) / 180)) / 9.81, 9)
    }
    expect(launch({ speed: 30, angleDeg: 20, height: 0 }).range).toBeCloseTo(launch({ speed: 30, angleDeg: 70, height: 0 }).range, 9)
  })

  it('drops from rest: 5 m with g = 10 m/s² takes 1 s', () => {
    const t = launch({ speed: 0, angleDeg: 45, height: 5, gravity: 10 })
    expect(t.flightTime).toBeCloseTo(1, 12)
    expect(t.range).toBe(0)
  })
})

describe('edge cases', () => {
  it('handles an immediate impact (no speed, no height) without NaN', () => {
    const t = launch({ speed: 0, height: 0 })
    expect(t.flightTime).toBe(0)
    expect(t.range).toBe(0)
    expect(t.maxHeight).toBe(0)
    const s = stateAt(t, 0)
    expect(s.landed).toBe(true)
    expect(Object.values(s).every((v) => typeof v === 'boolean' || Number.isFinite(v))).toBe(true)
  })

  it('treats a horizontal launch from the ground as an immediate impact', () => {
    const t = launch({ speed: 30, angleDeg: 0, height: 0 })
    expect(t.flightTime).toBe(0)
    expect(stateAt(t, 0).landed).toBe(true)
  })

  it('handles very short flights', () => {
    const t = launch({ speed: 1, angleDeg: 10, height: 0, gravity: 25 })
    expect(t.flightTime).toBeGreaterThan(0)
    expect(t.flightTime).toBeCloseTo((2 * Math.sin((10 * Math.PI) / 180)) / 25, 12)
    expect(samplePath(t).every((s) => Number.isFinite(s.x) && s.y >= 0)).toBe(true)
  })

  it('stops at the landing point: no position below ground and no motion after impact', () => {
    const t = launch({ speed: 18, angleDeg: 40, height: 2 })
    const impact = stateAt(t, t.flightTime)
    expect(impact.y).toBe(0)
    expect(impact.x).toBeCloseTo(t.range, 12)
    expect(stateAt(t, t.flightTime + 100)).toEqual(impact)
    for (const s of samplePath(t, 500)) expect(s.y).toBeGreaterThanOrEqual(0)
  })

  it('clamps negative and non-finite times to the launch', () => {
    const t = launch({})
    expect(stateAt(t, -3).t).toBe(0)
    expect(stateAt(t, Number.NaN).t).toBe(0)
    expect(stateAt(t, Number.POSITIVE_INFINITY).t).toBe(0)
  })

  it('rejects non-positive gravity instead of dividing by zero', () => {
    expect(() => launch({ gravity: 0 })).toThrow(RangeError)
    expect(() => launch({ gravity: -9.81 })).toThrow(RangeError)
  })

  it('samples always include the launch and the impact', () => {
    const t = launch({})
    const path = samplePath(t, 10)
    expect(path[0].t).toBe(0)
    expect(path.at(-1)!.t).toBe(t.flightTime)
  })
})

describe('playback timing', () => {
  const run = (rate: number, frame: number) => {
    const traj = launch({ speed: 22, angleDeg: 35, height: 4 })
    let t = 0
    let frames = 0
    while (t < traj.flightTime && frames < 100_000) {
      t = advanceTime(t, frame, rate, traj.flightTime)
      frames++
    }
    return { final: stateAt(traj, t), frames }
  }

  it('lands at the same point and time whatever the playback speed or frame rate', () => {
    const slow = run(0.25, 1 / 60)
    const fast = run(2, 1 / 30)
    expect(fast.final).toEqual(slow.final)
    expect(fast.frames).toBeLessThan(slow.frames)
  })

  it('caps a single frame step so returning from a background tab cannot jump ahead', () => {
    expect(advanceTime(0, 30, 1, 100)).toBe(MAX_FRAME_DT)
    expect(advanceTime(0, 30, 2, 100)).toBe(2 * MAX_FRAME_DT)
    expect(advanceTime(0, -1, 1, 100)).toBe(0)
  })

  it('never advances past impact', () => {
    expect(advanceTime(1.95, 0.1, 1, 2)).toBe(2)
  })
})

describe('input validation', () => {
  it('parses complete numbers only', () => {
    expect(parseNumber('12.5')).toBe(12.5)
    expect(parseNumber(' 7 ')).toBe(7)
    expect(parseNumber('.5')).toBe(0.5)
    for (const partial of ['', ' ', '-', '1.', '1e3', 'abc', '1,5', 'NaN', 'Infinity', '--2']) {
      expect(parseNumber(partial), partial).toBeNull()
    }
  })

  it('checks ranges and finiteness', () => {
    expect(isValidParam('gravity', 9.81)).toBe(true)
    expect(isValidParam('gravity', 0)).toBe(false)
    expect(isValidParam('angleDeg', 91)).toBe(false)
    expect(isValidParam('speed', Number.NaN)).toBe(false)
  })

  it('clamps into range and rounds to the input step', () => {
    expect(normalizeParam('angleDeg', 120)).toBe(90)
    expect(normalizeParam('speed', -5)).toBe(0)
    expect(normalizeParam('speed', 12.26)).toBe(12.5)
    expect(normalizeParam('gravity', 9.806)).toBe(9.81)
    expect(normalizeParam('gravity', 0)).toBe(1)
    expect(normalizeParam('height', Number.NaN)).toBeNull()
  })
})

describe('formatSig', () => {
  it('shows about three significant figures', () => {
    expect(formatSig(40.7747)).toBe('40.8')
    expect(formatSig(2.88)).toBe('2.88')
    expect(formatSig(0.013891)).toBe('0.014')
    expect(formatSig(1234.5)).toBe('1235')
    expect(formatSig(0)).toBe('0')
    expect(formatSig(-9.81)).toBe('-9.81')
  })
})
