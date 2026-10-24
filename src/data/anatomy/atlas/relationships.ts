import type { RegionId, SystemId } from './types'

/*
 * Anatomical relationships stated in words by the cited sections, kept apart from the geometry.
 * The atlas shapes are approximate, so no relationship here is read off the model: each one
 * paraphrases a statement of the cited section (`basis` says where in it), and tests check that
 * every structure and source exists. Where a source does not state a relationship, none is given.
 */

export type DirectionTerm = 'superior' | 'inferior' | 'anterior' | 'posterior' | 'medial' | 'lateral' | 'proximal' | 'distal' | 'superficial' | 'deep'

/** OpenStax A&P 2e §1.6 definitions, paraphrased. */
export const DIRECTION_TERMS: Record<DirectionTerm, string> = {
  superior: 'above or higher than another part of the body (also cranial)',
  inferior: 'below or lower than another part of the body (also caudal)',
  anterior: 'toward the front of the body (also ventral)',
  posterior: 'toward the back of the body (also dorsal)',
  medial: 'toward the middle of the body',
  lateral: 'toward the side of the body',
  proximal: 'in a limb, nearer to its attachment to the trunk',
  distal: 'in a limb, farther from its attachment to the trunk',
  superficial: 'closer to the surface of the body',
  deep: 'farther from the surface of the body',
}

export interface Relationship {
  id: string
  /** The structure the statement is about. */
  subject: string
  /** A directional term from §1.6, or null for a relationship that is not directional (contains, separates). */
  term: DirectionTerm | null
  /** The structure it is compared with, when that structure is in the atlas. */
  object?: string
  /** The statement shown, worded from the subject's point of view. */
  statement: string
  /** Where in the cited section the statement comes from, paraphrased (no source text is reproduced). */
  basis: string
  source: string
  /** Set when the statement combines a sourced fact with a §1.6 definition; the reasoning is shown. */
  derivedFrom?: string
}

