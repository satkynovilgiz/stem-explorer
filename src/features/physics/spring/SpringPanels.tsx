import { ExternalLink } from 'lucide-react'
import { useId, useMemo } from 'react'
import { SOURCES } from '../../../data/sources'
import { formatSig } from '../../../physics/projectile'
import { springAt, type SpringSolution } from '../../../physics/spring'
import { useSimTime, type SimClock } from '../clock'
import { SCENE_COLORS } from '../colors'
import { formatTick, niceStep } from '../sceneMath'
import type { PlaybackStatus } from '../state'

const STATUS_TEXT: Record<PlaybackStatus, string> = {
  ready: 'Ready at t = 0',
  playing: 'Oscillating',
  paused: 'Paused',
  landed: 'End of the window',
}

/** Values at the current simulation time. Not a live region: nothing is announced per frame. */
export function SpringReadouts({ solution, clock, status }: { solution: SpringSolution; clock: SimClock; status: PlaybackStatus }) {
  const now = springAt(solution, useSimTime(clock))
  const rows: [string, string][] = [
    ['Time t', `${formatSig(now.t)} s`],
    ['Position x', `${formatSig(now.x)} m`],
    ['Velocity v', `${formatSig(now.v)} m/s`],
    ['Acceleration a', `${formatSig(now.a)} m/s²`],
    ['Restoring force F', `${formatSig(now.force)} N`],
  ]
  return (
    <section className="info-section" aria-labelledby="spring-live-heading">
      <h3 id="spring-live-heading" className="section-title">
        Right now <span className="status-tag">{STATUS_TEXT[status]}</span>
      </h3>
      <dl className="readout">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small">Positive values point to the right (+x). The force always points back toward equilibrium.</p>
    </section>
  )
}

export function SpringSummary({ solution }: { solution: SpringSolution }) {
  const rows: [string, string][] = [
    ['Period T', `${formatSig(solution.period)} s`],
    ['Frequency f', `${formatSig(solution.frequency)} Hz`],
    ['Angular frequency ω', `${formatSig(solution.omega)} rad/s`],
    ['Amplitude A', `${formatSig(solution.amplitude)} m`],
    ['Maximum speed', `${formatSig(solution.maxSpeed)} m/s`],
    ['Total energy E', `${formatSig(solution.energy)} J`],
  ]
  return (
    <section className="info-section" aria-labelledby="spring-summary-heading">
      <h3 id="spring-summary-heading" className="section-title">
        This oscillation
      </h3>
      <dl className="stats">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {solution.amplitude === 0 && (
        <p className="inline-note">With zero displacement there is no restoring force, so the block stays at rest. The period still applies to any release.</p>
      )}
    </section>
  )
}

/** Kinetic, spring-potential and total energy as bars sharing one scale (the constant total). */
export function EnergyBars({ solution, clock }: { solution: SpringSolution; clock: SimClock }) {
  const now = springAt(solution, useSimTime(clock))
  const scale = solution.energy > 0 ? solution.energy : 1
  const bars: { label: string; value: number; color: string }[] = [
    { label: 'Kinetic ½mv²', value: now.kinetic, color: SCENE_COLORS.velocity },
    { label: 'Spring potential ½kx²', value: now.potential, color: SCENE_COLORS.acceleration },
    { label: 'Total E', value: solution.energy, color: SCENE_COLORS.path },
  ]
  return (
    <section className="info-section" aria-labelledby="energy-heading">
      <h3 id="energy-heading" className="section-title">
        Energy
      </h3>
      <ul className="energy-bars">
        {bars.map((b) => (
          <li key={b.label}>
            <span className="energy-label">{b.label}</span>
            <span className="energy-track" aria-hidden="true">
              <span className="energy-fill" style={{ width: `${(100 * b.value) / scale}%`, background: b.color }} />
            </span>
            <span className="energy-value">{formatSig(b.value)} J</span>
          </li>
        ))}
      </ul>
      <p className="muted small">Without friction or damping, kinetic plus potential energy always equals the total.</p>
    </section>
  )
}

const W = 360
const H = 190
const M = { left: 50, right: 14, top: 14, bottom: 38 }
const PW = W - M.left - M.right
const PH = H - M.top - M.bottom

