import { L, add, mirror } from '../figure'
import { pair } from '../helpers'
import type { AtlasStructure, Shape, Vec3 } from '../types'

/* ---------- Nervous ---------- */

const ARM_NERVE: Vec3[] = [[0.12, 8.0, -0.32], [0.7, 8.0, -0.1], add(L.shoulder, [-0.05, -0.2, 0.05]), add(L.elbow, [-0.08, 0, 0.06]), add(L.wrist, [-0.05, 0, 0.04])]
const LEG_NERVE: Vec3[] = [[0.08, 5.0, -0.36], [0.3, 4.55, -0.3], add(L.hip, [0, -0.2, -0.22]), add(L.knee, [0, 0.15, -0.22]), add(L.ankle, [0, 0.2, -0.05])]

export const NERVOUS: AtlasStructure[] = [
  {
    id: 'cns',
    name: 'Central nervous system',
    system: 'nervous',
    region: 'whole-body',
    description: 'The brain and spinal cord. The brain lies in the cranial cavity of the skull and the spinal cord in the vertebral cavity of the vertebral column.',
    function: 'Integrates sensory information with memory, emotional state and learning, and starts responses.',
    representation: 'container',
    shapes: [],
    sources: ['ap-12-1'],
  },
  {
    id: 'pns',
    name: 'Peripheral nervous system',
    system: 'nervous',
    region: 'whole-body',
    description: 'Everything in the nervous system outside the brain and spinal cord: nerves (bundles of axons) and ganglia (clusters of neuron cell bodies).',
    function: 'Carries sensory information to the CNS and motor commands from it to muscles and glands.',
    representation: 'container',
    shapes: [],
    sources: ['ap-12-1'],
  },
  {
    id: 'brain',
    name: 'Brain',
    system: 'nervous',
    region: 'head-neck',
    parent: 'cns',
    description: 'The part of the central nervous system inside the cranial cavity of the skull.',
    function: 'Processes sensory information, integrates it, and directs responses.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 9.45, -0.02], radii: [0.42, 0.36, 0.5] }],
    limitations: 'One smooth volume; its regions are not separated in this view.',
    sources: ['ap-12-1', 'ap-1-2'],
    related: [
      { id: 'spinal-cord', relation: 'Continuous with' },
      { id: 'skull', relation: 'Protected by' },
    ],
  },
  {
    id: 'spinal-cord',
    name: 'Spinal cord',
    system: 'nervous',
    region: 'back',
    parent: 'cns',
    description: 'The part of the central nervous system inside the vertebral cavity of the vertebral column.',
    function: 'Relays signals between the brain and the peripheral nerves and handles some reflexes.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0, 9.05, -0.1], [0, 8.4, -0.18], [0, 7.6, -0.38], [0, 6.6, -0.44], [0, 5.5, -0.32]], radius: 0.04 }],
    limitations: 'A thin tube along the vertebral column; where it ends is not modelled precisely.',
    sources: ['ap-12-1'],
    related: [{ id: 'vertebral-column', relation: 'Enclosed by' }],
  },
  {
    id: 'peripheral-nerves',
    name: 'Peripheral nerves (limb group)',
    system: 'nervous',
    region: 'whole-body',
    parent: 'pns',
    description: 'Nerves run from the spinal cord to the limbs and trunk, carrying sensory and motor signals.',
    function: 'Connect the central nervous system to the rest of the body.',
    representation: 'group',
    grouping: 'One schematic line per limb stands in for many nerves; individual named nerves are not distinguished.',
    shapes: [ARM_NERVE, ARM_NERVE.map(mirror), LEG_NERVE, LEG_NERVE.map(mirror)].map((points) => ({ kind: 'tube', points, radius: 0.025 }) as Shape),
    sources: ['ap-12-1'],
  },
]

/* ---------- Cardiovascular ---------- */

