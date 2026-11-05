import '../../styles/calculators.css'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import type { SubjectId } from '../../data/subjects'
import { calculatorsOf, initialValues, type Calculator } from '../../calc'
import type { Field, Values } from '../../calc/types'
import { SourceLinks } from '../guide/SourceLinks'

/** The open calculator lives in the address (`calc`), so a link or Back reopens the same one. */
function useOpenCalculator(list: readonly Calculator[]): [Calculator, (id: string) => void] {
  const pick = (id: string | null) => list.find((c) => c.id === id) ?? list[0]
  const [calc, setCalc] = useState(() => pick(new URLSearchParams(window.location.search).get('calc')))
  const open = (id: string) => {
    setCalc(pick(id))
    const params = new URLSearchParams(window.location.search)
    params.set('calc', id)
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`)
  }
  return [calc, open]
}

/** A subject's calculators: a list to choose from and the open calculator. */
export function CalculatorBench({ subject }: { subject: SubjectId }) {
  const list = calculatorsOf(subject)
  const [calc, open] = useOpenCalculator(list)
  return (
    <div className="calc-bench">
      <ul className="calc-picker" aria-label="Choose a calculator">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" className="calc-pick" aria-pressed={c.id === calc.id} onClick={() => open(c.id)}>
              <span className="calc-pick-title">{c.title}</span>
              <span className="calc-pick-text">{c.summary}</span>
            </button>
          </li>
        ))}
      </ul>
      <CalculatorPanel key={calc.id} calc={calc} />
    </div>
  )
}

/** `cv=formula:H2O,mass:5` opens the calculator with those inputs (a link from an explanation). */
function presetFromUrl(calc: Calculator): Values {
  const out: Record<string, string> = {}
  for (const pair of (new URLSearchParams(window.location.search).get('cv') ?? '').split(',')) {
    const i = pair.indexOf(':')
    if (i > 0 && calc.fields.some((f) => f.id === pair.slice(0, i))) out[pair.slice(0, i)] = pair.slice(i + 1).slice(0, 40)
  }
  return out
}

function CalculatorPanel({ calc }: { calc: Calculator }) {
  const id = useId()
  const [values, setValues] = useState<Values>(() => ({ ...initialValues(calc), ...presetFromUrl(calc) }))
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }))
  const shown = calc.fields.filter((f) => f.showIf?.(values) ?? true)
  const result = calc.compute(values)
  const changed = calc.fields.some((f) => values[f.id] !== f.initial)
  return (
    <section className="calc-panel" aria-labelledby={`${id}-title`}>
      <div className="calc-head">
        <h2 id={`${id}-title`} className="calc-title">
          {calc.title}
        </h2>
        {changed && (
          <button type="button" className="tool-button bordered" onClick={() => setValues(initialValues(calc))}>
            <RotateCcw size={14} aria-hidden="true" />
            <span>Back to the example</span>
          </button>
        )}
      </div>
      <p className="calc-summary">{calc.summary}</p>
      <p className="calc-formula">
        <span className="visually-hidden">Formula: </span>
        <code>{calc.formula}</code>
      </p>

      <form className="calc-form" onSubmit={(e) => e.preventDefault()}>
        {shown.map((f) => (
          <FieldInput key={f.id} field={f} value={values[f.id] ?? ''} onChange={(v) => set(f.id, v)} error={!result.ok && result.field === f.id ? result.reason : undefined} />
        ))}
      </form>

      {/* Screen readers hear the main answer as it changes, not every step on each keystroke. */}
      <p className="visually-hidden" role="status">
        {result.ok ? `${result.answers[0].label}: ${result.answers[0].value}` : `Can’t calculate: ${result.reason}`}
      </p>
      <div className={`sol-result calc-result${result.ok ? '' : ' is-problem'}`}>
        {result.ok ? (
          <>
            <dl className="calc-answers">
              {result.answers.map((a, i) => (
                <div key={a.label} className={i === 0 ? 'is-main' : undefined}>
                  <dt>{a.label}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
            {result.note && <p className="calc-note">{result.note}</p>}
            <h3 className="calc-steps-title">Steps</h3>
            <ol className="sol-steps">
              {result.steps.map((s) => (
                <li key={s}>
                  <code>{s}</code>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p>
            {result.field ? (
              <>
                <strong>Can’t calculate yet.</strong> Fix the field marked above.
              </>
            ) : (
              <>
                <strong>Can’t calculate:</strong> {result.reason}
              </>
            )}
          </p>
        )}
      </div>

      <p className="calc-assumes">
        <strong>Assumes:</strong> {calc.assumptions}
      </p>
      <p className="calc-sources small">
        <SourceLinks ids={calc.sourceIds} />
      </p>
      {calc.related && (
        <AppLink href={calc.related.href} className="chem-text-link calc-related">
          See it modelled: {calc.related.label} <ArrowRight size={15} aria-hidden="true" />
        </AppLink>
      )}
    </section>
  )
}

function FieldInput({ field, value, onChange, error }: { field: Field; value: string; onChange: (v: string) => void; error?: string }) {
  const id = useId()
  if (field.kind === 'choice') {
    return (
      <fieldset className="calc-field calc-choice">
        <legend className="param-label">{field.label}</legend>
        <div className="segmented" role="group" aria-label={field.label}>
          {field.options.map((o) => (
            <button key={o.value} type="button" className="segmented-option" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
    )
  }
  return (
    <div className={`calc-field${field.kind === 'text' ? ' is-wide' : ''}`}>
      <label htmlFor={id} className="param-label">
        {field.label}
      </label>
      <div className="sol-input-row">
        <input
          id={id}
          className="param-input calc-input"
          type="text"
          inputMode={field.kind === 'number' ? 'decimal' : 'text'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={[field.kind === 'text' && field.hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {field.kind === 'number' && field.unit && <span className="param-unit">{field.unit}</span>}
      </div>
      {field.kind === 'text' && field.hint && (
        <p id={`${id}-hint`} className="muted small calc-hint">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="calc-field-error">
          {error}
        </p>
      )}
    </div>
  )
}
