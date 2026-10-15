import { niceStep, ticksBetween } from '../../lib/ticks'
import { toWorld } from '../../math/coordinates'
import { heightColor, heightFraction } from '../../math/heightColor'
import { heightRange, type Params, type SurfaceDef } from '../../math/surfaces'

export interface SurfaceArrays {
  /** Vertex positions in Three.js world coordinates (mapped with toWorld). */
  positions: Float32Array
  colors: Float32Array
  indices: Uint32Array
  zMin: number
  zMax: number
}

/**
 * Triangle mesh for z = f(x, y) on the square domain, sampled on a (segments + 1)² grid.
 * The mesh only approximates the continuous surface; point readouts always use f itself.
 */
export function buildSurfaceArrays(surface: SurfaceDef, params: Params): SurfaceArrays {
  const n = surface.segments
  const { min, max } = surface.domain
  const { min: zMin, max: zMax } = heightRange(surface, params, n)
  const count = (n + 1) * (n + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = min + ((max - min) * i) / n
      const y = min + ((max - min) * j) / n
      const z = surface.evaluate(params, x, y)
      const k = (i * (n + 1) + j) * 3
      positions.set(toWorld([x, y, z]), k)
      colors.set(heightColor(heightFraction(z, zMin, zMax)), k)
    }
  }
  const indices = new Uint32Array(n * n * 6)
  let t = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = i * (n + 1) + j
      const b = a + 1
      const c = a + (n + 1)
      const d = c + 1
      indices.set([a, c, b, b, c, d], t)
      t += 6
    }
  }
  return { positions, colors, indices, zMin, zMax }
}

/** Wireframe lines along x = constant and y = constant, following the surface (segment pairs). */
export function buildWireframe(surface: SurfaceDef, params: Params, lines = 12, samples = 96): Float32Array {
  const { min, max } = surface.domain
  const out: number[] = []
  for (let l = 0; l <= lines; l++) {
    const c = min + ((max - min) * l) / lines
    for (const axis of ['x', 'y'] as const) {
      for (let s = 0; s < samples; s++) {
        const u0 = min + ((max - min) * s) / samples
        const u1 = min + ((max - min) * (s + 1)) / samples
        const p0 = axis === 'x' ? [c, u0] : [u0, c]
        const p1 = axis === 'x' ? [c, u1] : [u1, c]
        out.push(...toWorld([p0[0], p0[1], surface.evaluate(params, p0[0], p0[1])]))
        out.push(...toWorld([p1[0], p1[1], surface.evaluate(params, p1[0], p1[1])]))
      }
    }
  }
  return new Float32Array(out)
}

export interface AxisFrame {
  /** Floor and ceiling of the z axis (always at least one tick apart). */
  zFloor: number
  zCeil: number
  xyStep: number
  zStep: number
  xyTicks: number[]
  zTicks: number[]
}

/** Axes, grid and ticks for a surface. All axes share one world scale; only tick spacing differs. */
export function axisFrame(surface: SurfaceDef, zMin: number, zMax: number): AxisFrame {
  const { min, max } = surface.domain
  const xyStep = niceStep(max - min, 6)
  const lo = Math.min(zMin, 0)
  const hi = Math.max(zMax, 0)
  const zStep = niceStep(Math.max(hi - lo, 1e-6), 4)
  const zFloor = Math.floor(lo / zStep + 1e-9) * zStep
  let zCeil = Math.ceil(hi / zStep - 1e-9) * zStep
  if (zCeil - zFloor < zStep) zCeil = zFloor + zStep
  return {
    zFloor,
    zCeil,
    xyStep,
    zStep,
    xyTicks: ticksBetween(min, max, xyStep).filter((v) => v >= min - 1e-9 && v <= max + 1e-9),
    zTicks: ticksBetween(zFloor, zCeil, zStep),
  }
}
