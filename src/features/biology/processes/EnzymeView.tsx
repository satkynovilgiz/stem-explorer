import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { AppLink } from '../../../components/AppLink'
import { ShareActions } from '../../../components/ShareActions'
import {
  CYCLE,
  checkValue,
  curve,
  DEFAULT_COMPARE,
  DEFAULT_ENZYME,
  ENZYME_LIMITS,
  fmt,
  INVESTIGATIONS,
  niceMax,
  rate,
  sRange,
  type EnzymeState,
  type Investigation,
  type KineticParams,
} from '../../../data/biology/enzymes'
import { usePrefersReducedMotion } from '../../../lib/hooks'
import { linkTo } from '../../../lib/links'
import { SourceLinks } from '../../guide/SourceLinks'

const SOURCES = ['bio-6-5', 'chem-12-7', 'mm-derivation']

/* ---------- Conceptual catalytic cycle ---------- */

/** One schematic picture per stage. Shapes stand for roles, not for any real molecule. */
function CycleArt({ step, reduced }: { step: number; reduced: boolean }) {
  const id = CYCLE[step].id
  const bound = id === 'bound' || id === 'reaction'
  // Substrate position: away from the enzyme, then in the active site.
  const sub = id === 'free' ? 'translate(118px, 0)' : 'translate(0, 0)'
  return (
    <svg className={`enz-cycle-svg${reduced ? ' is-still' : ''}`} viewBox="0 0 360 170" role="img" aria-label={`Schematic, stage ${step + 1} of ${CYCLE.length}: ${CYCLE[step].title}.`}>
      {/* Enzyme: a large shape with a notch (the active site). In the bound stages the notch closes slightly (induced fit). */}
      <path
        className="enz-enzyme"
        d={
          bound
            ? 'M40 30 Q20 85 40 140 L150 140 Q168 120 170 104 L136 98 L136 72 L170 66 Q168 50 150 30 Z'
            : 'M40 30 Q20 85 40 140 L150 140 Q170 120 174 108 L132 100 L132 70 L174 62 Q170 50 150 30 Z'
        }
      />
      <text x="70" y="90" className="enz-label">
        Enzyme
      </text>
      <text x="132" y="160" textAnchor="middle" className="enz-label is-small">
        active site
      </text>
      {id !== 'released' ? (
        <g className="enz-substrate-move" style={{ transform: sub }}>
          {/* Substrate: a wedge that fits the notch. */}
          <path className="enz-substrate" d="M138 74 L176 68 L196 85 L176 102 L138 96 Z" />
          {id === 'reaction' && <line x1="167" y1="66" x2="167" y2="104" className="enz-split" />}
          <text x="186" y={id === 'free' ? 60 : 56} className="enz-label">
            {id === 'free' ? 'Substrate' : id === 'bound' ? 'ES complex' : 'Bonds rearranging'}
          </text>
        </g>
      ) : (
        <g>
          {/* Products: the two pieces leave; the enzyme is unchanged. */}
          <path className="enz-product" d="M230 60 L262 56 L262 92 L230 88 Z" />
          <path className="enz-product is-second" d="M284 74 L304 90 L284 106 L272 90 Z" />
          <text x="232" y="48" className="enz-label">
            Products
          </text>
        </g>
      )}
    </svg>
  )
}

function CatalyticCycle() {
  const id = useId()
  const reduced = usePrefersReducedMotion()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const last = CYCLE.length - 1
  // Optional playback: never starts by itself, runs once through the stages, and stops at the end.
  const running = playing && !reduced && step < last

  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setStep((s) => Math.min(last, s + 1)), 2200)
    return () => window.clearTimeout(t)
  }, [running, step, last])

  return (
    <section className="panel enz-cycle" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        The catalytic cycle · stage {step + 1} of {CYCLE.length}
      </h2>
      <p className="inline-note">Conceptual picture: the shapes, sizes and motion are schematic. This is not a molecular simulation, and the pace is not a reaction time.</p>
      <CycleArt step={step} reduced={reduced} />
      <ol className="enz-stages">
        {CYCLE.map((c, i) => (
          <li key={c.id}>
            <button type="button" className="segmented-option" aria-current={i === step ? 'step' : undefined} onClick={() => (setPlaying(false), setStep(i))}>
              {i + 1}. {c.title}
            </button>
          </li>
        ))}
      </ol>
      <p className="prose" aria-live="polite">
        <strong>{CYCLE[step].title}.</strong> {CYCLE[step].text}
      </p>
      <div className="share-row">
        <button type="button" className="tool-button bordered" disabled={step === 0} onClick={() => (setPlaying(false), setStep((s) => s - 1))}>
          <ChevronLeft size={15} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <button type="button" className="tool-button bordered" disabled={step === last} onClick={() => (setPlaying(false), setStep((s) => s + 1))}>
          <span>Next</span>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
        {!reduced && (
          <button
            type="button"
            className="tool-button bordered"
            aria-pressed={running}
            onClick={() => {
              if (running) return setPlaying(false)
              if (step === last) setStep(0)
              setPlaying(true)
            }}
          >
            {running ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            <span>{running ? 'Pause' : 'Play once'}</span>
          </button>
        )}
      </div>
      {reduced && <p className="muted small">Reduced motion is on, so the stages change only with Previous and Next.</p>}
    </section>
  )
}

