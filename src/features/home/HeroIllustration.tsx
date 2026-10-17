import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/*
 * Decorative hero art: a travelling wave, a bent three-atom molecule and a cell outline, drawn in
 * SVG (no WebGL, no images). Motion uses CSS transforms only and stops when:
 * - the visitor presses Pause (remembered on this browser),
 * - the illustration is scrolled out of view or the tab is hidden,
 * - the system asks for reduced motion (then nothing moves and no control is shown).
 * It is a mood piece, not a scientific model, and is hidden from assistive technology.
 */

const PAUSE_KEY = 'stem-explorer:hero-paused'

const readPaused = () => {
  try {
    return window.localStorage.getItem(PAUSE_KEY) === '1'
  } catch {
    return false
  }
}

const reducedQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribeReduced = (cb: () => void) => {
  const q = reducedQuery()
  q.addEventListener('change', cb)
  return () => q.removeEventListener('change', cb)
}

/** One wavelength is 80 units; the path spans several so a one-wavelength shift loops seamlessly. */
const WAVE = Array.from({ length: 6 }, () => 'q 20 -22 40 0 t 40 0').join(' ')

export function HeroIllustration() {
  const reduced = useSyncExternalStore(subscribeReduced, () => reducedQuery().matches, () => false)
  const [userPaused, setUserPaused] = useState(readPaused)
  const [inView, setInView] = useState(true)
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const running = !reduced && !userPaused && inView && tabVisible
  const toggle = () => {
    const next = !userPaused
    setUserPaused(next)
    try {
      window.localStorage.setItem(PAUSE_KEY, next ? '1' : '0')
    } catch {
      // Not remembered when storage is blocked; the button still works for this visit.
    }
  }

  return (
    <div ref={ref} className="hero-art" data-running={running ? 'true' : 'false'}>
      <svg viewBox="0 0 320 236" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="hero-wave-clip">
            <rect x="16" y="150" width="288" height="70" rx="12" />
          </clipPath>
          <radialGradient id="hero-glow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="var(--hero-glow)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--hero-glow)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="320" height="240" fill="url(#hero-glow)" />
        {/* Cell outline with a nucleus (biology) */}
        <g className="hero-cell">
          <ellipse cx="98" cy="86" rx="66" ry="50" fill="var(--hero-cell-fill)" stroke="var(--subject-biology)" strokeWidth="3" />
          <circle cx="112" cy="80" r="17" fill="none" stroke="var(--subject-biology)" strokeWidth="2.5" />
          <circle cx="116" cy="78" r="5" fill="var(--subject-biology)" opacity="0.7" />
          <ellipse cx="70" cy="104" rx="12" ry="6" fill="none" stroke="var(--subject-anatomy)" strokeWidth="2" />
        </g>
        {/* Bent three-atom molecule (chemistry) */}
        <g className="hero-molecule">
          <line x1="232" y1="70" x2="206" y2="102" stroke="var(--color-border-strong)" strokeWidth="5" strokeLinecap="round" />
          <line x1="232" y1="70" x2="262" y2="100" stroke="var(--color-border-strong)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="232" cy="68" r="17" fill="var(--subject-anatomy)" />
          <circle cx="204" cy="104" r="11" fill="var(--color-text)" />
          <circle cx="264" cy="102" r="11" fill="var(--color-text)" />
        </g>
        {/* Axes and a travelling wave (physics / mathematics) */}
        <g clipPath="url(#hero-wave-clip)">
          <rect x="16" y="150" width="288" height="70" rx="12" fill="var(--hero-panel)" />
          <line x1="16" y1="185" x2="304" y2="185" stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
          <path className="hero-wave" d={`M -64 185 ${WAVE}`} fill="none" stroke="var(--subject-physics)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <rect x="16" y="150" width="288" height="70" rx="12" fill="none" stroke="var(--color-border)" />
      </svg>
      {!reduced && (
        <button type="button" className="hero-art-toggle icon-button" aria-pressed={userPaused} aria-label="Pause decorative animation" onClick={toggle}>
          {userPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}
