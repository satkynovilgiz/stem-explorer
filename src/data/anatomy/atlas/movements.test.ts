import { describe, expect, it } from 'vitest'
import { boundsOf, findStructure } from '.'
import { angleAt, demoMembers, demoPivot, MOVEMENTS, poseWords, rotateAboutX, rotateShape, stretchShape } from './movements'

const close = (a: readonly number[], b: readonly number[], d = 9) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], d))

describe('rotation about the joint axis', () => {
  it('keeps the pivot fixed and preserves distances', () => {
    const pivot = [1, 2, 3] as const
    close(rotateAboutX(pivot, pivot, 1.2), pivot)
    const p = [1, 0.5, 3.4] as const
    const q = rotateAboutX(p, pivot, 0.7)
    expect(Math.hypot(q[1] - 2, q[2] - 3)).toBeCloseTo(Math.hypot(p[1] - 2, p[2] - 3), 12)
    expect(q[0]).toBe(1)
  })

  it('a quarter turn maps "down" to "forward" for a negative angle (elbow) and "back" for a positive one (knee)', () => {
    close(rotateAboutX([0, -1, 0], [0, 0, 0], -Math.PI / 2), [0, 0, 1])
    close(rotateAboutX([0, -1, 0], [0, 0, 0], Math.PI / 2), [0, 0, -1])
  })

  it('rotating then rotating back restores a shape; stretching moves only the distal end', () => {
    const cap = { kind: 'capsule', from: [0, 1, 0], to: [0, -1, 0.2], radius: 0.1 } as const
    const back = rotateShape(rotateShape(cap, [0, 0, 0], 0.9), [0, 0, 0], -0.9)
    if (back.kind !== 'capsule') throw new Error()
    close(back.from, cap.from)
    close(back.to, cap.to)
    const s = stretchShape(cap, [0, 0, 0], 0.9)
    if (s.kind !== 'capsule') throw new Error()
    expect(s.from).toEqual(cap.from)
    expect(s.to).not.toEqual(cap.to)
  })
})

describe('movement demonstrations', () => {
  it('reference all structures that exist, on both sides', () => {
    for (const m of MOVEMENTS) {
      for (const side of ['left', 'right'] as const) {
        const { moving, spanning, context } = demoMembers(m, side)
        for (const id of [...moving, ...spanning, ...context]) expect(findStructure(id), `${m.id}: ${id}`).toBeDefined()
        expect(findStructure(`${m.joint}-${side}`)).toBeDefined()
      }
      expect(m.principal.length).toBeGreaterThan(0)
      expect(m.sources).toContain('ap-9-5')
    }
  })

  it('pivots sit on the joint markers', () => {
    for (const m of MOVEMENTS) {
      close(demoPivot(m, 'left'), boundsOf(`${m.joint}-left`)!.center, 6)
      close(demoPivot(m, 'right'), boundsOf(`${m.joint}-right`)!.center, 6)
    }
  })

  it('elbow flexion brings the hand forward and up; knee flexion brings the foot back towards the thigh', () => {
    const elbow = MOVEMENTS.find((m) => m.id === 'elbow-flexion')!
    const hand = boundsOf('metacarpals-left')!.center
    const flexedHand = rotateAboutX(hand, elbow.pivot, angleAt(elbow, 0.6))
    expect(flexedHand[2]).toBeGreaterThan(hand[2])
    expect(flexedHand[1]).toBeGreaterThan(hand[1])
    const knee = MOVEMENTS.find((m) => m.id === 'knee-flexion')!
    const heel = boundsOf('tarsals-left')!.center
    const flexedHeel = rotateAboutX(heel, knee.pivot, angleAt(knee, 0.6))
    expect(flexedHeel[2]).toBeLessThan(heel[2])
    expect(flexedHeel[1]).toBeGreaterThan(heel[1])
  })

  it('progress is clamped and described in words, not degrees', () => {
    const m = MOVEMENTS[0]
    expect(angleAt(m, -1)).toBeCloseTo(0, 12)
    expect(angleAt(m, 2)).toBe(m.fullAngle)
    for (const t of [0, 0.3, 0.7, 1]) expect(poseWords(t)).not.toMatch(/°|degree/)
  })
})