const AORTA: Vec3[] = [
  [0.12, 6.95, 0.25],
  [0.08, 7.45, 0.18],
  [0.12, 7.72, 0.02],
  [0.22, 7.6, -0.22],
  [0.14, 6.6, -0.3],
  [0.06, 5.6, -0.22],
  [0.02, 4.75, -0.12],
]
const BIFURCATION = AORTA[AORTA.length - 1]

export const CARDIOVASCULAR: AtlasStructure[] = [
  {
    id: 'heart',
    name: 'Heart',
    system: 'cardiovascular',
    region: 'thorax',
    module: 'heart',
    description: 'A muscular pump in the thoracic cavity, between the lungs in the space called the mediastinum, inside the pericardial sac.',
    function: 'Pumps blood through the pulmonary and systemic circuits.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.2, 6.75, 0.22], radii: [0.36, 0.44, 0.32], rotation: [0.2, 0, -0.5] }],
    limitations: 'A single rounded shape here. Open the detailed heart explorer for its chambers, valves and vessels.',
    sources: ['ap-19-1', 'ap-1-2'],
    related: [
      { id: 'aorta', relation: 'Pumps blood into' },
      { id: 'superior-vena-cava', relation: 'Receives blood from' },
      { id: 'inferior-vena-cava', relation: 'Receives blood from' },
    ],
  },
  {
    id: 'aorta',
    name: 'Aorta',
    system: 'cardiovascular',
    region: 'thorax',
    description: 'The largest artery. It rises from the left ventricle (ascending aorta), arches to the left (aortic arch) and descends through the thorax and abdomen.',
    function: 'Carries blood from the heart to the systemic circuit. It divides at about the level of the fourth lumbar vertebra into the two common iliac arteries.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: AORTA, radius: 0.07 }],
    sources: ['ap-20-5'],
    related: [
      { id: 'common-carotid-artery-left', relation: 'Branch of the aortic arch' },
      { id: 'common-iliac-artery-left', relation: 'Divides into' },
      { id: 'heart', relation: 'Leaves the' },
    ],
  },
  ...pair({
    id: 'common-carotid-artery',
    name: 'common carotid artery',
    system: 'cardiovascular',
    region: 'head-neck',
    description: 'The left common carotid artery branches directly from the aortic arch; the right one branches from the brachiocephalic artery, which exists only on the right.',
    function: 'Each divides into the external and internal carotid arteries, which supply the head and neck.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.1, 7.72, 0.04], [0.14, 8.2, 0.08], [0.18, 8.75, 0.1]], radius: 0.035 }],
    rightShapes: [{ kind: 'tube', points: [[0.02, 7.7, 0.06], [-0.1, 7.9, 0.08], [-0.14, 8.2, 0.08], [-0.18, 8.75, 0.1]], radius: 0.035 }],
    sources: ['ap-20-5'],
    related: [{ id: 'aorta', relation: 'Arises from the aortic arch (directly on the left)' }],
  }),
  ...pair({
    id: 'common-iliac-artery',
    name: 'common iliac artery',
    system: 'cardiovascular',
    region: 'pelvis',
    description: 'One of the two arteries formed where the abdominal aorta divides.',
    function: 'Leads to the internal and external iliac arteries; the external iliac becomes the femoral artery as it passes through the body wall.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [BIFURCATION, [0.25, 4.45, -0.05], [0.42, 4.25, 0.05]], radius: 0.045 }],
    sources: ['ap-20-5'],
    related: [{ id: 'aorta', relation: 'Branch of' }],
  }),
  ...pair({
    id: 'femoral-artery',
    name: 'femoral artery',
    system: 'cardiovascular',
    region: 'lower-limb',
    description: 'The continuation of the external iliac artery in the thigh, after it passes through the body wall.',
    function: 'Supplies blood to the thigh and, through its continuation behind the knee, the leg.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.42, 4.25, 0.05], [0.5, 4.05, 0.22], add(L.hip, [-0.02, -0.8, 0.18]), add(L.knee, [-0.05, 0.25, -0.05])], radius: 0.035 }],
    sources: ['ap-20-5'],
  }),
  {
    id: 'superior-vena-cava',
    name: 'Superior vena cava',
    system: 'cardiovascular',
    region: 'thorax',
    description: 'A large systemic vein to the right of the aorta that enters the right atrium from above.',
    function: 'Returns blood from areas above the diaphragm: the head, neck, chest, shoulders and upper limbs.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[-0.2, 7.8, 0.12], [-0.16, 7.35, 0.16], [-0.08, 6.98, 0.2]], radius: 0.06 }],
    sources: ['ap-20-5'],
    related: [{ id: 'heart', relation: 'Drains into' }],
  },
  {
    id: 'inferior-vena-cava',
    name: 'Inferior vena cava',
    system: 'cardiovascular',
    region: 'abdomen',
    description: 'A large systemic vein that runs up the posterior abdominal wall to the right of the aorta and enters the right atrium from below.',
    function: 'Returns blood from below the diaphragm: the abdomen, pelvis and lower limbs.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[-0.14, 4.75, -0.12], [-0.14, 5.6, -0.16], [-0.12, 6.3, -0.05], [-0.04, 6.6, 0.12]], radius: 0.065 }],
    sources: ['ap-20-5'],
    related: [{ id: 'heart', relation: 'Drains into' }],
  },
  ...pair({
    id: 'internal-jugular-vein',
    name: 'internal jugular vein',
    system: 'cardiovascular',
    region: 'head-neck',
    description: 'A large vein in the neck, beside the common carotid artery.',
    function: 'Drains blood from the brain. It joins the subclavian vein to form the brachiocephalic vein, which leads to the superior vena cava.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.24, 8.85, 0.04], [0.24, 8.3, 0.08], [0.18, 7.85, 0.12]], radius: 0.04 }],
    limitations: 'The brachiocephalic and subclavian veins that connect it to the superior vena cava are not drawn.',
    sources: ['ap-20-5'],
  }),
]

