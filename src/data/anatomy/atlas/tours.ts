import { findStructure } from '.'
import type { Shape, SystemId, Vec3 } from './types'

/*
 * Guided tours through the atlas. Each step highlights real structures, explains what the step
 * represents, and may move a marker along a path. Movement is conceptual: it shows order and
 * direction, not timing, speed or volume.
 */

export type StepKind = 'route' | 'contribution' | 'process'

export interface TourStep {
  id: string
  title: string
  text: string
  /** route: the substance's own path; contribution: something added from elsewhere; process: no movement shown. */
  kind: StepKind
  /** Structures highlighted in this step. */
  focus: readonly string[]
  /** Points for the conceptual marker (body units); omitted when nothing moves. */
  path?: readonly Vec3[]
  /** Nervous-system tour: which division the step happens in. */
  division?: 'CNS' | 'PNS' | 'CNS and PNS'
  /** A schematic close-up or module that shows this step in more detail. */
  detail?: 'alveolus' | 'nephron' | 'heart'
  sources: readonly string[]
}

export interface AtlasTour {
  id: 'airflow' | 'food' | 'urine' | 'signal' | 'circulation' | 'pulmonary' | 'lymph'
  title: string
  system: SystemId
  /** Systems drawn during the tour. */
  systems: readonly SystemId[]
  summary: string
  conceptualNote: string
  steps: readonly TourStep[]
}

/** The centre-line of a structure: a tube's points, or the centres of its shapes. */
export function pathOf(id: string): Vec3[] {
  const s = findStructure(id)
  if (!s) return []
  return s.shapes.flatMap((sh: Shape): Vec3[] => (sh.kind === 'tube' ? [...sh.points] : sh.kind === 'capsule' ? [sh.from, sh.to] : [sh.center]))
}

const reversed = (p: readonly Vec3[]) => [...p].reverse()
const join = (...parts: (readonly Vec3[])[]) => parts.flat()

const AIR = 'Conceptual route of air: the marker shows order and direction only, not speed, volume or breathing rate.'

