import { useId, useMemo } from 'react'
import { formatSig, samplePath, stateAt, type MotionState, type Trajectory } from '../../physics/projectile'
import { useSimTime, type SimClock } from './clock'
import { SCENE_COLORS } from './colors'
import { formatTick, niceStep } from './sceneMath'

type Quantity = 'height' | 'vy'

interface Props {
  quantity: Quantity
  trajectory: Trajectory
  runA: Trajectory | null
  clock: SimClock
}

const W = 360
const H = 190
const M = { left: 46, right: 14, top: 14, bottom: 38 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

const pick = (q: Quantity, s: MotionState) => (q === 'height' ? s.y : s.vy)

const META: Record<Quantity, { title: string; axis: string; unit: string; symbol: string }> = {
  height: { title: 'Height vs time', axis: 'Height y (m)', unit: 'm', symbol: 'y' },
  vy: { title: 'Vertical velocity vs time', axis: 'Vertical velocity vᵧ (m/s)', unit: 'm/s', symbol: 'vᵧ' },
}

function summary(q: Quantity, t: Trajectory): string {
  const T = formatSig(t.flightTime)
  if (t.flightTime === 0) return 'The projectile starts on the ground and lands immediately, so there is no curve to show.'
  if (q === 'height') {
    return t.timeOfMaxHeight > 0
      ? `Height starts at ${formatSig(t.params.height)} m, peaks at ${formatSig(t.maxHeight)} m at t = ${formatSig(t.timeOfMaxHeight)} s, and reaches the ground at t = ${T} s. The curve is a parabola.`
      : `Height starts at its maximum, ${formatSig(t.params.height)} m, and falls to the ground at t = ${T} s along a parabola.`
  }
  const vyEnd = t.v0y - t.params.gravity * t.flightTime
  return `Vertical velocity changes in a straight line from ${formatSig(t.v0y)} m/s to ${formatSig(vyEnd)} m/s. Its slope is −g = −${formatSig(t.params.gravity)} m/s² throughout${t.timeOfMaxHeight > 0 ? `, and it is zero at the highest point (t = ${formatSig(t.timeOfMaxHeight)} s)` : ''}.`
}

/** Accessible SVG time graph sharing the simulation clock with the scene and readouts. */
export function TimeGraph({ quantity, trajectory, runA, clock }: Props) {
  const t = useSimTime(clock)
  const id = useId()
  const meta = META[quantity]

  const { tMax, vMin, vMax, tStep, vStep, active, reference } = useMemo(() => {
    const runs = runA ? [trajectory, runA] : [trajectory]
    const series = runs.map((r) => samplePath(r, 120).map((s) => [s.t, pick(quantity, s)] as const))
    const values = series.flat().map(([, v]) => v)
    const tMaxRaw = Math.max(0.1, ...runs.map((r) => r.flightTime))
    let lo = Math.min(0, ...values)
    let hi = Math.max(quantity === 'height' ? 1 : 0, ...values)
    if (hi - lo < 1e-9) hi = lo + 1
    const vStepRaw = niceStep(hi - lo, 4)
    lo = Math.floor(lo / vStepRaw) * vStepRaw
    hi = Math.ceil(hi / vStepRaw) * vStepRaw
    const tStepRaw = niceStep(tMaxRaw, 5)
    return {
      tMax: Math.ceil(tMaxRaw / tStepRaw) * tStepRaw,
      vMin: lo,
      vMax: hi,
      tStep: tStepRaw,
      vStep: vStepRaw,
      active: series[0],
      reference: runA ? series[1] : null,
    }
  }, [trajectory, runA, quantity])

  const sx = (time: number) => M.left + (time / tMax) * PW
  const sy = (value: number) => M.top + (1 - (value - vMin) / (vMax - vMin)) * PH
  const path = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([a, b], i) => `${i ? 'L' : 'M'}${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('')

  const tTicks = Array.from({ length: Math.round(tMax / tStep) + 1 }, (_, i) => i * tStep)
  const vTicks = Array.from({ length: Math.round((vMax - vMin) / vStep) + 1 }, (_, i) => vMin + i * vStep)
  const now = stateAt(trajectory, t)
  const nowValue = pick(quantity, now)

  return (
    <figure className="graph" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="graph-title">
        {meta.title}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <desc id={`${id}-desc`}>{summary(quantity, trajectory)}</desc>
        {/* Grid and ticks */}
        {vTicks.map((v) => (
          <g key={`v${v}`}>
            <line x1={M.left} x2={W - M.right} y1={sy(v)} y2={sy(v)} className={Math.abs(v) < 1e-9 ? 'graph-zero' : 'graph-grid'} />
            <text x={M.left - 6} y={sy(v)} className="graph-tick" textAnchor="end" dominantBaseline="middle">
              {formatTick(v, vStep)}
            </text>
          </g>
        ))}
        {tTicks.map((tt) => (
          <g key={`t${tt}`}>
            <line x1={sx(tt)} x2={sx(tt)} y1={M.top} y2={H - M.bottom} className="graph-grid" />
            <text x={sx(tt)} y={H - M.bottom + 14} className="graph-tick" textAnchor="middle">
              {formatTick(tt, tStep)}
            </text>
          </g>
        ))}
        <rect x={M.left} y={M.top} width={PW} height={PH} className="graph-frame" />
        <text x={M.left + PW / 2} y={H - 4} className="graph-axis" textAnchor="middle">
          Time t (s)
        </text>
        <text x={12} y={M.top + PH / 2} className="graph-axis" textAnchor="middle" transform={`rotate(-90 12 ${M.top + PH / 2})`}>
          {meta.axis}
        </text>

        {reference && <path d={path(reference)} className="graph-line" stroke={SCENE_COLORS.runA} strokeDasharray="2 4" strokeWidth={2.5} />}
        <path d={path(active)} className="graph-line" stroke={SCENE_COLORS.path} strokeWidth={2.5} />

        {/* Current-time marker: dashed vertical line plus a point on the active curve. */}
        <line x1={sx(now.t)} x2={sx(now.t)} y1={M.top} y2={H - M.bottom} className="graph-marker" />
        <circle cx={sx(now.t)} cy={sy(nowValue)} r={4.5} className="graph-dot" />
      </svg>
      <p className="graph-readout">
        At t = {formatSig(now.t)} s: {meta.symbol} = {formatSig(nowValue)} {meta.unit}
        {reference && (
          <span className="graph-legend">
            <span className="legend-swatch is-solid" aria-hidden="true" /> Run B (active)
            <span className="legend-swatch is-dotted" aria-hidden="true" /> Run A (saved)
          </span>
        )}
      </p>
      <p className="graph-summary">{summary(quantity, trajectory)}</p>
    </figure>
  )
}
