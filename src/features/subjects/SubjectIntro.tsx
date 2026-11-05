import type { CSSProperties, JSX } from 'react'
import type { SubjectId } from '../../data/subjects'
import '../../styles/subject-intro.css'

/**
 * A short decorative animation inside the header's subject mark. It sits in the mark's fixed box,
 * so nothing moves or is covered, and the mark is hidden from assistive technology.
 */
export function SubjectIntro({ subject }: { subject: SubjectId }) {
  const Scene = SCENES[subject]
  return (
    <svg viewBox="0 0 42 42" className={`si-scene si-${subject}`} focusable="false" data-testid="subject-intro">
      <Scene />
    </svg>
  )
}

/** Water forms: two hydrogens arrive at the real 104.5° angle. */
function ChemistryScene() {
  const half = (104.5 / 2) * (Math.PI / 180)
  const [x, y, bond] = [21, 15, 15]
  const dx = bond * Math.sin(half)
  const dy = bond * Math.cos(half)
  return (
    <>
      <line x1={x} y1={y} x2={x - dx} y2={y + dy} className="si-line si-draw is-late" pathLength={1} />
      <line x1={x} y1={y} x2={x + dx} y2={y + dy} className="si-line si-draw is-late" pathLength={1} />
      <circle cx={x - dx} cy={y + dy} r="4.5" className="si-dot si-h-left" />
      <circle cx={x + dx} cy={y + dy} r="4.5" className="si-dot si-h-right" />
      <circle cx={x} cy={y} r="7.5" className="si-dot" />
    </>
  )
}

/** A heartbeat trace is drawn across the mark. */
function AnatomyScene() {
  return <path className="si-line si-draw" pathLength={1} d="M4 23 H12 l2.5 -3 l2.5 3 h2 l2.5 -12 l3.5 19 l2.5 -7 h2 l2 -2.5 l2 2.5 H38" />
}

const HELIX = [0, 1, 2, 3, 4, 5]

/** A DNA double helix turns: base pairs swing in step, one after another. */
function BiologyScene() {
  return (
    <g transform="translate(8.5 21)">
      {HELIX.map((i) => (
        <g key={i} transform={`translate(${i * 5} 0)`} style={{ '--i': i } as CSSProperties}>
          <line y1="-11" y2="11" className="si-rung" />
          <circle r="1.9" className="si-dot si-base is-a" />
          <circle r="1.9" className="si-dot si-base is-b" />
        </g>
      ))}
    </g>
  )
}

/** A projectile on its true parabola: steady across, slowing up and speeding down. */
function PhysicsScene() {
  return (
    <>
      <path d="M6 33 Q21 -3 36 33" className="si-arc" />
      <g className="si-ball-x">
        <g className="si-ball-y">
          <circle r="4" className="si-dot" />
        </g>
      </g>
    </>
  )
}

/** Axes, then a curve drawn across them. */
function MathematicsScene() {
  return (
    <>
      <path d="M7 6 V36 H37" className="si-axes" />
      <path d="M8 29 C15 29 15 11 21 11 S28 26 36 15" className="si-line si-draw" pathLength={1} />
    </>
  )
}

const SCENES: Record<SubjectId, () => JSX.Element> = {
  chemistry: ChemistryScene,
  anatomy: AnatomyScene,
  biology: BiologyScene,
  physics: PhysicsScene,
  mathematics: MathematicsScene,
}
