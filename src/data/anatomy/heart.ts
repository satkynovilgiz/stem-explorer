/*
 * Simplified educational content about the human heart, paraphrased from OpenStax Anatomy and
 * Physiology 2e (CC BY 4.0). Each entry lists the pages it relies on. This content has not been
 * reviewed by a medical expert.
 */

export const HEART_PART_IDS = [
  'right-atrium',
  'right-ventricle',
  'left-atrium',
  'left-ventricle',
  'tricuspid-valve',
  'pulmonary-valve',
  'mitral-valve',
  'aortic-valve',
  'aorta',
  'pulmonary-trunk',
  'pulmonary-veins',
  'superior-vena-cava',
  'inferior-vena-cava',
  'interventricular-septum',
] as const

export type HeartPartId = (typeof HEART_PART_IDS)[number]
export type HeartView = 'whole' | 'cutaway'
/** Diagram convention for which pathway a structure belongs to. */
export type Oxygenation = 'poor' | 'rich' | 'none'
export type PartKind = 'chamber' | 'valve' | 'vessel' | 'wall'

export interface HeartPart {
  id: HeartPartId
  name: string
  kind: PartKind
  tag: string
  summary: string
  details: readonly string[]
  connections: readonly { targetId: HeartPartId; text: string }[]
  oxygenation: Oxygenation
  simplifications: readonly string[]
  sourceIds: readonly string[]
  /** Inside the heart wall: only drawn in the cutaway view. */
  internal: boolean
  /** Labelled by default (others are labelled only when selected). */
  majorLabel: boolean
}

export const HEART_SOURCES: Record<string, { label: string; url: string }> = {
  'ap-19-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 19.1 Heart Anatomy',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy',
  },
  'ap-18-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 18.3 Erythrocytes',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/18-3-erythrocytes',
  },
}

export const HEART_DISCLAIMER =
  'This is a simplified educational diagram in 3D. Shapes, proportions, vessel positions, and movement are schematic.'

export const ORIENTATION_NOTE =
  'Left and right always refer to the body’s own left and right. This model faces you, as if you were looking at a person’s chest from the front (anterior view), so the heart’s right side appears on your left.'

export const COLOR_CONVENTION =
  'Blue marks the relatively oxygen-poor pathway and red the oxygen-rich pathway. This is a diagram convention: blood is never blue. Oxygen-rich blood is bright red and oxygen-poor blood is a darker red.'

