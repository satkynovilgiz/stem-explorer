import { Pause, Play, X } from 'lucide-react'
import { useId } from 'react'
import { findStructure } from '../../../data/anatomy/atlas'
import { angleAt, findMovement, MOVEMENTS, poseWords, type MovementId, type Side } from '../../../data/anatomy/atlas/movements'
import { SourceLinks } from '../../guide/SourceLinks'
import type { AtlasState } from './atlasState'

const sidedName = (base: string, side: Side) => findStructure(`${base}-${side}`)?.name ?? base

/** A flat side-view sketch of the two segments, so the pose can be read without WebGL. */
function PoseSketch({ id, t, side }: { id: MovementId; t: number; side: Side }) {
  const m = findMovement(id)!
  const knee = id === 'knee-flexion'
  // Upper segment hangs down from (60, 20) to the joint at (60, 90); the lower segment rotates.
  const a = Math.abs(angleAt(m, t))
  // Matches the 3D view: seen from the body's left, anterior is on the left; from the right, on the right.
  const anteriorLeft = side === 'left'
  const forward = anteriorLeft ? -1 : 1
  const dir = knee ? -forward : forward // forearm swings anteriorly, leg posteriorly
  const end = [60 + dir * Math.sin(a) * 70, 90 + Math.cos(a) * 70]
  return (
    <svg className="pose-sketch" viewBox="0 0 120 170" role="img" aria-label={`Side-view sketch from the body’s ${side}: ${poseWords(t).toLowerCase()}. Anterior is to the ${anteriorLeft ? 'left' : 'right'}.`}>
      <text x="4" y="12" className="pose-axis">
        {anteriorLeft ? 'Anterior' : 'Posterior'}
      </text>
      <text x="116" y="12" className="pose-axis" textAnchor="end">
        {anteriorLeft ? 'Posterior' : 'Anterior'}
      </text>
      <line x1="60" y1="20" x2="60" y2="90" className="pose-upper" />
      <line x1="60" y1="90" x2={end[0]} y2={end[1]} className="pose-lower" />
      <circle cx="60" cy="90" r="6" className="pose-joint" />
      <line x1="60" y1="90" x2="60" y2="160" className="pose-reference" />
      <text x="64" y="166" className="pose-axis">
        reference
      </text>
      <text x={anteriorLeft ? 116 : 4} y="60" className="pose-label" textAnchor={anteriorLeft ? 'end' : 'start'}>
        {knee ? 'Thigh' : 'Arm'}
      </text>
    </svg>
  )
}

