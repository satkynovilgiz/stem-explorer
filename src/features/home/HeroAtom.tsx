import { usePrefersReducedMotion } from '../../lib/hooks'

/** Three tilted orbits (degrees) and how long one electron takes to go round each (seconds). */
const ORBITS = [
  { tilt: 0, dur: 7, start: 0.1 },
  { tilt: 60, dur: 9, start: 0.45 },
  { tilt: -60, dur: 11, start: 0.75 },
] as const
const RX = 150
const RY = 54
// One ellipse as a path (two arcs), so an electron can travel along it.
const ORBIT_PATH = `M ${-RX} 0 a ${RX} ${RY} 0 1 0 ${2 * RX} 0 a ${RX} ${RY} 0 1 0 ${-2 * RX} 0`

/** A point on the orbit at fraction t of the way round (for the still picture under reduced motion). */
const at = (t: number) => ({ x: -RX * Math.cos(2 * Math.PI * t), y: RY * Math.sin(2 * Math.PI * t) })

/**
 * The Home hero's decoration: a stylised atom whose electrons travel their orbits. Purely
 * decorative (hidden from assistive technology); with reduced motion it is a still picture.
 */
export function HeroAtom() {
  const still = usePrefersReducedMotion()
  return (
    <div className="hero-atom" aria-hidden="true">
      <span className="hero-glow" />
      <svg viewBox="-200 -200 400 400" className="hero-atom-svg" focusable="false">
        <defs>
          <radialGradient id="hero-nucleus" cx="35%" cy="35%" r="70%">
            <stop offset="0" stopColor="#5fb3a6" />
            <stop offset="1" stopColor="#13544c" />
          </radialGradient>
          <radialGradient id="hero-neutron" cx="35%" cy="35%" r="70%">
            <stop offset="0" stopColor="#f3e3c4" />
            <stop offset="1" stopColor="#c99a55" />
          </radialGradient>
          <radialGradient id="hero-electron" cx="35%" cy="35%" r="70%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#1d6f66" />
          </radialGradient>
        </defs>
        {ORBITS.map((o) => {
          const p = at(o.start)
          return (
            <g key={o.tilt} transform={`rotate(${o.tilt})`}>
              <path d={ORBIT_PATH} className="hero-orbit" />
              <circle r="8" fill="url(#hero-electron)" className="hero-electron" cx={still ? p.x : 0} cy={still ? p.y : 0}>
                {!still && <animateMotion dur={`${o.dur}s`} repeatCount="indefinite" path={ORBIT_PATH} begin={`-${(o.start * o.dur).toFixed(2)}s`} />}
              </circle>
            </g>
          )
        })}
        <g className="hero-nucleus">
          <circle cx="-10" cy="-8" r="15" fill="url(#hero-nucleus)" />
          <circle cx="12" cy="-6" r="15" fill="url(#hero-neutron)" />
          <circle cx="-4" cy="12" r="15" fill="url(#hero-neutron)" />
          <circle cx="14" cy="14" r="15" fill="url(#hero-nucleus)" />
          <circle cx="1" cy="0" r="15" fill="url(#hero-nucleus)" />
        </g>
      </svg>
    </div>
  )
}
