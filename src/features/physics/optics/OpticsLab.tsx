import { RotateCcw } from 'lucide-react'
import { useEffect, useId, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery } from '../../../lib/hooks'
import { opticsParamEntries, parseOpticsParams, withLabParams } from '../../../lib/labUrl'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { useExportNotes } from '../../../lib/presentation'
import {
  criticalAngle,
  DEFAULT_OPTICS,
  effectiveIncidence,
  MEDIA,
  OBJECT_HEIGHT,
  OPTICS_SPECS,
  principalRays,
  refract,
  signedFocal,
  thinLens,
  type LensResult,
  type OpticsKey,
  type OpticsParams,
  type RefractionResult,
} from '../../../physics/optics'
import { SourceLinks } from '../../guide/SourceLinks'

const DEG = Math.PI / 180
const fmtAngle = (a: number) => `${a.toFixed(2)}°`
const fmt = (x: number, digits = 3) => (Math.abs(x) >= 1000 ? x.toFixed(0) : x.toPrecision(digits))

/* ---------- Refraction diagram ---------- */

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  // Angles in SVG radians, measured from +x, counter-clockwise on screen (y down → negate).
  const p = (a: number) => `${cx + r * Math.cos(a)} ${cy - r * Math.sin(a)}`
  const large = Math.abs(to - from) > Math.PI ? 1 : 0
  return `M ${p(from)} A ${r} ${r} 0 ${large} ${to > from ? 0 : 1} ${p(to)}`
}

function RefractionDiagram({ p, r }: { p: OpticsParams; r: RefractionResult }) {
  const cx = 220
  const cy = 170
  const L = 140
  const t1 = p.incidence * DEG
  const incStart: [number, number] = [cx - L * Math.sin(t1), cy - L * Math.cos(t1)]
  const refl: [number, number] = [cx + L * Math.sin(t1), cy - L * Math.cos(t1)]
  const t2 = r.transmitted === null ? null : r.transmitted * DEG
  const trans: [number, number] | null = t2 === null ? null : [cx + L * Math.sin(t2), cy + L * Math.cos(t2)]
  const showReflected = !r.equalIndices
  const shade = (n: number) => `rgb(47 196 192 / ${Math.min(0.32, 0.04 + (n - 1) * 0.2)})`
  return (
    <svg className="optics-svg" viewBox="0 0 440 340" role="img" aria-label={`Ray diagram: incident ray at ${fmtAngle(p.incidence)} from the normal; ${r.totalInternalReflection ? 'total internal reflection, no transmitted ray' : `transmitted at ${fmtAngle(r.transmitted!)}`}.`}>
      <defs>
        <marker id="opt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="opt-arrowhead" />
        </marker>
      </defs>
      <rect x={0} y={0} width={440} height={cy} fill={shade(p.n1)} />
      <rect x={0} y={cy} width={440} height={340 - cy} fill={shade(p.n2)} />
      <line x1={0} y1={cy} x2={440} y2={cy} className="opt-interface" />
      <line x1={cx} y1={20} x2={cx} y2={320} className="opt-normal" />
      <text x={cx + 6} y={30} className="opt-label is-muted">
        normal
      </text>
      <text x={10} y={22} className="opt-label">
        Medium 1 · n₁ = {p.n1.toFixed(4)}
      </text>
      <text x={10} y={cy + 22} className="opt-label">
        Medium 2 · n₂ = {p.n2.toFixed(4)}
      </text>
      <line x1={incStart[0]} y1={incStart[1]} x2={cx} y2={cy} className="opt-ray is-incident" markerEnd="url(#opt-arrow)" />
      {showReflected && <line x1={cx} y1={cy} x2={refl[0]} y2={refl[1]} className={`opt-ray is-reflected${r.totalInternalReflection ? ' is-total' : ''}`} markerEnd="url(#opt-arrow)" />}
      {trans && <line x1={cx} y1={cy} x2={trans[0]} y2={trans[1]} className="opt-ray is-transmitted" markerEnd="url(#opt-arrow)" />}
      {p.incidence > 0.5 && (
        <>
          <path d={arcPath(cx, cy, 46, Math.PI / 2, Math.PI / 2 + t1)} className="opt-arc" />
          <text x={cx - 46 * Math.sin(t1 / 2) - 30} y={cy - 54 * Math.cos(t1 / 2)} className="opt-label">
            θ₁
          </text>
          {showReflected && (
            <>
              <path d={arcPath(cx, cy, 38, Math.PI / 2 - t1, Math.PI / 2)} className="opt-arc" />
              <text x={cx + 44 * Math.sin(t1 / 2) + 4} y={cy - 46 * Math.cos(t1 / 2)} className="opt-label">
                θr
              </text>
            </>
          )}
          {t2 !== null && t2 > 0.01 && (
            <>
              <path d={arcPath(cx, cy, 46, -Math.PI / 2, -Math.PI / 2 + t2)} className="opt-arc" />
              <text x={cx + 50 * Math.sin(t2 / 2) + 4} y={cy + 58 * Math.cos(t2 / 2)} className="opt-label">
                θ₂
              </text>
            </>
          )}
        </>
      )}
      <text x={12} y={330} className="opt-label is-muted">
        {r.totalInternalReflection
          ? 'Total internal reflection: no transmitted ray'
          : r.atCritical
            ? 'At the critical angle: transmitted ray along the boundary'
            : showReflected
              ? 'Reflected ray drawn thin: how much light reflects is not modelled'
              : 'Equal indices: no boundary to reflect from, no bending'}
      </text>
    </svg>
  )
}

