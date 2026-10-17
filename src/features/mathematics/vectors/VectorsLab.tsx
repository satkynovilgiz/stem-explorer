import { RotateCcw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { RangeField } from '../../../components/RangeField'
import { ShareActions } from '../../../components/ShareActions'
import { Tabs } from '../../../components/Tabs'
import { useMediaQuery } from '../../../lib/hooks'
import { DEFAULT_VECTORS, K_RANGE, MAT_RANGE, parseVectorsState, VEC_RANGE, vectorsEntries, withMathSection, type VectorsState } from '../../../lib/mathSections'
import { useRecordVisit } from '../../../lib/useExplorationLibrary'
import { add, angleBetween, apply, collapse, det, dot, inverse, norm, PRESETS, scale, type Mat2, type Vec2 } from '../../../math/linear'
import { SourceLinks } from '../../guide/SourceLinks'

const S = 380
const SPAN = 12 // −6 … 6
const sx = (x: number) => S / 2 + (x / SPAN) * S
const sy = (y: number) => S / 2 - (y / SPAN) * S
const f2 = (v: number) => (Math.abs(v) < 0.005 ? '0' : Number(v.toFixed(2)).toString()).replace('-', '−')
const vtext = (v: Vec2) => `(${f2(v[0])}, ${f2(v[1])})`

function Arrow({ v, from = [0, 0], className, label }: { v: Vec2; from?: Vec2; className: string; label?: string }) {
  const [x0, y0] = [sx(from[0]), sy(from[1])]
  const [x1, y1] = [sx(from[0] + v[0]), sy(from[1] + v[1])]
  const a = Math.atan2(y1 - y0, x1 - x0)
  const len = Math.hypot(x1 - x0, y1 - y0)
  return (
    <g className={className}>
      <line x1={x0} y1={y0} x2={x1} y2={y1} />
      {len > 4 && <path d="M 0 0 L -10 -5 L -10 5 z" transform={`translate(${x1} ${y1}) rotate(${(a * 180) / Math.PI})`} />}
      {label && (
        <text x={x1 + 6} y={y1 - 6} className="vec-label">
          {label}
        </text>
      )}
    </g>
  )
}

function Plane({ children, title }: { children: ReactNode; title: string }) {
  const grid = Array.from({ length: SPAN + 1 }, (_, i) => i - SPAN / 2)
  return (
    <figure className="vec-figure">
      <figcaption className="small">{title}</figcaption>
      <svg viewBox={`0 0 ${S} ${S}`} role="img" aria-label={title}>
        {grid.map((g) => (
          <g key={g}>
            <line x1={sx(g)} x2={sx(g)} y1={0} y2={S} className="vec-grid" />
            <line x1={0} x2={S} y1={sy(g)} y2={sy(g)} className="vec-grid" />
          </g>
        ))}
        <line x1={0} x2={S} y1={sy(0)} y2={sy(0)} className="vec-axis" />
        <line x1={sx(0)} x2={sx(0)} y1={0} y2={S} className="vec-axis" />
        {children}
      </svg>
    </figure>
  )
}

/** The original grid (dashed grey) and its image under M (solid colour), plus the unit square and its image. */
function TransformPlane({ m, u, v }: { m: Mat2; u: Vec2; v: Vec2 }) {
  const lines: [Vec2, Vec2][] = []
  for (let g = -4; g <= 4; g++) {
    lines.push([[g, -4], [g, 4]])
    lines.push([[-4, g], [4, g]])
  }
  const square: Vec2[] = [[0, 0], [1, 0], [1, 1], [0, 1]]
  const pts = (ps: Vec2[]) => ps.map((p) => `${sx(p[0])},${sy(p[1])}`).join(' ')
  return (
    <Plane title="Transformation: original (dashed grey) and transformed (solid colour)">
      {lines.map(([a, b], i) => (
        <line key={`o${i}`} x1={sx(a[0])} y1={sy(a[1])} x2={sx(b[0])} y2={sy(b[1])} className="vec-original-grid" />
      ))}
      {lines.map(([a, b], i) => {
        const [ta, tb] = [apply(m, a), apply(m, b)]
        return <line key={`t${i}`} x1={sx(ta[0])} y1={sy(ta[1])} x2={sx(tb[0])} y2={sy(tb[1])} className="vec-image-grid" />
      })}
      <polygon points={pts(square)} className="vec-square" />
      <polygon points={pts(square.map((p) => apply(m, p)))} className="vec-square-image" />
      <Arrow v={u} className="vec-u is-original" label="u" />
      <Arrow v={v} className="vec-v is-original" label="v" />
      <Arrow v={apply(m, u)} className="vec-u" label="Mu" />
      <Arrow v={apply(m, v)} className="vec-v" label="Mv" />
    </Plane>
  )
}

export function VectorsLab({ sectionSwitch, guidePanel }: { sectionSwitch: ReactNode; guidePanel: ReactNode }) {
  const [state, setState] = useState<VectorsState>(() => parseVectorsState(window.location.search).state)
  const [tab, setTab] = useState<'inputs' | 'results'>('inputs')
  const isMobile = useMediaQuery('(max-width: 899px)')
  const entries = vectorsEntries(state)
  const entriesKey = JSON.stringify(entries)
  useEffect(() => {
    const search = withMathSection(window.location.search, JSON.parse(entriesKey))
    if (search !== window.location.search) window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [entriesKey])
  useRecordVisit({ subject: 'mathematics', params: entries })

  const { u, v, k, m } = state
  const d = det(m)
  const kind = collapse(m)
  const inv = inverse(m)
  const angle = angleBetween(u, v)
  const vecSpec = (label: string) => ({ label, min: VEC_RANGE.min, max: VEC_RANGE.max, step: 0.1, decimals: 1 })
  const matSpec = (label: string) => ({ label, min: MAT_RANGE.min, max: MAT_RANGE.max, step: 0.1, decimals: 1 })
  const setVec = (key: 'u' | 'v', i: 0 | 1, val: number) => setState((s) => ({ ...s, [key]: (i === 0 ? [val, s[key][1]] : [s[key][0], val]) as Vec2 }))
  const setMat = (i: number, val: number) => setState((s) => ({ ...s, m: s.m.map((x, j) => (j === i ? val : x)) as unknown as Mat2 }))

  const inputs = (
    <section className="panel physics-inputs" aria-labelledby="vec-inputs-heading">
      <h2 id="vec-inputs-heading" className="panel-title">
        Vectors and matrix
      </h2>
      <div className="params">
        <RangeField spec={vecSpec('u, x-component')} value={u[0]} onChange={(x) => setVec('u', 0, x)} />
        <RangeField spec={vecSpec('u, y-component')} value={u[1]} onChange={(x) => setVec('u', 1, x)} />
        <RangeField spec={vecSpec('v, x-component')} value={v[0]} onChange={(x) => setVec('v', 0, x)} />
        <RangeField spec={vecSpec('v, y-component')} value={v[1]} onChange={(x) => setVec('v', 1, x)} />
        <RangeField spec={{ label: 'Scalar k', min: K_RANGE.min, max: K_RANGE.max, step: 0.1, decimals: 1 }} value={k} onChange={(x) => setState((s) => ({ ...s, k: x }))} />
      </div>
      <fieldset className="variant-choice matrix-inputs">
        <legend className="small">Matrix M = [a b; c d]</legend>
        <div className="matrix-grid">
          {(['a', 'b', 'c', 'd'] as const).map((name, i) => (
            <RangeField key={name} spec={matSpec(name)} value={m[i]} onChange={(x) => setMat(i, x)} showSlider={false} />
          ))}
        </div>
      </fieldset>
      <div className="share-row preset-row" role="group" aria-label="Matrix presets">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="tool-button bordered" onClick={() => setState((s) => ({ ...s, m: p.m }))}>
            {p.name}
          </button>
        ))}
      </div>
      <button type="button" className="tool-button bordered" onClick={() => setState(DEFAULT_VECTORS)}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Restore defaults</span>
      </button>
      <ShareActions subject="mathematics" params={entries} restores="these vectors and this matrix" />
    </section>
  )

  const results = (
    <div className="info-body">
      <h3 className="section-title">Vector operations</h3>
      <dl className="readout">
        <div>
          <dt>u + v</dt>
          <dd>{vtext(add(u, v))}</dd>
        </div>
        <div>
          <dt>k·u (k = {f2(k)})</dt>
          <dd>{vtext(scale(k, u))}</dd>
        </div>
        <div>
          <dt>u · v</dt>
          <dd className="vec-dot-value">
            {f2(u[0])}·{f2(v[0])} + {f2(u[1])}·{f2(v[1])} = {f2(dot(u, v))}
          </dd>
        </div>
        <div>
          <dt>Angle between u and v</dt>
          <dd>{angle === null ? 'undefined (a zero vector)' : `${angle.toFixed(1)}°${Math.abs(dot(u, v)) < 1e-9 ? ' — orthogonal' : ''}`}</dd>
        </div>
        <div>
          <dt>|u|, |v|</dt>
          <dd>
            {f2(norm(u))}, {f2(norm(v))}
          </dd>
        </div>
      </dl>
      <p className="muted small">
        u · v = |u||v| cos θ; non-zero vectors are orthogonal exactly when u · v = 0.
        <SourceLinks ids={['calc3-2-1', 'calc3-2-3']} />
      </p>
      <h3 className="section-title">The matrix M</h3>
      <dl className="readout">
        <div className="is-wide">
          <dt>Determinant det M = ad − bc</dt>
          <dd className="vec-det-value">
            {f2(m[0])}·{f2(m[3])} − {f2(m[1])}·{f2(m[2])} = {f2(d)}
          </dd>
        </div>
        <div className="is-wide">
          <dt>Meaning</dt>
          <dd className="vec-det-meaning">
            {kind === 'none'
              ? `Areas are multiplied by |det M| = ${f2(Math.abs(d))} (the unit square becomes a parallelogram of that area)${d < 0 ? '; the negative sign means the orientation is reversed (a mirror image)' : ''}.`
              : kind === 'line'
                ? 'det M = 0: the matrix is singular. The whole plane is flattened onto a line through the origin, areas become 0, and M has no inverse.'
                : 'M is the zero matrix: every vector is sent to the origin.'}
          </dd>
        </div>
        <div className="is-wide">
          <dt>Inverse</dt>
          <dd>{inv ? `[${inv.map((x) => f2(x)).join(', ')}] (row-major)` : 'None: ad − bc = 0'}</dd>
        </div>
      </dl>
      <p className="muted small">
        A 2×2 matrix has an inverse exactly when ad − bc ≠ 0. The area of the parallelogram spanned by two vectors is the size of their cross product; for the images of
        the unit vectors that is |ad − bc|, which is why |det M| is the area scale factor.
        <SourceLinks ids={['ca-7-7', 'ca-7-8', 'calc3-2-4']} />
      </p>
    </div>
  )

  const stage = (
    <section className="panel circuit-stage" aria-labelledby="vec-stage-heading">
      <h2 id="vec-stage-heading" className="panel-title">
        Vectors and transformations
      </h2>
      <div className="vec-planes">
        <Plane title="Vectors: u, v, u + v (parallelogram rule) and k·u">
          <Arrow v={v} from={u} className="vec-helper" />
          <Arrow v={u} from={v} className="vec-helper" />
          <Arrow v={add(u, v)} className="vec-sum" label="u + v" />
          <Arrow v={scale(k, u)} className="vec-scaled" label="k·u" />
          <Arrow v={u} className="vec-u" label="u" />
          <Arrow v={v} className="vec-v" label="v" />
        </Plane>
        <TransformPlane m={m} u={u} v={v} />
      </div>
      <ul className="vec-legend small" aria-label="Legend">
        <li>
          <span className="legend-line is-dashed" aria-hidden="true" /> Original grid, unit square and vectors
        </li>
        <li>
          <span className="legend-line" aria-hidden="true" /> After M: transformed grid, unit square and Mu, Mv
        </li>
      </ul>
      {kind !== 'none' && <p className="note-block small">Singular matrix: the transformed grid collapses onto a {kind === 'line' ? 'single line' : 'single point'}.</p>}
    </section>
  )

  if (isMobile) {
    return (
      <div className="chem chem--mobile">
        {sectionSwitch}
        <div className="chem-stage process-stage">{stage}</div>
        {guidePanel}
        <Tabs
          label="Vector panels"
          className="mobile-tabs"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'inputs', label: 'Inputs', content: inputs },
            { id: 'results', label: 'Results', content: <div className="panel">{results}</div> },
          ]}
        />
      </div>
    )
  }
  return (
    <div className="chem">
      <aside className="chem-side chem-side--left">
        {sectionSwitch}
        {inputs}
      </aside>
      <div className="chem-stage process-stage">{stage}</div>
      <aside className="chem-side chem-side--right">
        {guidePanel}
        <section className="panel info">{results}</section>
      </aside>
    </div>
  )
}
