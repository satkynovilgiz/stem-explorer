import { clampTime, DEFAULT_MOTION, defaultParams, getMotion, MAX_DT, MIN_DT, MOTION_IDS, paramsProblem, type MotionId, type MotionState } from '../math/motion'

/*
 * Derivatives and motion: `?msec=motion&mo=<motion>&<param keys>&mt=<t, s>&mdt=<Δt, s>&mex=math|phys`.
 * Each motion has its own parameter keys (mx0, mv; mx0, mv0, ma; my0, mv0; mA, mw). Playback is
 * never stored: a shared link opens paused at its time.
 */
export const MOTION_URL_KEYS = ['mo', 'mx0', 'mv', 'mv0', 'ma', 'my0', 'mA', 'mw', 'mt', 'mdt', 'mex'] as const

const num = (raw: string) => (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN)

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
    if (Number.isFinite(v) && v >= 0 && v <= def.tEnd(params) + 1e-9) t = Math.min(v, def.tEnd(params))
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

const r = (v: number, d = 3) => String(Number(v.toFixed(d)))

export function motionEntries(st: MotionState): Record<string, string> {
  const def = getMotion(st.motion)
  return {
    msec: 'motion',
    mo: st.motion,
    ...Object.fromEntries(def.params.map((s) => [s.url, r(st.params[s.key], 2)])),
    mt: r(st.t),
    mdt: r(st.dt),
    mex: st.view,
  }
}
