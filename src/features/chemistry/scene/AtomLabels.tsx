import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, type ReactNode, type RefObject } from 'react'
import { Matrix4, PerspectiveCamera, Vector3 } from 'three'
import type { Vec3 } from '../../../data/chemistry/types'

export type LabelElements = Map<string, HTMLElement>

export interface SceneLabel {
  key: string
  /** Anchor in source coordinates (Å). */
  position: Vec3
  /** Lift the label above a sphere of this radius (Å); 0 centers it on the anchor. */
  liftRadius: number
  className: string
  content: ReactNode
}

interface ProjectorProps {
  labels: readonly SceneLabel[]
  /** Source → world transform used by the model group. */
  matrix: Matrix4
  elements: RefObject<LabelElements>
}

const v = new Vector3()

/**
 * Lives inside the Canvas and moves plain DOM labels (rendered by <SceneLabelLayer>)
 * to their projected screen positions on every rendered frame. DOM writes only — no
 * React state — so nothing is re-rendered or announced per frame.
 */
export function SceneLabelProjector({ labels, matrix, elements }: ProjectorProps) {
  const invalidate = useThree((s) => s.invalidate)

  // Labels that just mounted need one frame to get positioned.
  useEffect(() => invalidate(), [invalidate, labels, matrix])

  useFrame(({ camera, size }) => {
    const map = elements.current
    if (!map) return
    // Use this frame's camera, not the previous frame's (useFrame runs before rendering).
    camera.updateMatrixWorld()
    const fov = camera instanceof PerspectiveCamera ? (camera.fov * Math.PI) / 180 : 1
    for (const label of labels) {
      const el = map.get(label.key)
      if (!el) continue
      v.set(...label.position).applyMatrix4(matrix)
      const dist = camera.position.distanceTo(v)
      v.project(camera)
      const x = ((v.x + 1) / 2) * size.width
      let y = ((1 - v.y) / 2) * size.height
      if (label.liftRadius > 0) {
        const pxPerUnit = size.height / (2 * Math.tan(fov / 2) * dist)
        y -= label.liftRadius * pxPerUnit + 12
      }
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden'
    }
  })

  return null
}

interface LayerProps {
  labels: readonly SceneLabel[]
  elements: RefObject<LabelElements>
}

/** Non-interactive DOM overlay; positions are written by the projector. */
export function SceneLabelLayer({ labels, elements }: LayerProps) {
  return (
    <div className="label-layer" aria-hidden="true">
      {labels.map((label) => (
        <span
          key={label.key}
          ref={(el) => {
            if (el) elements.current.set(label.key, el)
            else elements.current.delete(label.key)
          }}
          className={label.className}
        >
          {label.content}
        </span>
      ))}
    </div>
  )
}
