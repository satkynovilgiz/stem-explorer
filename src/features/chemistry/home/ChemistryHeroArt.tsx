import { usePrefersReducedMotion } from '../../../lib/hooks'

// Water at its real geometry: the two bonds are 104.5° apart.
const HALF_ANGLE = ((104.5 / 2) * Math.PI) / 180
const OXYGEN = { x: 214, y: 118 }
const BOND = 84
const DX = BOND * Math.sin(HALF_ANGLE)
const DY = BOND * Math.cos(HALF_ANGLE)
const ARC = 54
const arcFrom = { x: OXYGEN.x - ARC * Math.sin(HALF_ANGLE), y: OXYGEN.y + ARC * Math.cos(HALF_ANGLE) }
const arcTo = { x: OXYGEN.x + ARC * Math.sin(HALF_ANGLE), y: OXYGEN.y + ARC * Math.cos(HALF_ANGLE) }

const ORBIT = 'M -34 0 a 34 13 0 1 0 68 0 a 34 13 0 1 0 -68 0'
const ORBITS = [
  { tilt: 0, dur: 5, begin: 0 },
  { tilt: 60, dur: 6.5, begin: 1.4 },
  { tilt: -60, dur: 8, begin: 3 },
] as const

/** Real values from chemistry, drifting gently around the molecule. */
const CHIPS = [
  { text: 'H₂O', x: 330, y: 44, w: 58, i: 0 },
  { text: 'CO₂', x: 18, y: 188, w: 58, i: 1 },
  { text: 'NaCl', x: 322, y: 208, w: 64, i: 2 },
  { text: '6.022 × 10²³', x: 104, y: 22, w: 112, i: 3 },
] as const

/**
 * The picture in the Chemistry home page's panel. Decorative, so hidden from assistive technology;
 * with reduced motion it is a still picture.
 */
export function ChemistryHeroArt() {
  const still = usePrefersReducedMotion()
  return (
    <div className="chem-hero-art" aria-hidden="true">
      <svg viewBox="0 0 400 260" focusable="false">
        <defs>
          <radialGradient id="chem-hero-o" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ff8a7a" />
            <stop offset="0.55" stopColor="#e23d31" />
            <stop offset="1" stopColor="#a81f1a" />
          </radialGradient>
          <radialGradient id="chem-hero-h" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c6d3d0" />
          </radialGradient>
          <radialGradient id="chem-hero-glow">
            <stop offset="0" stopColor="#3fb3a2" stopOpacity="0.42" />
            <stop offset="1" stopColor="#3fb3a2" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="214" cy="135" r="125" fill="url(#chem-hero-glow)" className="chem-hero-glow" />

        <g transform="translate(62 84)">
          {ORBITS.map((o) => (
            <g key={o.tilt} transform={`rotate(${o.tilt})`}>
              <path d={ORBIT} className="chem-hero-orbit" />
              <circle r="3.5" className="chem-hero-electron" cx={still ? 34 : 0}>
                {!still && <animateMotion dur={`${o.dur}s`} begin={`-${o.begin}s`} repeatCount="indefinite" path={ORBIT} />}
              </circle>
            </g>
          ))}
          <circle r="9" className="chem-hero-nucleus" />
        </g>

        <g className="chem-hero-molecule">
          <line x1={OXYGEN.x} y1={OXYGEN.y} x2={OXYGEN.x - DX} y2={OXYGEN.y + DY} className="chem-hero-bond" />
          <line x1={OXYGEN.x} y1={OXYGEN.y} x2={OXYGEN.x + DX} y2={OXYGEN.y + DY} className="chem-hero-bond" />
          <path d={`M ${arcFrom.x} ${arcFrom.y} A ${ARC} ${ARC} 0 0 0 ${arcTo.x} ${arcTo.y}`} className="chem-hero-arc" pathLength={1} />
          <circle cx={OXYGEN.x - DX} cy={OXYGEN.y + DY} r="22" fill="url(#chem-hero-h)" className="chem-hero-atom" />
          <circle cx={OXYGEN.x + DX} cy={OXYGEN.y + DY} r="22" fill="url(#chem-hero-h)" className="chem-hero-atom" />
          <circle cx={OXYGEN.x} cy={OXYGEN.y} r="36" fill="url(#chem-hero-o)" className="chem-hero-atom" />
          <text x={OXYGEN.x - DX} y={OXYGEN.y + DY + 6} textAnchor="middle" className="chem-hero-letter">H</text>
          <text x={OXYGEN.x + DX} y={OXYGEN.y + DY + 6} textAnchor="middle" className="chem-hero-letter">H</text>
          <text x={OXYGEN.x} y={OXYGEN.y + 8} textAnchor="middle" className="chem-hero-letter is-o">O</text>
          <text x={OXYGEN.x} y={OXYGEN.y + DY + 30} textAnchor="middle" className="chem-hero-angle">104.5°</text>
        </g>

        {CHIPS.map((c) => (
          <g key={c.text} className="chem-hero-chip" style={{ animationDelay: `${c.i * -1.3}s` }}>
            <rect x={c.x} y={c.y} width={c.w} height="30" rx="15" />
            <text x={c.x + c.w / 2} y={c.y + 20} textAnchor="middle">
              {c.text}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
