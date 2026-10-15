import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, type RefObject } from 'react'
import { Object3D, Raycaster, Vector3 } from 'three'
import type { OrganelleId } from '../../../data/biology/types'
import type { V3 } from './layout'

export interface CellLabel {
  key: string
  organelleId: OrganelleId
  /** Anchor in scene coordinates, on a surface of the structure facing the default view. */
  position: V3
  text: string
  selected: boolean
}

export type LabelElements = Map<string, HTMLElement>

const v = new Vector3()
const dir = new Vector3()
const raycaster = new Raycaster()

function organelleOf(object: Object3D | null): OrganelleId | undefined {
  for (let o = object; o; o = o.parent) {
    if (o.userData.organelleId) return o.userData.organelleId as OrganelleId
  }
  return undefined
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 2 && b.y < a.y + a.h + 2

/**
 * Positions DOM labels each rendered frame, with two clutter controls:
 * 1. occlusion — a label is hidden when another structure lies between the camera and its anchor;
 * 2. collision — labels are placed in priority order (selected first) and any label that
 *    would overlap one already placed is hidden.
 * Only DOM styles change; React state is not touched, so nothing is announced per frame.
 */
export function CellLabelProjector({ labels, elements }: { labels: readonly CellLabel[]; elements: RefObject<LabelElements> }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => invalidate(), [invalidate, labels])
  // Label widths change once fonts finish loading; lay out again then.
  useEffect(() => {
    let active = true
    document.fonts?.ready.then(() => active && invalidate())
    return () => {
      active = false
    }
  }, [invalidate])

  const ordered = useMemo(() => [...labels].sort((a, b) => Number(b.selected) - Number(a.selected)), [labels])

  useFrame(({ camera, size, scene }) => {
    const map = elements.current
    if (!map) return
    // useFrame runs before rendering, so refresh the camera matrices: otherwise labels use the
    // previous frame's camera and stay slightly off after an animation ends.
    camera.updateMatrixWorld()
    const pickables: Object3D[] = []
    scene.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh && organelleOf(o)) pickables.push(o)
    })

    const placed: Rect[] = []
    for (const label of ordered) {
      const el = map.get(label.key)
      if (!el) continue
      v.set(...label.position)
      const dist = camera.position.distanceTo(v)
      dir.copy(v).sub(camera.position).normalize()
      raycaster.set(camera.position, dir)
      raycaster.far = dist - 0.12
      const blocker = raycaster
        .intersectObjects(pickables, false)
        .find((hit) => organelleOf(hit.object) !== label.organelleId)

      v.project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      const w = el.offsetWidth
      const h = el.offsetHeight
      const rect = { x: x - w / 2, y: y - h - 6, w, h }
      const onScreen = v.z < 1 && x > 0 && x < size.width && y > 0 && y < size.height
      const visible = onScreen && !blocker && !placed.some((p) => overlaps(p, rect))

      if (visible) placed.push(rect)
      // Centered by CSS percentages, so the position never depends on a stale width measurement.
      el.style.transform = `translate(${x}px, ${y - 6}px) translate(-50%, -100%)`
      el.style.visibility = visible ? 'visible' : 'hidden'
    }
  })

  return null
}

export function CellLabelLayer({ labels, elements }: { labels: readonly CellLabel[]; elements: RefObject<LabelElements> }) {
  return (
    <div className="label-layer" aria-hidden="true">
      {labels.map((label) => (
        <span
          key={label.key}
          ref={(el) => {
            if (el) elements.current.set(label.key, el)
            else elements.current.delete(label.key)
          }}
          className={`cell-label${label.selected ? ' is-selected' : ''}`}
        >
          {label.selected && <span className="cell-label-badge">Selected</span>}
          {label.text}
        </span>
      ))}
    </div>
  )
}
