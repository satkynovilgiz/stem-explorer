import { num, type Params, type SurfaceDef, type SurfaceId } from './surfaces'

/*
 * Exact partial derivatives and tangent planes for the fixed surface library. Every surface is a
 * polynomial or a product of sines and cosines, so it is differentiable everywhere and the tangent
 * plane always exists (OpenStax Calculus Vol. 3, §4.3–4.4). Nothing here depends on the mesh.
 */

export interface Partials {
  fx: number
  fy: number
}

/** ∂f/∂x and ∂f/∂y at (x, y), derived by hand for each surface. */
export function partials(id: SurfaceId, p: Params, x: number, y: number): Partials {
  switch (id) {
    case 'plane':
      return { fx: p.a, fy: p.b }
    case 'paraboloid':
      return { fx: 2 * p.a * x, fy: 2 * p.b * y }
    case 'saddle':
      return { fx: 2 * p.a * x, fy: -2 * p.b * y }
    case 'sine':
      return { fx: p.A * p.k * Math.cos(p.k * x) * Math.cos(p.k * y), fy: -p.A * p.k * Math.sin(p.k * x) * Math.sin(p.k * y) }
  }
}

/** Symbolic partial derivatives, shown next to the numbers. */
export const PARTIAL_FORMULAS: Record<SurfaceId, { fx: string; fy: string }> = {
  plane: { fx: '∂f/∂x = a', fy: '∂f/∂y = b' },
  paraboloid: { fx: '∂f/∂x = 2a·x', fy: '∂f/∂y = 2b·y' },
  saddle: { fx: '∂f/∂x = 2a·x', fy: '∂f/∂y = −2b·y' },
  sine: { fx: '∂f/∂x = A·k·cos(k·x)·cos(k·y)', fy: '∂f/∂y = −A·k·sin(k·x)·sin(k·y)' },
}

/** Below this the gradient is treated as zero (floating-point residue, e.g. the saddle origin). */
export const ZERO_GRADIENT = 1e-9

export interface TangentPlane {
  x0: number
  y0: number
  z0: number
  fx: number
  fy: number
  /** |∇f| = √(fx² + fy²): the steepest slope at the point. */
  gradientMagnitude: number
  /** Direction of ∇f in the x–y plane, degrees counter-clockwise from +x; null when ∇f = 0. */
  gradientDirectionDeg: number | null
  zeroGradient: boolean
  /** The plane z = z0 + fx·(x − x0) + fy·(y − y0). */
  evaluate: (x: number, y: number) => number
  /** The plane's equation with the numbers substituted. */
  equation: string
}

const signed = (value: number, decimals = 2) => {
  const text = num(value, decimals)
  return text.startsWith('−') ? `− ${text.slice(1)}` : `+ ${text}`
}

/** "(x − 1.00)" or "(x + 0.50)"; a zero offset becomes just "x". */
const shifted = (variable: string, at: number) => {
  const text = num(at)
  if (text === '0.00') return variable
  return text.startsWith('−') ? `(${variable} + ${text.slice(1)})` : `(${variable} − ${text})`
}

export function tangentPlane(surface: SurfaceDef, p: Params, x0: number, y0: number): TangentPlane {
  const z0 = surface.evaluate(p, x0, y0)
  const { fx: rawFx, fy: rawFy } = partials(surface.id, p, x0, y0)
  // Remove floating-point residue so an exact zero reads as zero (e.g. sin(kπ) on the sine surface).
  const fx = Math.abs(rawFx) < ZERO_GRADIENT ? 0 : rawFx
  const fy = Math.abs(rawFy) < ZERO_GRADIENT ? 0 : rawFy
  const gradientMagnitude = Math.hypot(fx, fy)
  const zeroGradient = gradientMagnitude < ZERO_GRADIENT
  const equation = `z = ${num(z0, 3)} ${signed(fx)}·${shifted('x', x0)} ${signed(fy)}·${shifted('y', y0)}`
  return {
    x0,
    y0,
    z0,
    fx,
    fy,
    gradientMagnitude,
    gradientDirectionDeg: zeroGradient ? null : (((Math.atan2(fy, fx) * 180) / Math.PI) + 360) % 360,
    zeroGradient,
    evaluate: (x, y) => z0 + fx * (x - x0) + fy * (y - y0),
    equation,
  }
}
