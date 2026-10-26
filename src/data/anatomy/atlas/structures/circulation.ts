import { add, L, mirror } from '../figure'
import { pair } from '../helpers'
import type { AtlasStructure, Shape, Vec3 } from '../types'

/*
 * Cardiovascular and lymphatic additions: the pulmonary circuit, the branches of the aortic arch,
 * the veins that carry blood (and lymph) back to the superior vena cava, the hepatic portal vein,
 * and the lymph-transport route back to the blood. Facts follow OpenStax Anatomy and Physiology 2e
 * §19.1, §20.5 and §21.1. Every shape is schematic: it shows which structures connect, not their
 * real calibre, length or course.
 *
 * Where structures meet in the drawing they meet in the body: a unit test checks that each new
 * shape touches only the structures it is related to.
 */

/** Where the pulmonary trunk divides. */
const PULMONARY_SPLIT: Vec3 = [0.2, 7.34, 0.3]
/** End of the brachiocephalic trunk, where it divides into the right subclavian and right common carotid. */
export const BRACHIOCEPHALIC_SPLIT: Vec3 = [-0.1, 7.92, 0.2]
/** Left and right venous angles: where each internal jugular vein meets the subclavian vein. */
export const VENOUS_ANGLE_LEFT: Vec3 = [0.18, 7.85, 0.12]
export const VENOUS_ANGLE_RIGHT: Vec3 = mirror(VENOUS_ANGLE_LEFT)
/** Top of the superior vena cava, where the two brachiocephalic veins join. */
export const SVC_TOP: Vec3 = [-0.2, 7.72, 0.13]

const PULMONARY_LIMIT = 'Drawn as a smooth tube to show where it runs and what it connects. Its branching inside the lung and the capillaries around the alveoli are not drawn.'

export const CARDIOVASCULAR_CONTAINERS: AtlasStructure[] = [
  {
    id: 'pulmonary-circulation',
    name: 'Pulmonary circuit vessels',
    system: 'cardiovascular',
    region: 'thorax',
    description: 'The vessels of the pulmonary circuit, which carries blood between the heart and the lungs.',
    function: 'The pulmonary circuit transports blood to and from the lungs, where it picks up oxygen and gives up carbon dioxide.',
    representation: 'container',
    shapes: [],
    sources: ['ap-19-1', 'ap-20-5'],
  },
  {
    id: 'systemic-arteries',
    name: 'Large systemic arteries',
    system: 'cardiovascular',
    region: 'whole-body',
    description: 'The aorta and a few of its large branches, carrying blood from the left ventricle to the body.',
    function: 'The systemic circuit transports oxygenated blood to virtually all of the tissues of the body.',
    representation: 'container',
    shapes: [],
    sources: ['ap-19-1', 'ap-20-5'],
  },
  {
    id: 'systemic-veins',
    name: 'Large systemic veins',
    system: 'cardiovascular',
    region: 'whole-body',
    description: 'A few of the large veins that return blood from the body to the right atrium, plus the hepatic portal vein.',
    function: 'Return blood from the tissues to the heart.',
    representation: 'container',
    shapes: [],
    sources: ['ap-20-5'],
  },
]