/* ---------- Respiratory ---------- */

export const RESPIRATORY: AtlasStructure[] = [
  {
    id: 'trachea',
    name: 'Trachea',
    system: 'respiratory',
    region: 'thorax',
    aliases: ['windpipe'],
    description: 'The airway below the larynx. At the carina it branches into the right and left primary bronchi.',
    function: 'Part of the conducting zone: a route for air that also helps clear debris and warm and humidify incoming air.',
    representation: 'individual',
    shapes: [
      { kind: 'tube', points: [[0, 8.55, 0.14], [0, 8.0, 0.1], [0, 7.55, 0.05]], radius: 0.06 },
      { kind: 'tube', points: [[0, 7.55, 0.05], [0.2, 7.38, 0.02], [0.38, 7.22, 0]], radius: 0.04 },
      { kind: 'tube', points: [[0, 7.55, 0.05], [-0.2, 7.4, 0.02], [-0.36, 7.28, 0]], radius: 0.045 },
    ],
    limitations: 'The two primary bronchi are drawn with the trachea and cut short; the bronchial tree is not drawn.',
    sources: ['ap-22-1'],
    related: [
      { id: 'lung-left', relation: 'Leads air to' },
      { id: 'lung-right', relation: 'Leads air to' },
    ],
  },
  ...pair({
    id: 'lung',
    name: 'lung',
    system: 'respiratory',
    region: 'thorax',
    description: 'One of the two lungs in the thoracic cavity, either side of the heart. The right lung is shorter and wider than the left; the airways end in alveoli, small sacs where gas exchange happens.',
    function: 'Gas exchange: oxygen passes from the air in the alveoli into the blood, and carbon dioxide passes out.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.66, 7.0, -0.02], radii: [0.46, 0.85, 0.48] }],
    rightShapes: [{ kind: 'ellipsoid', center: [-0.62, 7.05, -0.02], radii: [0.52, 0.83, 0.5] }],
    limitations: 'A smooth volume without lobes, airways or alveoli; the notch for the heart in the left lung is not drawn.',
    sources: ['ap-22-1', 'ap-22-2'],
    related: [
      { id: 'trachea', relation: 'Receives air through' },
      { id: 'diaphragm', relation: 'Rests on' },
    ],
  }),
  {
    id: 'diaphragm',
    name: 'Diaphragm',
    system: 'respiratory',
    alsoIn: ['muscular'],
    region: 'thorax',
    description: 'A dome-shaped skeletal muscle separating the thoracic and abdominal cavities. Openings in it let the inferior vena cava, the esophagus, the aorta and other structures pass through.',
    function: 'Its alternate contraction and relaxation changes the volume of the thoracic cavity during breathing.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 6.15, -0.02], radii: [1.0, 0.2, 0.6] }],
    limitations: 'A flattened dome; its two domes, central tendon and openings are not drawn.',
    sources: ['ap-11-4'],
    related: [
      { id: 'lung-left', relation: 'Below' },
      { id: 'liver', relation: 'Above' },
    ],
  },
]

