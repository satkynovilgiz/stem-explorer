import type { ThreeEvent } from '@react-three/fiber'
import type { OrganelleId } from '../../../data/biology/types'
import { CUT_HALF_ANGLE } from './layout'

export type SelectHandler = (organelleId: OrganelleId, instance: number | null) => void

/** Click handling shared by every pickable part. Hidden parts are never rendered, so they cannot be hit. */
export function pick(organelleId: OrganelleId, instance: number | null, onSelect: SelectHandler) {
  return {
    userData: { organelleId },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onSelect(organelleId, instance)
    },
  }
}

/** Sphere angles that leave a wedge open toward +z when `open` is true. */
export function shellAngles(open: boolean): [number, number] {
  return open ? [Math.PI / 2 + CUT_HALF_ANGLE, 2 * Math.PI - 2 * CUT_HALF_ANGLE] : [0, 2 * Math.PI]
}

