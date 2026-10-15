import { useId, useState } from 'react'
import { normalizeParam, parseNumber, PARAM_SPECS, type ParamKey } from '../../physics/projectile'

interface Props {
  paramKey: ParamKey
  value: number
  onChange: (key: ParamKey, value: number) => void
  note?: string
}

/**
 * Slider plus a typed number field. The slider commits as it moves; typed text commits only on
 * Enter or when the field loses focus, and only if it is a complete number — partial input such as
 * "", "-" or "1." never reaches the simulation. Out-of-range numbers are clamped to the range.
 */
export function ParamControl({ paramKey, value, onChange, note }: Props) {
  const spec = PARAM_SPECS[paramKey]
  const id = useId()
  const formatted = value.toFixed(spec.decimals)
  // While typing, show the draft; otherwise always show the committed value (so slider moves,
  // Restore defaults and shared links are reflected without syncing state).
  const [draft, setDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const text = draft ?? formatted

  const rangeText = `${spec.min}–${spec.max} ${spec.unit}`

  /** Commits a complete number (clamped into range); anything else reverts to the current value. */
  const commit = (keepEditing: boolean) => {
    const parsed = parseNumber(text)
    const next = parsed === null ? null : normalizeParam(paramKey, parsed)
    setError(null)
    if (next !== null) onChange(paramKey, next)
    setDraft(keepEditing && next !== null ? next.toFixed(spec.decimals) : null)
  }

  return (
    <div className="param">
      <div className="param-head">
        <label htmlFor={`${id}-number`} className="param-label">
          {spec.label} <span className="param-symbol">{spec.symbol}</span>
        </label>
        <div className="param-number">
          <input
            id={`${id}-number`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className="param-input"
            value={text}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint`}
            onFocus={() => setDraft(formatted)}
            onChange={(e) => {
              setDraft(e.target.value)
              const parsed = parseNumber(e.target.value)
              setError(
                parsed === null
                  ? e.target.value.trim() === ''
                    ? 'Enter a number.'
                    : 'Not a complete number yet.'
                  : parsed < spec.min || parsed > spec.max
                    ? `Will be limited to ${rangeText}.`
                    : null,
              )
            }}
            onBlur={() => commit(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(true)
              if (e.key === 'Escape') {
                setError(null)
                setDraft(formatted)
              }
            }}
          />
          <span className="param-unit">{spec.unit}</span>
        </div>
      </div>
      <input
        type="range"
        className="param-slider"
        aria-label={`${spec.label} slider`}
        aria-valuetext={`${value.toFixed(spec.decimals)} ${spec.unit}`}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(paramKey, Number(e.target.value))}
      />
      <p id={`${id}-hint`} className={`param-hint${error ? ' is-error' : ''}`}>
        {error ?? `Range ${rangeText}.${note ? ` ${note}` : ''}`}
      </p>
    </div>
  )
}
