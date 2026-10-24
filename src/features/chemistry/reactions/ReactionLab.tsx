import { Check, Minus, Plus, RotateCcw, X } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { checkBalance, chargeText, formatSig, isValidCoefficient, limitingReactant, molarMass, moleRatio, parseFormula, percentYield, type Equation, type Species } from '../../../chem/stoichiometry'
import { ELEMENTS } from '../../../data/chemistry/elements'
import { findReaction, REACTIONS, STATE_NAME, STATE_TEXT, TYPE_LABEL, TYPE_NOTE, WEIGHT_TEXT, WEIGHTS, type Reaction, type ReactionType } from '../../../data/chemistry/reactions'
import { Formula } from '../Formula'
import { SourceLinks } from '../../guide/SourceLinks'

const MAX_COEFFICIENT = 30
/** Largest amount accepted in the calculators (mol or g); beyond it the input is refused, not clipped. */
const MAX_AMOUNT = 1e6

/* ---------- Equation display ---------- */

function SpeciesText({ s, coefficient }: { s: Species; coefficient?: number }) {
  return (
    <span className="rx-species">
      {coefficient !== undefined && coefficient !== 1 && <span className="rx-coef">{coefficient}</span>}
      <Formula formula={s.formula} />
      {s.charge ? <sup className="rx-charge">{chargeText(s.charge)}</sup> : null}
      {s.state && <span className="rx-state" title={STATE_NAME[s.state]}>{STATE_TEXT[s.state]}</span>}
    </span>
  )
}

export function EquationText({ equation, coefficients, label }: { equation: Equation; coefficients: readonly number[]; label?: string }) {
  const n = equation.reactants.length
  const side = (list: readonly Species[], offset: number) =>
    list.map((s, i) => (
      <span key={i} className="rx-term">
        {i > 0 && <span className="rx-plus">+</span>}
        <SpeciesText s={s} coefficient={coefficients[offset + i]} />
      </span>
    ))
  return (
    <p className="rx-equation" aria-label={label}>
      {side(equation.reactants, 0)}
      <span className="rx-arrow" aria-label="yields">
        →
      </span>
      {side(equation.products, n)}
    </p>
  )
}

/* ---------- Conceptual particle picture ---------- */

/** CPK/Jmol colours (https://jmol.sourceforge.net/jscolors/) for the elements the library uses; a labelling convention. */
const JMOL: Record<string, string> = { Na: '#ab5cf2', Mg: '#8aff00', Cl: '#1ff01f', Ca: '#3dff00', Ag: '#c0c0c0' }
const colorFor = (el: string) => (ELEMENTS as Record<string, { color: string } | undefined>)[el]?.color ?? JMOL[el] ?? '#b0b0b0'