/* ---------- Digestive ---------- */

/** A schematic coil for the small intestine (far shorter than the real organ). */
const SMALL_INTESTINE: Vec3[] = (() => {
  const pts: Vec3[] = [[0.3, 5.35, 0.1]]
  for (let row = 0; row < 5; row++) {
    const y = 5.2 - row * 0.15
    const dir = row % 2 === 0 ? -1 : 1
    pts.push([0.35 * dir * -1, y, 0.28], [0.35 * dir, y - 0.07, 0.3])
  }
  pts.push([-0.45, 4.55, 0.22])
  return pts
})()

const LARGE_INTESTINE: Vec3[] = [
  [-0.55, 4.55, 0.2],
  [-0.62, 4.85, 0.18],
  [-0.62, 5.35, 0.15],
  [-0.3, 5.45, 0.3],
  [0.3, 5.45, 0.3],
  [0.66, 5.4, 0.12],
  [0.66, 4.8, 0.1],
  [0.45, 4.45, 0.15],
  [0.12, 4.38, 0.05],
  [0.02, 4.1, -0.18],
]

export const DIGESTIVE: AtlasStructure[] = [
  {
    id: 'esophagus',
    name: 'Esophagus',
    system: 'digestive',
    region: 'thorax',
    description: 'A muscular tube that connects the pharynx to the stomach, passing through an opening in the diaphragm.',
    function: 'Carries swallowed food to the stomach.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0, 8.5, -0.06], [0, 7.6, -0.16], [0.04, 6.6, -0.18], [0.22, 6.0, 0.02], [0.32, 5.85, 0.16]], radius: 0.045 }],
    sources: ['ap-23-3', 'ap-11-4'],
    related: [
      { id: 'stomach', relation: 'Leads to' },
      { id: 'diaphragm', relation: 'Passes through' },
    ],
  },
  {
    id: 'stomach',
    name: 'Stomach',
    system: 'digestive',
    region: 'abdomen',
    description: 'An expansion of the alimentary canal just below the esophagus, linking it to the first part of the small intestine (the duodenum). Empty it is about the size of a fist, but it can stretch a great deal.',
    function: 'Mixes food with digestive juices into chyme, which it releases into the small intestine.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.45, 5.72, 0.22], radii: [0.4, 0.3, 0.26], rotation: [0, 0, 0.5] }],
    sources: ['ap-23-4'],
    related: [
      { id: 'esophagus', relation: 'Receives food from' },
      { id: 'small-intestine', relation: 'Passes food to' },
    ],
  },
  {
    id: 'small-intestine',
    name: 'Small intestine',
    system: 'digestive',
    region: 'abdomen',
    description: 'The long, coiled part of the alimentary canal after the stomach. It is called “small” for its narrower diameter, not its length: it is about five times longer than the large intestine.',
    function: 'Where most digestion happens and most released nutrients (and most water) are absorbed into the blood or lymph.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: SMALL_INTESTINE, radius: 0.07 }],
    limitations: 'A short schematic coil; the real small intestine is far longer and its three parts are not distinguished.',
    sources: ['ap-23-1', 'ap-23-5'],
    related: [
      { id: 'stomach', relation: 'Receives food from' },
      { id: 'large-intestine', relation: 'Leads to' },
      { id: 'pancreas', relation: 'Receives secretions from' },
    ],
  },
  {
    id: 'large-intestine',
    name: 'Large intestine',
    system: 'digestive',
    region: 'abdomen',
    description: 'The final part of the alimentary canal. It frames the small intestine, starting at the cecum and ending at the anus.',
    function: 'Finishes absorbing nutrients and water, synthesizes certain vitamins, and forms and eliminates feces.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: LARGE_INTESTINE, radius: 0.09 }],
    limitations: 'Drawn as one tube; the cecum, colon segments, rectum and appendix are not separated.',
    sources: ['ap-23-5'],
  },
  {
    id: 'liver',
    name: 'Liver',
    system: 'digestive',
    region: 'abdomen',
    description: 'A large accessory digestive organ in the upper right abdomen, below the diaphragm. Blood from the digestive tract passes through it before returning to the heart.',
    function: 'Its digestive role is to produce bile and export it to the duodenum; it also processes nutrients carried from the digestive tract.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [-0.38, 5.85, 0.1], radii: [0.75, 0.36, 0.5], rotation: [0, 0, -0.15] }],
    limitations: 'One smooth wedge; its lobes are not drawn.',
    sources: ['ap-23-6', 'ap-23-1'],
    related: [{ id: 'gallbladder', relation: 'Bile is stored in' }],
  },
  {
    id: 'gallbladder',
    name: 'Gallbladder',
    system: 'digestive',
    region: 'abdomen',
    description: 'A small accessory digestive organ under the liver.',
    function: 'Stores, concentrates and releases bile.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [-0.34, 5.55, 0.44], radii: [0.09, 0.15, 0.09] }],
    sources: ['ap-23-6'],
    related: [{ id: 'liver', relation: 'Stores bile from' }],
  },
  {
    id: 'pancreas',
    name: 'Pancreas',
    system: 'digestive',
    alsoIn: ['endocrine'],
    region: 'abdomen',
    description: 'An organ behind the stomach with both digestive and endocrine cells.',
    function: 'Most of its cells secrete pancreatic juice into the small intestine; other cells secrete the hormones insulin and glucagon, which regulate blood glucose.',
    representation: 'individual',
    shapes: [{ kind: 'capsule', from: [-0.2, 5.42, 0.02], to: [0.72, 5.58, -0.08], radius: 0.09 }],
    sources: ['ap-17-1', 'ap-23-6'],
  },
]

