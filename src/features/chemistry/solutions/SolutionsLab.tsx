import { useEffect, useId, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { AMOUNT_UNITS, fromLitres, sig, solveDilution, solveMolarity, toLitres, toMol, VOLUME_UNITS, volumeLabel, type AmountUnit, type DilutionSolveFor, type MolaritySolveFor, type VolumeUnit } from '../../../chem/solutions'
import { DEFAULT_SOLUTIONS, parseSolutionsState, solutionsEntries, withSolutionsParams, type DilutionForm, type MolarityForm, type SolutionsState, type SolutionsTool } from '../../../lib/solutionsUrl'
import { SourceLinks } from '../../guide/SourceLinks'

/* ---------- Small inputs ---------- */

/** A number typed as text: only complete, positive numbers reach the calculation. */
function NumberField({ label, value, onChange, unit, describedBy }: { label: string; value: string; onChange: (t: string) => void; unit?: React.ReactNode; describedBy?: string }) {
  const id = useId()
  return (
    <div className="sol-field">
      <label htmlFor={id} className="param-label">
        {label}
      </label>
      <div className="sol-input-row">
        <input id={id} className="param-input sol-input" type="text" inputMode="decimal" autoComplete="off" value={value} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
        {unit}
      </div>
    </div>
  )
}

function UnitSelect<U extends string>({ label, value, options, onChange }: { label: string; value: U; options: readonly { id: U; label: string }[]; onChange: (u: U) => void }) {
  return (
    <select className="select sol-unit" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as U)}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

const parse = (t: string) => (/^\s*(\d+\.?\d*|\.\d+)\s*$/.test(t) ? Number(t) : /^\s*-/.test(t) ? -1 : Number.NaN)
const text = (n: number) => String(n)

/* ---------- Molarity ---------- */

type MolarityText = { amount: string; volume: string; molarity: string }

function MolarityTool({ form, onForm }: { form: MolarityForm; onForm: (f: MolarityForm) => void }) {
  const [t, setT] = useState<MolarityText>({ amount: text(form.amount), volume: text(form.volume), molarity: text(form.molarity) })
  const statusId = useId()
  const amountMol = toMol(parse(t.amount), form.amountUnit)
  const volumeL = toLitres(parse(t.volume), form.volumeUnit)
  const r = solveMolarity({ solveFor: form.solveFor, amount: amountMol, volume: volumeL, molarity: parse(t.molarity) })

  // Each complete, positive number updates the form (and the link); while a field is incomplete,
  // the link keeps that field's last valid value.
  const set = (k: keyof MolarityText, v: string) => {
    setT((x) => ({ ...x, [k]: v }))
    const n = parse(v)
    if (n > 0) onForm({ ...form, [k]: n })
  }
  const unitV = volumeLabel(form.volumeUnit)
  return (
    <div className="sol-tool">
      <fieldset className="sol-solve-for">
        <legend className="param-label">Solve for</legend>
        <div className="segmented" role="group" aria-label="Solve for">
          {(
            [
              ['molarity', 'Molarity'],
              ['amount', 'Amount of solute'],
              ['volume', 'Volume of solution'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="segmented-option" aria-pressed={form.solveFor === id} onClick={() => onForm({ ...form, solveFor: id as MolaritySolveFor })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sol-grid">
        {form.solveFor !== 'amount' && (
          <NumberField
            label="Amount of solute"
            value={t.amount}
            onChange={(v) => set('amount', v)}
            describedBy={statusId}
            unit={<UnitSelect label="Amount unit" value={form.amountUnit} options={AMOUNT_UNITS} onChange={(u: AmountUnit) => onForm({ ...form, amountUnit: u })} />}
          />
        )}
        {form.solveFor !== 'volume' && (
          <NumberField
            label="Volume of solution (the final total volume, not the solvent added)"
            value={t.volume}
            onChange={(v) => set('volume', v)}
            describedBy={statusId}
            unit={<UnitSelect label="Volume unit" value={form.volumeUnit} options={VOLUME_UNITS} onChange={(u: VolumeUnit) => onForm({ ...form, volumeUnit: u })} />}
          />
        )}
        {form.solveFor !== 'molarity' && <NumberField label="Molarity" value={t.molarity} onChange={(v) => set('molarity', v)} describedBy={statusId} unit={<span className="param-unit">M (mol/L)</span>} />}
      </div>

      <div id={statusId} className={`sol-result${r.ok ? '' : ' is-problem'}`} role="status" aria-live="polite">
        {r.ok ? (
          <>
            <p className="sol-answer">
              {form.solveFor === 'molarity' && <>Molarity = {sig(r.value.molarity)} M</>}
              {form.solveFor === 'amount' && (
                <>
                  Amount of solute = {sig(r.value.amount)} mol{form.amountUnit === 'mmol' && <> = {sig(r.value.amount * 1000)} mmol</>}
                </>
              )}
              {form.solveFor === 'volume' && (
                <>
                  Volume of solution = {sig(r.value.volume)} L{form.volumeUnit !== 'L' && <> = {sig(fromLitres(r.value.volume, form.volumeUnit))} {unitV}</>}
                </>
              )}
            </p>
            <ol className="sol-steps">
              {form.solveFor !== 'amount' && form.amountUnit === 'mmol' && (
                <li>
                  <code>
                    n = {t.amount} mmol × (1 mol / 1000 mmol) = {sig(r.value.amount, 4)} mol
                  </code>
                </li>
              )}
              {form.solveFor !== 'volume' && form.volumeUnit !== 'L' && form.volumeUnit !== 'dm3' && (
                <li>
                  <code>
                    V = {t.volume} {unitV} × (1 L / 1000 {unitV}) = {sig(r.value.volume, 4)} L
                  </code>
                </li>
              )}
              <li>
                {form.solveFor === 'molarity' && (
                  <code>
                    M = n / V = {sig(r.value.amount, 4)} mol / {sig(r.value.volume, 4)} L = {sig(r.value.molarity)} mol/L
                  </code>
                )}
                {form.solveFor === 'amount' && (
                  <code>
                    n = M × V = {sig(r.value.molarity, 4)} mol/L × {sig(r.value.volume, 4)} L = {sig(r.value.amount)} mol
                  </code>
                )}
                {form.solveFor === 'volume' && (
                  <code>
                    V = n / M = {sig(r.value.amount, 4)} mol / {sig(r.value.molarity, 4)} mol/L = {sig(r.value.volume)} L
                  </code>
                )}
              </li>
            </ol>
            <p className="muted small">Shown to 3 significant figures; the calculation keeps full precision.</p>
          </>
        ) : (
          <p>
            <strong>Can’t calculate:</strong> {r.reason}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------- Dilution ---------- */

type DilutionText = { c1: string; v1: string; c2: string; v2: string }

function DilutionTool({ form, onForm }: { form: DilutionForm; onForm: (f: DilutionForm) => void }) {
  const [t, setT] = useState<DilutionText>({ c1: text(form.c1), v1: text(form.v1), c2: text(form.c2), v2: text(form.v2) })
  const statusId = useId()
  const r = solveDilution({ solveFor: form.solveFor, c1: parse(t.c1), v1: toLitres(parse(t.v1), form.v1Unit), c2: parse(t.c2), v2: toLitres(parse(t.v2), form.v2Unit) })
  const set = (k: keyof DilutionText, v: string) => {
    setT((x) => ({ ...x, [k]: v }))
    const n = parse(v)
    if (n > 0) onForm({ ...form, [k]: n })
  }
  const field = (k: keyof DilutionText, label: string) => {
    if (form.solveFor === k) return null
    const unitKey = k === 'v1' ? 'v1Unit' : k === 'v2' ? 'v2Unit' : null
    return (
      <NumberField
        key={k}
        label={label}
        value={t[k]}
        onChange={(v) => set(k, v)}
        describedBy={statusId}
        unit={unitKey ? <UnitSelect label={`${label} unit`} value={form[unitKey]} options={VOLUME_UNITS} onChange={(u: VolumeUnit) => onForm({ ...form, [unitKey]: u })} /> : <span className="param-unit">M</span>}
      />
    )
  }
  const solvedUnit = form.solveFor === 'v1' ? form.v1Unit : form.v2Unit
  return (
    <div className="sol-tool">
      <fieldset className="sol-solve-for">
        <legend className="param-label">Solve for</legend>
        <div className="segmented" role="group" aria-label="Solve for">
          {(
            [
              ['c2', 'Final concentration C₂'],
              ['v2', 'Final volume V₂'],
              ['v1', 'Stock volume V₁'],
              ['c1', 'Stock concentration C₁'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className="segmented-option" aria-pressed={form.solveFor === id} onClick={() => onForm({ ...form, solveFor: id as DilutionSolveFor })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sol-grid">
        {field('c1', 'Stock concentration C₁')}
        {field('v1', 'Volume of stock taken V₁')}
        {field('c2', 'Final concentration C₂')}
        {field('v2', 'Final volume of solution V₂ (total, after adding solvent)')}
        {(form.solveFor === 'v1' || form.solveFor === 'v2') && (
          <div className="sol-field">
            <span className="param-label">Show {form.solveFor === 'v1' ? 'V₁' : 'V₂'} in</span>
            <UnitSelect label="Result unit" value={solvedUnit} options={VOLUME_UNITS} onChange={(u: VolumeUnit) => onForm({ ...form, [form.solveFor === 'v1' ? 'v1Unit' : 'v2Unit']: u })} />
          </div>
        )}
      </div>

      <div id={statusId} className={`sol-result${r.ok ? '' : ' is-problem'}`} role="status" aria-live="polite">
        {r.ok ? (
          <>
            <p className="sol-answer">
              {form.solveFor === 'c2' && <>C₂ = {sig(r.value.c2)} M</>}
              {form.solveFor === 'c1' && <>C₁ = {sig(r.value.c1)} M</>}
              {form.solveFor === 'v2' && (
                <>
                  V₂ = {sig(r.value.v2)} L{form.v2Unit !== 'L' && <> = {sig(fromLitres(r.value.v2, form.v2Unit))} {volumeLabel(form.v2Unit)}</>}
                </>
              )}
              {form.solveFor === 'v1' && (
                <>
                  V₁ = {sig(r.value.v1)} L{form.v1Unit !== 'L' && <> = {sig(fromLitres(r.value.v1, form.v1Unit))} {volumeLabel(form.v1Unit)}</>}
                </>
              )}
            </p>
            <ol className="sol-steps">
              <li>
                <code>
                  Volumes in litres: V₁ = {sig(r.value.v1, 4)} L, V₂ = {sig(r.value.v2, 4)} L
                </code>
              </li>
              <li>
                <code>
                  {form.solveFor === 'c2' && <>C₂ = C₁V₁ / V₂ = ({sig(r.value.c1, 4)} M × {sig(r.value.v1, 4)} L) / {sig(r.value.v2, 4)} L = {sig(r.value.c2)} M</>}
                  {form.solveFor === 'v2' && <>V₂ = C₁V₁ / C₂ = ({sig(r.value.c1, 4)} M × {sig(r.value.v1, 4)} L) / {sig(r.value.c2, 4)} M = {sig(r.value.v2)} L</>}
                  {form.solveFor === 'v1' && <>V₁ = C₂V₂ / C₁ = ({sig(r.value.c2, 4)} M × {sig(r.value.v2, 4)} L) / {sig(r.value.c1, 4)} M = {sig(r.value.v1)} L</>}
                  {form.solveFor === 'c1' && <>C₁ = C₂V₂ / V₁ = ({sig(r.value.c2, 4)} M × {sig(r.value.v2, 4)} L) / {sig(r.value.v1, 4)} L = {sig(r.value.c1)} M</>}
                </code>
              </li>
              <li>
                <code>Amount of solute n = C₁V₁ = C₂V₂ = {sig(r.value.amount)} mol (unchanged)</code>
              </li>
            </ol>
            <p className="small">
              Dilution factor V₂/V₁ = {sig(r.value.factor)}. Take {sig(fromLitres(r.value.v1, form.v1Unit))} {volumeLabel(form.v1Unit)} of the stock, then add solvent until the total volume
              of solution is {sig(fromLitres(r.value.v2, form.v2Unit))} {volumeLabel(form.v2Unit)}.
            </p>
          </>
        ) : (
          <p>
            <strong>Can’t calculate:</strong> {r.reason}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------- Worked examples (OpenStax Chemistry 2e §3.3, verified in unit tests) ---------- */

const EXAMPLES: readonly { id: string; label: string; textbook: string; state: SolutionsState }[] = [
  { id: '3.14', label: 'Example 3.14: 0.133 mol sucrose in 355 mL', textbook: '0.375 M', state: { ...DEFAULT_SOLUTIONS, tool: 'molarity' } },
  { id: '3.19', label: 'Example 3.19: 0.850 L of 5.00 M diluted to 1.80 L', textbook: '2.36 M', state: { ...DEFAULT_SOLUTIONS, tool: 'dilution' } },
  {
    id: '3.20',
    label: 'Example 3.20: 11 mL of 0.45 M diluted to 0.12 M',
    textbook: '0.041 L',
    state: { ...DEFAULT_SOLUTIONS, tool: 'dilution', dilution: { solveFor: 'v2', c1: 0.45, v1: 11, v1Unit: 'mL', c2: 0.12, v2: 1, v2Unit: 'L' } },
  },
  {
    id: '3.21',
    label: 'Example 3.21: 5.00 L of 0.100 M from 1.59 M stock',
    textbook: '0.314 L',
    state: { ...DEFAULT_SOLUTIONS, tool: 'dilution', dilution: { solveFor: 'v1', c1: 1.59, v1: 1, v1Unit: 'L', c2: 0.1, v2: 5, v2Unit: 'L' } },
  },
]

/* ---------- Lab ---------- */

export function SolutionsLab({ baseParams }: { baseParams: Record<string, string> }) {
  const [state, setState] = useState<SolutionsState>(() => parseSolutionsState(window.location.search).state)
  // Remount the tool when an example is loaded, so its text fields start from the example.
  const [formKey, setFormKey] = useState(0)
  const entries = solutionsEntries(state)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    const search = withSolutionsParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])

  const setTool = (tool: SolutionsTool) => setState((s) => ({ ...s, tool }))
  return (
    <section className="panel sol-lab" aria-labelledby="sol-heading">
      <h2 id="sol-heading" className="panel-title">
        Solutions: molarity and dilution
      </h2>
      <div className="segmented" role="group" aria-label="Calculator">
        <button type="button" className="segmented-option" aria-pressed={state.tool === 'molarity'} onClick={() => setTool('molarity')}>
          Molarity
        </button>
        <button type="button" className="segmented-option" aria-pressed={state.tool === 'dilution'} onClick={() => setTool('dilution')}>
          Dilution
        </button>
      </div>
      {state.tool === 'molarity' ? (
        <MolarityTool key={`m${formKey}`} form={state.molarity} onForm={(molarity) => setState((s) => ({ ...s, molarity }))} />
      ) : (
        <DilutionTool key={`d${formKey}`} form={state.dilution} onForm={(dilution) => setState((s) => ({ ...s, dilution }))} />
      )}
      <details className="sol-examples">
        <summary>Worked examples from the textbook</summary>
        <ul className="guide-list small">
          {EXAMPLES.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="relation-link"
                onClick={() => {
                  setState(e.state)
                  setFormKey((k) => k + 1)
                }}
              >
                Load {e.label}
              </button>{' '}
              (textbook answer: {e.textbook})
            </li>
          ))}
        </ul>
        <p className="muted small">
          <SourceLinks ids={['chem-3-3']} />
        </p>
      </details>
      <ShareActions subject="chemistry" params={{ ...baseParams, ...entries }} restores="this calculation" />
    </section>
  )
}

export function SolutionsPanel() {
  return (
    <section className="panel info" aria-labelledby="sol-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Chemistry · solutions</p>
        <h2 id="sol-panel-heading" className="info-title">
          Concentration and dilution
        </h2>
      </header>
      <div className="info-body">
        <p className="small">
          <strong>Molarity</strong> is the amount of solute (in moles) per litre of <em>solution</em>: M = n / V, in mol/L (symbol M).
          <SourceLinks ids={['chem-3-3']} />
        </p>
        <p className="small">
          <strong>Volume of solution vs volume of solvent.</strong> V is the volume of the finished solution: the solute and the solvent together, measured after mixing. The volume
          of solvent you add is a different quantity, so this calculator only takes solution volumes and never treats one as the other.
        </p>
        <p className="small">
          <strong>Dilution</strong> adds solvent only, so the amount of solute does not change: n = C₁V₁ = C₂V₂. A dilution can only lower the concentration, and the final volume
          is at least the volume of stock taken. Requests that break this are refused, with the reason.
          <SourceLinks ids={['chem-3-3']} />
        </p>
        <p className="small">
          <strong>Units.</strong> 1 L = 1 dm³ = 1000 mL; 1 mL = 1 cm³. Volumes are converted to litres before calculating.
          <SourceLinks ids={['chem-1-4']} />
        </p>
        <h3 className="section-title">Assumptions</h3>
        <ul className="guide-list small">
          <li>The solute is fully dissolved and stays in solution.</li>
          <li>Dilution adds only solvent; no solute is added or lost.</li>
          <li>Inputs are limited to 20 M and 100 L. These are calculator limits, not chemical ones; real solutes have a maximum solubility that is not modelled.</li>
        </ul>
      </div>
    </section>
  )
}
