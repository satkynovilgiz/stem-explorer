import { AlertTriangle, Loader2, MonitorX } from 'lucide-react'
import { Fragment, Suspense, useState, type ReactNode } from 'react'
import { isWebGLAvailable } from '../lib/webgl'
import { ErrorBoundary } from './ErrorBoundary'

export interface SceneCallbacks {
  onReady: () => void
  onContextLost: () => void
}

interface Props {
  /** Accessible name for the 3D region. */
  label: string
  /** What stays usable without 3D, e.g. "All molecule information and atom selection remain available". */
  fallbackNote: string
  /** Renders the (usually lazy-loaded) Canvas. */
  renderScene: (callbacks: SceneCallbacks) => ReactNode
  /** Overlays drawn on the viewport once the scene is ready (badges, hints). */
  overlay?: ReactNode
  /** Scene controls; rendered only while the 3D view works, so broken controls are never shown. */
  controls?: ReactNode
}

/**
 * Shared frame for 3D views: WebGL detection, an error boundary, recovery from a lost
 * WebGL context, and a loading state while Three.js downloads.
 */
export function ViewportShell({ label, fallbackNote, renderScene, overlay, controls }: Props) {
  const [webgl] = useState(isWebGLAvailable)
  const [ready, setReady] = useState(false)
  const [contextLost, setContextLost] = useState(false)
  const [attempt, setAttempt] = useState(0)

  const retry = () => {
    setContextLost(false)
    setReady(false)
    setAttempt((n) => n + 1)
  }

  if (!webgl) {
    return (
      <ViewportMessage icon={<MonitorX size={22} aria-hidden="true" />} title="3D view unavailable">
        Your browser or device could not start WebGL, which the 3D model needs. {fallbackNote}.
      </ViewportMessage>
    )
  }

  if (contextLost) {
    return (
      <ViewportMessage
        icon={<AlertTriangle size={22} aria-hidden="true" />}
        title="The 3D view stopped responding"
        action={{ label: 'Restart 3D view', onClick: retry }}
      >
        The graphics context was lost, which can happen when the device is low on memory.
      </ViewportMessage>
    )
  }

  return (
    <ErrorBoundary
      resetKey={attempt}
      fallback={() => (
        <ViewportMessage
          icon={<AlertTriangle size={22} aria-hidden="true" />}
          title="The 3D view could not be displayed"
          action={{ label: 'Try again', onClick: retry }}
        >
          Something went wrong while rendering the model. {fallbackNote}.
        </ViewportMessage>
      )}
    >
      <div className="viewport" role="region" aria-label={label}>
        <Suspense fallback={null}>
          <Fragment key={attempt}>
            {renderScene({ onReady: () => setReady(true), onContextLost: () => setContextLost(true) })}
          </Fragment>
        </Suspense>
        {ready ? (
          overlay
        ) : (
          <div className="viewport-loading" role="status">
            <Loader2 size={20} className="spin" aria-hidden="true" />
            <span>Loading 3D viewer…</span>
          </div>
        )}
      </div>
      {controls}
    </ErrorBoundary>
  )
}

function ViewportMessage({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="viewport viewport-message" role="alert">
      <span className="viewport-message-icon">{icon}</span>
      <p className="viewport-message-title">{title}</p>
      <p className="muted">{children}</p>
      {action && (
        <button type="button" className="button" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
