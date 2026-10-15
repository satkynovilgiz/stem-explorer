import type { ElementInfo, ElementSymbol, Representation } from './types'

/**
 * Colors: CPK / Jmol convention (https://jmol.sourceforge.net/jscolors/). N
 * and C match Jmol exactly; H and O are slightly adjusted for contrast on the dark background.
 * Radii: Bondi van der Waals radii, J. Phys. Chem. 1964, 68, 441–451.
 */
export const ELEMENTS: Record<ElementSymbol, ElementInfo> = {
  H: { symbol: 'H', name: 'Hydrogen', atomicNumber: 1, color: '#f2f2f2', vdwRadius: 1.2 },
  C: { symbol: 'C', name: 'Carbon', atomicNumber: 6, color: '#909090', vdwRadius: 1.7 },
  N: { symbol: 'N', name: 'Nitrogen', atomicNumber: 7, color: '#3050f8', vdwRadius: 1.55 },
  O: { symbol: 'O', name: 'Oxygen', atomicNumber: 8, color: '#ff2d2d', vdwRadius: 1.52 },
}

/**
 * Ball-and-stick spheres are deliberately shrunk so bonds stay visible.
 * They are schematic and do not represent a physical size.
 */
export const BALL_AND_STICK_SCALE = 0.28

export function atomRadius(symbol: ElementSymbol, representation: Representation): number {
  const { vdwRadius } = ELEMENTS[symbol]
  return representation === 'space-filling' ? vdwRadius : vdwRadius * BALL_AND_STICK_SCALE
}
