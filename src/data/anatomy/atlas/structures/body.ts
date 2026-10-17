import { add, arc, L, lerp, mirrorShape } from '../figure'
import { pair } from '../helpers'
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

/* ---------- Skeletal (coarse groups; individual bones are listed under them) ---------- */

const ribs: Shape[] = Array.from({ length: 12 }, (_, i) => {
  const y = 7.85 - i * 0.16
  const rx = 0.62 + Math.min(i, 7) * 0.07 - Math.max(0, i - 8) * 0.06
  // Upper ribs reach the sternum; the last two ("floating") ribs are short.
  const end = i < 10 ? Math.PI * 0.02 : Math.PI * 0.55
  return { kind: 'tube', points: [...arc(0, y, -0.05, rx, 0.62, Math.PI, end, 8, 0.25)], radius: 0.035 } as Shape
})
const ribsBothSides: Shape[] = [...ribs, ...ribs.map(mirrorShape)]

const SPINE_POINTS: Vec3[] = [
  [0, 8.85, -0.12],
  [0, 8.3, -0.2],
  [0, 7.6, -0.42],
  [0, 6.6, -0.48],
  [0, 5.6, -0.36],
  [0, 4.95, -0.32],
]

export const SKELETAL: AtlasStructure[] = [
  {
    id: 'axial-skeleton',
    name: 'Axial skeleton',
    system: 'skeletal',
    region: 'whole-body',
    description: 'The vertical, central axis of the skeleton: all bones of the head, neck, chest and back. In an adult it has 80 of the 206 bones.',
    function: 'Protects the brain, spinal cord, heart and lungs, and anchors muscles of the head, neck and back and muscles that move the shoulder and hip.',
    representation: 'container',
    shapes: [],
    sources: ['ap-7-1'],
  },
  {
    id: 'appendicular-skeleton',
    name: 'Appendicular skeleton',
    system: 'skeletal',
    region: 'whole-body',
    description: 'All bones of the upper and lower limbs plus the bones that attach each limb to the axial skeleton. In an adult it has 126 of the 206 bones.',
    function: 'Supports and moves the limbs.',
    representation: 'container',
    shapes: [],
    sources: ['ap-7-1'],
  },
  {
    id: 'skull',
    name: 'Skull',
    system: 'skeletal',
    region: 'head-neck',
    parent: 'axial-skeleton',
    description: 'The bones of the head: 22 skull bones, with seven associated bones (the hyoid and the ear ossicles) counted separately.',
    function: 'Encloses and protects the brain and supports the face.',
    representation: 'group',
    grouping: 'Drawn as one shell; individual skull bones are not separated here.',
    shapes: [
      { kind: 'ellipsoid', center: [0, 9.4, 0], radii: [0.5, 0.48, 0.58] },
      { kind: 'ellipsoid', center: [0, 8.95, 0.22], radii: [0.36, 0.34, 0.32] },
    ],
    sources: ['ap-7-1'],
  },
  {
    id: 'vertebral-column',
    name: 'Vertebral column',
    system: 'skeletal',
    region: 'back',
    parent: 'axial-skeleton',
    aliases: ['spine', 'backbone'],
    description: 'A column of 24 vertebrae plus the sacrum and coccyx, running from the base of the skull to the pelvis.',
    function: 'Supports the head and trunk and encloses the spinal cord in the vertebral cavity.',
    representation: 'group',
    grouping: 'Drawn as one curved rod; the vertebrae are not separated here.',
    shapes: [{ kind: 'tube', points: SPINE_POINTS, radius: 0.09 }],
    sources: ['ap-7-1', 'ap-12-1'],
    related: [{ id: 'spinal-cord', relation: 'Encloses' }],
  },
  {
    id: 'thoracic-cage',
    name: 'Thoracic cage',
    system: 'skeletal',
    region: 'thorax',
    parent: 'axial-skeleton',
    aliases: ['rib cage'],
    description: 'Twelve pairs of ribs and the sternum, joined to the thoracic vertebrae at the back.',
    function: 'Protects the heart and lungs.',
    representation: 'group',
    grouping: 'Ribs and sternum drawn together; the costal cartilages are not drawn.',
    shapes: [...ribsBothSides, { kind: 'box', center: [0, 7.15, 0.6], size: [0.16, 1.1, 0.06] }],
    sources: ['ap-7-1'],
    related: [
      { id: 'heart', relation: 'Protects' },
      { id: 'lung-left', relation: 'Protects' },
    ],
  },
  {
    id: 'pelvic-girdle',
    name: 'Pelvis (hip bones and sacrum)',
    system: 'skeletal',
    region: 'pelvis',
    parent: 'appendicular-skeleton',
    description: 'The two hip bones, which attach the lower limbs, joined at the back to the sacrum (the sacrum and coccyx belong to the vertebral column).',
    function: 'Attaches the lower limbs to the axial skeleton and supports the pelvic organs.',
    representation: 'group',
    grouping: 'Both hip bones and the sacrum drawn as one ring.',
    shapes: [
      { kind: 'ellipsoid', center: [0.5, 4.75, -0.05], radii: [0.42, 0.34, 0.12], rotation: [0, 0.6, -0.3] },
      { kind: 'ellipsoid', center: [-0.5, 4.75, -0.05], radii: [0.42, 0.34, 0.12], rotation: [0, -0.6, 0.3] },
      { kind: 'ellipsoid', center: [0, 4.65, -0.32], radii: [0.2, 0.3, 0.08] },
      { kind: 'tube', points: [[0.48, 4.42, 0.05], [0.2, 4.3, 0.3], [-0.2, 4.3, 0.3], [-0.48, 4.42, 0.05]], radius: 0.06 },
    ],
    sources: ['ap-7-1'],
  },
  ...pair({
    id: 'upper-limb-bones',
    name: 'upper limb bones',
    system: 'skeletal',
    region: 'upper-limb',
    parent: 'appendicular-skeleton',
    description: 'The clavicle and scapula (pectoral girdle), the humerus of the arm, the radius and ulna of the forearm, and the bones of the hand.',
    function: 'Attach the upper limb to the trunk and support its wide range of movement.',
    representation: 'group',
    grouping: 'Drawn as one rod per segment; the bones are named in the list.',
    shapes: [
      { kind: 'capsule', from: [0.15, 8.15, 0.25], to: [1.2, 8.1, 0.02], radius: 0.05 },
      { kind: 'capsule', from: add(L.shoulder, [-0.05, -0.02, -0.02]), to: L.elbow, radius: 0.075 },
      { kind: 'capsule', from: L.elbow, to: L.wrist, radius: 0.06 },
      { kind: 'ellipsoid', center: L.hand, radii: [0.12, 0.28, 0.05] },
    ],
    sources: ['ap-7-1'],
  }),
  ...pair({
    id: 'lower-limb-bones',
    name: 'lower limb bones',
    system: 'skeletal',
    region: 'lower-limb',
    parent: 'appendicular-skeleton',
    description: 'The femur of the thigh, the patella, the tibia and fibula of the leg, and the bones of the foot.',
    function: 'Support body weight and enable standing and walking.',
    representation: 'group',
    grouping: 'Drawn as one rod per segment; the bones are named in the list.',
    shapes: [
      { kind: 'capsule', from: L.hip, to: L.knee, radius: 0.1 },
      { kind: 'capsule', from: L.knee, to: L.ankle, radius: 0.08 },
      { kind: 'ellipsoid', center: lerp(L.ankle, L.foot, 0.6), radii: [0.12, 0.08, 0.32] },
    ],
    sources: ['ap-7-1'],
  }),
]

