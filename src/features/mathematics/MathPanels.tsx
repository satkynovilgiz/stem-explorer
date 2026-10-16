import { Eraser, ExternalLink, RotateCcw, Scissors } from 'lucide-react'
import { RangeField } from '../../components/RangeField'
import { formatValue, MATH_SOURCES, num, SURFACES, type Params, type SliceAxis, type SurfaceDef, type SurfaceId } from '../../math/surfaces'

/* ---------- Left: library and parameters ---------- */

export function SurfaceLibrary({ selected, onSelect }: { selected: SurfaceId; onSelect: (id: SurfaceId) => void }) {
  return (
    <div className="info-section">
      <h2 className="panel-title">Surface library</h2>
      <ul className="structure-list" aria-label="Surfaces">
        {SURFACES.map((s) => {
          const active = s.id === selected
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`structure-item surface-item${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => onSelect(s.id)}
              >
                <span className="structure-text">
                  <span className="structure-name">{s.name}</span>
                  <span className="surface-formula">{s.formula}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ParameterPanel({
  surface,
  params,
  onChange,
  onReset,
}: {
  surface: SurfaceDef
  params: Params
  onChange: (key: string, value: number) => void
  onReset: () => void
}) {
  return (
    <div className="info-section">
      <h2 className="panel-title">Parameters</h2>
      <p className="formula-display" aria-label="Formula with current values">
        {surface.substituted(params)}
      </p>
      <div className="params">
        {surface.params.map((def) => (
          <RangeField
            key={def.key}
            spec={{ label: def.label, symbol: def.symbol, min: def.min, max: def.max, step: def.step, decimals: def.decimals }}
            value={params[def.key]}
            onChange={(v) => onChange(def.key, v)}
            note={def.description}
          />
        ))}
      </div>
      <button type="button" className="tool-button bordered" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Reset parameters</span>
      </button>
    </div>
  )
}

/* ---------- Right: Explore tab ---------- */

export function PointInspector({
  surface,
  params,
  point,
  note,
  onSet,
  onClear,
}: {
  surface: SurfaceDef
  params: Params
  point: { x: number; y: number } | null
  note: string
  onSet: (x: number, y: number) => void
  onClear: () => void
}) {
  const { min, max } = surface.domain
  const spec = (axis: 'x' | 'y') => ({ label: axis, min: Number(min.toFixed(2)), max: Number(max.toFixed(2)), step: 0.01, decimals: 2 })
  const x = point?.x ?? 0
  const y = point?.y ?? 0
  const z = point ? surface.evaluate(params, point.x, point.y) : null
  return (
    <section className="info-section" aria-labelledby="point-heading">
      <h3 id="point-heading" className="section-title">
        Inspect a point
      </h3>
      <p className="muted small">Click the surface, or enter x and y. z is calculated from the formula, not read from the mesh.</p>
      <div className="point-fields">
        <RangeField spec={spec('x')} value={x} onChange={(v) => onSet(v, y)} showSlider={false} clamp={false} />
        <RangeField spec={spec('y')} value={y} onChange={(v) => onSet(x, v)} showSlider={false} clamp={false} />
      </div>
      {note && <p className="inline-note">{note}</p>}
      {point && z !== null ? (
        <div className="point-readout">
          <dl className="readout">
            <div>
              <dt>x</dt>
              <dd>{num(point.x)}</dd>
            </div>
            <div>
              <dt>y</dt>
              <dd>{num(point.y)}</dd>
            </div>
            <div className="is-wide">
              <dt>z = f(x, y)</dt>
              <dd>≈ {formatValue(z)}</dd>
            </div>
          </dl>
          <p className="substitution">
            <span className="muted">Exact rule:</span> {surface.formula}
            <br />
            <span className="muted">Substituted:</span> z = {surface.substitution(params, point.x, point.y)} ≈ {formatValue(z)}
          </p>
          <p className="muted small">Displayed numbers are rounded; the formula is exact.</p>
          <button type="button" className="tool-button bordered" onClick={onClear}>
            <Eraser size={16} aria-hidden="true" />
            <span>Clear point</span>
          </button>
        </div>
      ) : (
        <p className="muted small">No point selected. The marker P appears on the surface once you choose one.</p>
      )}
    </section>
  )
}

export function SliceControls({
  surface,
  slice,
  formula,
  onEnable,
  onAxis,
  onValue,
}: {
  surface: SurfaceDef
  slice: { axis: SliceAxis; value: number } | null
  /** The one-variable formula of the current slice, computed by the caller from the surface. */
  formula: string | null
  onEnable: (enabled: boolean) => void
  onAxis: (axis: SliceAxis) => void
  onValue: (value: number) => void
}) {
  const { min, max } = surface.domain
  return (
    <section className="info-section" aria-labelledby="slice-heading">
      <h3 id="slice-heading" className="section-title">
        Cross-section
      </h3>
      <button type="button" className="tool-button bordered" aria-pressed={!!slice} onClick={() => onEnable(!slice)}>
        <Scissors size={16} aria-hidden="true" />
        <span>{slice ? 'Hide cross-section' : 'Show cross-section'}</span>
      </button>
      {slice && (
        <>
          <div className="segmented segmented--modes slice-axis" role="group" aria-label="Slice direction">
            {(['x', 'y'] as const).map((a) => (
              <button key={a} type="button" className="segmented-option" aria-pressed={slice.axis === a} onClick={() => onAxis(a)}>
                {a} = constant
              </button>
            ))}
          </div>
          <RangeField
            // Range rounded inward to whole 0.05 steps so every slider position is a tidy value.
            spec={{ label: `Slice position ${slice.axis}`, min: Math.ceil(min / 0.05 - 1e-9) * 0.05, max: Math.floor(max / 0.05 + 1e-9) * 0.05, step: 0.05, decimals: 2 }}
            value={slice.value}
            onChange={onValue}
            note={`A vertical plane through ${slice.axis} = constant.`}
          />
          {formula && (
            <p className="slice-formula">
              <span className="muted">Slice formula:</span> {formula}
            </p>
          )}
        </>
      )}
    </section>
  )
}

/* ---------- Right: Formula and Sources tabs ---------- */

export function FormulaPanel({ surface, params }: { surface: SurfaceDef; params: Params }) {
  return (
    <div className="info-body">
      <section className="info-section">
        <h3 className="section-title">Formula</h3>
        <p className="formula-display">{surface.formula}</p>
        <p className="formula-display is-substituted">{surface.substituted(params)}</p>
        <p className="prose">{surface.description}</p>
      </section>
      <section className="info-section">
        <h3 className="section-title">Parameters</h3>
        <dl className="glossary">
          {surface.params.map((p) => (
            <div key={p.key}>
              <dt>
                {p.symbol} — {p.label} (now {num(params[p.key], p.decimals)})
              </dt>
              <dd>{p.description}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="info-section">
        <h3 className="section-title">Geometric meaning</h3>
        <ul className="bullets">
          {surface.meaning.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
      <section className="info-section">
        <h3 className="section-title">Coordinates and the mesh</h3>
        <ul className="bullets">
          <li>x and y are the inputs; z = f(x, y) is the height. The coordinates are abstract numbers without units.</li>
          <li>All three axes use the same scale, so steep surfaces really are steep; nothing is stretched.</li>
          <li>
            The 3D surface is a mesh of {surface.segments} × {surface.segments} squares (each split into two triangles) that
            approximates the smooth surface. Readouts and cross-sections are calculated from the formula itself.
          </li>
          <li>Height colours are a visual aid with a numeric legend; the grid lines show the same shape without colour.</li>
        </ul>
      </section>
    </div>
  )
}

export function SourcesPanel({ surface }: { surface: SurfaceDef }) {
  return (
    <div className="info-body">
      <ul className="sources">
        {surface.sourceIds.map((id) => {
          const s = MATH_SOURCES[id]
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
                <ExternalLink size={12} aria-hidden="true" className="external-icon" />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="source-use">{s.usedFor}</span>
            </li>
          )
        })}
      </ul>
      <section className="info-section">
        <h3 className="section-title">Limitations</h3>
        <ul className="limitations">
          {surface.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
          <li>Only these four preset formulas are available; arbitrary formulas cannot be entered.</li>
        </ul>
      </section>
    </div>
  )
}

