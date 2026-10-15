import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, type RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { Atom } from '../../../data/chemistry/types'

export type LabelElements = Map<string, HTMLSpanElement>

interface ProjectorProps {
  atoms: readonly Atom[]
  radii: ReadonlyMap<string, number>
  /** Place labels above each sphere instead of on its center. */
  offsetAbove: boolean
  elements: RefObject<LabelElements>
  visible: boolean
}

const v = new Vector3()

/**
 * Lives inside the Canvas and moves plain DOM labels (rendered by
 * <AtomLabelLayer>) to each atom's projected screen position every frame.
 */
export function AtomLabelProjector({ atoms, radii, offsetAbove, elements, visible }: ProjectorProps) {
  const invalidate = useThree((s) => s.invalidate)

  // Labels that just mounted need one frame to get positioned.
  useEffect(() => invalidate(), [invalidate, atoms, visible, offsetAbove])

  useFrame(({ camera, size }) => {
    const map = elements.current
    if (!map) return
    const fov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 1
    for (const atom of atoms) {
      const el = map.get(atom.id)
      if (!el) continue
      v.set(...atom.position).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      let y = ((1 - v.y) / 2) * size.height
      if (offsetAbove) {
        const dist = camera.position.distanceTo(v.set(...atom.position))
        const pxPerUnit = size.height / (2 * Math.tan(fov / 2) * dist)
        y -= (radii.get(atom.id) ?? 0) * pxPerUnit + 12
      }
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.visibility = 'visible'
    }
  })

  return null
}

interface LayerProps {
  atoms: readonly Atom[]
  selectedAtomId: string | null
  elements: RefObject<LabelElements>
}

/** DOM overlay holding one label per atom; positions are set by the projector. */
export function AtomLabelLayer({ atoms, selectedAtomId, elements }: LayerProps) {
  return (
    <div className="label-layer" aria-hidden="true">
      {atoms.map((atom) => (
        <span
          key={atom.id}
          ref={(el) => {
            if (el) elements.current.set(atom.id, el)
            else elements.current.delete(atom.id)
          }}
          className={`atom-label${atom.id === selectedAtomId ? ' is-selected' : ''}`}
        >
          {atom.label}
        </span>
      ))}
    </div>
  )
}
