import { MousePointerClick } from 'lucide-react'
import { lazy, type ReactNode } from 'react'
import { ViewportShell } from '../../components/ViewportShell'
import type { Molecule, Representation } from '../../data/chemistry/types'
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
  return (
    <ViewportShell
      label={`3D model of ${props.molecule.name}. Drag to rotate, scroll or pinch to zoom.`}
      fallbackNote="All molecule information and atom selection remain available in the panels"
      renderScene={(callbacks) => <MoleculeViewport {...props} {...callbacks} />}
      overlay={
        <>
          <ModeBadge molecule={props.molecule} representation={props.representation} />
          <p className="viewport-hint">
            <MousePointerClick size={14} aria-hidden="true" />
            Drag to rotate · Scroll or pinch to zoom · {HINTS[props.mode]}
          </p>
        </>
      }
      controls={controls}
    />
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
