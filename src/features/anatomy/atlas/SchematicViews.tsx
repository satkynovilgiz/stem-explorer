import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { SourceLinks } from '../../guide/SourceLinks'

/*
 * Two schematic close-ups the whole-body scale can't show. They are flat diagrams (SVG, no WebGL)
 * with manual steps; each step highlights one part and explains it. Not to scale, no measured values.
 */

interface ViewStep {
  title: string
  text: string
  /** Which diagram parts to emphasise. */
  parts: readonly string[]
  sources: readonly string[]
}

function StepFrame({
  id,
  title,
  note,
  steps,
  onClose,
  diagram,
}: {
  id: string
  title: string
  note: string
  steps: readonly ViewStep[]
  onClose: () => void
  diagram: (active: readonly string[]) => ReactNode
}) {
  const hid = useId()
  const [i, setI] = useState(0)
  const step = steps[i]
  return (
    <section className="panel info schematic-view" aria-labelledby={hid} data-view={id}>
      <header className="info-header">
        <p className="eyebrow">Schematic close-up · not to scale</p>
        <h2 id={hid} className="info-title">
          {title}
        </h2>
        <div className="header-actions">
          <button type="button" className="tool-button bordered" onClick={onClose}>
            <X size={15} aria-hidden="true" />
            <span>Close close-up</span>
          </button>
        </div>
      </header>
      <div className="info-body">
        {diagram(step.parts)}
        <p className="eyebrow">
          Step {i + 1} of {steps.length}
        </p>
        <h3 className="tour-title">{step.title}</h3>
        <p className="prose" aria-live="polite">
          {step.text}
          <SourceLinks ids={step.sources} />
        </p>
        <div className="tour-nav">
          <button type="button" className="tool-button bordered" disabled={i === 0} onClick={() => setI(i - 1)}>
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Previous</span>
          </button>
          <ol className="tour-dots" aria-label={`${title} steps`}>
            {steps.map((s, k) => (
              <li key={s.title}>
                <button type="button" className={`tour-dot${k === i ? ' is-current' : ''}`} aria-label={`Step ${k + 1}: ${s.title}`} aria-current={k === i ? 'step' : undefined} onClick={() => setI(k)} />
              </li>
            ))}
          </ol>
          <button type="button" className="button" disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <details className="small">
          <summary>All steps as text</summary>
          <ol>
            {steps.map((s) => (
              <li key={s.title}>
                <strong>{s.title}.</strong> {s.text}
              </li>
            ))}
          </ol>
        </details>
        <p className="muted small">{note}</p>
      </div>
    </section>
  )
}

const on = (active: readonly string[], part: string) => (active.includes(part) ? ' is-active' : '')

/* ---------- Alveolar gas exchange ---------- */

const ALVEOLUS_STEPS: ViewStep[] = [
  {
    title: 'Air reaches an alveolus',
    text: 'Bronchioles end at alveolar ducts, which open into clusters of alveoli: small, grape-like sacs. Breathing keeps bringing fresh air here.',
    parts: ['alveolus', 'duct'],
    sources: ['ap-22-1'],
  },
  {
    title: 'The respiratory membrane',
    text: 'Where the alveolar wall and a capillary wall meet, they form the respiratory membrane. Blood in the capillary is separated from the air by only these thin walls.',
    parts: ['membrane', 'capillary'],
    sources: ['ap-22-1', 'ap-22-4'],
  },
  {
    title: 'Oxygen moves into the blood',
    text: 'Gases move from higher to lower partial pressure by simple diffusion. Oxygen crosses the respiratory membrane from the alveolar air into the blood.',
    parts: ['o2', 'membrane'],
    sources: ['ap-22-4'],
  },
  {
    title: 'Carbon dioxide moves out of the blood',
    text: 'Carbon dioxide crosses in the other direction, from the blood into the alveolar air, and leaves the body when you breathe out.',
    parts: ['co2', 'membrane'],
    sources: ['ap-22-4'],
  },
]

export function AlveolusView({ onClose }: { onClose: () => void }) {
  return (
    <StepFrame
      id="alveolus"
      title="Gas exchange in an alveolus"
      steps={ALVEOLUS_STEPS}
      onClose={onClose}
      note="Schematic: one alveolus and one capillary, not to scale. Arrows show the direction of net diffusion only; no partial-pressure values or rates are shown."
      diagram={(a) => (
        <svg className="schematic-svg" viewBox="0 0 320 200" role="img" aria-label="Diagram: an alveolus beside a capillary. Oxygen arrow from the alveolus into the capillary; carbon dioxide arrow from the capillary into the alveolus.">
          <path className={`sv-duct${on(a, 'duct')}`} d="M20 30 C 60 30, 70 60, 95 75" />
          <circle className={`sv-alveolus${on(a, 'alveolus')}`} cx="130" cy="100" r="62" />
          <text x="110" y="70" className="sv-label">
            alveolar air
          </text>
          <rect className={`sv-capillary${on(a, 'capillary')}`} x="196" y="40" width="44" height="130" rx="22" />
          <text x="248" y="58" className="sv-label">
            capillary
          </text>
          <text x="248" y="72" className="sv-label">
            (blood)
          </text>
          <line className={`sv-membrane${on(a, 'membrane')}`} x1="193" y1="62" x2="193" y2="140" />
          <text x="150" y="190" className="sv-label">
            respiratory membrane
          </text>
          <g className={`sv-arrow sv-o2${on(a, 'o2')}`}>
            <line x1="150" y1="92" x2="222" y2="92" />
            <path d="M222 92 l-8 -5 v10 z" />
            <text x="152" y="86" className="sv-label">
              O₂
            </text>
          </g>
          <g className={`sv-arrow sv-co2${on(a, 'co2')}`}>
            <line x1="222" y1="122" x2="150" y2="122" />
            <path d="M150 122 l8 -5 v10 z" />
            <text x="154" y="138" className="sv-label">
              CO₂
            </text>
          </g>
        </svg>
      )}
    />
  )
}