/** Position vs time over the recorded window, with the current-time marker. */
export function SpringGraph({ solution, clock }: { solution: SpringSolution; clock: SimClock }) {
  const id = useId()
  const t = useSimTime(clock)
  const { points, xMax, tMax, tStep, xStep } = useMemo(() => {
    const n = 240
    const pts = Array.from({ length: n + 1 }, (_, i) => {
      const time = (i / n) * solution.duration
      return [time, springAt(solution, time).x] as const
    })
    const amp = Math.max(solution.amplitude, 0.05)
    const xs = niceStep(2 * amp, 4)
    const ts = niceStep(solution.duration, 5)
    return { points: pts, xMax: Math.ceil(amp / xs) * xs, tMax: Math.ceil(solution.duration / ts) * ts, tStep: ts, xStep: xs }
  }, [solution])
  const sx = (time: number) => M.left + (time / tMax) * PW
  const sy = (x: number) => M.top + (1 - (x + xMax) / (2 * xMax)) * PH
  const path = points.map(([a, b], i) => `${i ? 'L' : 'M'}${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('')
  const xTicks = Array.from({ length: Math.round((2 * xMax) / xStep) + 1 }, (_, i) => -xMax + i * xStep)
  const tTicks = Array.from({ length: Math.round(tMax / tStep) + 1 }, (_, i) => i * tStep)
  const now = springAt(solution, t)
  const desc =
    solution.amplitude === 0
      ? 'Position stays at 0 m: the block is released at equilibrium.'
      : `Position follows a cosine between ${formatSig(solution.amplitude)} m and −${formatSig(solution.amplitude)} m, repeating every ${formatSig(solution.period)} s. Three periods are shown.`
  return (
    <figure className="graph" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="graph-title">
        Position vs time
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="graph-svg" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <desc id={`${id}-desc`}>{desc}</desc>
        {xTicks.map((v) => (
          <g key={`x${v}`}>
            <line x1={M.left} x2={W - M.right} y1={sy(v)} y2={sy(v)} className={Math.abs(v) < 1e-9 ? 'graph-zero' : 'graph-grid'} />
            <text x={M.left - 6} y={sy(v)} className="graph-tick" textAnchor="end" dominantBaseline="middle">
              {formatTick(v, xStep)}
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
          Position x (m)
        </text>
        <path d={path} className="graph-line" stroke={SCENE_COLORS.path} strokeWidth={2.5} />
        <line x1={sx(now.t)} x2={sx(now.t)} y1={M.top} y2={H - M.bottom} className="graph-marker" />
        <circle cx={sx(now.t)} cy={sy(now.x)} r={4.5} className="graph-dot" />
      </svg>
      <p className="graph-readout">
        At t = {formatSig(now.t)} s: x = {formatSig(now.x)} m
      </p>
      <p className="graph-summary">{desc}</p>
    </figure>
  )
}

export function SpringAbout() {
  const sources = [
    { ...SOURCES['up-15-1'], usedFor: 'Hooke’s law, ω = √(k/m), T = 2π√(m/k), position, velocity and acceleration' },
    { ...SOURCES['up-15-2'], usedFor: 'Kinetic, spring-potential and total energy; energy conservation' },
  ]
  return (
    <div className="info-body">
      <div className="info-section">
        <h3 className="section-title">Model assumptions</h3>
        <ul className="bullets">
          <li>An ideal spring obeying Hooke’s law, F = −kx, attached to a block on a frictionless horizontal surface.</li>
          <li>No friction, air resistance or damping, so the oscillation never dies down.</li>
          <li>Displacement x is measured from equilibrium (where the spring is neither stretched nor compressed); +x is to the right.</li>
          <li>The block is released from rest: the initial velocity is fixed at 0 m/s.</li>
          <li>The spring’s own mass is ignored, and the block is treated as a point mass.</li>
        </ul>
      </div>
      <div className="info-section">
        <h3 className="section-title">Equations used</h3>
        <ul className="bullets equations">
          <li>
            <code>ω = √(k/m)</code>, <code>T = 2π√(m/k)</code>, <code>f = 1/T</code>. The period does not depend on the amplitude.
          </li>
          <li>
            <code>x(t) = x₀ cos(ωt)</code>, <code>v(t) = −x₀ ω sin(ωt)</code>, <code>a(t) = −ω² x(t)</code>
          </li>
          <li>
            <code>F = −kx</code>, <code>K = ½mv²</code>, <code>U = ½kx²</code>, <code>E = K + U = ½kA²</code>
          </li>
        </ul>
        <p className="muted small">
          Every value is computed from these formulas at the current time, never by stepping a simulation, so playback speed
          and frame rate cannot change any result.
        </p>
      </div>
      <ul className="sources">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
              <ExternalLink size={12} aria-hidden="true" className="external-icon" />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
            <span className="muted small"> — {s.usedFor}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