/* ---------- Urinary ---------- */

export const URINARY: AtlasStructure[] = [
  ...pair({
    id: 'kidney',
    name: 'kidney',
    system: 'urinary',
    region: 'abdomen',
    description: 'A bean-shaped organ behind the peritoneum (retroperitoneal), protected by muscle, fat and the lowest ribs. The left kidney sits at about the T12–L3 vertebrae; the right is a little lower, displaced by the liver.',
    function: 'Filters blood, regulates electrolyte balance and produces urine.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.42, 5.32, -0.3], radii: [0.15, 0.3, 0.12], rotation: [0, 0, 0.15] }],
    rightShapes: [{ kind: 'ellipsoid', center: [-0.42, 5.17, -0.3], radii: [0.15, 0.3, 0.12], rotation: [0, 0, -0.15] }],
    limitations: 'A smooth bean shape; the cortex, medulla and renal pelvis are not drawn.',
    sources: ['ap-25-3'],
    related: [
      { id: 'ureter-{side}', relation: 'Drains urine into' },
      { id: 'adrenal-gland-{side}', relation: 'Has on its superior aspect' },
    ],
  }),
  ...pair({
    id: 'ureter',
    name: 'ureter',
    system: 'urinary',
    region: 'abdomen',
    description: 'A tube of about 30 cm from the kidney to the urinary bladder, entering the bladder at an oblique angle.',
    function: 'Moves urine to the bladder by waves of peristalsis; the oblique entry acts as a one-way valve.',
    related: [
      { id: 'kidney-{side}', relation: 'Carries urine from' },
      { id: 'urinary-bladder', relation: 'Carries urine to' },
    ],
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.3, 5.22, -0.24], [0.3, 4.8, -0.2], [0.22, 4.4, -0.02], [0.13, 4.22, 0.15]], radius: 0.025 }],
    rightShapes: [{ kind: 'tube', points: [[-0.3, 5.07, -0.24], [-0.3, 4.75, -0.2], [-0.22, 4.4, -0.02], [-0.13, 4.22, 0.15]], radius: 0.025 }],
    sources: ['ap-25-2'],
  }),
  {
    id: 'urinary-bladder',
    name: 'Urinary bladder',
    system: 'urinary',
    region: 'pelvis',
    description: 'A highly distensible organ whose wall contains crisscrossing bands of smooth muscle (the detrusor muscle).',
    function: 'Stores urine; an adult bladder can hold about 500–600 mL.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 4.15, 0.25], radii: [0.22, 0.18, 0.18] }],
    sources: ['ap-25-2'],
  },
  {
    id: 'urethra',
    name: 'Urethra',
    system: 'urinary',
    region: 'pelvis',
    description: 'The tube that carries urine from the bladder out of the body. It is the urinary organ that differs most between sexes: about 4 cm long in females and about 20 cm in males, where it also passes through the prostate and penis.',
    function: 'Carries urine out of the body.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0, 3.98, 0.3], [0, 3.86, 0.33]], radius: 0.022 }],
    limitations: 'Drawn as a short stub regardless of the reproductive variant; its length and course differ between people.',
    sources: ['ap-25-2'],
  },
]

