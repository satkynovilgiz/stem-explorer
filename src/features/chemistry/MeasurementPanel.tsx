import { Eraser, MousePointer2, PauseCircle } from 'lucide-react'
import type { Molecule } from '../../data/chemistry/types'
import {
  ANGLE_DECIMALS,
  ATOMS_REQUIRED,
  DISTANCE_DECIMALS,
  formatAngle,
  formatDistance,
  measure,
  measurementLabel,
  type MeasureMode,
} from '../../lib/measurement'
import { AtomPicker } from './AtomPicker'

interface Props {
  molecule: Molecule
  mode: MeasureMode
  selection: readonly string[]
  autoRotatePaused: boolean
  onPick: (id: string) => void
  onClear: () => void
  onDone: () => void
}

const SLOT_NAMES: Record<MeasureMode, string[]> = {
  distance: ['Atom 1', 'Atom 2'],
  angle: ['End atom', 'Vertex', 'End atom'],
}

export function MeasurementPanel({ molecule, mode, selection, autoRotatePaused, onPick, onClear, onDone }: Props) {
  const result = measure(molecule, selection, mode)
  const required = ATOMS_REQUIRED[mode]

  return (
    <section className="measure-panel" aria-labelledby="measure-heading">
      <div className="measure-head">
        <div className="measure-intro">
          <h2 id="measure-heading" className="measure-title">
            {mode === 'distance' ? 'Measure distance' : 'Measure angle'}
          </h2>
          <p className="measure-instruction">
            {mode === 'distance'
              ? 'Pick two different atoms in the model or from the list below.'
              : 'Pick three atoms in order: end atom, vertex, end atom. The angle is measured at the vertex.'}
          </p>
        </div>
        <div className="measure-actions">
          <button
            type="button"
            className="tool-button"
            aria-label="Clear measurement"
            onClick={onClear}
            disabled={selection.length === 0}
          >
            <Eraser size={16} aria-hidden="true" />
            <span>Clear</span>
          </button>
          <button type="button" className="tool-button" onClick={onDone}>
            <MousePointer2 size={16} aria-hidden="true" />
            <span>Back to Inspect</span>
          </button>
        </div>
      </div>

      <ol className="measure-slots" aria-label="Selected atoms in order">
        {SLOT_NAMES[mode].map((name, i) => {
          const id = selection[i]
          return (
            <li key={i} className={`measure-slot${id ? ' is-filled' : ''}`}>
              <span className="measure-slot-index" aria-hidden="true">
                {i + 1}
              </span>
              <span className="measure-slot-name">{name}</span>
              <span className="measure-slot-value">{id ?? '—'}</span>
            </li>
          )
        })}
        {result && (
          <li className="measure-result">
            <span className="measure-result-label">
              {measurementLabel(result)}
              {result.kind === 'distance' && !result.bonded && ' (not bonded)'}
              {result.kind === 'angle' && !result.bondAngle && ' (not between two bonds)'}
            </span>
            <span className="measure-result-value">
              {result.kind === 'distance' ? formatDistance(result.value) : formatAngle(result.value)}
            </span>
          </li>
        )}
      </ol>

      <AtomPicker
        molecule={molecule}
        selectedIds={selection}
        ordered
        onPick={onPick}
        label={`Select atoms for the ${mode} measurement (${selection.length} of ${required} chosen)`}
      />

      <p className="measure-note">
        {mode === 'angle' && result?.kind === 'angle' && !result.bondAngle
          ? 'This is a geometric angle between atom positions; at least one arm is not a chemical bond. '
          : ''}
        Calculated from the model’s source coordinates and rounded to{' '}
        {mode === 'distance' ? `${10 ** -DISTANCE_DECIMALS} Å` : `${10 ** -ANGLE_DECIMALS}°`}. Results describe this
        static model, not a vibrating molecule.
        {autoRotatePaused && (
          <span className="measure-paused">
            <PauseCircle size={13} aria-hidden="true" /> Auto-rotate is paused while measuring.
          </span>
        )}
      </p>
    </section>
  )
}
