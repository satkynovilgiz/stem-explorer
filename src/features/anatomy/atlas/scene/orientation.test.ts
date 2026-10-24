import { describe, expect, it } from 'vitest'
import { Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { VIEW_DIRECTIONS } from '../atlasState'
import { axisEnds, END_ON } from './orientation'

/** The indicator for a camera placed in a view's direction, looking at the body. */
function endsFor(direction: readonly [number, number, number]) {
  const cam = new PerspectiveCamera()
  cam.position.copy(new Vector3(...direction).multiplyScalar(30))
  cam.up.set(0, 1, 0)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  const e = new Matrix4().copy(cam.matrixWorld).invert().elements
  return new Map(axisEnds([e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]]).map((a) => [a.label, a]))
}

describe('orientation indicator', () => {
  it('front view: body’s left to the screen’s right, superior up, anterior toward the viewer (end-on)', () => {
    const ends = endsFor([0, 0, 1])
    expect(ends.get('L')!.x).toBeCloseTo(1)
    expect(ends.get('R')!.x).toBeCloseTo(-1)
    expect(ends.get('S')!.y).toBeCloseTo(1)
    expect(ends.get('A')!.depth).toBeCloseTo(1)
    expect(Math.hypot(ends.get('A')!.x, ends.get('A')!.y)).toBeLessThan(END_ON)
  })

  it('back view: the body’s right is on the screen’s right', () => {
    expect(endsFor([0, 0, -1]).get('R')!.x).toBeCloseTo(1)
  })

  it('left lateral view: anterior on the screen’s left, the body’s left toward the viewer', () => {
    const ends = endsFor([1, 0, 0])
    expect(ends.get('A')!.x).toBeCloseTo(-1)
    expect(ends.get('L')!.depth).toBeCloseTo(1)
  })

  it('agrees with the view descriptions for every view direction used by the atlas', () => {
    expect(endsFor(VIEW_DIRECTIONS.front).get('L')!.x).toBeGreaterThan(0.9)
    expect(endsFor(VIEW_DIRECTIONS.back).get('L')!.x).toBeLessThan(-0.9)
    expect(endsFor(VIEW_DIRECTIONS.side).get('P')!.x).toBeGreaterThan(0.9)
  })
})
