/*
 * Geometric optics: reflection and refraction at a flat boundary (law of reflection, Snell's law,
 * critical angle, total internal reflection) and image formation by a thin lens (thin-lens
 * equation, magnification, principal rays). Pure functions, unit tested. Sources: OpenStax
 * University Physics Volume 3 §1.1–1.4 and §2.2, 2.4.
 *
 * Model: rays (no wave effects); angles measured from the normal; intensities are not computed.
 * Thin lens: thickness negligible, rays bend at the lens plane; paraxial (small-angle) rays; no
 * aberrations. Sign convention (§2.4): f > 0 converging, f < 0 diverging; image distance di > 0
 * on the side opposite the object (real), di < 0 on the object's side (virtual); m = −di/do,
 * m > 0 upright, m < 0 inverted.
 */

const DEG = Math.PI / 180

export type OpticsPart = 'refraction' | 'lens'
export type LensKind = 'converging' | 'diverging'

export interface OpticsParams {
  part: OpticsPart
  n1: number
  n2: number
  /** Angle of incidence from the normal, degrees (used unless `atCritical`). */
  incidence: number
  /** The incidence is exactly the critical angle θc = arcsin(n2/n1), kept at full precision (link: inc=critical). */
  atCritical: boolean
  lens: LensKind
  /** Focal length magnitude, cm (the sign comes from the lens kind). */
  focal: number
  /** Object distance from the lens, cm. */
  objectDistance: number
}

export type OpticsKey = 'n1' | 'n2' | 'incidence' | 'focal' | 'objectDistance'

export const OPTICS_SPECS: Record<OpticsKey, { label: string; symbol: string; unit?: string; min: number; max: number; step: number; decimals: number }> = {
  n1: { label: 'Index of medium 1 (incident side)', symbol: 'n₁', min: 1, max: 2.5, step: 0.0001, decimals: 4 },
  n2: { label: 'Index of medium 2', symbol: 'n₂', min: 1, max: 2.5, step: 0.0001, decimals: 4 },
  incidence: { label: 'Angle of incidence', symbol: 'θ₁', unit: '°', min: 0, max: 89.99, step: 0.01, decimals: 2 },
  focal: { label: 'Focal length (magnitude)', symbol: '|f|', unit: 'cm', min: 2, max: 20, step: 0.5, decimals: 1 },
  objectDistance: { label: 'Object distance', symbol: 'dₒ', unit: 'cm', min: 1, max: 60, step: 0.1, decimals: 1 },
}

/** Object height used for the ray diagram (cm). */
export const OBJECT_HEIGHT = 2

export const DEFAULT_OPTICS: OpticsParams = { part: 'refraction', n1: 1.0003, n2: 1.333, incidence: 40, atCritical: false, lens: 'converging', focal: 10, objectDistance: 25 }

/** θc in degrees when n1 > n2, else null. */
export const criticalAngle = (n1: number, n2: number) => (n1 > n2 ? Math.asin(n2 / n1) / DEG : null)

/** The incidence actually used: the exact critical angle in critical mode (when it exists), else the entered angle. */
export function effectiveIncidence(p: Pick<OpticsParams, 'n1' | 'n2' | 'incidence' | 'atCritical'>): number {
  const c = p.atCritical ? criticalAngle(p.n1, p.n2) : null
  return c ?? p.incidence
}

/** Representative indices for 589 nm light (University Physics Vol. 3, Table 1.1). */
export const MEDIA = [
  { id: 'air', name: 'Air (0 °C, 1 atm)', n: 1.000293 },
  { id: 'water', name: 'Water, fresh (20 °C)', n: 1.333 },
  { id: 'crown', name: 'Glass, crown', n: 1.52 },
  { id: 'diamond', name: 'Diamond', n: 2.419 },
] as const

export function isValidOpticsParam(key: OpticsKey, v: number): boolean {
  const s = OPTICS_SPECS[key]
  return Number.isFinite(v) && v >= s.min && v <= s.max
}

export function normalizeOpticsParam(key: OpticsKey, v: number): number | null {
  if (!isValidOpticsParam(key, v)) return null
  return Number(v.toFixed(OPTICS_SPECS[key].decimals))
}

/* ---------- Reflection and refraction ---------- */

export interface RefractionResult {
  /** θr = θ1 (law of reflection). */
  reflected: number
  /** θ2 from Snell's law, or null when there is no transmitted ray (total internal reflection). */
  transmitted: number | null
  /** θc = arcsin(n2/n1), only when n1 > n2; otherwise null (no critical angle exists). */
  critical: number | null
  totalInternalReflection: boolean
  /**
   * sin θ2 = n1 sin θ1 / n2 equals 1 to within floating-point rounding (SIN_TOLERANCE): the incidence
   * is the critical angle and the transmitted ray grazes the boundary at 90°.
   */
  atCritical: boolean
  equalIndices: boolean
  /** Normal incidence: θ1 = 0, so nothing bends. */
  normal: boolean
  /** How the transmitted ray bends relative to the normal. */
  bend: 'toward' | 'away' | 'none' | null
}

/**
 * Tolerance on sin θ2 for "exactly at the critical angle". It only absorbs floating-point rounding:
 * sin(arcsin(x)) and the products here carry relative errors of a few units in 1e-16, so 1e-12 is
 * far above rounding and far below any physical significance (it corresponds to about 1e-10° near
 * 41°). The input step of the angle slider plays no part in the classification.
 */
