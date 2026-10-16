import { Check, ChevronDown, ChevronLeft, ChevronRight, Circle, ExternalLink, Lightbulb, LogOut, Play, X } from 'lucide-react'
import { useId } from 'react'
import type { ActivityController } from './useActivity'

/**
 * Compact, collapsible activity panel that sits beside (or, on phones, below) the 3D view — never
 * over it. Ordinary explorer controls stay usable throughout.
 */
export function ActivityPanel<S>({ activity, state }: { activity: ActivityController<S>; state: S }) {
  const id = useId()
  const { def, phase, steps, index, completed, collapsed } = activity
  const doneCount = completed.filter(Boolean).length

  if (phase === 'closed') {
    return (
      <div className="activity activity--closed">
        <button type="button" className="activity-launch" onClick={activity.open}>
          <Lightbulb size={16} aria-hidden="true" />
          <span>
            <span className="activity-launch-label">Try this</span> {def.title}
          </span>
        </button>
      </div>
    )
  }

  if (phase === 'intro') {
    const changes = def.changes(state)
    return (
      <section className="activity" aria-labelledby={`${id}-title`}>
        <p className="eyebrow">Guided activity</p>
        <h2 id={`${id}-title`} className="activity-title">
          {def.title}
        </h2>
        <p className="activity-goal">
          <strong>Goal:</strong> {def.goal}
        </p>
        <p className="small">{def.setup}</p>
        <p className="small activity-changes-title">Starting will change:</p>
        <ul className="activity-changes small">
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="muted small">Exit at any time to return to your current view. Activity progress isn’t saved or shared.</p>
        <div className="share-row">
          <button type="button" className="button" onClick={activity.start}>
            <Play size={15} aria-hidden="true" />
            Start activity
          </button>
          <button type="button" className="tool-button bordered" onClick={activity.cancel}>
            Not now
          </button>
        </div>
      </section>
    )
  }

  const step = steps[index]
  const header = (
    <div className="activity-head">
      <button
        type="button"
        className="activity-toggle"
        aria-expanded={!collapsed}
        aria-controls={`${id}-body`}
        onClick={() => activity.setCollapsed(!collapsed)}
      >
        <Lightbulb size={16} aria-hidden="true" />
        <span className="activity-head-text">
          <span id={`${id}-title`} className="activity-title">
            {def.title}
          </span>
          <span className="activity-progress">
            {phase === 'finished' ? 'What it shows' : `Step ${index + 1} of ${steps.length}`} · {doneCount} of {steps.length} done
          </span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={collapsed ? '' : 'is-flipped'} />
      </button>
      <button type="button" className="icon-button activity-exit" aria-label="Exit activity and restore your previous view" onClick={activity.exit}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )

  return (
    <section className="activity activity--running" aria-labelledby={`${id}-title`}>
      {header}
      <p className="visually-hidden" role="status">
        {phase === 'finished' ? `${def.title}: summary` : `Step ${index + 1}: ${step.title}${completed[index] ? ', done' : ''}`}
      </p>
      {!collapsed && (
        <div id={`${id}-body`} className="activity-body">
          {phase === 'finished' ? (
            <>
              <h3 className="activity-step-title">What you saw</h3>
              <p className="activity-text">{def.conclusion}</p>
              <p className="muted small">
                {doneCount} of {steps.length} steps were detected or marked as explored. Ticks record what was done in the
                explorer; they are not a test of understanding.
              </p>
              <ul className="activity-sources small">
                {def.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.label}
                      <ExternalLink size={12} aria-hidden="true" className="external-icon" />
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="share-row">
                <button type="button" className="tool-button bordered" onClick={activity.previous}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  <span>Back to steps</span>
                </button>
                <button type="button" className="button" onClick={activity.exit}>
                  <LogOut size={15} aria-hidden="true" />
                  Exit and restore my view
                </button>
              </div>
            </>
          ) : (
            <>
              <ol className="activity-steps" aria-label="Steps">
                {steps.map((s, i) => (
                  <li key={s.title} className={`${i === index ? 'is-current' : ''}${completed[i] ? ' is-done' : ''}`} aria-current={i === index ? 'step' : undefined}>
                    {completed[i] ? <Check size={12} aria-hidden="true" /> : <Circle size={8} aria-hidden="true" />}
                    <span className="visually-hidden">
                      Step {i + 1}, {s.title}: {completed[i] ? 'done' : 'not done'}
                    </span>
                  </li>
                ))}
              </ol>
              <h3 className="activity-step-title">{step.title}</h3>
              <p className="activity-text">{step.text}</p>
              {completed[index] ? (
                <p className="activity-status is-done">
                  <Check size={14} aria-hidden="true" /> Done
                </p>
              ) : step.manual ? (
                <button type="button" className="tool-button bordered activity-explored" onClick={activity.markExplored}>
                  <Check size={15} aria-hidden="true" />
                  <span>I’ve explored this</span>
                </button>
              ) : (
                <p className="activity-status muted">Waiting for: {step.waitingFor}</p>
              )}
              {step.hint && (
                <details className="activity-hint">
                  <summary>Hint</summary>
                  <p className="small">{step.hint}</p>
                </details>
              )}
              <div className="share-row activity-nav">
                <button type="button" className="tool-button bordered" onClick={activity.previous} disabled={index === 0}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  <span>Previous</span>
                </button>
                <button type="button" className="tool-button bordered" onClick={activity.next}>
                  <span>{index === steps.length - 1 ? 'Finish' : 'Next'}</span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
                <button type="button" className="tool-button bordered" onClick={activity.exit}>
                  <LogOut size={15} aria-hidden="true" />
                  <span>Exit</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
