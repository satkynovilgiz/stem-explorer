/*
 * Curated links between subjects. Each one says what kind of link it is:
 * - 'same-math': the same equation describes both, within the stated model;
 * - 'connection': a real physical or biological connection;
 * - 'analogy': only a similarity in form, with its limits stated. An analogy is never an equivalence.
 * Endpoints are search-item ids (src/lib/searchIndex.ts). Every link cites the sections that state
 * both sides; nothing here is inferred.
 */

export type RelationKind = 'same-math' | 'connection' | 'analogy'

export const RELATION_LABELS: Record<RelationKind, string> = {
  'same-math': 'Same mathematics',
  connection: 'Real connection',
  analogy: 'Analogy only',
}

export interface Relation {
  id: string
  kind: RelationKind
  /** The two sides; each side may list several items (e.g. both lungs). */
  between: readonly [readonly string[], readonly string[]]
  text: string
  /** Where the link holds, or where an analogy breaks down. */
  limits: string
  sources: readonly string[]
}

const LUNGS = ['structure:lung-left', 'structure:lung-right']
const NET_EQUATION_MOLECULES = ['molecule:carbon-dioxide', 'molecule:water', 'molecule:oxygen']

export const RELATIONS: readonly Relation[] = [
  {
    id: 'inheritance-binomial',
    kind: 'same-math',
    between: [['section:inheritance'], ['section:binomial']],
    text: 'In the one-gene model each offspring is like a Bernoulli trial: for Yy × Yy, “green seeds” has probability p = 1/4. The number of green-seeded offspring among n is then binomial with n trials and p = 1/4, so its expected value is n/4. Both labs draw their random counts the same way, from a seeded generator.',
    limits:
      'Holds only under the model’s assumptions: independent offspring, a fixed probability, one gene with complete dominance. Real crosses can depart from it, and many traits do not follow a one-gene model at all.',
    sources: ['bio-12-1', 'stat-4-3'],
  },
  {
    id: 'wave-sine',
    kind: 'same-math',
    between: [['experiment:wave'], ['function:sine']],
    text: 'The wave lab’s displacement is y(x, t) = A sin(kx − ωt). At any one instant this is a sine function of x, with k playing the role of the angular frequency.',
    limits: 'Holds for the ideal sinusoidal wave the lab models.',
    sources: ['up1-16-2', 'calc1-1-3'],
  },
  {
    id: 'spring-cosine',
    kind: 'same-math',
    between: [['experiment:spring'], ['function:cosine']],
    text: 'A mass released from rest at x₀ on an ideal spring moves as x(t) = x₀ cos(ωt) with ω = √(k/m): a cosine function of time.',
    limits: 'Holds for the ideal, frictionless spring the lab models.',
    sources: ['up-15-1', 'calc1-1-3'],
  },
  {
    id: 'projectile-quadratic',
    kind: 'same-math',
    between: [['experiment:projectile'], ['function:quadratic']],
    text: 'Without air resistance the height is a quadratic function of horizontal distance, y = (tan θ₀)x − g x² / (2(v₀ cos θ₀)²), so the path is a parabola.',
    limits: 'Holds only without air resistance, as in the lab.',
    sources: ['up-4-3', 'calc1-1-2'],
  },
  {
    id: 'projectile-vectors',
    kind: 'same-math',
    between: [['experiment:projectile'], ['tool:vectors']],
    text: 'The launch velocity is a vector with components v₀ cos θ₀ and v₀ sin θ₀. The lab’s velocity arrows add and scale like the vectors in the vectors tool.',
    limits: 'The vectors tool is two-dimensional, like the lab.',
    sources: ['up-4-3', 'calc3-2-1'],
  },
  {
    id: 'circuit-blood-flow',
    kind: 'analogy',
    between: [['experiment:circuit'], ['structure:heart', 'subject:anatomy']],
    text: 'Blood flow = ΔP / resistance has the same form as Ohm’s law, I = V / R. The pressure difference plays the role of the voltage, and blood flow plays the role of the current.',
    limits:
      'Only an analogy. Blood is not an electric current. Vessels are elastic and blood flow pulses with the heartbeat. A vessel’s resistance depends strongly on its radius (to the fourth power, by Poiseuille’s equation), while the lab’s resistors are fixed.',
    sources: ['ap-20-2', 'up2-9-4'],
  },
  {
    id: 'gas-exchange',
    kind: 'connection',
    between: [LUNGS, ['molecule:oxygen', 'molecule:carbon-dioxide']],
    text: 'In the lungs, oxygen diffuses from the air in the alveoli into the capillary blood, and carbon dioxide diffuses out of the blood into the alveoli.',
    limits: 'The atlas lungs are schematic; the alveolus close-up shows the exchange.',
    sources: ['ap-22-4'],
  },
  {
    id: 'cells-gas-exchange',
    kind: 'connection',
    between: [['process:respiration'], LUNGS],
    text: 'Cells take up the oxygen that cellular respiration uses from the capillaries and release carbon dioxide into them. Gas exchange in the lungs then exchanges both with the air.',
    limits: 'The net equation summarises many steps; it is not the pathway.',
    sources: ['ap-22-4', 'cob-4-1'],
  },
  {
    id: 'photosynthesis-molecules',
    kind: 'connection',
    between: [['process:photosynthesis'], NET_EQUATION_MOLECULES],
    text: 'Carbon dioxide and water are the reactants, and oxygen a product, in the simplified net equation 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.',
    limits: 'A summary of the overall change, not the pathway.',
    sources: ['cob-4-1', 'bio-8-1'],
  },
  {
    id: 'respiration-molecules',
    kind: 'connection',
    between: [['process:respiration'], NET_EQUATION_MOLECULES],
    text: 'Oxygen is a reactant, and carbon dioxide and water are products, in the simplified net equation C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O.',
    limits: 'A summary of the overall change, not the pathway.',
    sources: ['cob-4-1'],
  },
]

/** Relations touching any of the given topic ids, with the items on the other side. */
export function relationsFor(topics: readonly string[]): { relation: Relation; others: readonly string[] }[] {
  const set = new Set(topics)
  const out: { relation: Relation; others: readonly string[] }[] = []
  for (const r of RELATIONS) {
    const [a, b] = r.between
    if (a.some((t) => set.has(t))) out.push({ relation: r, others: b })
    else if (b.some((t) => set.has(t))) out.push({ relation: r, others: a })
  }
  return out
}
