import { useEffect, useRef, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../lib/hooks'
import type { OverviewSubject } from './overview'

/** A chip with a real value, drifting gently. */
function Chip({ x, y, w, text, i }: { x: number; y: number; w: number; text: string; i: number }) {
  return (
    <g className="chem-hero-chip" style={{ animationDelay: `${i * -1.4}s` }}>
      <rect x={x} y={y} width={w} height="30" rx="15" />
      <text x={x + w / 2} y={y + 20} textAnchor="middle">
        {text}
      </text>
    </g>
  )
}

const HEART = 'M0 30 C-34 8 -30 -22 -12 -22 C-5 -22 -1 -17 0 -12 C1 -17 5 -22 12 -22 C30 -22 34 8 0 30 Z'

function AnatomyArt() {
  return (
    <>
      <g className="chem-hero-molecule">
        <g transform="translate(220 100) scale(2.4)">
          <path className="subj-hero-beat" d={HEART} />
        </g>
      </g>
      <path className="subj-hero-ecg" pathLength={1} d="M70 205 H150 l8 -10 l8 10 h8 l8 -42 l12 64 l8 -22 h12 l6 -8 l6 8 H370" />
      <Chip x={300} y={30} w={100} text="60–100 bpm" i={0} />
      <Chip x={50} y={40} w={104} text="4 chambers" i={1} />
    </>
  )
}

const HELIX = Array.from({ length: 12 }, (_, i) => i)

function BiologyArt() {
  return (
    <>
      {HELIX.map((i) => (
        <g key={i} transform={`translate(${96 + i * 22} 128)`} style={{ '--i': i } as CSSProperties}>
          <line className="subj-hero-rung" y1="-52" y2="52" />
          <circle className="subj-hero-base is-a" r="8" />
          <circle className="subj-hero-base is-b" r="8" />
        </g>
      ))}
      <Chip x={310} y={22} w={70} text="A–T" i={0} />
      <Chip x={40} y={210} w={70} text="G–C" i={1} />
      <Chip x={286} y={212} w={108} text="double helix" i={2} />
    </>
  )
}

function PhysicsArt() {
  return (
    <>
      <line x1="60" y1="214" x2="380" y2="214" className="subj-hero-ground" />
      <path d="M80 202 Q220 -110 360 202" className="subj-hero-path" />
      <g className="subj-hero-ball-x">
        <g className="subj-hero-ball-y">
          <circle r="13" className="subj-hero-ball" />
        </g>
      </g>
      <Chip x={276} y={22} w={118} text="g = 9.81 m/s²" i={0} />
      <Chip x={60} y={30} w={60} text="45°" i={1} />
    </>
  )
}

/** The saddle z = x² − y², drawn as a wire grid and turned slowly (still with reduced motion). */
function MathematicsArt() {
  const ref = useRef<SVGGElement>(null)
  const still = usePrefersReducedMotion()
  useEffect(() => {
    const g = ref.current
    if (!g) return
    const steps = Array.from({ length: 9 }, (_, i) => -1 + i * 0.25)
    const draw = (angle: number) => {
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const point = (x: number, y: number) => {
        const z = x * x - y * y
        return `${(222 + (x * cos - y * sin) * 110).toFixed(1)},${(132 + (x * sin + y * cos) * 48 - z * 62).toFixed(1)}`
      }
      g.innerHTML = steps
        .map((a) => `<polyline points="${steps.map((b) => point(a, b)).join(' ')}" class="subj-hero-wire"/><polyline points="${steps.map((b) => point(b, a)).join(' ')}" class="subj-hero-wire is-cross"/>`)
        .join('')
    }
    if (still) {
      draw(0.6)
      return
    }
    let frame = 0
    const loop = (t: number) => {
      draw(t / 4000)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [still])
  return (
    <>
      <g ref={ref} />
      <Chip x={276} y={18} w={118} text="z = x² − y²" i={0} />
    </>
  )
}

const ART = { anatomy: AnatomyArt, biology: BiologyArt, physics: PhysicsArt, mathematics: MathematicsArt } as const

/** The picture in a subject home page's panel. Decorative, so hidden from assistive technology. */
export function SubjectHeroArt({ subject }: { subject: OverviewSubject }) {
  const Art = ART[subject]
  return (
    <div className="chem-hero-art subj-hero-art" aria-hidden="true">
      <svg viewBox="0 0 440 260" focusable="false">
        <circle cx="220" cy="130" r="128" className="chem-hero-glow subj-hero-glow" />
        <Art />
      </svg>
    </div>
  )
}
