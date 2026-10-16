/** Axis tick helpers shared by the Physics and Mathematics views and graphs. */

/** A "nice" tick step (1, 2 or 5 × 10ⁿ) giving roughly `target` intervals across `span`. */
export function niceStep(span: number, target = 5): number {
  if (!(span > 0) || !Number.isFinite(span)) return 1
  const raw = span / target
  const power = 10 ** Math.floor(Math.log10(raw))
  const unit = raw / power
  const nice = unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10
  return nice * power
}

/** Multiples of `step` covering [min, max] (inclusive, expanded outward to whole steps). */
export function ticksBetween(min: number, max: number, step: number): number[] {
  const first = Math.floor(min / step + 1e-9)
  const last = Math.ceil(max / step - 1e-9)
  return Array.from({ length: last - first + 1 }, (_, i) => Number(((first + i) * step).toPrecision(12)))
}

/** Tick label with as many decimals as the tick step needs ("5", "10", "0.5", "0.25"). */
export function formatTick(value: number, step: number): string {
  // Steps finer than 0.001 (e.g. a tiny cross-section) use exponent notation instead of "0.000" labels.
  if (step < 0.001) return Math.abs(value) < step / 2 ? '0' : value.toExponential(1)
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step) - 1e-9))
  const text = value.toFixed(decimals)
  return Number(text) === 0 ? '0' : text
}
