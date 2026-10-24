/*
 * The compact orientation indicator: where each body axis points on screen for the current camera.
 * Body axes (types.ts): +x the body's left, +y superior, +z anterior. Pure maths, unit tested.
 */

export interface AxisEnd {
  /** The end's label: S/I (superior/inferior), L/R (body's left/right), A/P (anterior/posterior). */
  label: 'S' | 'I' | 'L' | 'R' | 'A' | 'P'
  name: string
  /** Screen direction: x to the right, y up; length 1 when the axis lies in the screen plane. */
  x: number
  y: number
  /** Toward the viewer (positive) or away (negative). */
  depth: number
}

const ENDS = [
  { label: 'S', name: 'Superior', v: [0, 1, 0] },
  { label: 'I', name: 'Inferior', v: [0, -1, 0] },
  { label: 'L', name: 'Body’s left', v: [1, 0, 0] },
  { label: 'R', name: 'Body’s right', v: [-1, 0, 0] },
  { label: 'A', name: 'Anterior', v: [0, 0, 1] },
  { label: 'P', name: 'Posterior', v: [0, 0, -1] },
] as const

/**
 * Projects the six axis ends into camera space. `inverseRotation` is the camera's world-to-view
 * rotation as a column-major 3×3 (the upper-left of three's matrixWorldInverse).
 */
export function axisEnds(inverseRotation: readonly number[]): AxisEnd[] {
  const m = inverseRotation
  return ENDS.map((e) => {
    const [x, y, z] = e.v
    return {
      label: e.label,
      name: e.name,
      x: m[0] * x + m[3] * y + m[6] * z,
      y: m[1] * x + m[4] * y + m[7] * z,
      depth: m[2] * x + m[5] * y + m[8] * z,
    }
  })
}

/** An axis is drawn as a line only when it is not seen nearly end-on. */
export const END_ON = 0.3