export const SIN_TOLERANCE = 1e-12

export function refract(n1: number, n2: number, incidenceDeg: number): RefractionResult | null {
  if (![n1, n2, incidenceDeg].every(Number.isFinite) || n1 < 1 || n2 < 1 || incidenceDeg < 0 || incidenceDeg >= 90) return null
  const critical = criticalAngle(n1, n2)
  const equalIndices = n1 === n2
  const normal = incidenceDeg === 0
  const s = (n1 * Math.sin(incidenceDeg * DEG)) / n2
  const atCritical = critical !== null && Math.abs(s - 1) <= SIN_TOLERANCE
  const tir = !atCritical && s > 1
  const transmitted = tir ? null : atCritical ? 90 : Math.asin(s) / DEG
  return {
    reflected: incidenceDeg,
    transmitted,
    critical,
    totalInternalReflection: tir,
    atCritical,
    equalIndices,
    normal,
    bend: transmitted === null ? null : normal || equalIndices ? 'none' : n2 > n1 ? 'toward' : 'away',
  }
}

/* ---------- Thin lens ---------- */

export interface LensResult {
  /** Signed focal length, cm. */
  f: number
  /** Image distance, cm; ±Infinity when the object is at the focal plane. */
  di: number
  atInfinity: boolean
  /** m = −di/do, or null when the image is at infinity. */
  magnification: number | null
  imageHeight: number | null
  type: 'real' | 'virtual' | null
  orientation: 'upright' | 'inverted' | null
}

/** f is signed (> 0 converging, < 0 diverging); do > 0. */
export function thinLens(f: number, objectDistance: number, objectHeight = OBJECT_HEIGHT): LensResult | null {
  if (!Number.isFinite(f) || !Number.isFinite(objectDistance) || f === 0 || objectDistance <= 0) return null
  const denom = 1 / f - 1 / objectDistance
  // The object at the focal plane: the rays leave parallel and no finite image forms.
  if (Math.abs(objectDistance - f) <= 1e-9 * Math.max(1, Math.abs(f))) {
    return { f, di: Number.POSITIVE_INFINITY, atInfinity: true, magnification: null, imageHeight: null, type: null, orientation: null }
  }
  const di = 1 / denom
  const m = -di / objectDistance
  return { f, di, atInfinity: false, magnification: m, imageHeight: m * objectHeight, type: di > 0 ? 'real' : 'virtual', orientation: m > 0 ? 'upright' : 'inverted' }
}

export const signedFocal = (p: Pick<OpticsParams, 'lens' | 'focal'>) => (p.lens === 'converging' ? p.focal : -p.focal)

export type Pt = readonly [number, number]

export interface PrincipalRay {
  id: 1 | 2 | 3
  description: string
  /** From the object's tip to the lens plane. */
  incoming: readonly [Pt, Pt]
  /** From the lens plane onward (to x = xMax). */
  outgoing: readonly [Pt, Pt]
  /** Backward extension of the outgoing ray to a virtual image (dashed), if any. */
  extension?: readonly [Pt, Pt]
}

/**
 * The three principal rays from the object's tip at (−do, ho), with the lens at x = 0 and the
 * optical axis at y = 0 (§2.4 ray-tracing rules). Ray 3 is omitted when the object is at the
 * focal plane, where it would never reach the lens.
 */
export function principalRays(f: number, objectDistance: number, objectHeight = OBJECT_HEIGHT, xMax = 70): PrincipalRay[] {
  const tip: Pt = [-objectDistance, objectHeight]
  const lens = thinLens(f, objectDistance, objectHeight)
  if (!lens) return []
  const along = (from: Pt, slope: number, x: number): Pt => [x, from[1] + slope * (x - from[0])]
  const out = (at: Pt, slope: number): [Pt, Pt] => [at, along(at, slope, xMax)]
  const virtualImage: Pt | null = lens.type === 'virtual' ? [lens.di, lens.imageHeight!] : null
  const ext = (at: Pt): readonly [Pt, Pt] | undefined => (virtualImage ? [at, virtualImage] : undefined)
  const rays: PrincipalRay[] = []
  // Ray 1: parallel to the axis, then through the far focal point (converging) or away from the near one (diverging).
  const r1at: Pt = [0, objectHeight]
  const s1 = -objectHeight / f
  rays.push({ id: 1, description: f > 0 ? 'Enters parallel to the axis, leaves through the focal point on the far side.' : 'Enters parallel to the axis, leaves as if it came from the focal point on the object’s side.', incoming: [tip, r1at], outgoing: out(r1at, s1), extension: ext(r1at) })
  // Ray 2: through the centre, undeviated.
  const s2 = -objectHeight / objectDistance
  rays.push({ id: 2, description: 'Passes through the centre of the lens without bending.', incoming: [tip, [0, 0]], outgoing: out([0, 0], s2), extension: ext([0, 0]) })
  // Ray 3: toward (or from) a focal point, then parallel.
  if (!lens.atInfinity) {
    const y3 = f > 0 ? (objectHeight * f) / (f - objectDistance) : (objectHeight * -f) / (objectDistance - f)
    const r3at: Pt = [0, y3]
    rays.push({ id: 3, description: f > 0 ? 'Passes through (or comes from the direction of) the near focal point, leaves parallel to the axis.' : 'Heads toward the focal point on the far side, leaves parallel to the axis.', incoming: [tip, r3at], outgoing: out(r3at, 0), extension: ext(r3at) })
  }
  return rays
}