export const CARDIOVASCULAR_ADDITIONS: AtlasStructure[] = [
  {
    id: 'pulmonary-trunk',
    name: 'Pulmonary trunk',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'pulmonary-circulation',
    description: 'The single vessel leaving the right ventricle. It curves posteriorly and soon divides into the left and right pulmonary arteries.',
    location: 'At the top of the heart, leaving the right ventricle and curving posteriorly.',
    function: 'Carries deoxygenated blood pumped by the right ventricle toward the lungs.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.1, 7.02, 0.4], [0.16, 7.22, 0.38], PULMONARY_SPLIT], radius: 0.06 }],
    terms: [
      { term: 'Pulmonary circuit', meaning: 'The route of blood to and from the lungs.' },
      { term: 'Bifurcate', meaning: 'To divide into two branches.' },
    ],
    limitations: PULMONARY_LIMIT,
    sources: ['ap-19-1', 'ap-20-5'],
    related: [
      { id: 'heart', relation: 'Leaves the right ventricle of the' },
      { id: 'pulmonary-artery-left', relation: 'Divides into' },
      { id: 'pulmonary-artery-right', relation: 'Divides into' },
    ],
    aliases: ['pulmonary artery trunk'],
  },
  ...pair({
    id: 'pulmonary-artery',
    name: 'pulmonary artery',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'pulmonary-circulation',
    description: 'One of the two branches of the pulmonary trunk, one to each lung. Inside the lung it branches many times, down to the capillaries around the alveoli.',
    location: 'From the division of the pulmonary trunk to the lung on its own side.',
    function: 'Carries deoxygenated blood to the lung, where gases are exchanged in the pulmonary capillaries around the alveoli.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [PULMONARY_SPLIT, [0.36, 7.36, 0.16], [0.5, 7.32, 0.06]], radius: 0.05 }],
    // The right one runs posteriorly first, then to the right behind the ascending aorta.
    rightShapes: [{ kind: 'tube', points: [PULMONARY_SPLIT, [0.2, 7.36, 0.14], [0.12, 7.3, 0.02], [-0.2, 7.22, 0.0], [-0.38, 7.14, -0.04]], radius: 0.04 }],
    terms: [
      { term: 'Pulmonary capillaries', meaning: 'Capillaries surrounding the alveoli, where gas exchange happens.' },
      { term: 'Deoxygenated blood', meaning: 'Blood that has given up much of its oxygen in the tissues.' },
    ],
    limitations: PULMONARY_LIMIT,
    sources: ['ap-19-1', 'ap-20-5'],
    related: [
      { id: 'pulmonary-trunk', relation: 'Branch of' },
      { id: 'lung-{side}', relation: 'Carries blood into the' },
    ],
  }),
  {
    id: 'pulmonary-veins',
    name: 'Pulmonary veins',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'pulmonary-circulation',
    description: 'Four veins, two from each lung, that return blood to the left atrium.',
    location: 'From each lung to the left atrium of the heart.',
    function: 'Return oxygen-rich blood from the pulmonary circuit to the left atrium.',
    representation: 'group',
    grouping: 'Drawn as four short tubes, two per side; their individual names are not shown.',
    shapes: (
      [
        [[0.5, 7.08, -0.06], [0.22, 6.98, -0.02]],
        [[0.5, 6.86, -0.08], [0.22, 6.9, -0.02]],
        [[-0.3, 7.06, -0.06], [0.12, 6.98, -0.02]],
        [[-0.3, 6.86, -0.08], [0.12, 6.9, -0.02]],
      ] as Vec3[][]
    ).map((points) => ({ kind: 'tube', points, radius: 0.03 }) as Shape),
    terms: [{ term: 'Left atrium', meaning: 'The heart chamber that receives blood from the pulmonary veins.' }],
    limitations: 'Short schematic tubes show the connection between the lungs and the back of the heart; their length and course are simplified.',
    sources: ['ap-19-1', 'ap-20-5'],
    related: [
      { id: 'heart', relation: 'Drain into the left atrium of the' },
      { id: 'lung-left', relation: 'Carry blood from the' },
      { id: 'lung-right', relation: 'Carry blood from the' },
    ],
  },
  {
    id: 'brachiocephalic-trunk',
    name: 'Brachiocephalic artery',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'systemic-arteries',
    aliases: ['brachiocephalic trunk', 'innominate artery'],
    description: 'The first of the three major branches of the aortic arch. It is found only on the right side; there is no corresponding artery on the left.',
    location: 'From the aortic arch up to the root of the neck on the right side.',
    function: 'Branches into the right subclavian artery and the right common carotid artery.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.1, 7.64, 0.14], [0.0, 7.78, 0.2], BRACHIOCEPHALIC_SPLIT], radius: 0.04 }],
    terms: [{ term: 'Aortic arch', meaning: 'The curved part of the aorta between its ascending and descending parts; three large arteries branch from it.' }],
    sources: ['ap-20-5'],
    related: [
      { id: 'aorta', relation: 'Branch of the aortic arch' },
      { id: 'subclavian-artery-right', relation: 'Branches into' },
      { id: 'common-carotid-artery-right', relation: 'Branches into' },
    ],
  },
  ...pair({
    id: 'subclavian-artery',
    name: 'subclavian artery',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'systemic-arteries',
    description:
      'The left subclavian artery arises directly from the aortic arch; the right one from the brachiocephalic artery. As it leaves the thorax for the armpit (axillary region) it is renamed the axillary artery.',
    location: 'From the top of the thorax toward the armpit (axillary region), where it becomes the axillary artery.',
    function: 'Supplies blood to the arm, chest, shoulder, back and central nervous system.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.16, 7.68, -0.06], [0.36, 7.94, -0.04], [0.75, 7.96, -0.02]], radius: 0.04 }],
    // The right one passes behind the internal jugular vein on its way to the arm.
    rightShapes: [{ kind: 'tube', points: [BRACHIOCEPHALIC_SPLIT, [-0.12, 8.0, 0.04], [-0.24, 8.02, -0.04], [-0.36, 7.96, -0.04], [-0.75, 7.96, -0.02]], radius: 0.04 }],
    terms: [{ term: 'Axillary artery', meaning: 'The name of the subclavian artery once it reaches the armpit (not drawn).' }],
    limitations: 'Drawn only to where it becomes the axillary artery; the arteries of the arm and its other branches are not drawn.',
    sources: ['ap-20-5'],
    related: [{ id: 'aorta', relation: 'Arises (left side directly) from the aortic arch of the' }],
  }),
  ...pair({
    id: 'subclavian-vein',
    name: 'subclavian vein',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'systemic-veins',
    description: 'The continuation of the axillary vein once it passes through the body wall into the thorax.',
    location: 'From the body wall at the armpit, where it continues the axillary vein, to the root of the neck, where it meets the jugular veins.',
    function: 'Returns blood from the upper limb. Lymph also enters the blood here: the thoracic duct drains into the left subclavian vein and the right lymphatic duct into the right one.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[0.75, 7.9, 0.14], [0.45, 7.89, 0.15], VENOUS_ANGLE_LEFT], radius: 0.045 }],
    terms: [
      { term: 'Axillary vein', meaning: 'The vein of the armpit; it becomes the subclavian vein (not drawn).' },
      { term: 'Venous angle', meaning: 'The junction of the internal jugular and subclavian veins, where the lymphatic ducts empty.' },
    ],
    sources: ['ap-20-5', 'ap-21-1'],
    related: [
      { id: 'brachiocephalic-vein-{side}', relation: 'Joins the internal jugular vein to form the' },
      { id: 'internal-jugular-vein-{side}', relation: 'Meets the' },
    ],
  }),
  ...pair({
    id: 'brachiocephalic-vein',
    name: 'brachiocephalic vein',
    system: 'cardiovascular',
    region: 'thorax',
    parent: 'systemic-veins',
    description: 'Formed on each side where the subclavian vein fuses with the jugular veins. The two brachiocephalic veins combine to form the superior vena cava.',
    location: 'At the root of the neck and top of the thorax, from the junction of the subclavian and jugular veins to the top of the superior vena cava.',
    function: 'Carries blood from the head, neck and upper limb on its side into the superior vena cava.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [VENOUS_ANGLE_LEFT, [0.14, 7.86, 0.22], [0.08, 7.84, 0.32], [-0.06, 7.8, 0.32], SVC_TOP], radius: 0.045 }],
    rightShapes: [{ kind: 'tube', points: [VENOUS_ANGLE_RIGHT, [-0.2, 7.79, 0.125], SVC_TOP], radius: 0.05 }],
    terms: [{ term: 'Superior vena cava', meaning: 'The large vein formed by the two brachiocephalic veins; it enters the right atrium.' }],
    limitations: 'The external jugular and vertebral veins, which also drain into it, are not drawn.',
    sources: ['ap-20-5'],
    related: [
      { id: 'subclavian-vein-{side}', relation: 'Formed by the' },
      { id: 'internal-jugular-vein-{side}', relation: 'Formed by the' },
      { id: 'superior-vena-cava', relation: 'Joins the other side to form the' },
    ],
  }),
  {
    id: 'hepatic-portal-vein',
    name: 'Hepatic portal vein',
    system: 'cardiovascular',
    alsoIn: ['digestive'],
    region: 'abdomen',
    parent: 'systemic-veins',
    aliases: ['portal vein'],
    description: 'The vein of the hepatic portal system. It begins at about the level of the second lumbar vertebra where the superior mesenteric and splenic veins meet.',
    location: 'In the upper abdomen, from about the level of the second lumbar vertebra up to the liver.',
    function:
      'Delivers blood from the digestive organs and spleen, with absorbed nutrients and certain wastes, directly to the liver for processing before it returns to the general circulation.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[-0.04, 5.46, -0.09], [-0.12, 5.6, -0.04], [-0.2, 5.74, 0.0]], radius: 0.035 }],
    terms: [
      { term: 'Portal system', meaning: 'Blood passing through one set of capillaries and then a second (here, the liver sinusoids) before returning to the heart.' },
      { term: 'Hepatic sinusoids', meaning: 'The specialized capillaries in the liver where the portal blood ends.' },
    ],
    limitations: 'The superior mesenteric and splenic veins that form it are not drawn, and its course is schematic.',
    sources: ['ap-20-5'],
    related: [
      { id: 'liver', relation: 'Carries blood into the' },
      { id: 'pancreas', relation: 'Receives blood (through the splenic vein) from the' },
      { id: 'small-intestine', relation: 'Receives blood (through the superior mesenteric vein) from the' },
      { id: 'spleen', relation: 'Receives blood (through the splenic vein) from the' },
    ],
  },
]

