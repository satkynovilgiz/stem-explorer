import { MousePointer2, RefreshCw, RotateCcw, Ruler, Tag, Triangle, type LucideIcon } from 'lucide-react'
import type { Representation } from '../../data/chemistry/types'
import type { InteractionMode } from '../../lib/measurement'

interface Props {
  showLabels: boolean
  autoRotate: boolean
  /** True while a measurement mode pauses auto-rotation. */
  autoRotatePaused: boolean
  representation: Representation
  mode: InteractionMode
  onReset: () => void
  onToggleLabels: () => void
  onToggleAutoRotate: () => void
  onRepresentationChange: (r: Representation) => void
  onModeChange: (m: InteractionMode) => void
}

const VIEWS: { value: Representation; label: string }[] = [
  { value: 'ball-and-stick', label: 'Ball & stick' },
  { value: 'space-filling', label: 'Space-filling' },
]

const MODES: { value: InteractionMode; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'inspect', label: 'Inspect', icon: MousePointer2, hint: 'Select an atom to read about it' },
  { value: 'distance', label: 'Distance', icon: Ruler, hint: 'Measure the distance between two atoms' },
  { value: 'angle', label: 'Angle', icon: Triangle, hint: 'Measure the angle formed by three atoms' },
]

export function SceneControls(props: Props) {
  const { showLabels, autoRotate, autoRotatePaused, representation, mode } = props
  return (
    <div className="scene-controls" role="toolbar" aria-label="Scene controls">
      <div className="control-group" role="group" aria-label="Camera">
        <span className="control-group-label" aria-hidden="true">
          Camera
        </span>
        <button type="button" className="tool-button" aria-label="Reset view" title="Reset view" onClick={props.onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          <span className="tool-text">Reset</span>
        </button>
        <button
          type="button"
          className="tool-button"
          aria-label="Atom labels"
          title="Show atom labels"
          aria-pressed={showLabels}
          onClick={props.onToggleLabels}
        >
          <Tag size={16} aria-hidden="true" />
          <span className="tool-text">Labels</span>
        </button>
        <button
          type="button"
          className="tool-button"
          aria-label={autoRotatePaused ? 'Auto-rotate (paused while measuring)' : 'Auto-rotate'}
          title={autoRotatePaused ? 'Auto-rotate is paused while measuring' : 'Auto-rotate the model'}
          aria-pressed={autoRotate}
          onClick={props.onToggleAutoRotate}
        >
          <RefreshCw size={16} aria-hidden="true" />
          <span className="tool-text">Rotate</span>
          {autoRotate && autoRotatePaused && <span className="tool-badge">Paused</span>}
        </button>
      </div>

      <div className="control-group" role="group" aria-label="Display mode">
        <span className="control-group-label" aria-hidden="true">
          Display
        </span>
        <div className="segmented">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              className="segmented-option"
              aria-pressed={representation === v.value}
              onClick={() => props.onRepresentationChange(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group control-group--modes" role="group" aria-label="Interaction mode">
        <span className="control-group-label" aria-hidden="true">
          Tool
        </span>
        <div className="segmented segmented--modes">
          {MODES.map(({ value, label, icon: Icon, hint }) => (
            <button
              key={value}
              type="button"
              className="segmented-option"
              aria-pressed={mode === value}
              title={hint}
              onClick={() => props.onModeChange(value)}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
