import type { ReferenceEntry } from '../../types'

export const SKELETAL: ReferenceEntry[] = [
  {
    id: 'vertebral-column',
    type: 'structure',
    subject: 'anatomy',
    category: 'Skeletal system',
    topic: 'Axial skeleton',
    title: 'Vertebral column',
    summary: 'The flexible column of vertebrae that supports the head and trunk and surrounds the spinal cord.',
    aliases: ['spine', 'spinal column', 'backbone'],
    tags: ['axial skeleton', 'vertebrae', 'spinal cord', 'curvatures'],
    level: 'introductory',
    system: 'Skeletal',
    region: 'Back (neck to pelvis)',
    location: 'In the midline of the back, from the base of the skull to the pelvis.',
    functions: ['Supports the head and the weight of the body above the pelvis.', 'Protects the spinal cord inside the vertebral canal.', 'Allows bending and twisting of the trunk and neck.', 'Provides attachment for muscles of the back and for the ribs.'],
    neighbours: ['Articulates with the occipital bone of the skull at C1.', 'Thoracic vertebrae articulate with the ribs.', 'The sacrum joins the hip bones at the back of the pelvis.', 'Surrounds the spinal cord.'],
    subdivisions: ['Cervical vertebrae C1–C7', 'Thoracic vertebrae T1–T12', 'Lumbar vertebrae L1–L5', 'Sacrum (fused vertebrae)', 'Coccyx (fused vertebrae)'],
    atlasIds: ['vertebral-column', 'cervical-vertebrae', 'thoracic-vertebrae', 'lumbar-vertebrae', 'sacrum', 'coccyx'],
    explanation: [
      'The column develops as 33 vertebrae; in the adult there are 24 separate vertebrae plus the sacrum and coccyx, which form by fusion. Vertebrae are named and numbered by region from the top down.',
      'Seen from the side the adult column has four curvatures: the thoracic and sacrococcygeal curves are primary (present before birth); the cervical and lumbar curves are secondary, developing as an infant holds up the head and begins to walk.',
    ],
    conditions: ['Counts describe typical anatomy; individual variation in the number of vertebrae exists.'],
    examples: [{ problem: 'Name the region of the vertebra labelled T6, and what it articulates with besides other vertebrae.', steps: ['“T” denotes thoracic; T6 is the sixth of twelve.', 'Thoracic vertebrae articulate with the ribs.'], answer: 'A thoracic vertebra; it also articulates with a pair of ribs.' }],
    mistakes: ['Counting the sacrum and coccyx as single vertebrae in the adult total of 24: the 24 are the separate cervical, thoracic and lumbar vertebrae.'],
    related: [{ id: 'spinal-cord', why: 'The column surrounds and protects the spinal cord; spinal nerves leave between vertebrae.' }],
    sources: [{ id: 'ap-7-3', locator: '§7.3 Regions of the Vertebral Column; curvatures' }],
    modelLimitations: ['The body atlas draws each region as a column of simple blocks; vertebral shapes, discs and the vertebral canal are not modelled.'],
  },
]