/* ---------- Lymphatic ---------- */

/** Ends at the armpit node cluster drawn in `lymph-nodes`. */
export const AXILLARY_NODES: Vec3[] = [[1.12, 7.5, -0.02], [1.16, 7.36, 0.04]]
const ARM_LYMPH: Vec3[] = [add(L.wrist, [0.06, 0.1, 0.12]), add(L.elbow, [0.06, 0, 0.14]), [1.3, 7.1, 0.08], AXILLARY_NODES[1]]
const LEG_LYMPH: Vec3[] = [add(L.ankle, [0.08, 0.25, 0.1]), add(L.knee, [0.1, 0, 0.14]), [0.6, 3.6, 0.36], [0.5, 4.22, 0.32]]

export const LYMPHATIC_CONTAINERS: AtlasStructure[] = [
  {
    id: 'lymphoid-organs',
    name: 'Lymphoid organs',
    system: 'lymphatic',
    region: 'whole-body',
    description: 'The primary lymphoid organs are the bone marrow and the thymus. Lymphocytes concentrate in the secondary lymphoid organs: the lymph nodes, the spleen and lymphoid nodules such as the tonsils.',
    function: 'Where lymphocytes develop and mature, and where lymph and blood are filtered.',
    representation: 'container',
    shapes: [],
    sources: ['ap-21-1'],
  },
  {
    id: 'lymph-transport',
    name: 'Lymphatic vessels and ducts',
    system: 'lymphatic',
    region: 'whole-body',
    description: 'The one-way route that collects fluid from the tissues and returns it to the blood.',
    function: 'Interstitial fluid enters lymphatic capillaries and becomes lymph. Larger vessels carry it on, and two ducts, the thoracic duct and the right lymphatic duct, empty it into the subclavian veins.',
    representation: 'container',
    shapes: [],
    sources: ['ap-21-1'],
  },
]

