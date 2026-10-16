import { useId, useState } from 'react'

export interface RangeSpec {
  label: string
  /** Optional symbol shown after the label, e.g. "v₀". */
  symbol?: string
  /** Optional unit shown after the number; omit for unitless quantities. */
  unit?: string
  min: number
  max: number
  step: number
  decimals: number
}

interface Props {
  spec: RangeSpec
  value: number
  onChange: (value: number) => void
  /** Extra hint shown after the range. */
  note?: string
  /** Hide the slider (e.g. for coordinate entry). */
  showSlider?: boolean
  /**
   * When false, typed numbers are passed on unclamped (only rounded to the decimals) so the caller can
   * clamp them itself and explain what happened.
   */
  clamp?: boolean
}

/** Strict number parsing: empty, partial ("1.", "-", "e") or non-numeric text is rejected. */
function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace('−', '-')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(trimmed) || /\.$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

function clampToStep(spec: RangeSpec, value: number): number {
  const clamped = Math.min(spec.max, Math.max(spec.min, value))
  const stepped = Math.round((clamped - spec.min) / spec.step) * spec.step + spec.min
  return Number(Math.min(spec.max, Math.max(spec.min, stepped)).toFixed(spec.decimals))
}

/**
 * Slider plus a typed number field. The slider commits as it moves; typed text commits only on
 * Enter or when the field loses focus, and only if it is a complete number — partial input never
 * reaches the model. Out-of-range numbers are clamped to the range and rounded to the step.
 */
export function RangeField({ spec, value, onChange, note, showSlider = true, clamp = true }: Props) {
  const id = useId()
  const formatted = value.toFixed(spec.decimals)
  // While typing, show the draft; otherwise always show the committed value.
  const [draft, setDraft] = useState<string | null>(null)
  // The text shown when editing began (or after the last commit). Leaving the field with this text
  // unchanged commits nothing, so display rounding never silently changes the stored value.
  const [baseline, setBaseline] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const text = draft ?? formatted
  const unit = spec.unit ? ` ${spec.unit}` : ''
  const rangeText = `${spec.min}–${spec.max}${unit}`

  const commit = (keepEditing: boolean) => {
    setError(null)
    if (text === baseline) {
      // Nothing was edited (or this exact text was already committed with Enter).
      setDraft(keepEditing ? text : null)
      return
    }
    const parsed = parseNumber(text)
    const next = parsed === null ? null : clamp ? clampToStep(spec, parsed) : Number(parsed.toFixed(spec.decimals))
    if (next !== null) onChange(next)
    const shown = next !== null ? next.toFixed(spec.decimals) : null
    setDraft(keepEditing ? shown : null)
    setBaseline(keepEditing ? shown : null)
  }

  return (
    <div className="param">
      <div className="param-head">
        <label htmlFor={`${id}-number`} className="param-label">
          {spec.label} {spec.symbol && <span className="param-symbol">{spec.symbol}</span>}
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
            onFocus={() => {
              setDraft(formatted)
              setBaseline(formatted)
            }}
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
            onBlur={() => {
              commit(false)
              setBaseline(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit(true)
              if (e.key === 'Escape') {
                setError(null)
                setDraft(formatted)
              }
            }}
          />
          {spec.unit && <span className="param-unit">{spec.unit}</span>}
        </div>
      </div>
      {showSlider && (
        <input
          type="range"
          className="param-slider"
          aria-label={`${spec.label} slider`}
          aria-valuetext={`${formatted}${unit}`}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      <p id={`${id}-hint`} className={`param-hint${error ? ' is-error' : ''}`}>
        {error ?? `Range ${rangeText}.${note ? ` ${note}` : ''}`}
      </p>
    </div>
  )
}
