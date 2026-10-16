import type { SubjectId } from './subjects'
import { ORGANELLES, structureParams } from './biology/organelles'

/**
 * The glossary: one definition per term, shared by the subject guides and the glossary page.
 * Biology structure terms come from the organelle data (not copied), so the two can't drift apart.
 */
export interface GlossaryEntry {
  id: string
  term: string
  definition: string
  subjects: SubjectId[]
  /** In-app places to see the term (relative links only). */
  links: { label: string; href: string }[]
  sourceIds: string[]
  /** Definitions that are the app's own convention or a unit definition rather than a cited claim. */
  kind?: 'convention' | 'unit'
}

const CORE: GlossaryEntry[] = [
  // Chemistry
  {
    id: 'covalent-bond',
    term: 'Covalent bond',
    definition: 'A bond in which two atoms are held together by their mutual attraction to a shared pair of electrons.',
    subjects: ['chemistry'],
    links: [{ label: 'Water', href: '?molecule=water#/chemistry' }],
    sourceIds: ['chem-7-2'],
  },
  {
    id: 'bond-length',
    term: 'Bond length',
    definition: 'The distance between the nuclei of two bonded atoms at which their potential energy is lowest. The Distance tool measures it between atom centres.',
    subjects: ['chemistry'],
    links: [{ label: 'Measure in water', href: '?molecule=water#/chemistry' }],
    sourceIds: ['chem-7-2'],
  },
  {
    id: 'bond-angle',
    term: 'Bond angle',
    definition: 'The angle between two bonds that share a common atom, measured at that atom (the vertex).',
    subjects: ['chemistry'],
    links: [{ label: 'Measure H–O–H in water', href: '?molecule=water#/chemistry' }],
    sourceIds: ['chem-7-6'],
  },
  {
    id: 'electron-domain',
    term: 'Electron domain',
    definition: 'A region around a central atom where electrons are concentrated: a bond (single, double or triple counts as one) or a lone pair.',
    subjects: ['chemistry'],
    links: [{ label: 'Ammonia', href: '?molecule=ammonia#/chemistry' }],
    sourceIds: ['chem-7-6'],
  },
  {
    id: 'lone-pair',
    term: 'Lone pair',
    definition: 'A pair of valence electrons on one atom that is not shared in a bond. Lone pairs repel more strongly than bonding pairs.',
    subjects: ['chemistry'],
    links: [{ label: 'Water', href: '?molecule=water#/chemistry' }],
    sourceIds: ['chem-7-6'],
  },
  {
    id: 'vsepr',
    term: 'VSEPR theory',
    definition: 'Valence shell electron-pair repulsion: electron domains around a central atom arrange themselves as far apart as possible, which predicts molecular shape.',
    subjects: ['chemistry'],
    links: [{ label: 'Methane', href: '?molecule=methane#/chemistry' }],
    sourceIds: ['chem-7-6'],
  },
  {
    id: 'molecular-structure',
    term: 'Molecular structure (shape)',
    definition: 'The arrangement of the atoms only. It can differ from the electron-pair geometry, which also counts lone pairs: water’s electron pairs are roughly tetrahedral, but its atoms form a bent shape.',
    subjects: ['chemistry'],
    links: [{ label: 'Water', href: '?molecule=water#/chemistry' }],
    sourceIds: ['chem-7-6'],
  },
  {
    id: 'van-der-waals-radius',
    term: 'Van der Waals radius',
    definition: 'An estimate of how far an atom’s electron cloud extends when it is not bonded. The space-filling view draws atoms at these radii.',
    subjects: ['chemistry'],
    links: [{ label: 'Space-filling benzene', href: '?molecule=benzene&view=space-filling#/chemistry' }],
    sourceIds: ['bondi'],
  },
  {
    id: 'angstrom',
    term: 'Ångström (Å)',
    definition: 'A unit of length used for atomic distances: 1 Å = 10⁻¹⁰ m = 0.1 nm.',
    subjects: ['chemistry'],
    links: [],
    sourceIds: [],
    kind: 'unit',
  },
  // Physics
  {
    id: 'projectile',
    term: 'Projectile',
    definition: 'An object moving through the air after it is launched, acted on only by gravity when air resistance is ignored.',
    subjects: ['physics'],
    links: [{ label: 'Projectile lab', href: '#/physics' }],
    sourceIds: ['up-4-3'],
  },
  {
    id: 'trajectory',
    term: 'Trajectory',
    definition: 'The path a projectile follows. Without air resistance it is a parabola.',
    subjects: ['physics'],
    links: [{ label: 'Projectile lab', href: '#/physics' }],
    sourceIds: ['up-4-3'],
  },
  {
    id: 'range',
    term: 'Range',
    definition: 'The horizontal distance a projectile travels before it lands.',
    subjects: ['physics'],
    links: [{ label: 'Compare 30° and 60°', href: '?speed=20&angle=30&height=0&gravity=9.81#/physics' }],
    sourceIds: ['up-4-3'],
  },
  {
    id: 'time-of-flight',
    term: 'Time of flight',
    definition: 'The time from launch until the projectile reaches the ground.',
    subjects: ['physics'],
    links: [{ label: 'Projectile lab', href: '#/physics' }],
    sourceIds: ['up-4-3'],
  },
  {
    id: 'free-fall-acceleration',
    term: 'Acceleration due to gravity (g)',
    definition: 'The constant downward acceleration of a freely falling object near Earth when air resistance is negligible. It is the same for all masses; 9.81 m/s² is an average value at Earth’s surface.',
    subjects: ['physics'],
    links: [{ label: 'Change g in the lab', href: '#/physics' }],
    sourceIds: ['up-3-5'],
  },
  {
    id: 'velocity-components',
    term: 'Velocity components',
    definition: 'The horizontal (vₓ) and vertical (vᵧ) parts of a velocity. In projectile motion they change independently: vₓ stays constant while vᵧ changes by −g each second.',
    subjects: ['physics'],
    links: [{ label: 'Show components', href: '#/physics' }],
    sourceIds: ['up-4-3'],
  },
  {
    id: 'simple-harmonic-motion',
    term: 'Simple harmonic motion',
    definition: 'Oscillation driven by a restoring force proportional to the displacement, F = −kx. The position follows a cosine (or sine) curve, and the period does not depend on the amplitude.',
    subjects: ['physics'],
    links: [{ label: 'Spring–mass lab', href: '?experiment=spring#/physics' }],
    sourceIds: ['up-15-1'],
  },
  {
    id: 'period',
    term: 'Period (T)',
    definition: 'The time for one complete oscillation. For a mass on a spring, T = 2π√(m/k).',
    subjects: ['physics'],
    links: [{ label: 'Spring–mass lab', href: '?experiment=spring#/physics' }],
    sourceIds: ['up-15-1'],
  },
  {
    id: 'spring-constant',
    term: 'Spring constant (k)',
    definition: 'How stiff a spring is: the force per metre of stretch or compression, in N/m.',
    subjects: ['physics'],
    links: [{ label: 'Spring–mass lab', href: '?experiment=spring#/physics' }],
    sourceIds: ['up-15-1'],
  },
  {
    id: 'equilibrium-position',
    term: 'Equilibrium position',
    definition: 'Where the spring is neither stretched nor compressed and the net force on the mass is zero; displacement x is measured from here.',
    subjects: ['physics'],
    links: [{ label: 'Spring–mass lab', href: '?experiment=spring#/physics' }],
    sourceIds: ['up-15-1'],
  },
  {
    id: 'restoring-force',
    term: 'Restoring force',
    definition: 'A force that always points back toward equilibrium. For an ideal spring it obeys Hooke’s law, F = −kx.',
    subjects: ['physics'],
    links: [{ label: 'Spring–mass lab', href: '?experiment=spring#/physics' }],
    sourceIds: ['up-15-1'],
  },
  // Mathematics
  {
    id: 'function-of-two-variables',
    term: 'Function of two variables',
    definition: 'A rule that assigns exactly one output z = f(x, y) to each input pair (x, y) in its domain.',
    subjects: ['mathematics'],
    links: [{ label: 'Surface explorer', href: '#/mathematics' }],
    sourceIds: ['calc3-4-1'],
  },
  {
    id: 'domain',
    term: 'Domain',
    definition: 'The set of inputs a function is defined on. The explorer shows each surface over −2 ≤ x, y ≤ 2.',
    subjects: ['mathematics'],
    links: [{ label: 'Surface explorer', href: '#/mathematics' }],
    sourceIds: ['calc3-4-1'],
  },
  {
    id: 'graph-surface',
    term: 'Graph of a function (surface)',
    definition: 'The set of points (x, y, f(x, y)) in three dimensions. For a function of two variables it is a surface.',
    subjects: ['mathematics'],
    links: [{ label: 'Paraboloid', href: '?surface=paraboloid#/mathematics' }],
    sourceIds: ['calc3-4-1'],
  },
  {
    id: 'vertical-trace',
    term: 'Vertical trace (cross-section)',
    definition: 'The curve where a surface meets a vertical plane such as x = c or y = c, giving z as a function of the other variable.',
    subjects: ['mathematics'],
    links: [{ label: 'Saddle slice x = 1', href: '?surface=saddle&slice=x&at=1#/mathematics' }],
    sourceIds: ['calc3-4-1'],
  },
  {
    id: 'saddle-point',
    term: 'Saddle point',
    definition: 'A point where both partial derivatives are zero but the function has no local maximum or minimum: it rises in one direction and falls in another.',
    subjects: ['mathematics'],
    links: [{ label: 'Saddle surface', href: '?surface=saddle#/mathematics' }],
    sourceIds: ['calc3-4-7'],
  },
  {
    id: 'parameter',
    term: 'Parameter',
    definition: 'A constant in a formula, such as a and b in z = a·x² + b·y², that you can change to reshape the whole surface.',
    subjects: ['mathematics'],
    links: [{ label: 'Surface explorer', href: '#/mathematics' }],
    sourceIds: [],
    kind: 'convention',
  },
  // Anatomy
  {
    id: 'atrium',
    term: 'Atrium',
    definition: 'One of the two upper chambers of the heart, which receive blood returning to the heart.',
    subjects: ['anatomy'],
    links: [{ label: 'Right atrium', href: '?part=right-atrium#/anatomy' }],
    sourceIds: ['ap-19-1'],
  },
  {
    id: 'ventricle',
    term: 'Ventricle',
    definition: 'One of the two lower chambers of the heart, which pump blood out of the heart.',
    subjects: ['anatomy'],
    links: [{ label: 'Left ventricle', href: '?part=left-ventricle#/anatomy' }],
    sourceIds: ['ap-19-1'],
  },
  {
    id: 'heart-valve',
    term: 'Heart valve',
    definition: 'A structure that lets blood pass in one direction and closes to prevent backflow.',
    subjects: ['anatomy'],
    links: [{ label: 'Mitral valve', href: '?part=mitral-valve#/anatomy' }],
    sourceIds: ['ap-19-1'],
  },
  {
    id: 'pulmonary-circuit',
    term: 'Pulmonary circuit',
    definition: 'The loop that carries blood from the right ventricle to the lungs and back to the left atrium.',
    subjects: ['anatomy'],
    links: [{ label: 'Pulmonary trunk', href: '?part=pulmonary-trunk#/anatomy' }],
    sourceIds: ['ap-19-1'],
  },
  {
    id: 'systemic-circuit',
    term: 'Systemic circuit',
    definition: 'The loop that carries blood from the left ventricle to the body and back to the right atrium.',
    subjects: ['anatomy'],
    links: [{ label: 'Aorta', href: '?part=aorta#/anatomy' }],
    sourceIds: ['ap-19-1'],
  },
  {
    id: 'artery',
    term: 'Artery',
    definition: 'A blood vessel that carries blood away from the heart, whatever its oxygen content. The pulmonary arteries carry oxygen-poor blood.',
    subjects: ['anatomy'],
    links: [{ label: 'Aorta', href: '?part=aorta#/anatomy' }],
    sourceIds: ['ap-20-1'],
  },
  {
    id: 'vein',
    term: 'Vein',
    definition: 'A blood vessel that carries blood toward the heart, whatever its oxygen content. The pulmonary veins carry oxygen-rich blood.',
    subjects: ['anatomy'],
    links: [{ label: 'Pulmonary veins', href: '?part=pulmonary-veins#/anatomy' }],
    sourceIds: ['ap-20-1'],
  },
  {
    id: 'anterior-view',
    term: 'Anterior view',
    definition: 'A view from the front of the body. The body’s right side appears on the viewer’s left, as in the heart model.',
    subjects: ['anatomy'],
    links: [{ label: 'Heart explorer', href: '#/anatomy' }],
    sourceIds: [],
    kind: 'convention',
  },
  // Biology (general; structure terms are added from the organelle data below)
  {
    id: 'organelle',
    term: 'Organelle',
    definition: 'A structure inside a eukaryotic cell, often surrounded by a membrane, that carries out a particular job.',
    subjects: ['biology'],
    links: [{ label: 'Cell explorer', href: '#/biology' }],
    sourceIds: ['bio-4-3'],
  },
  // 'Endomembrane system' is defined in the organelle data and added below.
]

export const slug = (term: string) =>
  term
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Structure glossary terms from the organelle content; one entry per term, linking every structure that uses it. */
function organelleTerms(): GlossaryEntry[] {
  const byTerm = new Map<string, GlossaryEntry>()
  for (const o of ORGANELLES) {
    for (const g of o.glossary) {
      const id = slug(g.term)
      const existing = byTerm.get(id)
      const link = { label: o.name, href: `?${new URLSearchParams(structureParams(o.id)).toString()}#/biology` }
      if (existing) {
        existing.links.push(link)
        existing.sourceIds = [...new Set([...existing.sourceIds, ...o.sourceIds])]
      } else {
        byTerm.set(id, { id, term: g.term, definition: g.definition, subjects: ['biology'], links: [link], sourceIds: [...o.sourceIds] })
      }
    }
  }
  return [...byTerm.values()]
}

export const GLOSSARY: readonly GlossaryEntry[] = [...CORE, ...organelleTerms()].sort((a, b) => a.term.localeCompare(b.term))

export function findTerm(id: string): GlossaryEntry | undefined {
  return GLOSSARY.find((g) => g.id === id)
}
