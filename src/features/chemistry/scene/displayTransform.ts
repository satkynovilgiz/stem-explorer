import { Matrix4, Quaternion, Vector3 } from 'three'
import { atomRadius } from '../../../data/chemistry/elements'
import type { Molecule, Representation } from '../../../data/chemistry/types'
import { centroid } from '../../../lib/chemistry'

/**
 * Display-only transform: center the source coordinates and apply the molecule's
 * preferred viewing rotation. Measurements never use this — rotation and translation
 * preserve distances and angles, and the data itself is left untouched.
 */
export function displayMatrix(molecule: Molecule): Matrix4 {
  const c = centroid(molecule)
  const translate = new Matrix4().makeTranslation(-c[0], -c[1], -c[2])
  const rotation = molecule.display.rotation
  if (!rotation) return translate
  const q = new Quaternion().setFromAxisAngle(
    new Vector3(...rotation.axis).normalize(),
    (rotation.angleDeg * Math.PI) / 180,
  )
  return new Matrix4().makeRotationFromQuaternion(q).multiply(translate)
}

/** Extra room (Å) above ball-and-stick atoms for their labels. */
const LABEL_MARGIN = 0.35

/** Radius (Å) around the centroid that encloses every drawn sphere in this representation. */
export function enclosingRadius(molecule: Molecule, representation: Representation): number {
  const c = centroid(molecule)
  return Math.max(
    ...molecule.atoms.map(
      (a) =>
        Math.hypot(a.position[0] - c[0], a.position[1] - c[1], a.position[2] - c[2]) +
        atomRadius(a.element, representation) +
        (representation === 'ball-and-stick' ? LABEL_MARGIN : 0),
    ),
  )
}
