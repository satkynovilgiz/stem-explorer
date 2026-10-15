import { formatSig, PARAM_KEYS, PARAM_SPECS, solveTrajectory, stateAt, type LaunchParams, type Trajectory } from '../../physics/projectile'
import { useSimTime, type SimClock } from './clock'
import type { PlaybackStatus } from './state'

interface Props {
  trajectory: Trajectory
  runA: LaunchParams | null
  clock: SimClock
  status: PlaybackStatus
}

const STATUS_TEXT: Record<PlaybackStatus, string> = {
  ready: 'Ready at launch',
  playing: 'In flight',
  paused: 'Paused',
  landed: 'Landed — values at impact',
}

/** Instantaneous values at the current simulation time. Not a live region: no per-frame announcements. */
function LiveValues({ trajectory, clock, status }: Omit<Props, 'runA'>) {
  const t = useSimTime(clock)
  const s = stateAt(trajectory, t)
  const rows: [string, string][] = [
    ['Time t', `${formatSig(s.t)} s`],
    ['Position x', `${formatSig(s.x)} m`],
    ['Height y', `${formatSig(s.y)} m`],
    ['Velocity vₓ', `${formatSig(s.vx)} m/s`],
    ['Velocity vᵧ', `${formatSig(s.vy)} m/s`],
    ['Speed |v|', `${formatSig(s.speed)} m/s`],
    ['Acceleration a', `(0, ${formatSig(s.ay)}) m/s²`],
  ]
  return (
    <section className="info-section" aria-labelledby="live-heading">
      <h3 id="live-heading" className="section-title">
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
    </section>
  )
}

function summaryRows(t: Trajectory): [string, string][] {
  return [
    ['Flight time', `${formatSig(t.flightTime)} s`],
    ['Maximum height', `${formatSig(t.maxHeight)} m`],
    ['Landing distance', `${formatSig(t.range)} m`],
    ['Impact speed', `${formatSig(t.impactSpeed)} m/s`],
  ]
}

export function ResultsPanel({ trajectory, runA, clock, status }: Props) {
  // Run A's results are recomputed from its saved inputs, never stored.
  const a = runA ? solveTrajectory(runA) : null
  return (
    <div className="info-body">
      <LiveValues trajectory={trajectory} clock={clock} status={status} />

      <section className="info-section" aria-labelledby="summary-heading">
        <h3 id="summary-heading" className="section-title">
          Predicted full flight
        </h3>
        <dl className="stats">
          {summaryRows(trajectory).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="muted small table-note">
          Calculated from the inputs before launch. Values are rounded to about three significant figures.
        </p>
      </section>

      {a && (
        <section className="info-section" aria-labelledby="compare-heading">
          <h3 id="compare-heading" className="section-title">
            Comparison
          </h3>
          <table className="data-table compare-table">
            <caption className="visually-hidden">Run A (saved) compared with Run B (active)</caption>
            <thead>
              <tr>
                <th scope="col">Quantity</th>
                <th scope="col" className="num">
                  <span className="legend-swatch is-dotted" aria-hidden="true" /> Run A
                </th>
                <th scope="col" className="num">
                  <span className="legend-swatch is-solid" aria-hidden="true" /> Run B
                </th>
              </tr>
            </thead>
            <tbody>
              {PARAM_KEYS.map((k) => (
                <tr key={k}>
                  <th scope="row">{PARAM_SPECS[k].label}</th>
                  <td className="num">
                    {a.params[k]} {PARAM_SPECS[k].unit}
                  </td>
                  <td className="num">
                    {trajectory.params[k]} {PARAM_SPECS[k].unit}
                  </td>
                </tr>
              ))}
              {summaryRows(a).map(([k, va], i) => (
                <tr key={k} className={i === 0 ? 'is-first-result' : undefined}>
                  <th scope="row">{k}</th>
                  <td className="num">{va}</td>
                  <td className="num">{summaryRows(trajectory)[i][1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small table-note">Only Run B (active) is animated. Run A is a static reference.</p>
        </section>
      )}
    </div>
  )
}