/** Each formula unit drawn as touching circles in a row; positions and sizes carry no meaning. */
function ParticlePicture({ equation, coefficients }: { equation: Equation; coefficients: readonly number[] }) {
  const n = equation.reactants.length
  const total = coefficients.reduce((a, b) => a + b, 0)
  if (total > 24 || equation.reactants.some((s) => s.charge) || coefficients.some((c) => !isValidCoefficient(c))) {
    return <p className="small muted">The particle picture is shown for up to 24 formula units of neutral species.</p>
  }
  const draw = (list: readonly Species[], offset: number) => {
    const units = list.flatMap((s, i) => Array.from({ length: coefficients[offset + i] }, () => s))
    return (
      <svg className="rx-particles" viewBox={`0 0 220 ${Math.max(1, Math.ceil(units.length / 3)) * 34 + 6}`} role="img" aria-label={units.map((u) => u.formula).join(', ')}>
        {units.map((u, k) => {
          const atoms = Object.entries(parseFormula(u.formula)).flatMap(([el, c]) => Array.from({ length: c }, () => el))
          const x0 = (k % 3) * 72 + 8
          const y = Math.floor(k / 3) * 34 + 20
          const r = Math.min(8, 56 / atoms.length / 2)
          return (
            <g key={k}>
              {atoms.map((el, a) => (
                <g key={a}>
                  <circle cx={x0 + r + a * r * 2} cy={y} r={r} fill={colorFor(el)} stroke="#0f1214" strokeWidth={0.8} />
                  {r >= 4 && (
                    <text x={x0 + r + a * r * 2} y={y} textAnchor="middle" dominantBaseline="central" className="rx-atom-label" fontSize={el.length > 1 ? r * 0.9 : r * 1.2}>
                      {el}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    )
  }
  return (
    <figure className="rx-particle-figure">
      <div className="rx-particle-sides">
        <div>
          <p className="small muted">Reactants</p>
          {draw(equation.reactants, 0)}
        </div>
        <div>
          <p className="small muted">Products</p>
          {draw(equation.products, n)}
        </div>
      </div>
      <figcaption className="small muted">
        Conceptual particle picture: one group of circles per formula unit, each circle labelled with its element and coloured by the CPK convention. Sizes, positions and spacing mean nothing,
        and it shows no mechanism, speed or conditions.
      </figcaption>
    </figure>
  )
}

/* ---------- Balancing ---------- */

function CoefficientEditor({ reaction, coefficients, onChange }: { reaction: Reaction; coefficients: number[]; onChange: (c: number[]) => void }) {
  const species = [...reaction.equation.reactants, ...reaction.equation.products]
  const n = reaction.equation.reactants.length
  const set = (k: number, v: number) => onChange(coefficients.map((c, i) => (i === k ? v : c)))
  return (
    <div className="rx-editor" role="group" aria-label="Coefficients">
      {species.map((s, k) => (
        <div key={k} className={`rx-editor-item${k === n ? ' is-first-product' : ''}`}>
          <span className="small muted">{k < n ? 'Reactant' : 'Product'}</span>
          <div className="rx-stepper">
            <button type="button" className="icon-button bordered" aria-label={`Decrease the coefficient of ${s.name}`} disabled={coefficients[k] <= 1} onClick={() => set(k, coefficients[k] - 1)}>
              <Minus size={14} aria-hidden="true" />
            </button>
            <input
              className="rx-coef-input"
              type="number"
              min={1}
              max={MAX_COEFFICIENT}
              step={1}
              value={coefficients[k]}
              aria-label={`Coefficient of ${s.name}`}
              onChange={(e) => {
                const v = Number(e.target.value)
                if (Number.isInteger(v) && v >= 1 && v <= MAX_COEFFICIENT) set(k, v)
              }}
            />
            <button type="button" className="icon-button bordered" aria-label={`Increase the coefficient of ${s.name}`} disabled={coefficients[k] >= MAX_COEFFICIENT} onClick={() => set(k, coefficients[k] + 1)}>
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <SpeciesText s={s} />
          <span className="small muted">{s.name}</span>
        </div>
      ))}
    </div>
  )
}

function BalanceTable({ equation, coefficients }: { equation: Equation; coefficients: readonly number[] }) {
  const n = equation.reactants.length
  const report = checkBalance(equation, coefficients.slice(0, n), coefficients.slice(n))
  const ionic = [...equation.reactants, ...equation.products].some((s) => s.charge)
  return (
    <>
      <div className="table-scroll">
        <table className="data-table rx-counts">
          <caption className="visually-hidden">Atoms of each element on each side</caption>
          <thead>
            <tr>
              <th scope="col">Element</th>
              <th scope="col">Reactants</th>
              <th scope="col">Products</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.elements.map((e) => (
              <tr key={e.element} className={e.balanced ? 'is-ok' : 'is-off'}>
                <th scope="row">{e.element}</th>
                <td>{e.left}</td>
                <td>{e.right}</td>
                <td>
                  <StatusMark ok={e.balanced} />
                </td>
              </tr>
            ))}
            {ionic && (
              <tr className={report.charge.balanced ? 'is-ok' : 'is-off'}>
                <th scope="row">Charge</th>
                <td>{signed(report.charge.left)}</td>
                <td>{signed(report.charge.right)}</td>
                <td>
                  <StatusMark ok={report.charge.balanced} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className={`rx-verdict ${report.balanced ? 'is-ok' : 'is-off'}`} role="status">
        {report.balanced
          ? report.lowestTerms
            ? `Balanced: every element${ionic ? ' and the charge' : ''} is conserved, in the smallest whole numbers.`
            : 'Balanced, but every coefficient shares a common factor. The convention is the smallest whole numbers: divide them all.'
          : `Not balanced yet: ${report.elements.filter((e) => !e.balanced).map((e) => e.element).join(', ')}${ionic && !report.charge.balanced ? `${report.elements.some((e) => !e.balanced) ? ' and ' : ''}charge` : ''} differ between the sides.`}
      </p>
    </>
  )
}

const signed = (q: number) => (q > 0 ? `+${q}` : q < 0 ? `−${-q}` : '0')

function StatusMark({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="rx-mark is-ok">
      <Check size={14} aria-hidden="true" /> Equal
    </span>
  ) : (
    <span className="rx-mark is-off">
      <X size={14} aria-hidden="true" /> Differs
    </span>
  )
}

/** Why balancing changes coefficients and never subscripts, using the reaction's own first species. */
function CoefficientVsSubscript({ reaction }: { reaction: Reaction }) {
  const s = reaction.equation.reactants[0]
  const counts = Object.entries(parseFormula(s.formula))
  return (
    <div className="inline-note rx-explainer">
      <p>
        <strong>Coefficient or subscript?</strong> A coefficient counts formula units: 2 <Formula formula={s.formula} /> means two units of {s.name}, so
        {' '}
        {counts.map(([el, c]) => `${2 * c} ${el}`).join(' and ')}. A subscript is part of the formula itself: changing it describes a different substance (H₂O is
        water; H₂O₂ is hydrogen peroxide). Balancing therefore changes only coefficients.
      </p>
      <SourceLinks ids={['chem-4-1']} />
    </div>
  )
}

/* ---------- Calculators ---------- */

function parseAmount(text: string): { value: number | null; error: string | null } {
  const t = text.trim().replace(',', '.')
  if (t === '') return { value: null, error: null }
  if (!/^[+]?\d*\.?\d+(e[+-]?\d+)?$/i.test(t)) return { value: null, error: 'Enter a number (for example 2 or 0.5).' }
  const v = Number(t)
  if (!Number.isFinite(v)) return { value: null, error: 'Enter a finite number.' }
  if (v > MAX_AMOUNT) return { value: null, error: `Enter at most ${MAX_AMOUNT.toLocaleString('en')}.` }
  return { value: v, error: null }
}

function AmountField({ id, label, value, onChange, unit }: { id: string; label: ReactNode; value: string; onChange: (v: string) => void; unit: string }) {
  const { error } = parseAmount(value)
  return (
    <div className="rx-field">
      <label htmlFor={id} className="param-label">
        {label}
      </label>
      <div className="rx-field-row">
        <input id={id} className="rx-amount" inputMode="decimal" autoComplete="off" value={value} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} onChange={(e) => onChange(e.target.value)} />
        <span className="small muted">{unit}</span>
      </div>
      {error && (
        <p id={`${id}-err`} className="status-error small" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function MoleCalculator({ reaction }: { reaction: Reaction }) {
  const id = useId()
  const species = [...reaction.equation.reactants, ...reaction.equation.products]
  const [from, setFrom] = useState(0)
  const [amount, setAmount] = useState('1')
  const { value } = parseAmount(amount)
  return (
    <section className="rx-calc" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="section-title">
        Mole-to-mole
      </h3>
      <p className="small muted">The balanced coefficients are mole ratios. Uses the balanced equation from the source, whatever the editor above shows.</p>
      <div className="rx-field">
        <label htmlFor={`${id}-from`} className="param-label">
          Known substance
        </label>
        <select id={`${id}-from`} className="select" value={from} onChange={(e) => setFrom(Number(e.target.value))}>
          {species.map((s, k) => (
            <option key={k} value={k}>
              {s.name} ({s.formula})
            </option>
          ))}
        </select>
      </div>
      <AmountField id={`${id}-n`} label="Amount" value={amount} onChange={setAmount} unit="mol" />
      {value !== null && (
        <div className="table-scroll">
          <table className="data-table">
            <caption className="visually-hidden">Moles of every substance</caption>
            <thead>
              <tr>
                <th scope="col">Substance</th>
                <th scope="col">Ratio</th>
                <th scope="col">Amount (mol)</th>
              </tr>
            </thead>
            <tbody>
              {species.map((s, k) => (
                <tr key={k}>
                  <th scope="row">
                    <SpeciesText s={s} />
                  </th>
                  <td>
                    {reaction.balanced[k]} : {reaction.balanced[from]}
                  </td>
                  <td>{formatSig(moleRatio(value, reaction.balanced[from], reaction.balanced[k]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function YieldCalculator({ reaction }: { reaction: Reaction }) {
  const id = useId()
  const { reactants, products } = reaction.equation
  const n = reactants.length
  const [inputs, setInputs] = useState(() => reactants.map(() => ({ text: '10', unit: 'g' as 'g' | 'mol' })))
  const [product, setProduct] = useState(0)
  const [actual, setActual] = useState('')
  const masses = useMemo(() => [...reactants, ...products].map((s) => molarMass(s.formula, WEIGHTS)), [reactants, products])
  const parsed = inputs.map((x) => parseAmount(x.text))
  const moles = parsed.map((p, i) => (p.value === null ? null : inputs[i].unit === 'g' ? p.value / masses[i] : p.value))
  const ready = moles.every((m) => m !== null)
  const result = ready ? limitingReactant(reaction.balanced.slice(0, n), reaction.balanced.slice(n), moles as number[]) : null
  const theoreticalMol = result ? result.products[product] : null
  const theoreticalG = theoreticalMol !== null ? theoreticalMol * masses[n + product] : null
  const act = parseAmount(actual)
  const pct = act.value !== null && theoreticalG !== null ? percentYield(act.value, theoreticalG) : null
  return (
    <section className="rx-calc" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="section-title">
        Limiting reactant and theoretical yield
      </h3>
      <p className="small muted">
        The reactant that runs out first limits how much product can form. The theoretical yield assumes it reacts completely by this equation and nothing else.
        <SourceLinks ids={['chem-4-4']} />
      </p>
      <div className="rx-yield-inputs">
        {reactants.map((s, i) => (
          <div key={i} className="rx-yield-input">
            <AmountField
              id={`${id}-r${i}`}
              label={
                <>
                  <SpeciesText s={s} /> {s.name}
                </>
              }
              value={inputs[i].text}
              onChange={(text) => setInputs(inputs.map((x, k) => (k === i ? { ...x, text } : x)))}
              unit=""
            />
            <div className="segmented" role="group" aria-label={`Unit for ${s.name}`}>
              {(['g', 'mol'] as const).map((u) => (
                <button key={u} type="button" className="segmented-option" aria-pressed={inputs[i].unit === u} onClick={() => setInputs(inputs.map((x, k) => (k === i ? { ...x, unit: u } : x)))}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {products.length > 1 && (
        <div className="rx-field">
          <label htmlFor={`${id}-p`} className="param-label">
            Product
          </label>
          <select id={`${id}-p`} className="select" value={product} onChange={(e) => setProduct(Number(e.target.value))}>
            {products.map((s, k) => (
              <option key={k} value={k}>
                {s.name} ({s.formula})
              </option>
            ))}
          </select>
        </div>
      )}
      {!ready ? (
        <p className="small muted">Enter an amount for every reactant.</p>
      ) : (
        result && (
          <div className="rx-results">
            <div className="table-scroll">
              <table className="data-table">
                <caption className="visually-hidden">Amounts of reactants</caption>
                <thead>
                  <tr>
                    <th scope="col">Reactant</th>
                    <th scope="col">Moles</th>
                    <th scope="col">Moles ÷ coefficient</th>
                    <th scope="col">Left over</th>
                  </tr>
                </thead>
                <tbody>
                  {reactants.map((s, i) => (
                    <tr key={i} className={result.limiting.includes(i) ? 'is-limiting' : ''}>
                      <th scope="row">
                        <SpeciesText s={s} /> {result.limiting.includes(i) && <span className="rx-tag">Limiting</span>}
                      </th>
                      <td>{formatSig(moles[i]!)}</td>
                      <td>{formatSig(moles[i]! / reaction.balanced[i])}</td>
                      <td>
                        {formatSig(result.leftover[i] * masses[i])} g ({formatSig(result.leftover[i])} mol)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="rx-verdict" role="status">
              {result.extent === 0
                ? 'A reactant amount is zero, so no product can form.'
                : result.limiting.length === n && n > 1
                  ? 'The amounts are exactly in the equation’s ratio: every reactant is used up together.'
                  : `${result.limiting.map((i) => reactants[i].name).join(' and ')} limit${result.limiting.length === 1 ? 's' : ''} the reaction.`}{' '}
              Theoretical yield of {products[product].name}: <strong>{formatSig(theoreticalG!)} g</strong> ({formatSig(theoreticalMol!)} mol).
            </p>
            <AmountField id={`${id}-actual`} label={`Actual yield of ${products[product].name} (measured)`} value={actual} onChange={setActual} unit="g" />
            {act.value !== null && (
              <p className="rx-verdict" role="status">
                {pct === null
                  ? 'Percent yield is undefined when the theoretical yield is zero.'
                  : `Percent yield = actual ÷ theoretical × 100 = ${formatSig(pct)} %.${pct > 100 ? ' Above 100 % points to a measurement problem, such as a wet or impure product.' : ''}`}
              </p>
            )}
            <p className="small muted">
              Actual yield is what is measured in practice and is often less than the theoretical yield, for example because of side reactions or incomplete reaction.
              <SourceLinks ids={['chem-4-4']} />
            </p>
          </div>
        )
      )}
    </section>
  )
}

/* ---------- The lab ---------- */

const TYPE_ORDER: ReactionType[] = ['synthesis', 'decomposition', 'combustion', 'precipitation', 'acid-base', 'solution']

export function ReactionPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const id = useId()
  return (
    <div className="rx-field">
      <label htmlFor={id} className="param-label">
        Reaction
      </label>
      <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {TYPE_ORDER.map((t) => (
          <optgroup key={t} label={TYPE_LABEL[t]}>
            {REACTIONS.filter((r) => r.type === t).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

export function ReactionLab({ reactionId, onReaction }: { reactionId: string; onReaction: (id: string) => void }) {
  const reaction = findReaction(reactionId)!
  // Keyed by reaction so the editor starts unbalanced (all 1s) for each reaction.
  return <ReactionLabInner key={reaction.id} reaction={reaction} onReaction={onReaction} />
}

function ReactionLabInner({ reaction, onReaction }: { reaction: Reaction; onReaction: (id: string) => void }) {
  const species = [...reaction.equation.reactants, ...reaction.equation.products]
  const [coefficients, setCoefficients] = useState<number[]>(() => species.map(() => 1))
  const [step, setStep] = useState<number | null>(null)
  const [form, setForm] = useState<'molecular' | 'complete' | 'net'>('molecular')
  const shown = form === 'molecular' || !reaction.ionic ? null : reaction.ionic[form]
  return (
    <div className="reaction-lab">
      <section className="panel" aria-labelledby="rx-heading">
        <p className="eyebrow">Reaction and stoichiometry lab</p>
        <h2 id="rx-heading" className="panel-title">
          {reaction.name}
        </h2>
        <ReactionPicker value={reaction.id} onChange={onReaction} />
        <p className="small">
          <span className="rx-type">{TYPE_LABEL[reaction.type]}</span> {TYPE_NOTE[reaction.type]}
        </p>
        <h3 className="section-title">Balance it</h3>
        <EquationText equation={reaction.equation} coefficients={coefficients} label="Equation with your coefficients" />
        <CoefficientEditor
          reaction={reaction}
          coefficients={coefficients}
          onChange={(c) => {
            setCoefficients(c)
            setStep(null)
          }}
        />
        <div className="share-row">
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              setCoefficients(species.map(() => 1))
              setStep(null)
            }}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Start again (all 1)</span>
          </button>
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              setCoefficients([...reaction.balanced])
              setStep(reaction.steps.length - 1)
            }}
          >
            <span>Show the balanced equation</span>
          </button>
        </div>
        <BalanceTable equation={reaction.equation} coefficients={coefficients} />
        <CoefficientVsSubscript reaction={reaction} />
        <h3 className="section-title">Step by step</h3>
        <ol className="rx-steps">
          {reaction.steps.map((s, i) => (
            <li key={i} className={step === i ? 'is-active' : ''}>
              <button
                type="button"
                className="relation-link"
                aria-pressed={step === i}
                onClick={() => {
                  setStep(i)
                  setCoefficients([...s.coefficients])
                }}
              >
                Step {i + 1}
              </button>{' '}
              {s.text}
            </li>
          ))}
        </ol>
        <h3 className="section-title">Particle picture</h3>
        <ParticlePicture equation={reaction.equation} coefficients={coefficients} />
      </section>

      {reaction.ionic && (
        <section className="panel" aria-labelledby="rx-ionic">
          <h2 id="rx-ionic" className="panel-title">
            Molecular and ionic equations
          </h2>
          <div className="segmented" role="group" aria-label="Equation form">
            {(['molecular', 'complete', 'net'] as const).map((f) => (
              <button key={f} type="button" className="segmented-option" aria-pressed={form === f} onClick={() => setForm(f)}>
                {f === 'molecular' ? 'Molecular' : f === 'complete' ? 'Complete ionic' : 'Net ionic'}
              </button>
            ))}
          </div>
          <EquationText equation={shown ? shown.equation : reaction.equation} coefficients={shown ? shown.coefficients : reaction.balanced} label={`${form} equation`} />
          <p className="small">
            {form === 'molecular'
              ? 'Every substance written as a whole formula, as if undissociated.'
              : form === 'complete'
                ? 'Every dissolved strong electrolyte written as its ions.'
                : `Spectator ions (${reaction.ionic.spectators.join(', ')}) are removed: they appear unchanged on both sides. Atoms and charge are both conserved.`}
            <SourceLinks ids={[reaction.source]} />
          </p>
          {shown && <BalanceTable equation={shown.equation} coefficients={shown.coefficients} />}
        </section>
      )}

      <section className="panel" aria-labelledby="rx-stoich">
        <h2 id="rx-stoich" className="panel-title">
          Stoichiometry
        </h2>
        <MolarMasses reaction={reaction} />
        <MoleCalculator reaction={reaction} />
        {reaction.yieldLab && <YieldCalculator reaction={reaction} />}
      </section>
    </div>
  )
}

function MolarMasses({ reaction }: { reaction: Reaction }) {
  const species = [...reaction.equation.reactants, ...reaction.equation.products]
  const elements = [...new Set(species.flatMap((s) => Object.keys(parseFormula(s.formula))))]
  return (
    <section className="rx-calc" aria-labelledby="rx-mm">
      <h3 id="rx-mm" className="section-title">
        Molar masses
      </h3>
      <div className="table-scroll">
        <table className="data-table">
          <caption className="visually-hidden">Molar mass of each substance</caption>
          <thead>
            <tr>
              <th scope="col">Substance</th>
              <th scope="col">Molar mass (g/mol)</th>
            </tr>
          </thead>
          <tbody>
            {species.map((s, k) => (
              <tr key={k}>
                <th scope="row">
                  <SpeciesText s={s} /> <span className="small muted">{s.name}</span>
                </th>
                <td>{molarMass(s.formula, WEIGHTS).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Sums of CIAAW 2024 abridged standard atomic weights ({elements.map((el) => `${el} ${WEIGHT_TEXT[el]}`).join('; ')}), shown to 0.01 g/mol. Results below are
        rounded to three significant figures for display; calculations keep full precision.
        <SourceLinks ids={['ciaaw-2024']} />
      </p>
    </section>
  )
}

export function ReactionPanel({ reactionId, shareParams }: { reactionId: string; shareParams: Record<string, string> }) {
  const reaction = findReaction(reactionId)!
  return (
    <section className="panel info" aria-labelledby="rx-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Chemistry · reactions</p>
        <h2 id="rx-panel-heading" className="info-title">
          {reaction.name}
        </h2>
        <EquationText equation={reaction.equation} coefficients={reaction.balanced} label="Balanced equation from the source" />
      </header>
      <div className="info-body">
        <dl className="readout">
          <div>
            <dt>Type</dt>
            <dd>{TYPE_LABEL[reaction.type]}</dd>
          </div>
          <div>
            <dt>Conditions</dt>
            <dd>{reaction.conditions ?? 'None stated in the source'}</dd>
          </div>
        </dl>
        {reaction.statesNote && <p className="small muted">{reaction.statesNote}</p>}
        {reaction.note && <p className="small">{reaction.note}</p>}
        <p className="inline-note small">
          A balanced equation shows that atoms{reaction.ionic ? ' and charge' : ''} are conserved. It does not show whether a reaction actually happens, how fast, how
          completely, or under which conditions.
        </p>
        <p className="small">
          Source of the equation
          <SourceLinks ids={[reaction.source]} />
        </p>
        <ShareActions subject="chemistry" params={shareParams} restores="this reaction (your coefficients and amounts are not stored)" />
      </div>
    </section>
  )
}
