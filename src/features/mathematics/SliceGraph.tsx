import { useId, useMemo } from 'react'
import { formatTick, niceStep, ticksBetween } from '../../lib/ticks'
import { num, type Params, type SliceAxis, type SliceKind, type SurfaceDef } from '../../math/surfaces'

interface Props {
  surface: SurfaceDef
  params: Params
  slice: { axis: SliceAxis; value: number }
  point: { x: number; y: number } | null
}

const W = 380
const H = 210
const M = { left: 46, right: 14, top: 14, bottom: 38 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

const KIND_TEXT: Record<SliceKind, string> = {
  line: 'a straight line',
  'parabola-up': 'a parabola opening upward',
  'parabola-down': 'a parabola opening downward',
  sinusoid: 'a sinusoidal wave',
  constant: 'a constant (horizontal line)',
}

/**
 * 2D graph of the vertical cross-section, computed from the surface function. For x = constant the
 * horizontal axis is y; for y = constant it is x. The vertical axis is always z.
 */
export function SliceGraph({ surface, params, slice, point }: Props) {
  const id = useId()
  const { axis, value } = slice
  const free = axis === 'x' ? 'y' : 'x'
  const { min, max } = surface.domain
  const result = surface.slice(params, axis, value)

  const { pts, zLo, zHi, zStep, uStep } = useMemo(() => {
    const samples = Array.from({ length: 201 }, (_, i) => {
      const u = min + ((max - min) * i) / 200
      return [u, result.evaluate(u)] as const
    })
    const zs = samples.map(([, z]) => z)
    let lo = Math.min(...zs)
    let hi = Math.max(...zs)
    if (hi - lo < 1e-9) {
      lo -= 1
      hi += 1
    }
    const step = niceStep(hi - lo, 4)
    return {
      pts: samples,
      zLo: Math.floor(lo / step + 1e-9) * step,
      zHi: Math.ceil(hi / step - 1e-9) * step,
      zStep: step,
      uStep: niceStep(max - min, 6),
    }
  }, [result, min, max])

  const sx = (u: number) => M.left + ((u - min) / (max - min)) * PW
  const sy = (z: number) => M.top + (1 - (z - zLo) / (zHi - zLo)) * PH
  const d = pts.map(([u, z], i) => `${i ? 'L' : 'M'}${sx(u).toFixed(1)},${sy(z).toFixed(1)}`).join('')
  const uTicks = ticksBetween(min, max, uStep).filter((u) => u >= min - 1e-9 && u <= max + 1e-9)
  const zTicks = ticksBetween(zLo, zHi, zStep)

  // If the inspected point lies on this slice, mark it on the curve too.
  const onSlice = point && Math.abs((axis === 'x' ? point.x : point.y) - value) < 1e-6
  const pointU = point ? (axis === 'x' ? point.y : point.x) : 0

  const zs = pts.map(([, z]) => z)
  const zMin = Math.min(...zs)
  const zMax = Math.max(...zs)
  const sampleUs = [min, (min + max) / 2 - (max - min) / 4, (min + max) / 2, (min + max) / 2 + (max - min) / 4, max]
  const summary = `At ${axis} = ${num(value)} the cross-section is ${KIND_TEXT[result.kind]}: ${result.formula}. Over ${num(min)} ≤ ${free} ≤ ${num(max)}, z ranges from ${num(zMin, 3)} to ${num(zMax, 3)}.`

  return (
    <figure className="graph slice-graph" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="graph-title">
        Cross-section at {axis} = {num(value)}: z as a function of {free}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <desc id={`${id}-desc`}>{summary}</desc>
        {zTicks.map((z) => (
          <g key={`z${z}`}>
            <line x1={M.left} x2={W - M.right} y1={sy(z)} y2={sy(z)} className={Math.abs(z) < 1e-9 ? 'graph-zero' : 'graph-grid'} />
            <text x={M.left - 6} y={sy(z)} className="graph-tick" textAnchor="end" dominantBaseline="middle">
              {formatTick(z, zStep)}
            </text>
          </g>
        ))}
        {uTicks.map((u) => (
          <g key={`u${u}`}>
            <line x1={sx(u)} x2={sx(u)} y1={M.top} y2={H - M.bottom} className={Math.abs(u) < 1e-9 ? 'graph-zero' : 'graph-grid'} />
            <text x={sx(u)} y={H - M.bottom + 14} className="graph-tick" textAnchor="middle">
              {formatTick(u, uStep)}
            </text>
          </g>
        ))}
        <rect x={M.left} y={M.top} width={PW} height={PH} className="graph-frame" />
        <text x={M.left + PW / 2} y={H - 4} className="graph-axis" textAnchor="middle">
          {free} (horizontal axis)
        </text>
        <text x={12} y={M.top + PH / 2} className="graph-axis" textAnchor="middle" transform={`rotate(-90 12 ${M.top + PH / 2})`}>
          z (vertical axis)
        </text>
        <path d={d} className="graph-line" stroke="#f5c26b" strokeWidth={2.5} />
        {onSlice && <circle cx={sx(pointU)} cy={sy(result.evaluate(pointU))} r={4.5} className="graph-dot" />}
      </svg>
      <p className="slice-formula">
        <span className="muted">Slice formula:</span> {result.formula}
      </p>
      <table className="data-table slice-table">
        <caption className="visually-hidden">Values along the cross-section at {axis} = {num(value)}</caption>
        <thead>
          <tr>
            <th scope="row">{free}</th>
            {sampleUs.map((u) => (
              <td key={u} className="num">
                {num(u)}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">z</th>
            {sampleUs.map((u) => (
              <td key={u} className="num">
                {num(result.evaluate(u), 3)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="graph-summary">{summary} The vertical axis is scaled to fit and is not to the same scale as the horizontal axis.</p>
    </figure>
  )
}
