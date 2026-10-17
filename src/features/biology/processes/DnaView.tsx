import { useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { BASE_CLASS, BASE_NAMES, CODING_5_TO_3, complement, hydrogenBonds, TEMPLATE_3_TO_5, transcribe, type DnaBase } from '../../../data/biology/dna'
import { SourceLinks } from '../../guide/SourceLinks'
import { StepNav } from './StepNav'

const STEPS = [
  {
    title: 'The sugar–phosphate backbone',
    text: 'Each strand is a chain of nucleotides. Their sugar and phosphate groups form the backbone on the outside, like the sides of a ladder.',
    sources: ['bio-14-2'],
  },
  {
    title: 'Bases and complementary pairing',
    text: 'The nitrogenous bases are stacked inside, like rungs. Adenine pairs with thymine (two hydrogen bonds) and guanine with cytosine (three). Each pair is a purine (A, G) with a pyrimidine (C, T).',
    sources: ['bio-14-2'],
  },
  {
    title: 'Strand direction',
    text: 'One end of each strand has a free 5′ phosphate and the other a free 3′-OH. The two strands are antiparallel: the 3′ end of one faces the 5′ end of the other.',
    sources: ['bio-14-2'],
  },
  {
    title: 'Transcription: making RNA',
    text: 'RNA is built 5′→3′ by RNA polymerase. New RNA nucleotides pair with the template strand, so the RNA is complementary to the template and matches the coding (nontemplate) strand — with uracil (U) in place of thymine (T).',
    sources: ['bio-15-2', 'bio-15-1'],
  },
] as const

const W = 34

function Strand({ bases, y, label5Left, selected, onPick, kind }: { bases: readonly DnaBase[]; y: number; label5Left: boolean; selected: number | null; onPick: (i: number) => void; kind: 'coding' | 'template' }) {
  return (
    <g>
      <text x={8} y={y + 4} className="dna-end">
        {label5Left ? '5′' : '3′'}
      </text>
      <line x1={30} x2={30 + bases.length * W} y1={y} y2={y} className="dna-backbone" />
      {bases.map((b, i) => (
        <g key={i}>
          <circle cx={30 + i * W + W / 2} cy={y} r={4} className="dna-phosphate" />
          <text x={30 + i * W + W / 2} y={kind === 'coding' ? y + 22 : y - 14} textAnchor="middle" className={`dna-base is-${b}${selected === i ? ' is-selected' : ''}`} onClick={() => onPick(i)}>
            {b}
          </text>
        </g>
      ))}
      <text x={38 + bases.length * W} y={y + 4} className="dna-end">
        {label5Left ? '3′' : '5′'}
      </text>
    </g>
  )
}

export function DnaView() {
  const [step, setStep] = useState(0)
  const [pair, setPair] = useState<number | null>(null)
  const [made, setMade] = useState(0)
  const rna = transcribe(TEMPLATE_3_TO_5)
  const width = 60 + CODING_5_TO_3.length * W
  const transcribing = step === 3
  return (
    <section className="panel process-view" aria-labelledby="dna-heading">
      <h2 id="dna-heading" className="panel-title">
        DNA and RNA
      </h2>
      <StepNav steps={STEPS} index={step} onChange={setStep} label="DNA steps" />
      <svg className="dna-svg" viewBox={`0 0 ${width} ${transcribing ? 210 : 150}`} role="img" aria-label="Schematic DNA segment of 12 base pairs: coding strand 5′ to 3′ on top, template strand 3′ to 5′ below, bases paired between them.">
        {CODING_5_TO_3.map((b, i) => (
          <line
            key={i}
            x1={30 + i * W + W / 2}
            x2={30 + i * W + W / 2}
            y1={40}
            y2={110}
            className={`dna-rung${pair === i ? ' is-selected' : ''}${step === 1 ? ' is-emphasis' : ''}`}
            strokeDasharray={hydrogenBonds(b, complement(b)) === 3 ? '3 3' : '7 4'}
          />
        ))}
        <Strand bases={CODING_5_TO_3} y={30} label5Left selected={pair} onPick={setPair} kind="coding" />
        <Strand bases={TEMPLATE_3_TO_5} y={120} label5Left={false} selected={pair} onPick={setPair} kind="template" />
        <text x={30} y={14} className="dna-strand-label">
          Coding (nontemplate) strand
        </text>
        <text x={30} y={146} className="dna-strand-label">
          Template strand
        </text>
        {transcribing && (
          <g>
            <text x={8} y={184} className="dna-end">
              5′
            </text>
            {rna.slice(0, made).map((b, i) => (
              <text key={i} x={30 + i * W + W / 2} y={184} textAnchor="middle" className={`dna-base is-rna is-${b}`}>
                {b}
              </text>
            ))}
            <text x={30} y={204} className="dna-strand-label">
              RNA (built 5′→3′, pairing with the template)
            </text>
          </g>
        )}
      </svg>
      <div className="pair-picker" role="group" aria-label="Inspect a base pair">
        {CODING_5_TO_3.map((b, i) => (
          <button key={i} type="button" className="tool-button bordered" aria-pressed={pair === i} onClick={() => setPair(pair === i ? null : i)}>
            {i + 1}: {b}–{TEMPLATE_3_TO_5[i]}
          </button>
        ))}
      </div>
      <p className="muted small">Select a pair (or a letter in the drawing) to inspect it. A schematic, flat segment of 12 base pairs — not a real gene, and not drawn as a twisting double helix.</p>
      {pair !== null && (
        <dl className="readout">
          <div>
            <dt>Coding strand</dt>
            <dd>
              {CODING_5_TO_3[pair]} — {BASE_NAMES[CODING_5_TO_3[pair]]} ({BASE_CLASS[CODING_5_TO_3[pair]]})
            </dd>
          </div>
          <div>
            <dt>Template strand</dt>
            <dd>
              {TEMPLATE_3_TO_5[pair]} — {BASE_NAMES[TEMPLATE_3_TO_5[pair]]} ({BASE_CLASS[TEMPLATE_3_TO_5[pair]]})
            </dd>
          </div>
          <div className="is-wide">
            <dt>Pair</dt>
            <dd>
              {CODING_5_TO_3[pair]}–{TEMPLATE_3_TO_5[pair]}: {hydrogenBonds(CODING_5_TO_3[pair], TEMPLATE_3_TO_5[pair])} hydrogen bonds (drawn with {hydrogenBonds(CODING_5_TO_3[pair], TEMPLATE_3_TO_5[pair]) === 3 ? 'short' : 'long'} dashes)
            </dd>
          </div>
        </dl>
      )}
      {transcribing && (
        <div className="share-row">
          <button type="button" className="button" disabled={made >= rna.length} onClick={() => setMade((n) => n + 1)}>
            Add the next RNA nucleotide
          </button>
          <button type="button" className="tool-button bordered" disabled={made === 0} onClick={() => setMade(0)}>
            Start again
          </button>
          <span className="small" aria-live="polite">
            {made === 0
              ? 'No RNA yet.'
              : made < rna.length
                ? `Added ${rna[made - 1]} (pairs with template ${TEMPLATE_3_TO_5[made - 1]}). RNA so far: 5′-${rna.slice(0, made).join('')}-3′`
                : `Done: RNA 5′-${rna.join('')}-3′, the coding strand with U for T.`}
          </span>
        </div>
      )}
    </section>
  )
}

export function DnaPanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="dna-panel-heading">
      <header className="info-header">
        <p className="eyebrow">Biology</p>
        <h2 id="dna-panel-heading" className="info-title">
          DNA and RNA
        </h2>
        <p className="info-summary">How the two strands of DNA are built and paired, and how a gene’s template strand is copied into RNA.</p>
      </header>
      <div className="info-body">
        <ul className="guide-list small">
          {STEPS.map((s) => (
            <li key={s.title}>
              <strong>{s.title}.</strong> {s.text}
              <SourceLinks ids={s.sources} />
            </li>
          ))}
        </ul>
        <details className="small">
          <summary>Go deeper</summary>
          <p>
            The mRNA is a copy of the protein-coding information in the coding strand. In prokaryotes, transcription, translation and mRNA breakdown can all proceed
            together because they run in the same 5′→3′ direction and no membrane separates them.
            <SourceLinks ids={['bio-15-2']} />
          </p>
        </details>
        <p className="muted small">The model is a short, flat, schematic segment: real DNA is a double helix and genes are far longer. Validation of the pairing and directions is unit tested.</p>
        <ShareActions subject="biology" params={shareParams} restores="the DNA and RNA section" />
      </div>
    </section>
  )
}
