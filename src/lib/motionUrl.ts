import { clampTime, DEFAULT_MOTION, defaultParams, getMotion, MAX_DT, MIN_DT, MOTION_IDS, paramsProblem, type MotionId, type MotionState } from '../math/motion'

/*
 * Derivatives and motion: `?msec=motion&mo=<motion>&<param keys>&mt=<t, s>&mdt=<Δt, s>&mex=math|phys`.
 * Each motion has its own parameter keys (mx0, mv; mx0, mv0, ma; my0, mv0; mA, mw). Playback is
 * never stored: a shared link opens paused at its time.
 */
export const MOTION_URL_KEYS = ['mo', 'mx0', 'mv', 'mv0', 'ma', 'my0', 'mA', 'mw', 'mt', 'mdt', 'mex'] as const

const num = (raw: string) => (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(raw.trim()) ? Number(raw) : Number.NaN)

/**
 * Links written before values were stored at full precision rounded the time to 3 decimals, so a
 * landing time of 1.190603… s was stored as 1.191 s, just past the end of the motion. A time at
 * most this far past the end is read as the end; anything further is rejected.
 */
export const LEGACY_TIME_TOLERANCE = 0.0005

export function parseMotionState(search: string): { state: MotionState; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const rawId = q.get('mo')
  const motion = rawId && (MOTION_IDS as readonly string[]).includes(rawId) ? (rawId as MotionId) : DEFAULT_MOTION.motion
  if (rawId !== null && motion !== rawId) invalid.push('mo')
  const def = getMotion(motion)
  let params = motion === DEFAULT_MOTION.motion ? { ...DEFAULT_MOTION.params } : defaultParams(def)
  for (const s of def.params) {
    const raw = q.get(s.url)
    if (raw === null) continue
    const v = num(raw)
    if (Number.isFinite(v) && v >= s.min && v <= s.max) params[s.key] = v
    else invalid.push(s.url)
  }
  if (paramsProblem(def, params)) {
    invalid.push(def.params[0].url)
    params = defaultParams(def)
  }
  // Keys of the other motions don't belong in this link.
  const own = new Set(def.params.map((s) => s.url))
  for (const k of ['mx0', 'mv', 'mv0', 'ma', 'my0', 'mA', 'mw']) if (q.has(k) && !own.has(k)) invalid.push(k)
  let t = DEFAULT_MOTION.t
  const rt = q.get('mt')
  if (rt !== null) {
    const v = num(rt)
    if (Number.isFinite(v) && v >= 0 && v <= def.tEnd(params) + LEGACY_TIME_TOLERANCE) t = Math.min(v, def.tEnd(params))
    else invalid.push('mt')
  }
  let dt = DEFAULT_MOTION.dt
  const rd = q.get('mdt')
  if (rd !== null) {
    const v = num(rd)
    if (Number.isFinite(v) && Math.abs(v) >= MIN_DT && Math.abs(v) <= MAX_DT) dt = v
    else invalid.push('mdt')
  }
  const rv = q.get('mex')
  const view = rv === 'math' || rv === 'phys' ? rv : DEFAULT_MOTION.view
  if (rv !== null && view !== rv) invalid.push('mex')
  return { state: { motion, params, t: clampTime(def, params, t), dt, view }, invalid: [...new Set(invalid)] }
}

/*
 * Stored values are the shortest strings that read back as the same number (String(v)), so a
 * link reopens exactly the state it was made from: y₀ = 0.001 m stays 0.001, and a landing time
 * stays the landing time. Display rounding (fmt) is separate and never written to links.
 */
const r = (v: number) => String(Object.is(v, -0) ? 0 : v)

export function motionEntries(st: MotionState): Record<string, string> {
  const def = getMotion(st.motion)
  return {
    msec: 'motion',
    mo: st.motion,
    ...Object.fromEntries(def.params.map((s) => [s.url, r(st.params[s.key])])),
    mt: r(st.t),
    mdt: r(st.dt),
    mex: st.view,
  }
}