export const HEART_PARTS: readonly HeartPart[] = [
  {
    id: 'right-atrium',
    name: 'Right atrium',
    kind: 'chamber',
    tag: 'Receives blood returning from the body',
    summary: 'The upper chamber on the heart’s right side. It receives oxygen-poor blood returning from the body.',
    details: [
      'The superior and inferior venae cavae, and the coronary sinus that drains the heart muscle, empty into it.',
      'Like the left atrium, it acts as a receiving chamber and contracts to push blood into the ventricle below.',
    ],
    connections: [
      { targetId: 'superior-vena-cava', text: 'Receives blood from the superior vena cava.' },
      { targetId: 'inferior-vena-cava', text: 'Receives blood from the inferior vena cava.' },
      { targetId: 'tricuspid-valve', text: 'Sends blood through the tricuspid valve into the right ventricle.' },
    ],
    oxygenation: 'poor',
    simplifications: ['Drawn as a rounded chamber; the coronary sinus and the interatrial septum are not shown.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'right-ventricle',
    name: 'Right ventricle',
    kind: 'chamber',
    tag: 'Pumps blood to the lungs',
    summary: 'The lower chamber on the heart’s right side. It pumps oxygen-poor blood into the pulmonary trunk, toward the lungs.',
    details: [
      'It receives blood from the right atrium through the tricuspid valve.',
      'It drives the pulmonary circuit, which carries blood to the lungs and back to the heart.',
    ],
    connections: [
      { targetId: 'tricuspid-valve', text: 'Fills through the tricuspid valve.' },
      { targetId: 'pulmonary-valve', text: 'Ejects blood through the pulmonary valve.' },
      { targetId: 'interventricular-septum', text: 'Separated from the left ventricle by the interventricular septum.' },
    ],
    oxygenation: 'poor',
    simplifications: ['Shape and wall thickness are schematic; the papillary muscles and chordae tendineae are not drawn.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'left-atrium',
    name: 'Left atrium',
    kind: 'chamber',
    tag: 'Receives blood returning from the lungs',
    summary: 'The upper chamber on the heart’s left side. It receives oxygen-rich blood from the lungs through the pulmonary veins.',
    details: [
      'It acts as a receiving chamber and contracts to push blood into the left ventricle.',
      'It lies toward the back of the heart, behind the right side.',
    ],
    connections: [
      { targetId: 'pulmonary-veins', text: 'Receives blood from the pulmonary veins.' },
      { targetId: 'mitral-valve', text: 'Sends blood through the mitral valve into the left ventricle.' },
    ],
    oxygenation: 'rich',
    simplifications: ['Its position toward the back of the heart is only suggested.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'left-ventricle',
    name: 'Left ventricle',
    kind: 'chamber',
    tag: 'Pumps blood to the body',
    summary: 'The lower chamber on the heart’s left side. It pumps oxygen-rich blood into the aorta, out to the body.',
    details: [
      'Both ventricles pump the same amount of blood, but the left ventricle’s muscle is much thicker, because pushing blood around the long systemic circuit requires much more pressure.',
      'It receives blood from the left atrium through the mitral valve.',
    ],
    connections: [
      { targetId: 'mitral-valve', text: 'Fills through the mitral valve.' },
      { targetId: 'aortic-valve', text: 'Ejects blood through the aortic valve.' },
      { targetId: 'interventricular-septum', text: 'Separated from the right ventricle by the interventricular septum.' },
    ],
    oxygenation: 'rich',
    simplifications: ['The model does not show the true difference in wall thickness between the ventricles.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'tricuspid-valve',
    name: 'Tricuspid valve',
    kind: 'valve',
    tag: 'Right atrioventricular valve',
    summary: 'The valve between the right atrium and the right ventricle, also called the right atrioventricular valve.',
    details: [
      'It typically has three flaps (leaflets or cusps).',
      'The flaps are connected by chordae tendineae to papillary muscles, which control the opening and closing of the valve.',
    ],
    connections: [
      { targetId: 'right-atrium', text: 'Opens from the right atrium…' },
      { targetId: 'right-ventricle', text: '…into the right ventricle.' },
    ],
    oxygenation: 'none',
    simplifications: ['Drawn as a ring with three flat flaps; chordae tendineae and papillary muscles are not shown, and the valve does not move.'],
    sourceIds: ['ap-19-1'],
    internal: true,
    majorLabel: false,
  },
  {
    id: 'pulmonary-valve',
    name: 'Pulmonary valve',
    kind: 'valve',
    tag: 'Between right ventricle and pulmonary trunk',
    summary: 'The pulmonary semilunar valve, at the base of the pulmonary trunk where it leaves the right ventricle.',
    details: ['It is made of three small flaps of endothelium reinforced with connective tissue.'],
    connections: [
      { targetId: 'right-ventricle', text: 'Guards the outflow from the right ventricle…' },
      { targetId: 'pulmonary-trunk', text: '…into the pulmonary trunk.' },
    ],
    oxygenation: 'none',
    simplifications: ['Drawn as a ring with three flaps; it does not open or close.'],
    sourceIds: ['ap-19-1'],
    internal: true,
    majorLabel: false,
  },
  {
    id: 'mitral-valve',
    name: 'Mitral valve',
    kind: 'valve',
    tag: 'Left atrioventricular (bicuspid) valve',
    summary: 'The valve between the left atrium and the left ventricle, also called the bicuspid valve.',
    details: ['It has two cusps, compared with the three of the tricuspid valve.'],
    connections: [
      { targetId: 'left-atrium', text: 'Opens from the left atrium…' },
      { targetId: 'left-ventricle', text: '…into the left ventricle.' },
    ],
    oxygenation: 'none',
    simplifications: ['Drawn as a ring with two flat cusps; it does not move.'],
    sourceIds: ['ap-19-1'],
    internal: true,
    majorLabel: false,
  },
  {
    id: 'aortic-valve',
    name: 'Aortic valve',
    kind: 'valve',
    tag: 'Between left ventricle and aorta',
    summary: 'The aortic semilunar valve, at the base of the aorta where it leaves the left ventricle.',
    details: [
      'It is normally composed of three flaps.',
      'When the ventricle relaxes and blood tries to flow back from the aorta, the blood fills the cusps and closes the valve.',
    ],
    connections: [
      { targetId: 'left-ventricle', text: 'Guards the outflow from the left ventricle…' },
      { targetId: 'aorta', text: '…into the aorta.' },
    ],
    oxygenation: 'none',
    simplifications: ['Drawn as a ring with three flaps; it does not open or close.'],
    sourceIds: ['ap-19-1'],
    internal: true,
    majorLabel: false,
  },
  {
    id: 'aorta',
    name: 'Aorta',
    kind: 'vessel',
    tag: 'Carries blood to the body',
    summary: 'The large artery leaving the left ventricle. It carries oxygen-rich blood into the systemic circuit, toward the body.',
    details: ['The left ventricle pumps oxygenated blood into it through the aortic valve.'],
    connections: [
      { targetId: 'aortic-valve', text: 'Begins at the aortic valve.' },
      { targetId: 'left-ventricle', text: 'Receives blood from the left ventricle.' },
    ],
    oxygenation: 'rich',
    simplifications: ['Shown as a single arching tube; its branches to the head, arms and heart muscle are not drawn.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'pulmonary-trunk',
    name: 'Pulmonary trunk and arteries',
    kind: 'vessel',
    tag: 'Carries blood to the lungs',
    summary: 'The pulmonary trunk leaves the right ventricle and divides into the left and right pulmonary arteries, which lead to the lungs.',
    details: [
      'The right ventricle pumps oxygen-poor blood into it.',
      'The pulmonary trunk and its branches are the only arteries after birth that carry relatively oxygen-poor blood.',
    ],
    connections: [
      { targetId: 'pulmonary-valve', text: 'Begins at the pulmonary valve.' },
      { targetId: 'right-ventricle', text: 'Receives blood from the right ventricle.' },
    ],
    oxygenation: 'poor',
    simplifications: ['The two pulmonary arteries are shown as short branches that end at the “lungs” marker.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'pulmonary-veins',
    name: 'Pulmonary veins',
    kind: 'vessel',
    tag: 'Bring blood back from the lungs',
    summary: 'Veins that carry oxygen-rich blood from the lungs into the left atrium.',
    details: [
      'After birth they are the only veins that carry highly oxygenated blood.',
      'There are typically four; the model shows four short, simplified vessels.',
    ],
    connections: [{ targetId: 'left-atrium', text: 'Empty into the left atrium.' }],
    oxygenation: 'rich',
    simplifications: ['Positions are schematic; their real route behind the heart is simplified.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'superior-vena-cava',
    name: 'Superior vena cava',
    kind: 'vessel',
    tag: 'Large vein entering the right atrium from above',
    summary: 'One of the two large veins that return oxygen-poor blood from the body to the right atrium. It enters from above.',
    details: ['Together with the inferior vena cava and the coronary sinus, it empties into the right atrium.'],
    connections: [{ targetId: 'right-atrium', text: 'Empties into the right atrium.' }],
    oxygenation: 'poor',
    simplifications: ['Shown as a short straight tube.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'inferior-vena-cava',
    name: 'Inferior vena cava',
    kind: 'vessel',
    tag: 'Large vein entering the right atrium from below',
    summary: 'The other large vein returning oxygen-poor blood from the body to the right atrium. It enters from below.',
    details: ['Together with the superior vena cava and the coronary sinus, it empties into the right atrium.'],
    connections: [{ targetId: 'right-atrium', text: 'Empties into the right atrium.' }],
    oxygenation: 'poor',
    simplifications: ['Shown as a short tube; its path behind the heart is simplified.'],
    sourceIds: ['ap-19-1'],
    internal: false,
    majorLabel: true,
  },
  {
    id: 'interventricular-septum',
    name: 'Interventricular septum',
    kind: 'wall',
    tag: 'Wall between the ventricles',
    summary: 'The muscular wall that separates the right ventricle from the left ventricle.',
    details: ['A second wall, the interatrial septum, separates the two atria; it is not drawn in this model.'],
    connections: [
      { targetId: 'right-ventricle', text: 'Forms one wall of the right ventricle.' },
      { targetId: 'left-ventricle', text: 'Forms one wall of the left ventricle.' },
    ],
    oxygenation: 'none',
    simplifications: ['Drawn as a flat wall; its real curved shape is not represented.'],
    sourceIds: ['ap-19-1'],
    internal: true,
    majorLabel: false,
  },
]

export function findHeartPart(id: string): HeartPart | undefined {
  return HEART_PARTS.find((p) => p.id === id)
}

/** External destinations shown as labelled markers, never as parts of the heart. */
export type ExternalDestination = 'body' | 'lungs'

export interface FlowStep {
  id: string
  title: string
  text: string
  /** Heart structures highlighted at this step. */
  parts: readonly HeartPartId[]
  /** External destination highlighted at this step, if any. */
  external?: ExternalDestination
}

/** The conceptual blood-flow pathway, verified against OpenStax A&P 2e §19.1. */
export const FLOW_STEPS: readonly FlowStep[] = [
  {
    id: 'systemic-veins',
    title: 'From the body: the venae cavae',
    text: 'Oxygen-poor blood returning from the body reaches the heart through the superior and inferior venae cavae.',
    parts: ['superior-vena-cava', 'inferior-vena-cava'],
    external: 'body',
  },
  { id: 'right-atrium', title: 'Right atrium', text: 'The venae cavae empty into the right atrium, a receiving chamber.', parts: ['right-atrium'] },
  { id: 'tricuspid', title: 'Tricuspid valve', text: 'The right atrium pushes blood through the tricuspid valve.', parts: ['tricuspid-valve'] },
  { id: 'right-ventricle', title: 'Right ventricle', text: 'Blood fills the right ventricle, which pumps it toward the lungs.', parts: ['right-ventricle'] },
  { id: 'pulmonary-valve', title: 'Pulmonary valve', text: 'Blood leaves the right ventricle through the pulmonary valve.', parts: ['pulmonary-valve'] },
  {
    id: 'pulmonary-arteries',
    title: 'Pulmonary trunk and arteries',
    text: 'The pulmonary trunk divides into the left and right pulmonary arteries, which carry the blood to the lungs.',
    parts: ['pulmonary-trunk'],
  },
  {
    id: 'lungs',
    title: 'Lungs (outside the heart)',
    text: 'In the lungs’ capillaries the blood takes up oxygen. The lungs are outside the heart and are only marked, not modelled.',
    parts: [],
    external: 'lungs',
  },
  { id: 'pulmonary-veins', title: 'Pulmonary veins', text: 'Oxygen-rich blood returns from the lungs through the pulmonary veins.', parts: ['pulmonary-veins'] },
  { id: 'left-atrium', title: 'Left atrium', text: 'The pulmonary veins empty into the left atrium.', parts: ['left-atrium'] },
  { id: 'mitral', title: 'Mitral valve', text: 'The left atrium pushes blood through the mitral valve.', parts: ['mitral-valve'] },
  { id: 'left-ventricle', title: 'Left ventricle', text: 'Blood fills the left ventricle, the chamber with the thickest wall, which pumps it out to the body.', parts: ['left-ventricle'] },
  { id: 'aortic-valve', title: 'Aortic valve', text: 'Blood leaves the left ventricle through the aortic valve.', parts: ['aortic-valve'] },
  { id: 'aorta', title: 'Aorta', text: 'The aorta carries the oxygen-rich blood into the systemic circuit.', parts: ['aorta'] },
  {
    id: 'body',
    title: 'Body (outside the heart)',
    text: 'Arteries deliver the blood to the body’s tissues, and veins bring it back to the venae cavae, where the pathway starts again.',
    parts: [],
    external: 'body',
  },
]