export const RELATIONSHIPS: readonly Relationship[] = [
  // Breathing: diaphragm, lungs and the thoracic cavity
  {
    id: 'diaphragm-inferior-lungs',
    subject: 'diaphragm',
    term: 'inferior',
    object: 'lung-left',
    statement: 'The diaphragm is inferior to the lungs: it borders their inferior surface, at the base of the lungs.',
    basis: '§22.2, Gross Anatomy of the Lungs: the diaphragm borders the inferior surface of the lungs, at their base.',
    source: 'ap-22-2',
  },
  {
    id: 'lungs-superior-diaphragm',
    subject: 'lung-left',
    term: 'superior',
    object: 'diaphragm',
    statement: 'Each lung is superior to the diaphragm. Its apex is its superior region; its base lies near the diaphragm.',
    basis: '§22.2, Gross Anatomy of the Lungs: the apex is the superior region of the lung; the base lies near the diaphragm.',
    source: 'ap-22-2',
  },
  {
    id: 'diaphragm-floor-thorax',
    subject: 'diaphragm',
    term: null,
    statement: 'The diaphragm forms the floor of the thoracic cavity and separates it from the abdominopelvic cavity, which is inferior to it.',
    basis: '§1.6, body cavities: the diaphragm is the floor of the thoracic cavity, with the abdominopelvic cavity inferior to it.',
    source: 'ap-1-6',
  },
  {
    id: 'thorax-contains',
    subject: 'heart',
    term: null,
    object: 'lung-left',
    statement: 'The thoracic cavity contains the lungs and the heart; the heart lies in the mediastinum, which separates the right and left pleurae around the lungs.',
    basis: '§1.6, body cavities (contents of the thoracic cavity; heart in the mediastinum) and §22.2, Pleura of the Lungs (the mediastinum separates the pleurae).',
    source: 'ap-1-6',
  },
  {
    id: 'diaphragm-moves-inferiorly',
    subject: 'diaphragm',
    term: 'inferior',
    statement: 'When the diaphragm contracts it moves inferiorly, toward the abdominal cavity, which enlarges the thoracic cavity and gives the lungs more space.',
    basis: '§22.3, Physical Factors Affecting Ventilation: diaphragm contraction moves it inferiorly and enlarges the thoracic cavity.',
    source: 'ap-22-3',
  },
  // Urinary: kidney, ureter and bladder
  {
    id: 'kidneys-lateral-spine',
    subject: 'kidney-left',
    term: 'lateral',
    object: 'vertebral-column',
    statement: 'The kidneys lie on either side of the vertebral column (lateral to it), against the posterior abdominal wall, behind the peritoneum (retroperitoneal).',
    basis: '§25.3, introduction: the kidneys’ position beside the spine, retroperitoneal, against the posterior abdominal wall.',
    source: 'ap-25-3',
  },
  {
    id: 'right-kidney-inferior',
    subject: 'kidney-right',
    term: 'inferior',
    object: 'kidney-left',
    statement: 'The right kidney is slightly inferior to (lower than) the left, displaced by the liver. The left lies at about the T12–L3 vertebrae.',
    basis: '§25.3, External Anatomy: vertebral level of the left kidney; the right kidney lower because of the liver.',
    source: 'ap-25-3',
  },
  {
    id: 'adrenal-superior-kidney',
    subject: 'adrenal-gland-left',
    term: 'superior',
    object: 'kidney-left',
    statement: 'Each adrenal gland sits on the superior aspect of its kidney.',
    basis: '§25.3, External Anatomy: the adrenal gland on the superior aspect of each kidney.',
    source: 'ap-25-3',
  },
  {
    id: 'ureters-retroperitoneal',
    subject: 'ureter-left',
    term: null,
    object: 'urinary-bladder',
    statement: 'The ureters are retroperitoneal, anchored between the parietal peritoneum and the posterior abdominal wall; the bladder collects urine from both ureters.',
    basis: '§25.2, Ureters and Bladder: ureters retroperitoneal and anchored to the posterior abdominal wall; the bladder receives both ureters.',
    source: 'ap-25-2',
  },
  {
    id: 'bladder-posterior-pubic',
    subject: 'urinary-bladder',
    term: 'posterior',
    object: 'hip-bone-left',
    statement: 'The bladder lies posterior to the pubic bone (part of each hip bone) and anterior to the rectum.',
    basis: '§25.2, Bladder: the bladder’s position relative to the pubic bone and the rectum.',
    source: 'ap-25-2',
  },
  {
    id: 'urethra-inferior-ureters',
    subject: 'urethra',
    term: 'inferior',
    object: 'urinary-bladder',
    statement: 'The urethra begins at the base of the bladder, inferior to and between the two ureteral openings, and runs posterior and inferior to the pubic symphysis.',
    basis: '§25.2, Urethra: where the urethra begins at the bladder base and its course relative to the pubic symphysis.',
    source: 'ap-25-2',
  },
  // Upper limb: biceps, triceps, elbow and forearm bones
  {
    id: 'ulna-medial-radius',
    subject: 'ulna-left',
    term: 'medial',
    object: 'radius-left',
    statement: 'In the anatomical position the ulna is the medial bone of the forearm.',
    basis: '§8.2, Ulna and Radius: the ulna on the medial and the radius on the lateral side of the forearm.',
    source: 'ap-8-2',
  },
  {
    id: 'radius-lateral-ulna',
    subject: 'radius-left',
    term: 'lateral',
    object: 'ulna-left',
    statement: 'In the anatomical position the radius is the lateral bone of the forearm (on the thumb side).',
    basis: '§8.2, Ulna and Radius: the ulna on the medial and the radius on the lateral side of the forearm.',
    source: 'ap-8-2',
  },
  {
    id: 'humerus-proximal-forearm',
    subject: 'humerus-left',
    term: 'proximal',
    object: 'radius-left',
    statement: 'The humerus is proximal to the radius and ulna: the arm lies between the shoulder and the elbow, the forearm between the elbow and the wrist.',
    basis: '§8.2, introduction: the arm lies between the shoulder and elbow, the forearm between the elbow and wrist.',
    source: 'ap-8-2',
    derivedFrom: 'The source places the arm between shoulder and elbow and the forearm beyond the elbow; §1.6 defines proximal as nearer the limb’s attachment to the trunk.',
  },
  {
    id: 'elbow-formed-by',
    subject: 'elbow-joint-left',
    term: null,
    object: 'humerus-left',
    statement: 'The elbow is a hinge joint formed mainly by the trochlea of the humerus and the trochlear notch of the ulna; the humeroradial and proximal radioulnar joints are also associated with it.',
    basis: '§9.6, Elbow Joint: the hinge joint between humerus and ulna, with the associated humeroradial and proximal radioulnar joints.',
    source: 'ap-9-6',
  },
  {
    id: 'olecranon-posterior',
    subject: 'ulna-left',
    term: 'posterior',
    statement: 'The olecranon, the posterior and superior part of the proximal ulna, forms the bony tip of the elbow.',
    basis: '§8.2, Ulna: the olecranon process at the posterior, superior part of the proximal ulna forms the tip of the elbow.',
    source: 'ap-8-2',
  },
  {
    id: 'biceps-anterior-arm',
    subject: 'biceps-brachii-left',
    term: 'anterior',
    object: 'humerus-left',
    statement: 'The biceps brachii is in the anterior (flexor) compartment of the arm. It crosses the shoulder and elbow joints and flexes the forearm.',
    basis: '§11.5, Muscles That Move the Forearm: the biceps crossing shoulder and elbow; the anterior (flexor) compartment of the arm.',
    source: 'ap-11-5',
  },
  {
    id: 'brachialis-deep-biceps',
    subject: 'brachialis-left',
    term: 'deep',
    object: 'biceps-brachii-left',
    statement: 'The brachialis is deep to the biceps brachii and adds power in flexing the forearm.',
    basis: '§11.5, Muscles That Move the Forearm: the brachialis deep to the biceps brachii, adding flexion power.',
    source: 'ap-11-5',
  },
  {
    id: 'triceps-extends',
    subject: 'triceps-brachii-left',
    term: null,
    object: 'biceps-brachii-left',
    statement: 'The triceps brachii is a forearm extensor, opposing the flexors (biceps brachii, brachialis, brachioradialis). The cited section does not state its position in words, so no directional relationship is given for it here.',
    basis: '§11.5, Muscles That Move the Forearm: the forearm flexors and extensors are listed; no position is stated for the triceps in the text.',
    source: 'ap-11-5',
  },
]