/* ---------- Lens diagram ---------- */

const VB_W = 680
const VB_H = 300
const Y_SCALE = 11
const sy = (y: number) => VB_H / 2 - y * Y_SCALE

/** Horizontal half-width (cm) that fits the object, 2F and a nearby image: 25–65 cm. */
function halfWidth(p: OpticsParams, lens: LensResult): number {
  const image = !lens.atInfinity && Math.abs(lens.di) <= 60 ? Math.abs(lens.di) : 0
  return Math.min(65, Math.max(25, 1.2 * Math.max(p.objectDistance, 2 * p.focal, image)))
}

function LensDiagram({ p, lens }: { p: OpticsParams; lens: LensResult }) {
  const f = signedFocal(p)
  const X_HALF = halfWidth(p, lens)
  const sx = (x: number) => VB_W / 2 + (x / X_HALF) * (VB_W / 2 - 10)
  const rays = principalRays(f, p.objectDistance, OBJECT_HEIGHT, X_HALF + 5)
  const imageOnDiagram = !lens.atInfinity && Math.abs(lens.di) <= X_HALF && Math.abs(lens.imageHeight!) * Y_SCALE < VB_H / 2 - 8
  const id = useId()
  const clip = `${id}-clip`
  const marks = [-2 * p.focal, -p.focal, p.focal, 2 * p.focal].filter((x) => Math.abs(x) <= X_HALF)
  const conv = p.lens === 'converging'
  return (
    <svg
      className="optics-svg is-lens"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={`${conv ? 'Converging' : 'Diverging'} lens, focal length ${p.focal} cm, object at ${p.objectDistance} cm. ${
        lens.atInfinity ? 'The image is at infinity.' : `${lens.type === 'real' ? 'Real' : 'Virtual'}, ${lens.orientation} image at ${fmt(lens.di)} cm.`
      }`}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={VB_W} height={VB_H} />
        </clipPath>
        <marker id={`${id}-tip`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" className="opt-arrowhead" />
        </marker>
      </defs>
      <line x1={0} y1={sy(0)} x2={VB_W} y2={sy(0)} className="opt-axis" />
      {/* Lens: arrowheads outward (converging) or inward (diverging), the usual symbols. */}
      <line x1={sx(0)} y1={30} x2={sx(0)} y2={VB_H - 30} className="opt-lens" />
      <path d={conv ? `M ${sx(0) - 8} 40 L ${sx(0)} 30 L ${sx(0) + 8} 40 M ${sx(0) - 8} ${VB_H - 40} L ${sx(0)} ${VB_H - 30} L ${sx(0) + 8} ${VB_H - 40}` : `M ${sx(0) - 8} 22 L ${sx(0)} 30 L ${sx(0) + 8} 22 M ${sx(0) - 8} ${VB_H - 22} L ${sx(0)} ${VB_H - 30} L ${sx(0) + 8} ${VB_H - 22}`} className="opt-lens" fill="none" />
      {marks.map((x) => (
        <g key={x}>
          <circle cx={sx(x)} cy={sy(0)} r={3} className="opt-focal" />
          <text x={sx(x)} y={sy(0) + 16} textAnchor="middle" className="opt-label is-muted">
            {Math.abs(x) === p.focal ? 'F' : '2F'}
          </text>
        </g>
      ))}
      <g clipPath={`url(#${clip})`}>
        {rays.map((r) => (
          <g key={r.id} className={`opt-pray is-ray${r.id}`}>
            <line x1={sx(r.incoming[0][0])} y1={sy(r.incoming[0][1])} x2={sx(r.incoming[1][0])} y2={sy(r.incoming[1][1])} />
            <line x1={sx(r.outgoing[0][0])} y1={sy(r.outgoing[0][1])} x2={sx(r.outgoing[1][0])} y2={sy(r.outgoing[1][1])} />
            {r.extension && <line x1={sx(r.extension[0][0])} y1={sy(r.extension[0][1])} x2={sx(r.extension[1][0])} y2={sy(r.extension[1][1])} className="is-extension" />}
            <text x={sx(r.outgoing[1][0]) - 14} y={Math.min(VB_H - 6, Math.max(12, sy(r.outgoing[1][1]) - 4))} className="opt-label">
              {r.id}
            </text>
          </g>
        ))}
        <line x1={sx(-p.objectDistance)} y1={sy(0)} x2={sx(-p.objectDistance)} y2={sy(OBJECT_HEIGHT)} className="opt-object" markerEnd={`url(#${id}-tip)`} />
        {imageOnDiagram && (
          <line x1={sx(lens.di)} y1={sy(0)} x2={sx(lens.di)} y2={sy(lens.imageHeight!)} className={`opt-image${lens.type === 'virtual' ? ' is-virtual' : ''}`} markerEnd={`url(#${id}-tip)`} />
        )}
      </g>
      {/* The object label sits below the axis; the image label beyond the image's tip, so they never overlap. */}
      <text x={sx(-p.objectDistance)} y={sy(0) + 32} textAnchor="middle" className="opt-label">
        object
      </text>
      {imageOnDiagram && (
        <text x={sx(lens.di)} y={lens.imageHeight! > 0 ? sy(lens.imageHeight!) - 10 : Math.max(sy(lens.imageHeight!) + 18, sy(0) + 48)} textAnchor="middle" className="opt-label">
          {lens.type === 'real' ? 'real image' : 'virtual image'}
        </text>
      )}
      {!imageOnDiagram && (
        <text x={VB_W - 10} y={22} textAnchor="end" className="opt-label is-warning">
          {lens.atInfinity ? 'Image at infinity: the rays leave parallel' : `Image beyond the diagram: dᵢ = ${fmt(lens.di)} cm, hᵢ = ${fmt(lens.imageHeight!)} cm`}
        </text>
      )}
    </svg>
  )
}

/* ---------- Readouts ---------- */

const fmt4 = (a: number) => `${a.toFixed(4)}°`

/**
 * When θ1 and θc look the same at the two decimals shown but are not equal, say so: the
 * classification comes from the full-precision calculation, not from the rounded display.
 */
function roundingNote(p: OpticsParams, r: RefractionResult): string | null {
  if (r.critical === null || r.atCritical || fmtAngle(p.incidence) !== fmtAngle(r.critical)) return null
  return ` Both θ₁ and θc show as ${fmtAngle(r.critical)} at two decimals; to four, θ₁ = ${fmt4(p.incidence)} and θc = ${fmt4(r.critical)}, so θ₁ is ${p.incidence > r.critical ? 'just above' : 'just below'} the critical angle.`
}

function RefractionReadout({ p, r }: { p: OpticsParams; r: RefractionResult }) {
  const critMode = p.atCritical && r.critical !== null
  return (
    <div className="info-body">
      <dl className="readout">
        <div>
          <dt>Angle of incidence θ₁</dt>
          <dd>{critMode ? `θc = ${fmt4(r.critical!)} (exact)` : fmtAngle(p.incidence)}</dd>
        </div>
        <div>
          <dt>Angle of reflection θr</dt>
          <dd>{r.equalIndices ? 'none (no boundary)' : fmtAngle(r.reflected)}</dd>
        </div>
        <div>
          <dt>Angle of refraction θ₂</dt>
          <dd>{r.transmitted === null ? 'none: total internal reflection' : fmtAngle(r.transmitted)}</dd>
        </div>
        <div>
          <dt>Critical angle θc</dt>
          <dd>{r.critical === null ? 'none (n₁ ≤ n₂)' : fmt4(r.critical)}</dd>
        </div>
      </dl>
      <p className="rx-verdict" role="status">
        {r.totalInternalReflection
          ? `θ₁ is larger than the critical angle (${fmt4(r.critical!)}), so all of the light is reflected back into medium 1.${roundingNote(p, r) ?? ''}`
          : r.atCritical
            ? 'θ₁ is the critical angle, kept at full precision: sin θ₂ = 1, so the refracted ray travels along the boundary at θ₂ = 90°. Any larger angle gives total internal reflection.'
            : r.normal
              ? 'Normal incidence (θ₁ = 0): the ray crosses the boundary without bending.'
              : r.equalIndices
                ? 'The indices are equal: the ray does not bend.'
                : r.bend === 'toward'
                  ? 'Entering a higher index: the ray bends toward the normal (θ₂ < θ₁).'
                  : `Entering a lower index: the ray bends away from the normal (θ₂ > θ₁). Beyond θc = ${fmt4(r.critical!)} there would be total internal reflection.${roundingNote(p, r) ?? ''}`}
      </p>
      <section className="info-section">
        <h3 className="section-title">Equations used</h3>
        <div className="small equation-list">
          <p>
            <code>θr = θ₁</code> (law of reflection; angles from the normal)
            <SourceLinks ids={['up3-1-2']} />
          </p>
          <p>
            <code>
              n₁ sin θ₁ = n₂ sin θ₂ → {p.n1.toFixed(4)} × sin {p.incidence.toFixed(critMode || roundingNote(p, r) ? 4 : 2)}° = {(p.n1 * Math.sin(p.incidence * DEG)).toFixed(6)}
              {r.transmitted !== null ? ` = ${p.n2.toFixed(4)} × sin ${r.transmitted.toFixed(critMode ? 0 : 2)}°` : ` > n₂ = ${p.n2.toFixed(4)}, so sin θ₂ would exceed 1 and no θ₂ exists`}
            </code>
            <SourceLinks ids={['up3-1-3']} />
          </p>
          <p>
            <code>{r.critical === null ? 'sin θc = n₂ / n₁ needs n₁ > n₂: no critical angle here' : `sin θc = n₂ / n₁ = ${(p.n2 / p.n1).toFixed(6)} → θc = ${fmt4(r.critical)}`}</code>
            <SourceLinks ids={['up3-1-4']} />
          </p>
        </div>
      </section>
    </div>
  )
}

function LensReadout({ p, lens }: { p: OpticsParams; lens: LensResult }) {
  const f = signedFocal(p)
  return (
    <div className="info-body">
      <dl className="readout">
        <div>
          <dt>Focal length f</dt>
          <dd>{f > 0 ? '+' : '−'}{p.focal} cm</dd>
        </div>
        <div>
          <dt>Object distance dₒ</dt>
          <dd>{p.objectDistance} cm</dd>
        </div>
        <div>
          <dt>Image distance dᵢ</dt>
          <dd>{lens.atInfinity ? '∞ (no finite image)' : `${fmt(lens.di)} cm`}</dd>
        </div>
        <div>
          <dt>Magnification m</dt>
          <dd>{lens.magnification === null ? 'undefined' : fmt(lens.magnification)}</dd>
        </div>
        <div>
          <dt>Image</dt>
          <dd>{lens.atInfinity ? 'none: rays leave parallel' : `${lens.type}, ${lens.orientation}`}</dd>
        </div>
        <div>
          <dt>Image height hᵢ (hₒ = {OBJECT_HEIGHT} cm)</dt>
          <dd>{lens.imageHeight === null ? '—' : `${fmt(lens.imageHeight)} cm`}</dd>
        </div>
      </dl>
      <p className="rx-verdict" role="status">
        {lens.atInfinity
          ? 'The object is at the focal plane: the rays leave the lens parallel, so no finite image forms (dᵢ → ∞).'
          : lens.type === 'virtual'
            ? `Virtual image on the object’s side (dᵢ < 0): it can be seen through the lens but not projected on a screen.${f > 0 ? ' The object is inside the focal length, as in a magnifying glass.' : ' A diverging lens always gives a virtual, upright, smaller image.'}`
            : `Real image on the far side (dᵢ > 0): it could be projected on a screen.${Math.abs(p.objectDistance - f) < 0.3 * Math.abs(f) ? ' The object is close to the focal plane, so the image is far away and large.' : ''}`}
      </p>
      <section className="info-section">
        <h3 className="section-title">Equations used</h3>
        <div className="small equation-list">
          <p>
            <code>
              1/dₒ + 1/dᵢ = 1/f → 1/{p.objectDistance} + 1/dᵢ = 1/{f}
              {lens.atInfinity ? ' → 1/dᵢ = 0, dᵢ = ∞' : ` → dᵢ = ${fmt(lens.di)} cm`}
            </code>
          </p>
          <p>
            <code>m = hᵢ/hₒ = −dᵢ/dₒ{lens.magnification === null ? ' (undefined at infinity)' : ` = ${fmt(lens.magnification)}`}</code>
          </p>
        </div>
        <p className="small muted">
          Sign convention: f &gt; 0 converging, f &lt; 0 diverging; dᵢ &gt; 0 on the side opposite the object (real), dᵢ &lt; 0 on the object’s side (virtual); m &gt; 0
          upright, m &lt; 0 inverted.
          <SourceLinks ids={['up3-2-4']} />
        </p>
      </section>
    </div>
  )
}

/* ---------- Lab ---------- */

const REFRACTION_PRESETS: { label: string; n1: number; n2: number; inc?: number }[] = [
  { label: 'Air → water', n1: 1.0003, n2: 1.333 },
  { label: 'Water → air', n1: 1.333, n2: 1.0003 },
  { label: 'Air → crown glass', n1: 1.0003, n2: 1.52 },
  { label: 'Crown glass → air', n1: 1.52, n2: 1.0003 },
  { label: 'Diamond → air', n1: 2.419, n2: 1.0003 },
  { label: 'Equal indices', n1: 1.333, n2: 1.333 },
]

const LENS_PRESETS: { label: string; lens: 'converging' | 'diverging'; f: number; d: number }[] = [
  { label: 'Beyond 2F (camera)', lens: 'converging', f: 10, d: 30 },
  { label: 'Between F and 2F (projector)', lens: 'converging', f: 10, d: 15 },
  { label: 'At F (image at infinity)', lens: 'converging', f: 10, d: 10 },
  { label: 'Inside F (magnifier)', lens: 'converging', f: 10, d: 5 },
  { label: 'Diverging lens', lens: 'diverging', f: 10, d: 20 },
]

export function OpticsLab({ experimentSwitch, guidePanel }: { experimentSwitch: ReactNode; guidePanel: ReactNode }) {
  const [params, setParams] = useState<OpticsParams>(() => parseOpticsParams(window.location.search).params)
  const [tab, setTab] = useState<'inputs' | 'values' | 'about'>('inputs')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const entries = opticsParamEntries(params)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    const search = withLabParams(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'physics', params: entries })
  useExportNotes('physics', [], [])

  // Typing an angle leaves critical mode; changing an index keeps it only while a critical angle exists.
  const set = (key: OpticsKey, v: number) =>
    setParams((p) => {
      const next = { ...p, [key]: v }
      return { ...next, atCritical: key === 'incidence' ? false : p.atCritical && criticalAngle(next.n1, next.n2) !== null }
    })
  const incidence = effectiveIncidence(params)
  const r = refract(params.n1, params.n2, incidence)!
  const lens = thinLens(signedFocal(params), params.objectDistance)!
  const isRefraction = params.part === 'refraction'

  const partSwitch = (
    <div className="segmented" role="group" aria-label="Optics experiment">
      <button type="button" className="segmented-option" aria-pressed={isRefraction} onClick={() => setParams((p) => ({ ...p, part: 'refraction' }))}>
        Reflection and refraction
      </button>
      <button type="button" className="segmented-option" aria-pressed={!isRefraction} onClick={() => setParams((p) => ({ ...p, part: 'lens' }))}>
        Thin lens
      </button>
    </div>
  )

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="optics-inputs-heading">
      <h2 id="optics-inputs-heading" className="panel-title">
        Geometric optics
      </h2>
      {partSwitch}
      {isRefraction ? (
        <>
          <div className="params">
            {(['n1', 'n2', 'incidence'] as const).map((k) => (
              <RangeField key={k} spec={OPTICS_SPECS[k]} value={params[k]} onChange={(v) => set(k, v)} />
            ))}
          </div>
          <div className="optics-presets" role="group" aria-label="Refraction presets">
            {REFRACTION_PRESETS.map((x) => (
              <button key={x.label} type="button" className="chip-button" onClick={() => setParams((p) => ({ ...p, n1: x.n1, n2: x.n2 }))}>
                {x.label}
              </button>
            ))}
          </div>
          {params.atCritical && r.critical !== null && (
            <p className="inline-note small" role="status">
              Critical mode: θ₁ is exactly θc = {r.critical.toFixed(7)}° (calculated, not the rounded value in the field). Typing or sliding an angle leaves this mode. Links store
              it as “critical”.
            </p>
          )}
          <div className="share-row">
            <button type="button" className="tool-button bordered" disabled={r.critical === null} onClick={() => setParams((p) => ({ ...p, atCritical: true, incidence: Number(r.critical!.toFixed(2)) }))}>
              Set θ₁ to the critical angle
            </button>
            <button type="button" className="tool-button bordered" onClick={() => set('incidence', 0)}>
              Normal incidence
            </button>
          </div>
          <p className="small muted">
            Indices for 589 nm light: {MEDIA.map((m) => `${m.name} ${m.n}`).join('; ')}. Air is entered as 1.0003 (the slider has 4 decimals).
            <SourceLinks ids={['up3-1-1']} />
          </p>
        </>
      ) : (
        <>
          <div className="segmented" role="group" aria-label="Lens type">
            {(['converging', 'diverging'] as const).map((k) => (
              <button key={k} type="button" className="segmented-option" aria-pressed={params.lens === k} onClick={() => setParams((p) => ({ ...p, lens: k }))}>
                {k === 'converging' ? 'Converging (f > 0)' : 'Diverging (f < 0)'}
              </button>
            ))}
          </div>
          <div className="params">
            {(['focal', 'objectDistance'] as const).map((k) => (
              <RangeField key={k} spec={OPTICS_SPECS[k]} value={params[k]} onChange={(v) => set(k, v)} />
            ))}
          </div>
          <div className="optics-presets" role="group" aria-label="Lens presets">
            {LENS_PRESETS.map((x) => (
              <button key={x.label} type="button" className="chip-button" onClick={() => setParams((p) => ({ ...p, lens: x.lens, focal: x.f, objectDistance: x.d }))}>
                {x.label}
              </button>
            ))}
          </div>
          <p className="small muted">
            Domain: |f| from 2 to 20 cm, dₒ from 1 to 60 cm, object height {OBJECT_HEIGHT} cm, distances measured from the lens.
          </p>
        </>
      )}
      <button type="button" className="tool-button bordered" onClick={() => setParams({ ...DEFAULT_OPTICS, part: params.part })}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>
      <ShareActions subject="physics" params={entries} restores="this optics configuration (it is static: nothing moves)" />
    </section>
  )

  const values = <section className="panel info">{isRefraction ? <RefractionReadout p={{ ...params, incidence }} r={r} /> : <LensReadout p={params} lens={lens} />}</section>

  const about = (
    <section className="panel info">
      <div className="info-body">
        <h3 className="section-title">Model and assumptions</h3>
        <ul className="guide-list small">
          <li>Light is treated as rays (geometric optics): no diffraction or interference.</li>
          <li>Angles are measured from the normal, the line perpendicular to the surface.</li>
          <li>One wavelength (indices are listed for 589 nm); dispersion is not modelled.</li>
          <li>How much light is reflected or transmitted is not calculated; only directions are.</li>
          {!isRefraction && (
            <>
              <li>Thin-lens approximation: the lens is much thinner than its radii of curvature, and rays bend at its centre plane.</li>
              <li>Paraxial rays: close to the axis and at small angles, so there is no spherical aberration. The vertical scale of the drawing is exaggerated.</li>
            </>
          )}
        </ul>
        <p className="muted small">
          <SourceLinks ids={isRefraction ? ['up3-1-2', 'up3-1-3', 'up3-1-4'] : ['up3-2-4', 'up3-2-2']} />
        </p>
      </div>
    </section>
  )

  const stage = (
    <section className="panel optics-stage" aria-labelledby="optics-stage-heading">
      <h2 id="optics-stage-heading" className="panel-title">
        {isRefraction ? 'Reflection and refraction at a flat boundary' : `${params.lens === 'converging' ? 'Converging' : 'Diverging'} thin lens: principal rays`}
      </h2>
      {isRefraction ? <RefractionDiagram p={{ ...params, incidence }} r={r} /> : <LensDiagram p={params} lens={lens} />}
      <p className="muted small">
        {isRefraction
          ? 'Static ray diagram, angles drawn true. Shading darkens with the index of refraction; the labels give the values.'
          : 'Static ray diagram, horizontal scale fitted to the scene and vertical scale exaggerated: ray 1 parallel to the axis, ray 2 through the centre, ray 3 through a focal point. Solid image arrow: real; dashed: virtual (dashed lines are backward extensions).'}
      </p>
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile physics">
        {experimentSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Optics lab panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'values', label: 'Values', content: values },
            { id: 'about', label: 'Assumptions', content: about },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem physics">
      <aside className="chem-side chem-side--left">
        {experimentSwitch}
        {inputs}
      </aside>
      <div className="chem-stage process-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        {values}
        {about}
      </aside>
    </div>
  )
}
