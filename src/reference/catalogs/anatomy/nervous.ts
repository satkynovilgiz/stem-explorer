import type { ReferenceEntry } from '../../types'

export const NERVOUS: ReferenceEntry[] = [
  {
    id: 'spinal-cord',
    type: 'structure',
    subject: 'anatomy',
    category: 'Nervous system',
    topic: 'Central nervous system',
    title: 'Spinal cord',
    summary: 'The part of the central nervous system inside the vertebral column, linking the brain with the spinal nerves.',
    tags: ['central nervous system', 'gray matter', 'white matter', 'spinal nerves'],
    level: 'introductory',
    system: 'Nervous',
    region: 'Back',
    location: 'In the vertebral canal, continuous with the brain stem above; it ends near the upper lumbar vertebrae.',
    functions: ['Carries sensory information up to the brain and motor commands down from it.', 'Processes sensory input in the posterior horn and sends motor output from the anterior horn to skeletal muscles.'],
    neighbours: ['Continuous with the medulla of the brain stem.', 'Surrounded by the vertebral column.', 'Spinal nerves leave it at each level and pass between vertebrae.'],
    subdivisions: ['Cervical, thoracic, lumbar and sacral regions', 'Gray matter: posterior, anterior and (in thoracic, upper lumbar and sacral regions) lateral horns', 'White matter columns around the gray matter'],
    atlasIds: ['spinal-cord'],
    explanation: [
      'The spinal cord’s regions are named for where its spinal nerves leave the vertebral column, not for the vertebrae beside it. It stops growing in length in early childhood while the vertebral column keeps growing, so the adult cord is shorter than the column: the sacral cord lies at the level of the upper lumbar vertebrae, and the lower nerve roots descend as the cauda equina.',
      'In cross-section, gray matter forms an H-shape of horns surrounded by white matter. The posterior horn handles sensory processing; the anterior horn sends motor signals to skeletal muscles.',
    ],
    conditions: ['Describes typical adult anatomy.'],
    examples: [{ problem: 'A nerve root leaves the vertebral column below the level where the cord ends. Which structure is it part of?', steps: ['The cord ends near the upper lumbar vertebrae.', 'Roots continuing below form a bundle in the lower vertebral canal.'], answer: 'The cauda equina.' }],
    mistakes: ['Assuming the cord runs the full length of the vertebral column.'],
    related: [{ id: 'vertebral-column', why: 'The column encloses the cord; the cord’s regions are named for where nerves exit it.' }],
    sources: [{ id: 'ap-13-2', locator: '§13.2 The Spinal Cord; Gray Horns' }],
    modelLimitations: ['The body atlas draws the cord as a single rod; horns, roots and the cauda equina are not modelled.'],
  },
]