/* ---------- Nephron ---------- */

const NEPHRON_STEPS: ViewStep[] = [
  {
    title: 'Blood arrives at the glomerulus',
    text: 'An afferent arteriole brings blood to the glomerulus, a tuft of high-pressure capillaries largely surrounded by Bowman’s capsule. Together they form the renal corpuscle.',
    parts: ['arteriole', 'glomerulus'],
    sources: ['ap-25-4'],
  },
  {
    title: 'Filtration',
    text: 'Fluid is filtered from the glomerular blood into Bowman’s capsule, which captures this filtrate and directs it into the proximal convoluted tubule (PCT).',
    parts: ['capsule', 'filtration'],
    sources: ['ap-25-4', 'ap-25-5'],
  },
  {
    title: 'Modification: reabsorption',
    text: 'Along the tubule — PCT, loop of Henle and distal convoluted tubule (DCT) — most of the filtrate is reabsorbed and returned to the blood. About 99 percent of it is returned, so only about 1–2 litres of urine are produced per day.',
    parts: ['tubule', 'reabsorption'],
    sources: ['ap-25-4', 'ap-25-5'],
  },
  {
    title: 'Modification: secretion',
    text: 'Other substances, such as urea, potassium ions, ammonia, creatinine and some drugs, are secreted from the blood into the filtrate as waste products.',
    parts: ['tubule', 'secretion'],
    sources: ['ap-25-6'],
  },
  {
    title: 'Collecting duct to the renal pelvis',
    text: 'Collecting ducts, continuous with the nephron but not technically part of it, carry the forming urine deeper into the kidney; modification continues until their ends. Urine then drains through the renal pelvis into the ureter.',
    parts: ['duct'],
    sources: ['ap-25-4', 'ap-25-6', 'ap-25-3'],
  },
]

export function NephronView({ onClose }: { onClose: () => void }) {
  return (
    <StepFrame
      id="nephron"
      title="A nephron: filtration, then modification"
      steps={NEPHRON_STEPS}
      onClose={onClose}
      note="Schematic of one nephron, not to scale. It shows the broad sequence only: which substances are moved in which segment, and how, is not shown. The surrounding capillaries are drawn as a single band."
      diagram={(a) => (
        <svg className="schematic-svg" viewBox="0 0 320 220" role="img" aria-label="Diagram of a nephron: afferent arteriole, glomerulus in Bowman’s capsule, proximal tubule, loop of Henle, distal tubule and collecting duct, with filtration, reabsorption and secretion arrows.">
          <path className={`sv-vessel${on(a, 'arteriole')}`} d="M10 40 H 52" />
          <text x="4" y="62" className="sv-label">
            afferent
          </text>
          <text x="4" y="74" className="sv-label">
            arteriole
          </text>
          <circle className={`sv-glomerulus${on(a, 'glomerulus')}`} cx="70" cy="44" r="14" />
          <path className={`sv-capsule${on(a, 'capsule')}`} d="M52 22 A 26 26 0 1 0 92 30" />
          <text x="44" y="96" className="sv-label">
            Bowman’s capsule
          </text>
          <g className={`sv-arrow sv-filtration${on(a, 'filtration')}`}>
            <line x1="70" y1="44" x2="86" y2="60" />
            <text x="88" y="70" className="sv-label">
              filtration
            </text>
          </g>
          <path
            className={`sv-tubule${on(a, 'tubule')}`}
            d="M92 30 C 110 20, 120 50, 135 35 S 155 20, 160 45 L 160 170 Q 170 190 180 170 L 180 60 C 185 40, 200 55, 210 40 S 230 30, 240 45"
          />
          <text x="112" y="16" className="sv-label">
            PCT
          </text>
          <text x="126" y="196" className="sv-label">
            loop of Henle
          </text>
          <text x="200" y="28" className="sv-label">
            DCT
          </text>
          <path className={`sv-duct${on(a, 'duct')}`} d="M240 45 L 270 45 L 270 210" />
          <text x="276" y="120" className="sv-label">
            collecting
          </text>
          <text x="276" y="132" className="sv-label">
            duct
          </text>
          <rect className="sv-band" x="120" y="100" width="90" height="16" rx="8" />
          <text x="214" y="112" className="sv-label">
            capillaries
          </text>
          <g className={`sv-arrow sv-reabsorption${on(a, 'reabsorption')}`}>
            <line x1="160" y1="128" x2="160" y2="118" />
            <line x1="180" y1="128" x2="180" y2="118" />
            <text x="96" y="142" className="sv-label">
              reabsorption ↑
            </text>
          </g>
          <g className={`sv-arrow sv-secretion${on(a, 'secretion')}`}>
            <line x1="170" y1="100" x2="170" y2="90" />
            <text x="186" y="94" className="sv-label">
              secretion ↓
            </text>
          </g>
        </svg>
      )}
    />
  )
}