export const TOURS: readonly AtlasTour[] = [
  {
    id: 'airflow',
    title: 'Follow a breath of air',
    system: 'respiratory',
    systems: ['respiratory'],
    summary: 'From the nasal cavity to the alveoli, and the muscles that drive breathing.',
    conceptualNote: AIR,
    steps: [
      {
        id: 'nose',
        title: 'Nasal cavity',
        text: 'Air usually enters through the nares into the nasal cavity, which is divided by the nasal septum. The conducting zone that starts here moves air, removes debris and pathogens, and warms and humidifies it.',
        kind: 'route',
        focus: ['nasal-cavity'],
        path: [[0, 9.12, 0.52], [0, 9.12, 0.3], [0, 9.1, 0.2]],
        sources: ['ap-22-1'],
      },
      {
        id: 'pharynx',
        title: 'Pharynx',
        text: 'The pharynx is a shared passage for air and food, in three regions: nasopharynx, oropharynx and laryngopharynx.',
        kind: 'route',
        focus: ['pharynx'],
        path: pathOf('pharynx'),
        sources: ['ap-22-1'],
      },
      {
        id: 'larynx',
        title: 'Larynx',
        text: 'The larynx, built of cartilage, connects the pharynx to the trachea and helps regulate the volume of air entering and leaving the lungs.',
        kind: 'route',
        focus: ['larynx'],
        path: [[0, 8.64, 0.12], [0, 8.46, 0.15]],
        sources: ['ap-22-1'],
      },
      {
        id: 'trachea',
        title: 'Trachea',
        text: 'The trachea carries air down into the thorax, where it branches at the carina.',
        kind: 'route',
        focus: ['trachea'],
        path: pathOf('trachea'),
        sources: ['ap-22-1'],
      },
      {
        id: 'bronchi',
        title: 'Primary bronchi',
        text: 'The right and left primary bronchi carry air into each lung. Inside, they branch into bronchioles, which lead to the structures of gas exchange (not drawn).',
        kind: 'route',
        focus: ['primary-bronchus-left', 'primary-bronchus-right'],
        path: pathOf('primary-bronchus-left'),
        sources: ['ap-22-1'],
      },
      {
        id: 'alveoli',
        title: 'Alveoli: gas exchange',
        text: 'The airways end in alveoli, small grape-like sacs. Where alveolar and capillary walls meet (the respiratory membrane), oxygen passes into the blood and carbon dioxide passes out, by simple diffusion. The atlas cannot show alveoli at this scale: open the gas-exchange view.',
        kind: 'process',
        focus: ['lung-left', 'lung-right'],
        detail: 'alveolus',
        sources: ['ap-22-1', 'ap-22-4'],
      },
      {
        id: 'muscles',
        title: 'What moves the air',
        text: 'Air moves because of pressure differences between the atmosphere and the lungs. In normal breathing in, the diaphragm and the external intercostal muscles contract and change the volume of the thorax; when they relax, air leaves.',
        kind: 'process',
        focus: ['diaphragm'],
        sources: ['ap-22-3', 'ap-11-4'],
      },
      {
        id: 'out',
        title: 'Breathing out',
        text: 'Air leaving the lungs follows the same airways in reverse, carrying out carbon dioxide.',
        kind: 'route',
        focus: ['trachea', 'larynx', 'pharynx', 'nasal-cavity'],
        path: join(reversed(pathOf('primary-bronchus-left')), reversed(pathOf('trachea')), [[0, 8.64, 0.12]], reversed(pathOf('pharynx')), [[0, 9.12, 0.5]]),
        sources: ['ap-22-1', 'ap-22-3'],
      },
    ],
  },
  {
    id: 'food',
    title: 'Follow food through the digestive tract',
    system: 'digestive',
    systems: ['digestive'],
    summary: 'The route food takes, with the liver, gallbladder and pancreas shown as separate contributions.',
    conceptualNote:
      'Conceptual route: the marker shows order, not timing. Steps marked “Contribution” are secretions added to the tract by accessory organs; food never passes through those organs.',
    steps: [
      {
        id: 'mouth',
        title: 'Mouth',
        text: 'Teeth and tongue begin mechanical digestion and saliva begins chemical digestion.',
        kind: 'route',
        focus: ['oral-cavity'],
        path: [[0, 8.83, 0.5], [0, 8.83, 0.3], [0, 8.85, 0.16]],
        sources: ['ap-23-1', 'ap-23-3'],
      },
      {
        id: 'pharynx',
        title: 'Pharynx',
        text: 'Swallowed food passes through the pharynx, the passage shared with air, into the esophagus.',
        kind: 'route',
        focus: ['pharynx'],
        path: [[0, 8.86, 0.14], [0, 8.66, 0.06], [0, 8.5, -0.06]],
        sources: ['ap-22-1', 'ap-23-1'],
      },
      {
        id: 'esophagus',
        title: 'Esophagus',
        text: 'A muscular tube carries food from the pharynx through an opening in the diaphragm to the stomach.',
        kind: 'route',
        focus: ['esophagus'],
        path: pathOf('esophagus'),
        sources: ['ap-23-3'],
      },
      {
        id: 'stomach',
        title: 'Stomach',
        text: 'Food is mixed with digestive juices in the stomach and converted into chyme, which is released into the small intestine.',
        kind: 'route',
        focus: ['stomach'],
        path: [[0.32, 5.85, 0.16], [0.5, 5.75, 0.22], [0.3, 5.62, 0.28], [0.14, 5.62, 0.27]],
        sources: ['ap-23-4'],
      },
      {
        id: 'duodenum',
        title: 'Duodenum',
        text: 'Chyme enters the duodenum, the first and shortest region of the small intestine.',
        kind: 'route',
        focus: ['duodenum'],
        path: pathOf('duodenum'),
        sources: ['ap-23-5'],
      },
      {
        id: 'bile',
        title: 'Contribution: bile from the liver and gallbladder',
        text: 'The liver produces bile; the gallbladder stores and concentrates it. Bile flows through the bile ducts into the duodenum. This is a secretion joining the food, not part of the food’s route.',
        kind: 'contribution',
        focus: ['liver', 'gallbladder', 'bile-ducts'],
        path: pathOf('bile-ducts').slice(0, 3),
        sources: ['ap-23-6'],
      },
      {
        id: 'pancreas',
        title: 'Contribution: pancreatic juice',
        text: 'The pancreas delivers pancreatic juice, containing digestive enzymes and bicarbonate, to the duodenum through the pancreatic duct. Again a secretion, not part of the food’s route.',
        kind: 'contribution',
        focus: ['pancreas'],
        path: [[0.6, 5.56, -0.06], [0.2, 5.5, -0.02], [-0.2, 5.42, 0.04], [-0.3, 5.42, 0.07]],
        sources: ['ap-23-6'],
      },
      {
        id: 'jejunum-ileum',
        title: 'Jejunum and ileum',
        text: 'Digestion continues and most released nutrients and most water are absorbed in the small intestine. The ileum joins the cecum of the large intestine.',
        kind: 'route',
        focus: ['jejunum-ileum'],
        path: pathOf('jejunum-ileum'),
        sources: ['ap-23-5'],
      },
      {
        id: 'large-intestine',
        title: 'Large intestine',
        text: 'The large intestine finishes absorbing nutrients and water, synthesizes certain vitamins, forms feces and eliminates them through the rectum and anus.',
        kind: 'route',
        focus: ['large-intestine'],
        path: pathOf('large-intestine'),
        sources: ['ap-23-5'],
      },
    ],
  },
  {
    id: 'urine',
    title: 'Follow urine from kidney to exit',
    system: 'urinary',
    systems: ['urinary'],
    summary: 'Filtration in the kidneys, then the route urine takes out of the body.',
    conceptualNote: 'Conceptual route: the marker shows order and direction only. The kidneys’ microscopic work is shown in the nephron view.',
    steps: [
      {
        id: 'kidneys',
        title: 'Kidneys: filtering the blood',
        text: 'Nephrons in each kidney take a simple filtrate of the blood and modify it into urine, by filtration, reabsorption and secretion. Open the nephron view for the broad sequence.',
        kind: 'process',
        focus: ['kidney-left', 'kidney-right'],
        detail: 'nephron',
        sources: ['ap-25-4', 'ap-25-5'],
      },
      {
        id: 'ureters',
        title: 'Ureters',
        text: 'Urine leaves each kidney through its ureter, moved by waves of peristalsis. The ureter enters the bladder at an angle that acts as a one-way valve.',
        kind: 'route',
        focus: ['ureter-left', 'ureter-right'],
        path: pathOf('ureter-left'),
        sources: ['ap-25-2'],
      },
      {
        id: 'bladder',
        title: 'Urinary bladder',
        text: 'The distensible bladder stores urine; an adult bladder can hold about 500–600 mL.',
        kind: 'route',
        focus: ['urinary-bladder'],
        path: [[0.13, 4.22, 0.15], [0, 4.15, 0.25], [0, 4.0, 0.29]],
        sources: ['ap-25-2'],
      },
      {
        id: 'urethra',
        title: 'Urethra',
        text: 'The urethra carries urine out of the body. It is about 4 cm long in females and about 20 cm in males; the atlas draws it as a short stub either way.',
        kind: 'route',
        focus: ['urethra'],
        path: [[0, 3.98, 0.3], [0, 3.8, 0.34]],
        sources: ['ap-25-2'],
      },
    ],
  },
  {
    id: 'signal',
    title: 'From a touch to a movement',
    system: 'nervous',
    systems: ['nervous'],
    summary: 'A conceptual sequence through the peripheral and central nervous systems: sensation, integration and response.',
    conceptualNote:
      'Conceptual sequence, not a real neural pathway or its timing: one marker stands for signals carried by many neurons, and the nerves are schematic lines.',
    steps: [
      {
        id: 'sense',
        title: 'Sensation in the hand',
        text: 'Sensory receptors register a stimulus, such as touch on the hand. Detecting it is the nervous system’s sensory function.',
        kind: 'process',
        focus: ['peripheral-nerves'],
        division: 'PNS',
        sources: ['ap-12-1'],
      },
      {
        id: 'in',
        title: 'Into the spinal cord',
        text: 'The signal travels along peripheral nerves of the arm and enters the spinal cord through spinal nerves.',
        kind: 'route',
        focus: ['peripheral-nerves', 'spinal-nerves'],
        division: 'PNS',
        path: reversed([[0.12, 8.0, -0.32], [0.7, 8.0, -0.1], [1.25, 7.75, 0.05], [1.54, 6.25, 0.01], [1.8, 4.65, 0.09]]),
        sources: ['ap-12-1', 'ap-13-4'],
      },
      {
        id: 'up',
        title: 'Up the spinal cord',
        text: 'The spinal cord relays the information towards the brain. Some responses, reflexes, are coordinated within the spinal cord itself.',
        kind: 'route',
        focus: ['spinal-cord'],
        division: 'CNS',
        path: [[0, 8.05, -0.3], [0, 8.4, -0.18], [0, 9.05, -0.1]],
        sources: ['ap-12-1', 'ap-13-2'],
      },
      {
        id: 'integrate',
        title: 'Integration in the brain',
        text: 'The brain combines the sensation with memories, emotional state and learning, and selects a response.',
        kind: 'process',
        focus: ['cerebrum', 'cerebellum'],
        division: 'CNS',
        sources: ['ap-12-1', 'ap-13-2'],
      },
      {
        id: 'down',
        title: 'Down the spinal cord',
        text: 'A motor command travels down the spinal cord.',
        kind: 'route',
        focus: ['spinal-cord', 'brainstem'],
        division: 'CNS',
        path: [[0, 9.4, 0], [0, 9.05, -0.1], [0, 8.4, -0.18], [0, 8.05, -0.3]],
        sources: ['ap-12-1'],
      },
      {
        id: 'out',
        title: 'Out to the muscles',
        text: 'Spinal nerves and nerves of the arm carry the command to skeletal muscles, which contract: the motor response.',
        kind: 'route',
        focus: ['spinal-nerves', 'peripheral-nerves'],
        division: 'PNS',
        path: [[0.12, 8.0, -0.32], [0.7, 8.0, -0.1], [1.25, 7.75, 0.05], [1.54, 6.25, 0.01]],
        sources: ['ap-12-1', 'ap-13-4'],
      },
    ],
  },
  {
    id: 'circulation',
    title: 'The systemic circuit through the body',
    system: 'cardiovascular',
    systems: ['cardiovascular', 'respiratory'],
    summary: 'From the heart out to the body and back, connecting the atlas to the detailed heart and the lungs.',
    conceptualNote:
      'Conceptual route of blood: the marker shows direction only, not speed, pressure or the pulsing of real blood flow. Capillaries are not drawn.',
    steps: [
      {
        id: 'heart',
        title: 'Out of the heart',
        text: 'The left ventricle pumps blood into the aorta. The detailed heart explorer shows the chambers and valves on the way.',
        kind: 'route',
        focus: ['heart', 'aorta'],
        path: pathOf('aorta').slice(0, 3),
        detail: 'heart',
        sources: ['ap-19-1', 'ap-20-5'],
      },
      {
        id: 'head',
        title: 'To the head',
        text: 'Branches of the aortic arch include the common carotid arteries, which supply the head and neck. The left one arises directly from the arch; the right one from the brachiocephalic artery, found only on the right.',
        kind: 'route',
        focus: ['common-carotid-artery-left', 'common-carotid-artery-right'],
        path: pathOf('common-carotid-artery-left'),
        sources: ['ap-20-5'],
      },
      {
        id: 'down',
        title: 'Down the aorta',
        text: 'The aorta descends through the thorax and abdomen and divides at about the level of the fourth lumbar vertebra into the common iliac arteries.',
        kind: 'route',
        focus: ['aorta', 'common-iliac-artery-left'],
        path: join(pathOf('aorta').slice(2), pathOf('common-iliac-artery-left').slice(1)),
        sources: ['ap-20-5'],
      },
      {
        id: 'leg',
        title: 'Into the leg',
        text: 'The external iliac artery becomes the femoral artery as it passes through the body wall into the thigh.',
        kind: 'route',
        focus: ['femoral-artery-left'],
        path: pathOf('femoral-artery-left'),
        sources: ['ap-20-5'],
      },
      {
        id: 'capillaries',
        title: 'Exchange in the capillaries',
        text: 'In capillary beds, small molecules such as gases cross the thin capillary walls between blood and tissues. Capillaries are far too small to draw here.',
        kind: 'process',
        focus: ['femoral-artery-left'],
        sources: ['ap-20-3'],
      },
      {
        id: 'return',
        title: 'Back through the venae cavae',
        text: 'Blood from below the diaphragm returns through the inferior vena cava; blood from the head, neck, chest and upper limbs returns through the superior vena cava. Both enter the right atrium.',
        kind: 'route',
        focus: ['inferior-vena-cava', 'superior-vena-cava', 'internal-jugular-vein-right'],
        path: pathOf('inferior-vena-cava'),
        sources: ['ap-20-5'],
      },
      {
        id: 'lungs',
        title: 'Then to the lungs',
        text: 'From the right side of the heart, blood goes to the lungs in the pulmonary circuit and comes back oxygen-rich to the left side. The heart explorer’s blood-flow tour follows that circuit step by step.',
        kind: 'process',
        focus: ['heart', 'lung-left', 'lung-right'],
        detail: 'heart',
        sources: ['ap-19-1'],
      },
    ],
  },
  {
    id: 'pulmonary',
    title: 'The pulmonary circuit and the great vessels',
    system: 'cardiovascular',
    systems: ['cardiovascular', 'respiratory'],
    summary: 'From the right ventricle to the lungs and back to the left atrium, then up the branches of the aortic arch and back down the veins of the neck.',
    conceptualNote:
      'Conceptual route of blood: the marker shows order and direction only, not speed, pressure or the pulsing of real blood flow. The branching inside the lungs and the capillaries are not drawn.',
    steps: [
      {
        id: 'trunk',
        title: 'Out of the right ventricle',
        text: 'The right ventricle pumps deoxygenated blood into the pulmonary trunk, the single vessel leaving it. The trunk curves posteriorly and divides into the left and right pulmonary arteries.',
        kind: 'route',
        focus: ['heart', 'pulmonary-trunk'],
        path: pathOf('pulmonary-trunk'),
        detail: 'heart',
        sources: ['ap-19-1', 'ap-20-5'],
      },
      {
        id: 'arteries',
        title: 'To both lungs',
        text: 'Each pulmonary artery carries blood to its lung, where it branches many times. Compare the two: the right one is drawn running behind the ascending aorta to reach the right lung.',
        kind: 'route',
        focus: ['pulmonary-artery-left', 'pulmonary-artery-right', 'lung-left', 'lung-right'],
        path: pathOf('pulmonary-artery-right'),
        sources: ['ap-20-5'],
      },
      {
        id: 'exchange',
        title: 'Gas exchange around the alveoli',
        text: 'The pulmonary capillaries surround the alveoli. There blood picks up oxygen and gives up carbon dioxide. The capillaries are far too small to draw; the alveolus close-up shows the idea.',
        kind: 'process',
        focus: ['lung-left', 'lung-right'],
        detail: 'alveolus',
        sources: ['ap-20-5', 'ap-22-1'],
      },
      {
        id: 'veins',
        title: 'Back to the left atrium',
        text: 'Four pulmonary veins, two from each lung, return the oxygen-rich blood to the left atrium. The pulmonary circuit is complete: blood went from the right side of the heart to the left side through the lungs.',
        kind: 'route',
        focus: ['pulmonary-veins', 'heart'],
        path: pathOf('pulmonary-veins').slice(4, 6),
        sources: ['ap-19-1', 'ap-20-5'],
      },
      {
        id: 'arch',
        title: 'Up the branches of the aortic arch',
        text: 'The left ventricle pumps blood into the aorta. Three large arteries branch from its arch: the brachiocephalic artery (on the right only), the left common carotid artery and the left subclavian artery. The brachiocephalic artery divides into the right subclavian and right common carotid arteries.',
        kind: 'route',
        focus: ['aorta', 'brachiocephalic-trunk', 'common-carotid-artery-left', 'subclavian-artery-left', 'subclavian-artery-right', 'common-carotid-artery-right'],
        path: join(pathOf('aorta').slice(0, 2), pathOf('brachiocephalic-trunk'), pathOf('subclavian-artery-right').slice(1)),
        sources: ['ap-20-5'],
      },
      {
        id: 'return',
        title: 'Down the veins of the neck',
        text: 'On each side the subclavian vein from the arm meets the internal jugular vein from the head, forming a brachiocephalic vein. The two brachiocephalic veins combine to form the superior vena cava, which enters the right atrium.',
        kind: 'route',
        focus: ['subclavian-vein-left', 'internal-jugular-vein-left', 'brachiocephalic-vein-left', 'brachiocephalic-vein-right', 'superior-vena-cava'],
        path: join(pathOf('subclavian-vein-left'), pathOf('brachiocephalic-vein-left').slice(1), pathOf('superior-vena-cava').slice(1)),
        sources: ['ap-20-5'],
      },
    ],
  },
  {
    id: 'lymph',
    title: 'From tissue fluid back to the blood',
    system: 'lymphatic',
    systems: ['lymphatic', 'cardiovascular'],
    summary: 'How fluid that leaves the blood in the tissues is collected as lymph, filtered in lymph nodes and returned to the veins at the root of the neck.',
    conceptualNote:
      'Conceptual route of lymph: the marker shows order and direction only, not speed or volume. Real lymphatic vessels form a dense network that is not drawn.',
    steps: [
      {
        id: 'capillaries',
        title: 'Fluid becomes lymph',
        text: 'Lymphatic capillaries, found in almost every tissue, take in interstitial fluid. Once inside, it is called lymph. The capillaries are too small to draw.',
        kind: 'process',
        focus: ['lymphatic-vessels'],
        sources: ['ap-21-1'],
      },
      {
        id: 'vessels',
        title: 'Up the limb in one direction',
        text: 'Larger lymphatic vessels have valves like veins. The heart does not pump lymph: contracting skeletal muscles and breathing push it along, and the one-way valves keep it moving toward the heart.',
        kind: 'route',
        focus: ['lymphatic-vessels'],
        path: pathOf('lymphatic-vessels').slice(0, 4),
        sources: ['ap-21-1'],
      },
      {
        id: 'nodes',
        title: 'Filtered in lymph nodes',
        text: 'Lymph passes through lymph nodes, which remove debris and pathogens. Nodes are common near the groin, armpits, neck, chest and abdomen; the atlas draws a few of them.',
        kind: 'process',
        focus: ['lymph-nodes'],
        sources: ['ap-21-1'],
      },
      {
        id: 'cisterna',
        title: 'Into the cisterna chyli',
        text: 'Lymph from the lower abdomen, pelvis and lower limbs collects in the cisterna chyli, a sac-like chamber just beneath the diaphragm where the thoracic duct begins.',
        kind: 'route',
        focus: ['cisterna-chyli'],
        path: pathOf('thoracic-duct').slice(0, 2),
        sources: ['ap-21-1'],
      },
      {
        id: 'thoracic-duct',
        title: 'Up the thoracic duct',
        text: 'The thoracic duct, the largest lymphatic vessel, carries lymph from most of the body up through the thorax and drains it into the left subclavian vein.',
        kind: 'route',
        focus: ['thoracic-duct', 'subclavian-vein-left'],
        path: pathOf('thoracic-duct'),
        sources: ['ap-21-1'],
      },
      {
        id: 'right-duct',
        title: 'The upper right body drains separately',
        text: 'Lymph from the right side of the head and thorax and the right upper limb goes to the right lymphatic duct, which empties into the right subclavian vein.',
        kind: 'route',
        focus: ['right-lymphatic-duct', 'subclavian-vein-right'],
        path: pathOf('right-lymphatic-duct'),
        sources: ['ap-21-1'],
      },
      {
        id: 'blood',
        title: 'Back in the blood',
        text: 'Now part of the blood again, the returned fluid flows through the brachiocephalic veins into the superior vena cava and the right atrium of the heart.',
        kind: 'route',
        focus: ['brachiocephalic-vein-left', 'superior-vena-cava', 'heart'],
        path: join(pathOf('brachiocephalic-vein-left'), pathOf('superior-vena-cava').slice(1)),
        sources: ['ap-20-5', 'ap-21-1'],
      },
    ],
  },
]

export const findTour = (id: string) => TOURS.find((t) => t.id === id)
