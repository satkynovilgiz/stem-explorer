/** Height colour ramp (low → high): deep blue → teal → pale yellow. A visual aid only. */
export const HEIGHT_STOPS: readonly [number, readonly [number, number, number]][] = [
  [0, [0.16, 0.24, 0.47]],
  [0.5, [0.18, 0.72, 0.7]],
  [1, [0.96, 0.89, 0.55]],
]

/**
 * Normalized position of z in [min, max]. A constant surface (max ≈ min) has no range to spread
 * over, so every point gets the middle colour instead of dividing by zero.
 */
export function heightFraction(z: number, min: number, max: number): number {
  const span = max - min
  if (!(span > 1e-9) || !Number.isFinite(span)) return 0.5
  return Math.min(1, Math.max(0, (z - min) / span))
}

export function heightColor(t: number): [number, number, number] {
  const f = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0.5))
  for (let i = 1; i < HEIGHT_STOPS.length; i++) {
    const [t1, c1] = HEIGHT_STOPS[i]
    const [t0, c0] = HEIGHT_STOPS[i - 1]
    if (f <= t1) {
      const u = (f - t0) / (t1 - t0)
      return [c0[0] + (c1[0] - c0[0]) * u, c0[1] + (c1[1] - c0[1]) * u, c0[2] + (c1[2] - c0[2]) * u]
    }
  }
  const last = HEIGHT_STOPS[HEIGHT_STOPS.length - 1][1]
  return [last[0], last[1], last[2]]
}

/** CSS gradient matching the ramp, for the legend. */
export function heightGradientCss(): string {
  return `linear-gradient(to top, ${HEIGHT_STOPS.map(([t, [r, g, b]]) => `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}) ${t * 100}%`).join(', ')})`
}