/* ---------- Muscular (a first set of superficial muscles) ---------- */

export const MUSCULAR: AtlasStructure[] = [
  ...pair({
    id: 'pectoralis-major',
    name: 'pectoralis major',
    system: 'muscular',
    region: 'thorax',
    description: 'A thick, fan-shaped muscle covering much of the upper front of the thorax.',
    function: 'Moves the humerus (the arm bone) at the shoulder; it is one of the two axial muscles that move the arm.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.55, 7.45, 0.6], radii: [0.55, 0.38, 0.14], rotation: [0, 0, -0.2] }],
    sources: ['ap-11-5'],
  }),
  ...pair({
    id: 'deltoid',
    name: 'deltoid',
    system: 'muscular',
    region: 'upper-limb',
    description: 'The thick muscle that creates the rounded outline of the shoulder.',
    function: 'The major abductor of the arm (raises it away from the body); it also helps flex, extend and rotate the arm.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [1.32, 7.85, 0], radii: [0.26, 0.42, 0.3], rotation: [0, 0, -0.2] }],
    sources: ['ap-11-5'],
  }),
  {
    id: 'rectus-abdominis',
    name: 'Rectus abdominis',
    system: 'muscular',
    region: 'abdomen',
    description: 'A pair of long, straight muscles down the middle of the front of the abdomen, crossed by bands of connective tissue (tendinous intersections).',
    function: 'Flexes the vertebral column, as when sitting up.',
    representation: 'group',
    grouping: 'The left and right rectus abdominis are drawn as one band.',
    shapes: [{ kind: 'box', center: [0, 5.45, 0.62], size: [0.5, 1.7, 0.08] }],
    sources: ['ap-11-4'],
  },
  ...pair({
    id: 'quadriceps',
    name: 'quadriceps femoris (group)',
    system: 'muscular',
    region: 'lower-limb',
    description: 'A group of four muscles on the front of the thigh that share the quadriceps tendon, which attaches to the patella.',
    function: 'Extends and stabilizes the knee.',
    representation: 'group',
    grouping: 'Four muscles (rectus femoris, vastus lateralis, vastus medialis, vastus intermedius) drawn as one volume.',
    shapes: [{ kind: 'capsule', from: add(L.hip, [0.05, -0.25, 0.22]), to: add(L.knee, [0, 0.3, 0.18]), radius: 0.26 }],
    sources: ['ap-11-6'],
  }),
]

export const BODY_STRUCTURES: AtlasStructure[] = [...INTEGUMENTARY, ...SKELETAL, ...MUSCULAR]
