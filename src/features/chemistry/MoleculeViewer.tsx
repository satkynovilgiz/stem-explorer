import { AlertTriangle, Loader2, MonitorX, MousePointerClick } from 'lucide-react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import type { Molecule, Representation } from '../../data/chemistry/types'
import { isWebGLAvailable } from '../../lib/webgl'
import type { MoleculeViewportProps } from './scene/MoleculeViewport'

// Three.js is loaded on demand so the rest of the interface renders immediately.
const MoleculeViewport = lazy(() => import('./scene/MoleculeViewport'))

const HINTS = {
  inspect: 'Click an atom to inspect it',
  distance: 'Click two atoms to measure',
  angle: 'Click three atoms: end, vertex, end',
} as const

type Props = Omit<MoleculeViewportProps, 'onReady' | 'onContextLost'> & {
  /** Scene controls, shown only while the 3D view is working. */
  controls: ReactNode
}

export function MoleculeViewer({ controls, ...props }: Props) {
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
        Your browser or device could not start WebGL, which the 3D model needs. All molecule information and
        atom selection remain available in the panels.
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
          Something went wrong while rendering the model. Molecule information is still available in the
          panels.
        </ViewportMessage>
      )}
    >
      <div
        className="viewport"
        role="region"
        aria-label={`3D model of ${props.molecule.name}. Drag to rotate, scroll or pinch to zoom.`}
      >
        <Suspense fallback={null}>
          <MoleculeViewport
            key={attempt}
            {...props}
            onReady={() => setReady(true)}
            onContextLost={() => setContextLost(true)}
          />
        </Suspense>
        {ready ? (
          <>
            <ModeBadge molecule={props.molecule} representation={props.representation} />
            <p className="viewport-hint">
              <MousePointerClick size={14} aria-hidden="true" />
              Drag to rotate · Scroll or pinch to zoom · {HINTS[props.mode]}
            </p>
          </>
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

function ModeBadge({ molecule, representation }: { molecule: Molecule; representation: Representation }) {
  return (
    <div className="viewport-badge">
      <span className="viewport-badge-name">{molecule.name}</span>
      <span className="viewport-badge-mode">
        {representation === 'ball-and-stick'
          ? 'Ball & stick · schematic atom sizes'
          : 'Space-filling · approx. van der Waals radii'}
      </span>
    </div>
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
