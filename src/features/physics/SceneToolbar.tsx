import { Box, MoveRight, RotateCcw, Route, Square } from 'lucide-react'
import type { CameraView } from './scene/PhysicsScene'

interface Props {
  view: CameraView
  showPreview: boolean
  showVectors: boolean
  showComponents: boolean
  onViewChange: (view: CameraView) => void
  onResetCamera: () => void
  onTogglePreview: () => void
  onToggleVectors: () => void
  onToggleComponents: () => void
}

/** Controls that only affect the 3D view; hidden (with the view) when WebGL is unavailable. */
export function SceneToolbar(props: Props) {
  const { view, showPreview, showVectors, showComponents } = props
  return (
    <div className="scene-controls" role="toolbar" aria-label="3D view controls">
      <div className="control-group" role="group" aria-label="Camera view">
        <div className="segmented segmented--modes">
          <button type="button" className="segmented-option" aria-pressed={view === 'side'} onClick={() => props.onViewChange('side')}>
            <Square size={15} aria-hidden="true" />
            Side view
          </button>
          <button
            type="button"
            className="segmented-option"
            aria-pressed={view === 'perspective'}
            onClick={() => props.onViewChange('perspective')}
          >
            <Box size={15} aria-hidden="true" />
            Perspective
          </button>
        </div>
        <button type="button" className="tool-button" aria-label="Reset camera" title="Reset camera" onClick={props.onResetCamera}>
          <RotateCcw size={16} aria-hidden="true" />
          <span className="tool-text">Reset camera</span>
        </button>
      </div>
      <div className="control-group control-group--modes" role="group" aria-label="Show in scene">
        <button type="button" className="tool-button" aria-pressed={showPreview} onClick={props.onTogglePreview} title="Dashed predicted path">
          <Route size={16} aria-hidden="true" />
          <span>Preview</span>
        </button>
        <button type="button" className="tool-button" aria-pressed={showVectors} onClick={props.onToggleVectors} title="Velocity and acceleration arrows">
          <MoveRight size={16} aria-hidden="true" />
          <span>Vectors</span>
        </button>
        <button
          type="button"
          className="tool-button"
          aria-pressed={showComponents}
          disabled={!showVectors}
          onClick={props.onToggleComponents}
          title="Horizontal and vertical velocity components"
        >
          <span>Components</span>
        </button>
      </div>
    </div>
  )
}
