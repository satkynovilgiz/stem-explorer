/**
 * The single place where mathematical coordinates meet Three.js coordinates.
 *
 * Mathematics: x and y are horizontal, z is up (right-handed).
 * Three.js:    X and Z are horizontal, Y is up (right-handed).
 *
 * Mapping (x, y, z) → (X, Y, Z) = (x, z, −y). It is a rotation (determinant +1), so orientation is
 * preserved and the picture is never mirrored. Scale is 1:1 on every axis.
 */
export type Triple = readonly [number, number, number]

export function toWorld([x, y, z]: Triple): [number, number, number] {
  return [x, z, -y]
}

export function fromWorld([X, Y, Z]: Triple): [number, number, number] {
  return [X, -Z, Y]
}