/** Relationships about a structure. Left/right pairs share statements written for one side. */
export function relationshipsOf(id: string): Relationship[] {
  const base = id.replace(/-(left|right)$/, '')
  const sideless = (x: string) => x.replace(/-(left|right)$/, '')
  // The right-kidney statement is specific to the right side; everything else applies to both sides.
  return RELATIONSHIPS.filter((r) => (r.id === 'right-kidney-inferior' ? r.subject === id || r.object === id : sideless(r.subject) === base || (r.object && sideless(r.object) === base)))
}

/** Curated explorations: a question, the structures to show, and the relationships to read. */
export interface RelationExploration {
  id: 'breathing' | 'urinary' | 'elbow'
  title: string
  question: string
  systems: readonly SystemId[]
  region: RegionId
  /** Structures highlighted and labelled in the view, in reading order. */
  focus: readonly string[]
  relationships: readonly string[]
  /** What the schematic model cannot show for this exploration. */
  limits: string
  /** A suggestion for reading the view, if any. */
  tip?: string
}

export const RELATION_EXPLORATIONS: readonly RelationExploration[] = [
  {
    id: 'breathing',
    title: 'Diaphragm, lungs and the thoracic cavity',
    question: 'Where is the diaphragm relative to the lungs, and what does it do in breathing?',
    systems: ['respiratory', 'cardiovascular'],
    region: 'thorax',
    focus: ['diaphragm', 'lung-left', 'lung-right', 'heart'],
    relationships: ['diaphragm-inferior-lungs', 'lungs-superior-diaphragm', 'diaphragm-floor-thorax', 'thorax-contains', 'diaphragm-moves-inferiorly'],
    limits: 'The pleurae, the mediastinum and the dome’s movement are not drawn; the diaphragm is a still, simplified dome.',
  },
  {
    id: 'urinary',
    title: 'Kidney, ureter and bladder',
    question: 'How are the kidneys, ureters and bladder arranged in the body?',
    systems: ['urinary', 'skeletal'],
    region: 'abdomen',
    focus: ['kidney-left', 'kidney-right', 'adrenal-gland-left', 'ureter-left', 'ureter-right', 'urinary-bladder', 'urethra'],
    relationships: ['kidneys-lateral-spine', 'right-kidney-inferior', 'adrenal-superior-kidney', 'ureters-retroperitoneal', 'bladder-posterior-pubic', 'urethra-inferior-ureters'],
    limits: 'The peritoneum, the renal vessels and the rectum are not drawn, and the bladder is shown at one fixed size although it distends as it fills.',
  },
  {
    id: 'elbow',
    title: 'Biceps, triceps, elbow and forearm bones',
    question: 'Which muscles and bones meet at the elbow, and on which side is each?',
    systems: ['skeletal', 'muscular'],
    region: 'upper-limb',
    focus: ['humerus-left', 'ulna-left', 'radius-left', 'elbow-joint-left', 'biceps-brachii-left', 'brachialis-left', 'triceps-brachii-left'],
    relationships: ['humerus-proximal-forearm', 'ulna-medial-radius', 'radius-lateral-ulna', 'elbow-formed-by', 'olecranon-posterior', 'biceps-anterior-arm', 'brachialis-deep-biceps', 'triceps-extends'],
    limits: 'Joint surfaces, ligaments and the muscles’ exact attachments are not drawn; muscles are smooth capsules placed on the correct side.',
    tip: 'The front view separates the radius and ulna; the Side view separates the front and back of the arm. Overlapping labels are hidden in the view but always listed here.',
  },
]

export const findRelationExploration = (id: string) => RELATION_EXPLORATIONS.find((e) => e.id === id)