/* ---------- Endocrine ---------- */

export const ENDOCRINE: AtlasStructure[] = [
  {
    id: 'pituitary-gland',
    name: 'Pituitary gland',
    system: 'endocrine',
    region: 'head-neck',
    description: 'A small gland in the brain region, anterior to the hypothalamus, with two lobes: the posterior lobe is neural tissue and the anterior lobe is glandular tissue.',
    function: 'Secretes hormones that regulate body processes.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 9.22, 0.12], radii: [0.05, 0.04, 0.05] }],
    sources: ['ap-17-1', 'ap-17-3'],
  },
  {
    id: 'pineal-gland',
    name: 'Pineal gland',
    system: 'endocrine',
    region: 'head-neck',
    description: 'A small gland in the brain region, posterior to the hypothalamus.',
    function: 'One of the endocrine glands; this atlas does not describe its hormones.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 9.38, -0.14], radii: [0.04, 0.035, 0.04] }],
    sources: ['ap-17-1'],
  },
  {
    id: 'thyroid-gland',
    name: 'Thyroid gland',
    system: 'endocrine',
    region: 'head-neck',
    description: 'A butterfly-shaped gland wrapped around the trachea in the neck. The parathyroid glands are embedded in its back surface (not drawn).',
    function: 'Secretes thyroid hormones, which influence the basal metabolic rate (the energy the body uses at rest).',
    representation: 'individual',
    shapes: [
      { kind: 'ellipsoid', center: [0.1, 8.32, 0.2], radii: [0.08, 0.13, 0.06] },
      { kind: 'ellipsoid', center: [-0.1, 8.32, 0.2], radii: [0.08, 0.13, 0.06] },
    ],
    sources: ['ap-17-1', 'ap-17-4'],
    related: [{ id: 'trachea', relation: 'Wraps around' }],
  },
  ...pair({
    id: 'adrenal-gland',
    name: 'adrenal gland',
    system: 'endocrine',
    region: 'abdomen',
    description: 'A gland on the superior aspect of each kidney.',
    function: 'Secretes hormones including epinephrine and norepinephrine (fight-or-flight) and aldosterone, which acts on the kidney.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.38, 5.66, -0.28], radii: [0.1, 0.07, 0.06] }],
    rightShapes: [{ kind: 'ellipsoid', center: [-0.38, 5.51, -0.28], radii: [0.1, 0.07, 0.06] }],
    sources: ['ap-17-1', 'ap-17-6', 'ap-25-3'],
    related: [{ id: 'kidney-{side}', relation: 'Sits on' }],
  }),
]