export const LYMPHATIC_ADDITIONS: AtlasStructure[] = [
  {
    id: 'lymphatic-vessels',
    name: 'Lymphatic vessels (examples)',
    system: 'lymphatic',
    region: 'whole-body',
    parent: 'lymph-transport',
    description:
      'Lymphatic capillaries in almost every tissue take in interstitial fluid, which becomes lymph. They merge into larger vessels that, like veins, have three layers and closely spaced one-way valves.',
    location: 'Throughout the body. The examples drawn run up each limb to the lymph nodes of the armpit and groin.',
    function: 'Carry lymph toward the heart. Lymph is not pumped by the heart: contraction of skeletal muscles during movement and breathing push it along, and the valves keep it from flowing back.',
    representation: 'group',
    grouping: 'One line per limb stands for a whole network of vessels; each ends at its node cluster. The vessels that carry lymph on from the nodes to the ducts are not drawn.',
    shapes: [ARM_LYMPH, ARM_LYMPH.map(mirror), LEG_LYMPH, LEG_LYMPH.map(mirror)].map((points) => ({ kind: 'tube', points, radius: 0.018 }) as Shape),
    terms: [
      { term: 'Lymph', meaning: 'Interstitial fluid once it has entered a lymphatic capillary.' },
      { term: 'Lymphatic trunks', meaning: 'Larger lymphatic vessels formed where the superficial and deep lymphatic vessels merge.' },
      { term: 'Lacteals', meaning: 'Lymphatic capillaries in the small intestine that take up dietary fats as a milky fluid called chyle.' },
    ],
    limitations: 'Four schematic lines only. Real lymphatic vessels form a dense network, and the capillaries and lacteals are far too small to draw.',
    sources: ['ap-21-1'],
    related: [{ id: 'lymph-nodes', relation: 'Carry lymph through the' }],
  },
  {
    id: 'cisterna-chyli',
    name: 'Cisterna chyli',
    system: 'lymphatic',
    region: 'abdomen',
    parent: 'lymph-transport',
    description: 'A sac-like chamber at the start of the thoracic duct.',
    location: 'Just beneath the diaphragm, at the lower end of the thoracic duct.',
    function: 'Receives lymph from the lower abdomen, pelvis and lower limbs; the thoracic duct begins here.',
    representation: 'individual',
    shapes: [{ kind: 'ellipsoid', center: [-0.06, 5.45, -0.26], radii: [0.045, 0.13, 0.045] }],
    terms: [{ term: 'Thoracic duct', meaning: 'The largest lymphatic vessel; it begins in the cisterna chyli and drains into the left subclavian vein.' }],
    limitations: 'Drawn as a small elongated sac; its size and shape vary.',
    sources: ['ap-21-1'],
    related: [{ id: 'thoracic-duct', relation: 'Leads into the' }],
  },
  {
    id: 'right-lymphatic-duct',
    name: 'Right lymphatic duct',
    system: 'lymphatic',
    region: 'head-neck',
    parent: 'lymph-transport',
    description: 'A short duct at the root of the neck on the right side.',
    location: 'At the junction of the right internal jugular and right subclavian veins.',
    function: 'Receives lymph from only the upper right part of the body (the right side of the head and thorax and the right upper limb) and empties it into the right subclavian vein.',
    representation: 'individual',
    shapes: [{ kind: 'tube', points: [[-0.36, 7.9, 0.06], [-0.28, 7.88, 0.1], [-0.19, 7.87, 0.11]], radius: 0.02 }],
    terms: [{ term: 'Venous angle', meaning: 'Where the internal jugular and subclavian veins meet; lymph returns to the blood here.' }],
    limitations: 'A short schematic tube; the lymphatic trunks that form it are not drawn.',
    sources: ['ap-21-1'],
    related: [
      { id: 'subclavian-vein-right', relation: 'Empties into the' },
      { id: 'thoracic-duct', relation: 'Counterpart for the rest of the body:' },
    ],
  },
]