export function MovementPanel({
  state,
  reducedMotion,
  playing,
  onStart,
  onSide,
  onT,
  onPlay,
  onExit,
  onSelect,
}: {
  state: AtlasState
  reducedMotion: boolean
  playing: boolean
  onStart: (id: MovementId, side: Side) => void
  onSide: (s: Side) => void
  onT: (t: number) => void
  onPlay: (p: boolean) => void
  onExit: () => void
  onSelect: (id: string) => void
}) {
  const id = useId()
  const demo = state.demo
  const m = demo ? findMovement(demo.id)! : null
  return (
    <section className="info-section movement-panel" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="section-title">
        Movement demonstrations
      </h3>
      <div className="segmented" role="group" aria-label="Demonstration">
        {MOVEMENTS.map((mv) => (
          <button key={mv.id} type="button" className="segmented-option" aria-pressed={demo?.id === mv.id} onClick={() => onStart(mv.id, demo?.side ?? 'left')}>
            {mv.name}
          </button>
        ))}
      </div>
      {!demo || !m ? (
        <p className="muted small">
          Each demonstration rotates one limb segment about its joint, from the anatomical position, and names the muscles that produce the movement. Ranges are
          conceptual.
        </p>
      ) : (
        <>
          <div className="share-row">
            <div className="segmented" role="group" aria-label="Side">
              {(['left', 'right'] as const).map((s) => (
                <button key={s} type="button" className="segmented-option" aria-pressed={demo.side === s} onClick={() => onSide(s)}>
                  {s === 'left' ? 'Left' : 'Right'} side
                </button>
              ))}
            </div>
            <button type="button" className="tool-button bordered" onClick={onExit}>
              <X size={15} aria-hidden="true" />
              <span>Exit demonstration</span>
            </button>
          </div>
          <p className="small">
            <strong>Reference posture.</strong> {m.referencePosture}
          </p>
          <p className="small">
            <strong>Movement: {m.name.toLowerCase()}.</strong> {m.definition}
            <SourceLinks ids={['ap-9-5']} />
          </p>
          <label className="param-label" htmlFor={`${id}-t`}>
            Flexion (conceptual)
          </label>
          <div className="movement-control">
            {!reducedMotion && (
              <button type="button" className="tool-button bordered" aria-pressed={playing} onClick={() => onPlay(!playing)}>
                {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>
            )}
            <input
              id={`${id}-t`}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(demo.t * 100)}
              aria-valuetext={poseWords(demo.t)}
              onChange={(e) => {
                onPlay(false)
                onT(Number(e.target.value) / 100)
              }}
            />
          </div>
          <p className="small movement-pose" aria-live="polite">
            {poseWords(demo.t)}
          </p>
          <PoseSketch id={demo.id} t={demo.t} side={demo.side} />
          <h4 className="inventory-title">Principal structures</h4>
          <ul className="relation-list">
            <li>
              <span className="muted small">Joint: </span>
              <button type="button" className="relation-link" onClick={() => onSelect(`${m.joint}-${demo.side}`)}>
                {sidedName(m.joint, demo.side)}
              </button>
            </li>
            {m.principal.map((p) => (
              <li key={p.id}>
                <span className="muted small">Flexor: </span>
                <button type="button" className="relation-link" onClick={() => onSelect(`${p.id}-${demo.side}`)}>
                  {sidedName(p.id, demo.side)}
                </button>{' '}
                <span className="small">— {p.role.toLowerCase()}</span>
              </li>
            ))}
            {m.opposing.map((p) => (
              <li key={p.id}>
                <span className="muted small">Opposes: </span>
                <button type="button" className="relation-link" onClick={() => onSelect(`${p.id}-${demo.side}`)}>
                  {sidedName(p.id, demo.side)}
                </button>{' '}
                <span className="small">— {p.role.toLowerCase()}</span>
              </li>
            ))}
          </ul>
          <div className="inline-note small">
            <p>
              <strong>What this shows and does not.</strong> Rigid segments turn about one fixed axis through the joint. The range is conceptual — no measured range of
              motion for any population is claimed, so no angles are given. Muscles that cross the joint simply stretch between their ends; muscle shortening, forces,
              joint surfaces and ligaments are not modelled.
            </p>
            {m.notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
          <p className="muted small">
            <SourceLinks ids={m.sources} />
          </p>
        </>
      )}
    </section>
  )
}

/* ---------- Regional comparison ---------- */

const ROWS: { label: string; upper: string; lower: string; upperIds: string[]; lowerIds: string[] }[] = [
  { label: 'Girdle (attaches the limb)', upper: 'Pectoral girdle: clavicle and scapula', lower: 'Pelvic girdle: hip bone', upperIds: ['clavicle', 'scapula'], lowerIds: ['hip-bone'] },
  { label: 'Proximal segment', upper: 'Arm: humerus', lower: 'Thigh: femur', upperIds: ['humerus'], lowerIds: ['femur'] },
  { label: 'Distal segment', upper: 'Forearm: ulna (medial) and radius (lateral)', lower: 'Leg: tibia (medial, weight-bearing) and fibula (lateral)', upperIds: ['ulna', 'radius'], lowerIds: ['tibia', 'fibula'] },
  { label: 'Wrist / back of foot', upper: '8 carpals', lower: '7 tarsals', upperIds: ['carpals'], lowerIds: ['tarsals'] },
  { label: 'Palm / mid-foot', upper: '5 metacarpals', lower: '5 metatarsals', upperIds: ['metacarpals'], lowerIds: ['metatarsals'] },
  { label: 'Digits', upper: '14 phalanges', lower: '14 phalanges', upperIds: ['hand-phalanges'], lowerIds: ['foot-phalanges'] },
  { label: 'Main hinge', upper: 'Elbow: hinge allowing only flexion and extension', lower: 'Knee: functions primarily as a hinge; some rotation when flexed', upperIds: ['elbow-joint'], lowerIds: ['knee-joint'] },
  { label: 'Ball-and-socket joint', upper: 'Shoulder: very large range, supported mainly by muscles', lower: 'Hip: restricted by strong ligaments, stable for weight bearing', upperIds: ['shoulder-joint'], lowerIds: ['hip-joint'] },
  { label: 'Flexors of the hinge', upper: 'Biceps brachii, brachialis, brachioradialis', lower: 'Hamstring group, sartorius', upperIds: ['biceps-brachii', 'brachialis', 'brachioradialis'], lowerIds: ['hamstrings', 'sartorius'] },
  { label: 'Extensors of the hinge', upper: 'Triceps brachii', lower: 'Quadriceps femoris group', upperIds: ['triceps-brachii'], lowerIds: ['quadriceps'] },
]

export function LimbComparison({ onSelect }: { onSelect: (id: string) => void }) {
  const cell = (text: string, ids: string[]) => (
    <td>
      {text}
      <span className="compare-links">
        {ids.map((b) => (
          <button key={b} type="button" className="relation-link small" onClick={() => onSelect(`${b}-left`)}>
            Show {findStructure(`${b}-left`)!.name.replace(/^Left /, '').replace(/ \(.*\)$/, '')}
          </button>
        ))}
      </span>
    </td>
  )
  return (
    <details className="info-section limb-compare">
      <summary className="section-title">Compare upper and lower limbs</summary>
      <table className="compare-table">
        <caption className="small">The limbs share a plan: a girdle, one proximal bone, two distal bones, then a wrist or ankle group, five long bones and the digits.</caption>
        <thead>
          <tr>
            <th scope="col">Part</th>
            <th scope="col">Upper limb</th>
            <th scope="col">Lower limb</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {cell(r.upper, r.upperIds)}
              {cell(r.lower, r.lowerIds)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        “Show” buttons select the left-side structure. Counts and joint descriptions:
        <SourceLinks ids={['ap-8-1', 'ap-8-2', 'ap-8-3', 'ap-8-4', 'ap-9-6', 'ap-11-5', 'ap-11-6']} />
      </p>
    </details>
  )
}