/* ---------- Lymphatic and immune ---------- */

const nodes = (centers: Vec3[], r = 0.05): Shape[] => centers.map((c) => ({ kind: 'ellipsoid', center: c, radii: [r, r, r] }) as Shape)

export const LYMPHATIC: AtlasStructure[] = [
  {
    id: 'thymus',
    name: 'Thymus',
    system: 'lymphatic',
    region: 'thorax',
    description: 'A two-lobed organ in the space between the sternum and the aorta.',
    function: 'Where immature T cells mature.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0, 7.5, 0.45], radii: [0.18, 0.24, 0.07] }],
    limitations: 'Drawn at a typical size; the thymus changes size with age.',
    sources: ['ap-21-1'],
  },
  {
    id: 'spleen',
    name: 'Spleen',
    system: 'lymphatic',
    region: 'abdomen',
    description: 'A major secondary lymphoid organ in the upper left abdomen, about 12 cm long, fragile and dark red from its many blood vessels.',
    function: 'Filters the blood and supports immune responses to blood-borne pathogens.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [0.86, 5.85, -0.22], radii: [0.14, 0.28, 0.11], rotation: [0, 0, 0.3] }],
    sources: ['ap-21-1'],
  },
  {
    id: 'tonsils',
    name: 'Tonsils',
    system: 'lymphatic',
    region: 'head-neck',
    description: 'Lymphoid nodules along the inner surface of the pharynx.',
    function: 'Help develop immunity to pathogens entering through the mouth.',
    representation: 'group',
    grouping: 'Shown as two small markers in the throat; the individual tonsils are not distinguished.',
    shapes: nodes([[0.1, 8.82, 0.2], [-0.1, 8.82, 0.2]], 0.045),
    sources: ['ap-21-1'],
  },
  {
    id: 'lymph-nodes',
    name: 'Lymph node clusters',
    system: 'lymphatic',
    region: 'whole-body',
    description: 'Bean-shaped organs along lymphatic vessels, about 500–600 in the body, clustered near the neck, armpits, groin, chest and abdomen.',
    function: 'Remove debris and pathogens from lymph.',
    representation: 'group',
    grouping: 'A few markers in the neck, armpits and groin stand for the clusters there; nodes in the chest and abdomen are not drawn.',
    shapes: nodes([
      [0.26, 8.5, 0.05], [0.3, 8.3, 0.0], [-0.26, 8.5, 0.05], [-0.3, 8.3, 0.0],
      [0.98, 7.55, -0.02], [1.02, 7.4, 0.04], [-0.98, 7.55, -0.02], [-1.02, 7.4, 0.04],
      [0.42, 4.32, 0.36], [0.5, 4.22, 0.32], [-0.42, 4.32, 0.36], [-0.5, 4.22, 0.32],
    ]),
    sources: ['ap-21-1'],
  },
  {
    id: 'thoracic-duct',
    name: 'Thoracic duct',
    system: 'lymphatic',
    region: 'thorax',
    description: 'The largest lymphatic vessel. It begins just below the diaphragm and rises through the thorax.',
    function: 'Drains lymph from most of the body into the left subclavian vein; only the upper right part of the body drains through the right lymphatic duct.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.02, 5.75, -0.3], [0.04, 6.6, -0.36], [0.08, 7.6, -0.26], [0.2, 8.05, -0.05], [0.32, 7.95, 0.06]], radius: 0.022 }],
    sources: ['ap-21-1'],
  },
]

export const ORGAN_STRUCTURES: AtlasStructure[] = [...NERVOUS, ...CARDIOVASCULAR, ...RESPIRATORY, ...DIGESTIVE, ...URINARY, ...ENDOCRINE, ...LYMPHATIC]
