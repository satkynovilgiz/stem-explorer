import { Eye, Focus, Layers, RotateCcw, ScanSearch, Tag } from 'lucide-react'
import type { CellView } from '../../data/biology/types'

interface Props {
  view: CellView
  showLabels: boolean
  hasSelection: boolean
  /** The selection is inside the cell and the whole-cell view hides it. */
  selectionHidden: boolean
  isolated: boolean
  onViewChange: (view: CellView) => void
  onReset: () => void
  onToggleLabels: () => void
  onFocus: () => void
  onIsolate: () => void
  onShowAll: () => void
}

const VIEWS: { value: CellView; label: string }[] = [
  { value: 'whole', label: 'Whole cell' },
  { value: 'cutaway', label: 'Cutaway' },
]

export function CellToolbar(props: Props) {
  const { view, showLabels, hasSelection, selectionHidden, isolated } = props
  const noTarget = !hasSelection || selectionHidden
  const why = !hasSelection ? 'Select a structure first' : selectionHidden ? 'Switch to Cutaway to see this structure' : ''

  return (
    <div className="scene-controls" role="toolbar" aria-label="Cell view controls">
      <div className="control-group" role="group" aria-label="View">
        <span className="control-group-label" aria-hidden="true">
          View
        </span>
        <div className="segmented segmented--modes">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              className="segmented-option"
              aria-pressed={view === v.value}
              onClick={() => props.onViewChange(v.value)}
            >
              {v.value === 'whole' ? <Eye size={15} aria-hidden="true" /> : <Layers size={15} aria-hidden="true" />}
              {v.label}
            </button>
          ))}
        </div>
      </div>

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
          aria-label="Labels"
          title="Show labels for major structures"
          aria-pressed={showLabels}
          onClick={props.onToggleLabels}
        >
          <Tag size={16} aria-hidden="true" />
          <span className="tool-text">Labels</span>
        </button>
      </div>

      <div className="control-group control-group--modes" role="group" aria-label="Selection">
        <span className="control-group-label" aria-hidden="true">
          Selection
        </span>
        <button
          type="button"
          className="tool-button"
          title={why || 'Move the camera to the selected structure'}
          disabled={noTarget}
          onClick={props.onFocus}
        >
          <Focus size={16} aria-hidden="true" />
          <span>Focus</span>
        </button>
        {isolated ? (
          <button type="button" className="tool-button is-on" onClick={props.onShowAll}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>Show all</span>
          </button>
        ) : (
          <button
            type="button"
            className="tool-button"
            title={why || 'Show only the selected structure'}
            disabled={noTarget}
            onClick={props.onIsolate}
          >
            <ScanSearch size={16} aria-hidden="true" />
            <span>Isolate</span>
          </button>
        )}
      </div>
    </div>
  )
}