/* ---------- Inputs ---------- */

function Field({ label, unit, field, value, onValue }: { label: string; unit: string; field: 's' | 'vmax' | 'km'; value: number; onValue: (v: number) => void }) {
  const id = useId()
  const [text, setText] = useState(String(value))
  const [error, setError] = useState<string | null>(null)
  const { min, max } = ENZYME_LIMITS[field]
  // Follow changes made elsewhere (slider, investigations, reset) unless the box holds an error.
  const [shown, setShown] = useState(value)
  if (shown !== value) {
    setShown(value)
    setText(String(value))
    setError(null)
  }
  const step = field === 'vmax' ? 0.1 : 0.01
  return (
    <div className="enz-field">
      <label className="param-label" htmlFor={`${id}-n`}>
        {label} ({unit})
      </label>
      <div className="sol-input-row">
        <input
          type="range"
          className="enz-range"
          min={field === 's' ? 0 : min}
          max={max}
          step={step}
          value={Math.min(max, value)}
          aria-label={`${label} slider (${unit})`}
          onChange={(e) => onValue(Number(e.target.value))}
        />
        <input
          id={`${id}-n`}
          className="param-input enz-number"
          inputMode="decimal"
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-e` : undefined}
          onChange={(e) => {
            setText(e.target.value)
            const why = checkValue(field, e.target.value)
            setError(why)
            if (!why) {
              setShown(Number(e.target.value))
              onValue(Number(e.target.value))
            }
          }}
        />
      </div>
      {error && (
        <p id={`${id}-e`} className="small status-error">
          {error} The graph keeps the last valid value.
        </p>
      )}
    </div>
  )
}

/* ---------- Graph ---------- */

const W = 520
const H = 300
const M = { l: 56, r: 64, t: 18, b: 44 }

function RateGraph({ st }: { st: EnzymeState }) {
  const sMax = sRange(st)
  const vMax = niceMax(Math.max(st.a.vmax, st.b?.vmax ?? 0) * 1.08)
  const x = (s: number) => M.l + (s / sMax) * (W - M.l - M.r)
  const y = (v: number) => H - M.b - (v / vMax) * (H - M.t - M.b)
  const line = (p: KineticParams) =>
    curve(p, sMax)
      .map(([s, v]) => `${x(s).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ')
  const vA = rate(st.s, st.a)
  const vB = st.b ? rate(st.s, st.b) : null
  const kmA = st.a.km
  const ticks = [0, sMax / 2, sMax]
  const vticks = [0, vMax / 2, vMax]
  return (
    <figure className="enz-graph">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rate v against substrate concentration [S]. Set A: Vmax ${fmt(st.a.vmax)} µM/s, Km ${fmt(kmA)} mM; at [S] = ${fmt(st.s)} mM, v = ${fmt(vA)} µM/s.${st.b && vB !== null ? ` Set B (dashed): Vmax ${fmt(st.b.vmax)} µM/s, Km ${fmt(st.b.km)} mM; v = ${fmt(vB)} µM/s.` : ''}`}>
        <line x1={M.l} x2={W - M.r} y1={H - M.b} y2={H - M.b} className="wave-axis" />
        <line x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} className="wave-axis" />
        {ticks.map((t) => (
          <text key={`x${t}`} x={x(t)} y={H - M.b + 16} textAnchor="middle" className="wave-label">
            {fmt(t)}
          </text>
        ))}
        {vticks.map((t) => (
          <text key={`y${t}`} x={M.l - 6} y={y(t) + 4} textAnchor="end" className="wave-label">
            {fmt(t)}
          </text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 8} textAnchor="middle" className="wave-label">
          [S], substrate concentration (mM)
        </text>
        <text x={14} y={(M.t + H - M.b) / 2} textAnchor="middle" className="wave-label" transform={`rotate(-90 14 ${(M.t + H - M.b) / 2})`}>
          v, initial rate (µM/s)
        </text>
        {/* Vmax (A): the asymptote, never reached. */}
        <line x1={M.l} x2={W - M.r} y1={y(st.a.vmax)} y2={y(st.a.vmax)} className="enz-vmax" />
        <text x={W - M.r + 4} y={y(st.a.vmax) + 4} className="wave-label">
          Vmax A
        </text>
        {/* Km (A): where v = Vmax/2. */}
        {kmA <= sMax && (
          <>
            <line x1={x(kmA)} x2={x(kmA)} y1={H - M.b} y2={y(st.a.vmax / 2)} className="enz-km" />
            <line x1={M.l} x2={x(kmA)} y1={y(st.a.vmax / 2)} y2={y(st.a.vmax / 2)} className="enz-km" />
            {/* Labels sit below and to the right of the half-maximal point, where the rising curve is not. */}
            <text x={x(kmA) + 6} y={H - M.b - 6} className="wave-label">
              Km A
            </text>
            <text x={x(kmA) + 10} y={y(st.a.vmax / 2) + 16} className="wave-label">
              Vmax/2
            </text>
          </>
        )}
        {st.b && (
          <>
            <polyline points={line(st.b)} className="enz-curve is-b" />
            <text x={W - M.r + 4} y={y(rate(sMax, st.b)) + 4} className="wave-label">
              B (dashed)
            </text>
          </>
        )}
        <polyline points={line(st.a)} className="enz-curve" />
        <text x={W - M.r + 4} y={y(rate(sMax, st.a)) + 16} className="wave-label">
          A (solid)
        </text>
        {/* Current state: a ring on A, a square on B. */}
        <circle cx={x(st.s)} cy={y(vA)} r={6} className="enz-point" />
        {st.b && vB !== null && <rect x={x(st.s) - 5} y={y(vB) - 5} width={10} height={10} className="enz-point is-b" />}
        <line x1={x(st.s)} x2={x(st.s)} y1={H - M.b} y2={y(Math.max(vA, vB ?? 0))} className="enz-now" />
      </svg>
      <figcaption className="muted small">
        Solid line and ring: set A. Dashed line and square: set B. The dashed horizontal line is Vmax for A, which the curve approaches but never reaches; the dotted lines mark Km, where v = Vmax/2.
      </figcaption>
    </figure>
  )
}

/* ---------- The lab ---------- */

function Substitution({ name, p, s }: { name: string; p: KineticParams; s: number }) {
  const v = rate(s, p)
  return (
    <p className="enz-sub">
      <span className="enz-set">{name}</span> v = Vmax × [S] / (Km + [S]) = {fmt(p.vmax)} µM/s × {fmt(s)} mM / ({fmt(p.km)} mM + {fmt(s)} mM) ={' '}
      <strong>{fmt(v)} µM/s</strong> ({fmt((v / p.vmax) * 100)}% of Vmax)
    </p>
  )
}

export function EnzymeView({ st, onState, shareParams }: { st: EnzymeState; onState: (s: EnzymeState) => void; shareParams: Record<string, string> }) {
  const id = useId()
  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const active = investigation && Math.abs(st.s - investigation.sOverKm * st.a.km) < 1e-9 ? investigation : null
  const set = (patch: Partial<EnzymeState>) => onState({ ...st, ...patch })
  return (
    <div className="enz-lab">
      <CatalyticCycle />

      <section className="panel enz-kinetics" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="panel-title">
          Rate and substrate concentration (Michaelis–Menten)
        </h2>
        <p className="inline-note">Illustrative parameter values, not measurements of a real enzyme. Units: [S] and Km in mM; v and Vmax in µM/s.</p>

        <div className="enz-investigations" role="group" aria-label="Investigations">
          {INVESTIGATIONS.map((inv) => (
            <button
              key={inv.id}
              type="button"
              className="tool-button bordered"
              aria-pressed={active?.id === inv.id}
              onClick={() => {
                setInvestigation(inv)
                set({ s: Number((inv.sOverKm * st.a.km).toPrecision(6)) })
              }}
            >
              {inv.title}
            </button>
          ))}
        </div>
        {active && (
          <div className="enz-investigation" role="status">
            <p className="small">
              <strong>{active.question}</strong>
            </p>
            <p className="small">{active.explain(st)}</p>
          </div>
        )}

        <RateGraph st={st} />
        <Substitution name="A" p={st.a} s={st.s} />
        {st.b && <Substitution name="B" p={st.b} s={st.s} />}

        <div className="enz-inputs">
          <Field label="Substrate concentration [S]" unit="mM" field="s" value={st.s} onValue={(s) => set({ s })} />
          <fieldset className="enz-set-fields">
            <legend className="param-label">Set A (solid line)</legend>
            <Field label="Vmax" unit="µM/s" field="vmax" value={st.a.vmax} onValue={(vmax) => set({ a: { ...st.a, vmax } })} />
            <Field label="Km" unit="mM" field="km" value={st.a.km} onValue={(km) => set({ a: { ...st.a, km } })} />
          </fieldset>
          <label className="toggle-row small">
            <input type="checkbox" checked={!!st.b} onChange={(e) => set({ b: e.target.checked ? { ...DEFAULT_COMPARE } : null })} />
            Compare with a second parameter set (B, dashed line)
          </label>
          {st.b && (
            <fieldset className="enz-set-fields">
              <legend className="param-label">Set B (dashed line)</legend>
              <Field label="Vmax" unit="µM/s" field="vmax" value={st.b.vmax} onValue={(vmax) => set({ b: { ...st.b!, vmax } })} />
              <Field label="Km" unit="mM" field="km" value={st.b.km} onValue={(km) => set({ b: { ...st.b!, km } })} />
            </fieldset>
          )}
          <div className="share-row">
            <button type="button" className="tool-button bordered" onClick={() => (setInvestigation(null), onState({ ...DEFAULT_ENZYME, b: st.b ? { ...DEFAULT_COMPARE } : null }))}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>Reset values</span>
            </button>
            {st.b && (
              <button type="button" className="tool-button bordered" onClick={() => set({ b: { ...DEFAULT_COMPARE } })}>
                <span>Reset set B</span>
              </button>
            )}
          </div>
        </div>

        <table className="data-table enz-table">
          <caption className="small">At [S] = {fmt(st.s)} mM</caption>
          <thead>
            <tr>
              <th scope="col">Set</th>
              <th scope="col">Vmax (µM/s)</th>
              <th scope="col">Km (mM)</th>
              <th scope="col">v (µM/s)</th>
              <th scope="col">v / Vmax</th>
            </tr>
          </thead>
          <tbody>
            {[['A', st.a] as const, ...(st.b ? [['B', st.b] as const] : [])].map(([n, p]) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td>{fmt(p.vmax)}</td>
                <td>{fmt(p.km)}</td>
                <td>{fmt(rate(st.s, p))}</td>
                <td>{fmt((rate(st.s, p) / p.vmax) * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {st.b && (
          <p className="small">
            {st.b.km > st.a.km
              ? `B has the larger Km, so it needs more substrate (${fmt(st.b.km)} mM rather than ${fmt(st.a.km)} mM) to reach half of its own Vmax.`
              : st.b.km < st.a.km
                ? `B has the smaller Km, so it reaches half of its own Vmax at a lower [S] (${fmt(st.b.km)} mM rather than ${fmt(st.a.km)} mM).`
                : 'A and B have the same Km, so both reach half of their own Vmax at the same [S].'}{' '}
            {st.b.vmax !== st.a.vmax ? `Their maximum rates differ: ${fmt(st.a.vmax)} and ${fmt(st.b.vmax)} µM/s.` : 'Their maximum rates are the same.'}
          </p>
        )}
        <ShareActions subject="biology" params={shareParams} restores="these values and the comparison (the cycle opens at its first stage, paused)" />
      </section>
    </div>
  )
}

/* ---------- Explanations ---------- */

/** Schematic energy profile: same start and end, a lower peak with the catalyst. No values are implied. */
function EnergyProfile() {
  return (
    <figure className="enz-energy-fig">
      <svg className="enz-energy" viewBox="0 0 300 150" role="img" aria-label="Schematic energy diagram: with an enzyme the peak (activation energy) is lower; the reactants and products have the same energies either way.">
        <line x1="20" y1="130" x2="290" y2="130" className="wave-axis" />
        <line x1="20" y1="10" x2="20" y2="130" className="wave-axis" />
        <path d="M24 70 C 90 70, 110 18, 150 18 S 210 100, 286 100" className="enz-curve is-b" />
        <path d="M24 70 C 90 70, 115 50, 150 50 S 210 100, 286 100" className="enz-curve" />
        <text x="26" y="86" className="wave-label">
          reactants
        </text>
        <text x="284" y="116" textAnchor="end" className="wave-label">
          products
        </text>
        <text x="155" y="146" textAnchor="middle" className="wave-label">
          progress of the reaction (schematic, no scale)
        </text>
      </svg>
      <figcaption className="muted small">Dashed: without the enzyme. Solid: with the enzyme, a lower peak (a lower activation energy). Same start and end energies.</figcaption>
    </figure>
  )
}

export function EnzymePanel() {
  return (
    <section className="panel info" aria-labelledby="enz-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology · with chemistry</p>
        <h2 id="enz-panel-heading" className="info-title">
          Enzymes and catalysis
        </h2>
        <p className="info-summary">How a catalyst speeds a reaction, what enzymes do in cells, and how their rate depends on substrate concentration.</p>
      </header>
      <div className="info-body">
        <section className="info-section">
          <h3 className="section-title">Chemical catalysis</h3>
          <p className="small">
            A catalyst increases a reaction’s rate without being consumed, by providing an alternative mechanism with a lower activation energy. The reactants and products end
            at the same energies either way.
            <SourceLinks ids={['chem-12-7']} />
          </p>
          <EnergyProfile />
          <p className="small">
            Related: <AppLink href={linkTo('chemistry', { csec: 'reactions' })}>Chemistry › Reactions and stoichiometry</AppLink>
          </p>
        </section>
        <section className="info-section">
          <h3 className="section-title">Enzymes in living cells</h3>
          <p className="small">
            Enzymes are biological catalysts, usually proteins. They lower the activation energies of chemical reactions inside the cell, and they remain unchanged by the
            reactions they catalyze. An enzyme binds its substrates at its active site; in the induced-fit view the enzyme changes shape slightly as it binds. Enzymes do not
            change a reaction’s ΔG, so they do not make an endergonic reaction spontaneous.
            <SourceLinks ids={['bio-6-5', 'chem-12-7']} />
          </p>
          <p className="small">
            Related: <AppLink href={linkTo('biology', { bsec: 'energy' })}>Biology › Energy processes</AppLink> (photosynthesis and cellular respiration run through many
            enzyme-catalysed steps) and the <AppLink href={linkTo('biology', { structure: 'lysosome', cell: 'cutaway' })}>lysosome</AppLink>, which holds digestive enzymes.
          </p>
        </section>
        <section className="info-section">
          <h3 className="section-title">The Michaelis–Menten equation</h3>
          <p className="small">
            v = Vmax × [S] / (Km + [S]). v is the initial rate, Vmax the rate approached when the enzyme is saturated with substrate, and Km the substrate concentration that
            gives exactly half of Vmax: putting [S] = Km into the equation gives v = Vmax / 2. At low [S] the rate is nearly proportional to [S]; at high [S] it levels off
            toward Vmax and never exceeds it. Km must be greater than zero.
            <SourceLinks ids={['mm-derivation']} />
          </p>
          <p className="small">
            <strong>Km and affinity.</strong> Km is similar to, but not the same as, the dissociation constant of the enzyme–substrate complex. Only when the complex falls apart
            much faster than it forms product (k₋₁ ≫ k₂) is Km close to it; only then does a lower Km mean tighter binding. So Km is not a universal, direct measure of
            binding affinity.
            <SourceLinks ids={['mm-derivation']} />
          </p>
        </section>
        <section className="info-section">
          <h3 className="section-title">Assumptions and limits</h3>
          <ul className="small">
            <li>One substrate and one enzyme, with the enzyme–substrate complex at a steady state.</li>
            <li>Initial rates: product has not built up, so the reverse reaction is ignored.</li>
            <li>Far more substrate than enzyme, so binding hardly lowers the free substrate concentration.</li>
            <li>The model leaves out inhibitors, activators and cooperative binding.</li>
            <li>
              Temperature and pH are not simulated. High temperatures and extreme pH eventually denature enzymes, but this lab has no data on how Vmax and Km change before
              that, so it applies no factor for them.
              <SourceLinks ids={['bio-6-5']} />
            </li>
            <li>The parameter values are illustrative. They are not measured values for any particular enzyme.</li>
          </ul>
        </section>
        <p className="small muted">
          Sources
          <SourceLinks ids={SOURCES} />
        </p>
      </div>
    </section>
  )
}
