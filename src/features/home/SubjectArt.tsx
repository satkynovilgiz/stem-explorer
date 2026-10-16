import type { SubjectId } from '../../data/subjects'

/*
 * Small original SVG illustrations for the subject cards. They are decorative previews in the
 * app's palette, not scientific models (each card links to the real explorer).
 */

function Heart() {
  return (
    <g>
      <path d="M58 30 q-14 -18 -26 -4 q-14 16 6 40 l20 22 l22 -22 q18 -24 4 -40 q-12 -14 -26 4z" fill="#cf4f4a" opacity="0.9" />
      <path d="M58 30 q-14 -18 -26 -4 q-14 16 6 40 l20 22 z" fill="#5677c9" />
      <path d="M52 26 v-16 M62 28 q4 -18 18 -18" stroke="#cf4f4a" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M44 24 v-14" stroke="#5677c9" strokeWidth="6" strokeLinecap="round" />
    </g>
  )
}

function Molecule() {
  return (
    <g>
      <line x1="60" y1="46" x2="34" y2="70" stroke="#c3ccd2" strokeWidth="5" />
      <line x1="60" y1="46" x2="86" y2="70" stroke="#c3ccd2" strokeWidth="5" />
      <circle cx="60" cy="44" r="17" fill="#ff2d2d" />
      <circle cx="32" cy="72" r="11" fill="#f2f2f2" />
      <circle cx="88" cy="72" r="11" fill="#f2f2f2" />
      <path d="M44 58 a22 22 0 0 0 32 0" stroke="#f5c26b" strokeWidth="2" fill="none" strokeDasharray="3 3" />
    </g>
  )
}

function Cell() {
  return (
    <g>
      <ellipse cx="60" cy="52" rx="46" ry="36" fill="#1f3a40" stroke="#5fb3c9" strokeWidth="4" />
      <circle cx="50" cy="48" r="15" fill="#7b6fd6" />
      <circle cx="52" cy="46" r="5" fill="#c9a2f2" />
      <rect x="74" y="60" width="18" height="9" rx="4.5" fill="#e8875a" />
      <path d="M78 34 q8 6 0 12 M84 32 q8 7 0 15" stroke="#f2c45a" strokeWidth="3" fill="none" />
      <circle cx="30" cy="66" r="4" fill="#d46a9f" />
    </g>
  )
}

function Trajectory() {
  return (
    <g>
      <line x1="12" y1="84" x2="108" y2="84" stroke="#8a959e" strokeWidth="2" />
      <line x1="16" y1="88" x2="16" y2="14" stroke="#8a959e" strokeWidth="2" />
      <path d="M16 84 Q58 -4 100 84" stroke="#6fe0dc" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      <path d="M16 84 Q40 30 52 36" stroke="#2fc4c0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="52" cy="36" r="5" fill="#e8ecef" />
      <line x1="52" y1="36" x2="70" y2="30" stroke="#7aa7ff" strokeWidth="3" />
      <line x1="52" y1="36" x2="52" y2="54" stroke="#f5c26b" strokeWidth="3" />
    </g>
  )
}

function Surface() {
  const lines = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    // A saddle-like grid drawn in simple projection.
    lines.push(<path key={`a${i}`} d={`M${14 + t * 40} ${70 - t * 20} Q${60 + t * 4} ${40 + (t - 0.5) * 30} ${66 + t * 40} ${74 - t * 22}`} stroke="#2fc4c0" strokeWidth="1.6" fill="none" opacity="0.85" />)
    lines.push(<path key={`b${i}`} d={`M${14 + t * 52} ${70 + t * 4} Q${40 + t * 20} ${34 + Math.abs(t - 0.5) * 30} ${54 + t * 52} ${50 + t * 2}`} stroke="#f5e17a" strokeWidth="1.2" fill="none" opacity="0.6" />)
  }
  return (
    <g>
      {lines}
      <line x1="60" y1="14" x2="60" y2="88" stroke="#f5c26b" strokeWidth="2" strokeDasharray="3 3" />
    </g>
  )
}

const ART: Record<SubjectId, () => React.JSX.Element> = {
  anatomy: Heart,
  chemistry: Molecule,
  biology: Cell,
  physics: Trajectory,
  mathematics: Surface,
}

export function SubjectArt({ subject }: { subject: SubjectId }) {
  const Art = ART[subject]
  return (
    <svg className="subject-art" viewBox="0 0 120 96" aria-hidden="true" focusable="false">
      <Art />
    </svg>
  )
}
