import type { SubjectId } from './subjects'

/** A statement and the sources that support it (ids in `SOURCES`). */
export interface Cited {
  text: string
  sourceIds: string[]
}

export interface SubjectGuide {
  subject: SubjectId
  /** One or two plain-language sentences for beginners. */
  summary: string
  /** Deeper explanation, shown on request. */
  deeper: Cited[]
  /** Glossary ids. */
  keyTerms: string[]
  /** Equations or structural relationships. */
  relations: (Cited & { expression: string })[]
  /** Symbols and units used in the relations. */
  symbols: { symbol: string; meaning: string; unit: string }[]
  misconceptions: (Cited & { claim: string })[]
  /** What the visualization simplifies. */
  simplifications: string[]
  /** What is measured data, what is computed from it, and what is only illustrative. */
  modelKinds: { measured: string[]; computed: string[]; illustrative: string[] }
}

export const GUIDES: Record<SubjectId, SubjectGuide> = {
  chemistry: {
    subject: 'chemistry',
    summary:
      'A molecule is a group of atoms held together by covalent bonds. Its 3D shape, set by bond lengths and bond angles, affects how it behaves. These six molecules are built from measured geometry.',
    deeper: [
      { text: 'In a covalent bond, two atoms share a pair of electrons. The bond length is the separation at which the pair of atoms has its lowest energy.', sourceIds: ['chem-7-2'] },
      {
        text: 'VSEPR theory predicts shape: the electron domains around a central atom (bonds and lone pairs) spread as far apart as possible. Lone pairs repel more strongly than bonding pairs, so they squeeze the bond angles between the atoms.',
        sourceIds: ['chem-7-6'],
      },
      {
        text: 'A shape name describes where the atoms are, not the lone pairs. Water’s four electron domains point roughly to the corners of a tetrahedron, but with only three atoms the molecule is bent, at about 104.5°.',
        sourceIds: ['chem-7-6'],
      },
    ],
    keyTerms: ['covalent-bond', 'bond-length', 'bond-angle', 'electron-domain', 'lone-pair', 'vsepr', 'molecular-structure', 'van-der-waals-radius', 'angstrom'],
    relations: [
      { expression: 'd = √(Δx² + Δy² + Δz²)', text: 'Distance between two atom centres, computed from their coordinates (Distance tool).', sourceIds: [] },
      { expression: 'cos θ = (BA · BC) / (|BA| |BC|)', text: 'Angle at atom B between atoms A and C, computed from coordinates (Angle tool).', sourceIds: [] },
    ],
    symbols: [
      { symbol: 'd', meaning: 'distance between two atom centres', unit: 'Å' },
      { symbol: 'θ', meaning: 'angle at the vertex atom', unit: '°' },
      { symbol: 'BA, BC', meaning: 'vectors from the vertex B to atoms A and C', unit: 'Å' },
    ],
    misconceptions: [
      {
        claim: 'A molecule’s shape name counts its lone pairs.',
        text: 'Shape names describe the positions of atoms only. Water has a tetrahedral arrangement of electron pairs but a bent molecular structure.',
        sourceIds: ['chem-7-6'],
      },
      {
        claim: 'Atoms are hard balls of the sizes shown.',
        text: 'Ball-and-stick sizes are schematic. Space-filling uses van der Waals radii, which estimate how far an unbonded atom’s electron cloud extends. Neither is a hard surface.',
        sourceIds: ['bondi'],
      },
    ],
    simplifications: [
      'Molecules are shown frozen at one geometry; real molecules vibrate and rotate.',
      'Bonds are drawn as sticks; bond order is shown, but electron density is not.',
      'Atom colours follow the CPK convention and are labels, not real colours.',
    ],
    modelKinds: {
      measured: ['Atom coordinates and reported bond lengths and angles (experimental geometries, NIST CCCBDB)'],
      computed: ['Distances and angles from the Distance and Angle tools, calculated from the coordinates'],
      illustrative: ['Atom colours, ball sizes in ball-and-stick view, and stick thickness'],
    },
  },
  biology: {
    subject: 'biology',
    summary:
      'Cells are the basic units of life. A eukaryotic cell, such as an animal cell, is divided into membrane-bound organelles, each with its own job.',
    deeper: [
      { text: 'The nucleus holds the cell’s DNA. Ribosomes build proteins. Mitochondria release usable energy from food molecules.', sourceIds: ['bio-4-3'] },
      {
        text: 'The endomembrane system works like a production line: proteins and lipids made at the ER travel in vesicles to the Golgi apparatus, which modifies, sorts and ships them. Some go to lysosomes, others to the plasma membrane.',
        sourceIds: ['bio-4-4'],
      },
      { text: 'Not every protein follows this route. Signal sequences can send proteins elsewhere, for example into mitochondria.', sourceIds: ['bio-4-4'] },
    ],
    keyTerms: ['organelle', 'endomembrane-system'],
    relations: [
      {
        expression: 'rough ER → transport vesicles → Golgi (cis → trans) → vesicles → plasma membrane or lysosomes',
        text: 'The secretory pathway through the endomembrane system.',
        sourceIds: ['bio-4-4'],
      },
    ],
    symbols: [],
    misconceptions: [
      {
        claim: 'Every protein passes through the Golgi apparatus.',
        text: 'Proteins made on free ribosomes, such as many bound for mitochondria, never enter the ER–Golgi pathway.',
        sourceIds: ['bio-4-4'],
      },
      {
        claim: 'Only animal cells have mitochondria; plants use chloroplasts instead.',
        text: 'Plant cells have chloroplasts and mitochondria. Both plant and animal cells have mitochondria.',
        sourceIds: ['bio-4-3'],
      },
    ],
    simplifications: [
      'One generalized animal cell and one generalized plant cell; real cell types differ greatly in shape and contents.',
      'Shapes, sizes, numbers and positions of organelles are schematic and not to scale.',
      'The cytoskeleton and most molecules are not drawn.',
    ],
    modelKinds: {
      measured: [],
      computed: [],
      illustrative: ['The whole 3D cell: structures are placed and sized for clarity, not from measurements'],
    },
  },
  physics: {
    subject: 'physics',
    summary:
      'A projectile moves under gravity alone once it is launched. Its horizontal and vertical motions are independent: it moves sideways at a steady speed while gravity changes its vertical speed.',
    deeper: [
      { text: 'With no air resistance, the horizontal velocity stays constant and the vertical velocity changes at the constant rate g. The path is a parabola.', sourceIds: ['up-4-3'] },
      { text: 'Near Earth’s surface, all objects fall with the same acceleration, whatever their mass, when air resistance is negligible.', sourceIds: ['up-3-5'] },
      { text: 'For launch and landing at the same height, the range depends on sin 2θ, so it is greatest at 45°, and two angles that add up to 90° give the same range.', sourceIds: ['up-4-3'] },
    ],
    keyTerms: ['projectile', 'trajectory', 'range', 'time-of-flight', 'free-fall-acceleration', 'velocity-components'],
    relations: [
      { expression: 'x(t) = v₀ cos θ · t', text: 'Horizontal position: constant horizontal velocity.', sourceIds: ['up-4-3'] },
      { expression: 'y(t) = y₀ + v₀ sin θ · t − ½ g t²', text: 'Vertical position: constant downward acceleration.', sourceIds: ['up-4-3'] },
      { expression: 'vᵧ(t) = v₀ sin θ − g t', text: 'Vertical velocity changes by −g every second; vₓ never changes.', sourceIds: ['up-4-3'] },
      { expression: 'R = v₀² sin 2θ / g', text: 'Range, only when launch and landing are at the same height (y₀ = 0).', sourceIds: ['up-4-3'] },
      { expression: 'h = (v₀ sin θ)² / (2g)', text: 'Maximum height above the launch point.', sourceIds: ['up-4-3'] },
    ],
    symbols: [
      { symbol: 'v₀', meaning: 'launch speed', unit: 'm/s' },
      { symbol: 'θ', meaning: 'launch angle above the horizontal', unit: '°' },
      { symbol: 'y₀', meaning: 'launch height above the ground', unit: 'm' },
      { symbol: 'g', meaning: 'magnitude of gravitational acceleration', unit: 'm/s²' },
      { symbol: 't', meaning: 'time since launch', unit: 's' },
      { symbol: 'R, h', meaning: 'range and maximum height', unit: 'm' },
    ],
    misconceptions: [
      {
        claim: 'Heavier objects fall faster.',
        text: 'Without air resistance, every object has the same acceleration g. Mass does not appear in these equations, and the lab has no mass input.',
        sourceIds: ['up-3-5'],
      },
      {
        claim: 'At the highest point the projectile has stopped.',
        text: 'Only the vertical velocity is zero at the top. The horizontal velocity is unchanged, as the vₓ readout shows.',
        sourceIds: ['up-4-3'],
      },
      {
        claim: '45° always gives the longest throw.',
        text: 'The range formula, and the 45° result from it, apply only when launch and landing are at the same height.',
        sourceIds: ['up-4-3'],
      },
    ],
    simplifications: [
      'No air resistance, wind or spin.',
      'Flat, level ground and constant g.',
      'The projectile is treated as a point; its size and shape do not matter.',
    ],
    modelKinds: {
      measured: ['9.81 m/s² default gravity: an average value at Earth’s surface'],
      computed: ['Every position, velocity, time, range and height, from the analytic equations'],
      illustrative: ['Arrow lengths (scaled per scene, as the legend states) and the ball size'],
    },
  },
  mathematics: {
    subject: 'mathematics',
    summary:
      'A function of two variables gives a height z for every point (x, y). Drawing all those heights produces a surface you can turn, slice and probe.',
    deeper: [
      { text: 'The graph of z = f(x, y) is the set of points (x, y, f(x, y)). Each input pair has exactly one height.', sourceIds: ['calc3-4-1'] },
      { text: 'Fixing x = c or y = c cuts the surface with a vertical plane. The curve left behind, a vertical trace, is a function of one variable.', sourceIds: ['calc3-4-1'] },
      {
        text: 'On the saddle z = a·x² − b·y², the trace along x opens upward and the trace along y opens downward. At the origin the surface is level, yet it is neither a maximum nor a minimum: a saddle point.',
        sourceIds: ['calc3-4-7'],
      },
    ],
    keyTerms: ['function-of-two-variables', 'domain', 'graph-surface', 'vertical-trace', 'saddle-point', 'parameter'],
    relations: [
      { expression: 'x = c  ⇒  z = f(c, y)', text: 'A vertical trace at fixed x.', sourceIds: ['calc3-4-1'] },
      { expression: 'y = c  ⇒  z = f(x, c)', text: 'A vertical trace at fixed y.', sourceIds: ['calc3-4-1'] },
    ],
    symbols: [
      { symbol: 'x, y', meaning: 'inputs (horizontal coordinates)', unit: 'none' },
      { symbol: 'z', meaning: 'output (height)', unit: 'none' },
      { symbol: 'a, b, c, A, k', meaning: 'parameters of the chosen surface', unit: 'none' },
    ],
    misconceptions: [
      {
        claim: 'The colours are a fourth variable.',
        text: 'Colour only repeats the height z, so you can read heights from the legend.',
        sourceIds: [],
      },
      {
        claim: 'A level point is always a top or a bottom.',
        text: 'A saddle point is level but neither: the surface rises in one direction and falls in another.',
        sourceIds: ['calc3-4-7'],
      },
      {
        claim: 'The values come from the drawn mesh.',
        text: 'The mesh is an approximation for drawing. Every number shown comes from the exact formula.',
        sourceIds: [],
      },
    ],
    simplifications: ['Each surface is drawn only over −2 ≤ x, y ≤ 2.', 'The 3D surface is a triangle mesh; small features between grid lines are smoothed.'],
    modelKinds: {
      measured: [],
      computed: ['Heights, point values, cross-section curves and tables, all from the exact formula'],
      illustrative: ['The mesh, grid lines and height colours'],
    },
  },
  anatomy: {
    subject: 'anatomy',
    summary:
      'The heart is a double pump. Its right side sends blood to the lungs to pick up oxygen; its left side sends blood to the rest of the body.',
    deeper: [
      { text: 'Each side has an atrium that receives blood and a ventricle that pumps it out. Valves keep blood moving one way.', sourceIds: ['ap-19-1'] },
      { text: 'The pulmonary circuit runs from the right ventricle to the lungs and back to the left atrium. The systemic circuit runs from the left ventricle to the body and back to the right atrium.', sourceIds: ['ap-19-1'] },
      { text: 'Arteries carry blood away from the heart and veins carry it toward the heart. The names describe direction, not oxygen content.', sourceIds: ['ap-20-1'] },
    ],
    keyTerms: ['atrium', 'ventricle', 'heart-valve', 'pulmonary-circuit', 'systemic-circuit', 'artery', 'vein', 'anterior-view'],
    relations: [
      {
        expression: 'venae cavae → right atrium → tricuspid valve → right ventricle → pulmonary valve → pulmonary trunk and arteries → lungs',
        text: 'Pulmonary circuit (oxygen-poor blood out, oxygen-rich back).',
        sourceIds: ['ap-19-1'],
      },
      {
        expression: 'pulmonary veins → left atrium → mitral valve → left ventricle → aortic valve → aorta → body',
        text: 'Systemic circuit.',
        sourceIds: ['ap-19-1'],
      },
    ],
    symbols: [],
    misconceptions: [
      {
        claim: 'Arteries always carry oxygen-rich blood.',
        text: 'The pulmonary arteries carry oxygen-poor blood to the lungs, and the pulmonary veins return oxygen-rich blood. Vessels are named by direction.',
        sourceIds: ['ap-20-1'],
      },
      {
        claim: 'Blood in veins is blue.',
        text: 'Blood is always red; oxygen-poor blood is darker red. The blue in the model is only a diagram convention.',
        sourceIds: ['ap-18-3'],
      },
      {
        claim: 'The left of the screen is the heart’s left side.',
        text: 'The model is an anterior (front) view, so the body’s right side is on your left.',
        sourceIds: [],
      },
    ],
    simplifications: [
      'Shapes, proportions and vessel positions are schematic, not to scale.',
      'The heart does not beat; valves are shown in one position.',
      'The lungs and body are outside the model and are only marked in the tour.',
    ],
    modelKinds: {
      measured: [],
      computed: [],
      illustrative: ['The whole 3D heart and the blue/red oxygen-pathway colours'],
    },
  },
}
