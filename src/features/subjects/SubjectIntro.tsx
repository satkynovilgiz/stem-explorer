import { SUBJECTS, type SubjectId } from '../../data/subjects'
import '../../styles/subject-intro.css'

/**
 * A brief full-screen opening for a subject. Purely decorative: hidden from assistive technology,
 * and clicks and keys pass straight through to the page underneath.
 */
export function SubjectIntro({ subject }: { subject: SubjectId }) {
  const { name, tagline } = SUBJECTS.find((s) => s.id === subject)!
  const Scene = SCENES[subject]
  return (
    <div className={`subject-intro is-${subject}`} aria-hidden="true" data-testid="subject-intro">
      <div className="si-content">
        <svg viewBox="0 0 240 150" className="si-scene" focusable="false">
          <Scene />
        </svg>
        <p className="si-name">{name}</p>
        <p className="si-tagline">{tagline}</p>
      </div>
    </div>
  )
}

/** Water forms: two hydrogens fly in to the real 104.5° angle and the bonds appear. */
function ChemistryScene() {
  const BOND = 50
  const half = (104.5 / 2) * (Math.PI / 180)
  const dx = BOND * Math.sin(half)
  const dy = BOND * Math.cos(half)
  const O = { x: 120, y: 62 }
  return (
    <>
      <circle cx={O.x} cy={O.y} r="42" className="si-ring" />
      <line x1={O.x} y1={O.y} x2={O.x - dx} y2={O.y + dy} className="si-bond" pathLength={1} />
      <line x1={O.x} y1={O.y} x2={O.x + dx} y2={O.y + dy} className="si-bond" pathLength={1} />
      <g className="si-hydrogen is-left">
        <circle cx={O.x - dx} cy={O.y + dy} r="13" className="si-atom-h" />
      </g>
      <g className="si-hydrogen is-right">
        <circle cx={O.x + dx} cy={O.y + dy} r="13" className="si-atom-h" />
      </g>
      <circle cx={O.x} cy={O.y} r="23" className="si-atom-o" />
    </>
  )
}

/** A heart beats twice as its ECG trace is drawn underneath. */
function AnatomyScene() {
  return (
    <>
      <g transform="translate(120 48)">
        <path className="si-heart" d="M0 30 C-34 8 -30 -22 -12 -22 C-5 -22 -1 -17 0 -12 C1 -17 5 -22 12 -22 C30 -22 34 8 0 30 Z" />
      </g>
      <path
        className="si-draw si-ecg"
        pathLength={1}
        d="M8 118 H62 q6 -9 12 0 h7 l4 6 l8 -36 l8 44 l5 -14 h10 q8 -11 16 0 h16 q6 -9 12 0 h7 l4 6 l8 -36 l8 44 l5 -14 h34"
      />
    </>
  )
}

const HELIX_COLUMNS = Array.from({ length: 14 }, (_, i) => i)

/** A DNA double helix turns: each base pair swings in step, one after another along the strand. */
function BiologyScene() {
  return (
    <g transform="translate(29 75)">
      {HELIX_COLUMNS.map((i) => (
        <g key={i} transform={`translate(${i * 14} 0)`} style={{ '--i': i } as React.CSSProperties}>
          <line x1="0" x2="0" y1="-36" y2="36" className="si-rung" />
          <circle r="5" className="si-base is-a" />
          <circle r="5" className="si-base is-b" />
        </g>
      ))}
    </g>
  )
}

/** A projectile follows its true parabola: steady across, slowing up and speeding down. */
function PhysicsScene() {
  return (
    <>
      <line x1="10" y1="131" x2="230" y2="131" className="si-ground" />
      <path d="M24 122 Q120 -58 216 122" className="si-arc" />
      <g className="si-ball-x">
        <g className="si-ball-y">
          <circle r="9" className="si-ball" />
        </g>
      </g>
      <circle cx="216" cy="131" r="14" className="si-impact" />
    </>
  )
}

const CURVE = 'M20 75 C40 15 70 15 90 75 S140 135 160 75 S205 25 222 58'

/** Axes appear and a curve is drawn across them, with a point riding its tip. */
function MathematicsScene() {
  return (
    <>
      <line x1="20" y1="75" x2="228" y2="75" className="si-axis" pathLength={1} />
      <line x1="20" y1="136" x2="20" y2="14" className="si-axis" pathLength={1} />
      <path d={CURVE} className="si-draw si-curve" pathLength={1} />
      <circle r="6" className="si-point">
        <animateMotion dur="1s" begin="0.2s" fill="freeze" path={CURVE} />
      </circle>
    </>
  )
}

const SCENES: Record<SubjectId, () => React.JSX.Element> = {
  chemistry: ChemistryScene,
  anatomy: AnatomyScene,
  biology: BiologyScene,
  physics: PhysicsScene,
  mathematics: MathematicsScene,
}
