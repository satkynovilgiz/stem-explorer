import { L, mirrorShape } from '../figure'
import type { AtlasStructure, Shape, Vec3 } from '../types'

/* ---------- Integumentary ---------- */

const limbShell = (rr: number): Shape[] => [
    { kind: 'capsule', from: L.shoulder, to: L.elbow, radius: 0.3 * rr },
    { kind: 'capsule', from: L.elbow, to: L.wrist, radius: 0.24 * rr },
    { kind: 'ellipsoid', center: L.hand, radii: [0.17 * rr, 0.34 * rr, 0.1 * rr] },
    { kind: 'capsule', from: L.hip, to: L.knee, radius: 0.43 * rr },
    { kind: 'capsule', from: L.knee, to: L.ankle, radius: 0.3 * rr },
    { kind: 'ellipsoid', center: L.foot, radii: [0.17 * rr, 0.13 * rr, 0.38 * rr] },
]

const SKIN_SHAPES: Shape[] = [
  { kind: 'ellipsoid', center: [0, 9.3, 0.02], radii: [0.56, 0.7, 0.64] },
  { kind: 'capsule', from: [0, 8.25, -0.02], to: [0, 8.8, 0], radius: 0.3 },
  { kind: 'ellipsoid', center: [0, 7.1, 0], radii: [1.25, 1.2, 0.72] },
  { kind: 'ellipsoid', center: [0, 5.45, 0.02], radii: [1.08, 1.15, 0.65] },
  { kind: 'ellipsoid', center: [0, 4.55, 0], radii: [1.1, 0.6, 0.64] },
  ...limbShell(1),
  ...limbShell(1).map(mirrorShape),
]

const fingertip = (side: 1 | -1): Vec3 => [side * 1.99, 3.8, 0.13]
const toeTip = (side: 1 | -1): Vec3 => [side * 0.55, 0.12, 0.62]

export const INTEGUMENTARY: AtlasStructure[] = [
  {
    id: 'skin',
    name: 'Skin',
    system: 'integumentary',
    region: 'whole-body',
    description:
      'The skin covers the whole body. Its outer layer, the epidermis, is a keratinized epithelium without blood vessels; beneath it the dermis holds blood and lymph vessels, nerves, hair follicles and sweat glands. The hypodermis below connects the skin to underlying fascia.',
    function: 'Protects the body overall, holds many sensory receptors, and (with sweat glands) helps control temperature.',
    representation: 'individual',
    shapes: SKIN_SHAPES,
    limitations: 'Drawn as a translucent outline of the whole figure; its thickness and layers are not shown.',
    sources: ['ap-5-1', 'ap-1-2'],
    related: [{ id: 'hair', relation: 'Accessory structure growing from the epidermis' }, { id: 'nails', relation: 'Accessory structure' }],
  },
  {
    id: 'hair',
    name: 'Hair (scalp)',
    system: 'integumentary',
    region: 'head-neck',
    parent: 'skin',
    description: 'A keratinous filament that grows out of the epidermis from a follicle in the dermis.',
    function: 'Protection, sensory input, thermoregulation and communication.',
    representation: 'group',
    grouping: 'All scalp hair drawn as one cap. Body hair elsewhere is not drawn.',
    shapes: [{ kind: 'ellipsoid', center: [0, 9.55, -0.05], radii: [0.58, 0.5, 0.64] }],
    sources: ['ap-5-2'],
  },
  {
    id: 'nails',
    name: 'Nails',
    system: 'integumentary',
    region: 'whole-body',
    parent: 'skin',
    description: 'Hard plates of keratin at the tips of the fingers and toes.',
    function: 'Protect the tips of the fingers and toes and give a firm back-support for picking up small objects.',
    representation: 'group',
    grouping: 'Each hand’s and foot’s nails are drawn as one small plate, because the hands and feet are drawn without separate digits.',
    shapes: [1, -1].flatMap((s) => [
      { kind: 'box', center: fingertip(s as 1 | -1), size: [0.12, 0.08, 0.03] } as Shape,
      { kind: 'box', center: toeTip(s as 1 | -1), size: [0.16, 0.03, 0.08] } as Shape,
    ]),
    sources: ['ap-5-2'],
  },
]

export const BODY_STRUCTURES: AtlasStructure[] = [...INTEGUMENTARY]
