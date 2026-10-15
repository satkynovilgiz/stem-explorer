import { Pause, Play, SkipBack } from 'lucide-react'
import { useId } from 'react'
import { formatSig } from '../../physics/projectile'
import { useSimTime, type SimClock } from './clock'
import { PLAYBACK_RATES, type PlaybackRate, type PlaybackStatus } from './state'

interface Props {
  clock: SimClock
  flightTime: number
  status: PlaybackStatus
  rate: PlaybackRate
  onLaunch: () => void
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onScrub: (t: number) => void
  onRateChange: (rate: PlaybackRate) => void
}

export function PlaybackBar(props: Props) {
  const { clock, flightTime, status, rate } = props
  const t = useSimTime(clock)
  const id = useId()
  // 0.01 s steps (0.001 s for very short flights) keep keyboard scrubbing and typed times predictable.
  const step = flightTime >= 0.2 ? 0.01 : 0.001

  const primary =
    status === 'playing'
      ? { label: 'Pause', icon: <Pause size={16} aria-hidden="true" />, onClick: props.onPause }
      : status === 'paused'
        ? { label: 'Resume', icon: <Play size={16} aria-hidden="true" />, onClick: props.onResume }
        : {
            label: status === 'landed' ? 'Launch again' : 'Launch',
            icon: <Play size={16} aria-hidden="true" />,
            onClick: props.onLaunch,
          }

  return (
    <div className="playback" role="group" aria-label="Playback">
      <div className="playback-buttons">
        <button type="button" className="button playback-primary" onClick={primary.onClick}>
          {primary.icon}
          {primary.label}
        </button>
        <button type="button" className="tool-button bordered" onClick={props.onReset} title="Return to t = 0 s, keeping the inputs">
          <SkipBack size={16} aria-hidden="true" />
          <span>Reset experiment</span>
        </button>
      </div>

      <div className="playback-time">
        <label htmlFor={`${id}-scrub`} className="playback-time-label">
          Time <output className="playback-clock">{formatSig(t, 3)} s</output>
          <span className="muted"> of {formatSig(flightTime, 3)} s</span>
        </label>
        <input
          id={`${id}-scrub`}
          type="range"
          className="param-slider playback-scrubber"
          min={0}
          max={Math.max(flightTime, 0)}
          step={step}
          value={Math.min(t, flightTime)}
          disabled={flightTime === 0}
          aria-valuetext={`${formatSig(t, 3)} seconds of ${formatSig(flightTime, 3)}`}
          onChange={(e) => props.onScrub(Number(e.target.value))}
        />
      </div>

      <div className="control-group" role="group" aria-label="Playback speed">
        <span className="control-group-label" aria-hidden="true">
          Speed
        </span>
        <div className="segmented">
          {PLAYBACK_RATES.map((r) => (
            <button
              key={r}
              type="button"
              className="segmented-option"
              aria-pressed={rate === r}
              aria-label={`Playback speed ${r} times`}
              onClick={() => props.onRateChange(r)}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
