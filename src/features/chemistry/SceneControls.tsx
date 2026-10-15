import { RefreshCw, RotateCcw, Tag } from 'lucide-react'
import type { Representation } from '../../data/chemistry/types'

interface Props {
  showLabels: boolean
  autoRotate: boolean
  representation: Representation
  onReset: () => void
  onToggleLabels: () => void
  onToggleAutoRotate: () => void
  onRepresentationChange: (r: Representation) => void
}

const MODES: { value: Representation; label: string }[] = [
  { value: 'ball-and-stick', label: 'Ball & stick' },
  { value: 'space-filling', label: 'Space-filling' },
]

export function SceneControls(props: Props) {
  const { showLabels, autoRotate, representation } = props
  return (
    <div className="scene-controls" role="toolbar" aria-label="Scene controls">
      <button type="button" className="tool-button" aria-label="Reset view" title="Reset view" onClick={props.onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        <span>Reset view</span>
      </button>
      <button
        type="button"
        className="tool-button"
        aria-label="Labels"
        title="Show atom labels"
        aria-pressed={showLabels}
        onClick={props.onToggleLabels}
      >
        <Tag size={16} aria-hidden="true" />
        <span>Labels</span>
      </button>
      <button
        type="button"
        className="tool-button"
        aria-label="Auto-rotate"
        title="Auto-rotate the model"
        aria-pressed={autoRotate}
        onClick={props.onToggleAutoRotate}
      >
        <RefreshCw size={16} aria-hidden="true" />
        <span>Auto-rotate</span>
      </button>

      <div className="segmented" role="group" aria-label="Display mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className="segmented-option"
            aria-pressed={representation === m.value}
            onClick={() => props.onRepresentationChange(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
