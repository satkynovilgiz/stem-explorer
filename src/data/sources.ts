import { HEART_SOURCES } from './anatomy/heart'
import { BIOLOGY_SOURCES } from './biology/organelles'
import { MATH_SOURCES } from '../math/surfaces'

export interface SourceRef {
  label: string
  url: string
}

/**
 * One registry for the sources cited by subject guides and the glossary, so each claim can name
 * the source that supports it. Subject-specific registries are reused, not copied.
 */
export const SOURCES: Record<string, SourceRef> = {
  ...Object.fromEntries(Object.entries(HEART_SOURCES).map(([id, s]) => [id, { label: s.label, url: s.url }])),
  ...Object.fromEntries(Object.entries(BIOLOGY_SOURCES).map(([id, s]) => [id, { label: s.label, url: s.url }])),
  ...Object.fromEntries(Object.entries(MATH_SOURCES).map(([id, s]) => [id, { label: s.label, url: s.url }])),
  'ap-20-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 20.1 Structure and Function of Blood Vessels',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-1-structure-and-function-of-blood-vessels',
  },
  'ap-1-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 1.2 Structural Organization of the Human Body',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-2-structural-organization-of-the-human-body',
  },
  'ap-1-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 1.6 Anatomical Terminology',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/1-6-anatomical-terminology',
  },
  'ap-5-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 5.1 Layers of the Skin',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/5-1-layers-of-the-skin',
  },
  'ap-5-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 5.2 Accessory Structures of the Skin',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/5-2-accessory-structures-of-the-skin',
  },
  'ap-7-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 7.1 Divisions of the Skeletal System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-1-divisions-of-the-skeletal-system',
  },
  'ap-7-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 7.2 The Skull',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull',
  },
  'ap-7-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 7.3 The Vertebral Column',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column',
  },
  'ap-7-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 7.4 The Thoracic Cage',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage',
  },
  'ap-8-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 8.1 The Pectoral Girdle',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-1-the-pectoral-girdle',
  },
  'ap-8-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 8.2 Bones of the Upper Limb',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb',
  },
  'ap-8-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 8.3 The Pelvic Girdle and Pelvis',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-3-the-pelvic-girdle-and-pelvis',
  },
  'ap-8-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 8.4 Bones of the Lower Limb',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb',
  },
  'ap-9-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 9.1 Classification of Joints',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-1-classification-of-joints',
  },
  'ap-9-5': {
    label: 'OpenStax Anatomy and Physiology 2e — 9.5 Types of Body Movements',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-5-types-of-body-movements',
  },
  'ap-9-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 9.6 Anatomy of Selected Synovial Joints',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-6-anatomy-of-selected-synovial-joints',
  },
  'ap-11-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 11.3 Axial Muscles of the Head, Neck, and Back',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back',
  },
  'ap-11-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 11.4 Axial Muscles of the Abdominal Wall, and Thorax',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-4-axial-muscles-of-the-abdominal-wall-and-thorax',
  },
  'ap-11-5': {
    label: 'OpenStax Anatomy and Physiology 2e — 11.5 Muscles of the Pectoral Girdle and Upper Limbs',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs',
  },
  'ap-11-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 11.6 Appendicular Muscles of the Pelvic Girdle and Lower Limbs',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs',
  },
  'ap-12-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 12.1 Basic Structure and Function of the Nervous System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/12-1-basic-structure-and-function-of-the-nervous-system',
  },
  'ap-13-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 13.2 The Central Nervous System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-2-the-central-nervous-system',
  },
  'ap-13-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 13.4 The Peripheral Nervous System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-4-the-peripheral-nervous-system',
  },
  'ap-20-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 20.2 Blood Flow, Blood Pressure, and Resistance',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-2-blood-flow-blood-pressure-and-resistance',
  },
  'ap-20-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 20.3 Capillary Exchange',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-3-capillary-exchange',
  },
  'ap-22-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 22.3 The Process of Breathing',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-3-the-process-of-breathing',
  },
  'ap-22-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 22.4 Gas Exchange',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-4-gas-exchange',
  },
  'ap-25-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 25.4 Microscopic Anatomy of the Kidney',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-4-microscopic-anatomy-of-the-kidney',
  },
  'ap-25-5': {
    label: 'OpenStax Anatomy and Physiology 2e — 25.5 Physiology of Urine Formation',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-5-physiology-of-urine-formation',
  },
  'ap-25-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 25.6 Tubular Reabsorption',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-6-tubular-reabsorption',
  },
  'ap-17-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 17.1 An Overview of the Endocrine System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-1-an-overview-of-the-endocrine-system',
  },
  'ap-17-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 17.3 The Pituitary Gland and Hypothalamus',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-3-the-pituitary-gland-and-hypothalamus',
  },
  'ap-17-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 17.4 The Thyroid Gland',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-4-the-thyroid-gland',
  },
  'ap-17-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 17.6 The Adrenal Glands',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/17-6-the-adrenal-glands',
  },
  'ap-20-5': {
    label: 'OpenStax Anatomy and Physiology 2e — 20.5 Circulatory Pathways',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways',
  },
  'bio-6-5': {
    label: 'OpenStax Biology 2e — 6.5 Enzymes',
    url: 'https://openstax.org/books/biology-2e/pages/6-5-enzymes',
  },
  'chem-12-7': {
    label: 'OpenStax Chemistry 2e — 12.7 Catalysis',
    url: 'https://openstax.org/books/chemistry-2e/pages/12-7-catalysis',
  },
  'mm-derivation': {
    label: 'LibreTexts, Principles of Biochemistry (M. Blaber) — 7.2 Derivation of the Michaelis–Menten equation',
    url: 'https://bio.libretexts.org/Courses/Wheaton_College_Massachusetts/Principles_of_Biochemistry/07:_Enzymes_catalysis_and_kinetics/7.02:_Derivation_of_Michaelis-Menten_equation',
  },
  'ap-21-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 21.1 Anatomy of the Lymphatic and Immune Systems',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/21-1-anatomy-of-the-lymphatic-and-immune-systems',
  },
  'ap-22-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 22.1 Organs and Structures of the Respiratory System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-1-organs-and-structures-of-the-respiratory-system',
  },
  'ap-22-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 22.2 The Lungs',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/22-2-the-lungs',
  },
  'ap-23-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 23.1 Overview of the Digestive System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-1-overview-of-the-digestive-system',
  },
  'ap-23-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 23.3 The Mouth, Pharynx, and Esophagus',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-3-the-mouth-pharynx-and-esophagus',
  },
  'ap-23-4': {
    label: 'OpenStax Anatomy and Physiology 2e — 23.4 The Stomach',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-4-the-stomach',
  },
  'ap-23-5': {
    label: 'OpenStax Anatomy and Physiology 2e — 23.5 The Small and Large Intestines',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-5-the-small-and-large-intestines',
  },
  'ap-23-6': {
    label: 'OpenStax Anatomy and Physiology 2e — 23.6 Accessory Organs in Digestion: The Liver, Pancreas, and Gallbladder',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder',
  },
  'ap-25-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 25.2 Gross Anatomy of Urine Transport',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-2-gross-anatomy-of-urine-transport',
  },
  'ap-25-3': {
    label: 'OpenStax Anatomy and Physiology 2e — 25.3 Gross Anatomy of the Kidney',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/25-3-gross-anatomy-of-the-kidney',
  },
  'ap-27-1': {
    label: 'OpenStax Anatomy and Physiology 2e — 27.1 Anatomy and Physiology of the Testicular Reproductive System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/27-1-anatomy-and-physiology-of-the-testicular-reproductive-system',
  },
  'ap-27-2': {
    label: 'OpenStax Anatomy and Physiology 2e — 27.2 Anatomy and Physiology of the Ovarian Reproductive System',
    url: 'https://openstax.org/books/anatomy-and-physiology-2e/pages/27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system',
  },
  'up2-9-1': {
    label: 'OpenStax University Physics Volume 2 — 9.1 Electrical Current',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/9-1-electrical-current',
  },
  'up2-9-4': {
    label: 'OpenStax University Physics Volume 2 — 9.4 Ohm’s Law',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/9-4-ohms-law',
  },
  'up2-9-5': {
    label: 'OpenStax University Physics Volume 2 — 9.5 Electrical Energy and Power',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/9-5-electrical-energy-and-power',
  },
  'up2-10-1': {
    label: 'OpenStax University Physics Volume 2 — 10.1 Electromotive Force',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/10-1-electromotive-force',
  },
  'up2-10-2': {
    label: 'OpenStax University Physics Volume 2 — 10.2 Resistors in Series and Parallel',
    url: 'https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel',
  },
  'up1-16-1': {
    label: 'OpenStax University Physics Volume 1 — 16.1 Traveling Waves',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/16-1-traveling-waves',
  },
  'up1-16-2': {
    label: 'OpenStax University Physics Volume 1 — 16.2 Mathematics of Waves',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/16-2-mathematics-of-waves',
  },
  'calc1-1-2': {
    label: 'OpenStax Calculus Volume 1 — 1.2 Basic Classes of Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/1-2-basic-classes-of-functions',
  },
  'calc1-1-3': {
    label: 'OpenStax Calculus Volume 1 — 1.3 Trigonometric Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/1-3-trigonometric-functions',
  },
  'calc1-1-5': {
    label: 'OpenStax Calculus Volume 1 — 1.5 Exponential and Logarithmic Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/1-5-exponential-and-logarithmic-functions',
  },
  'calc1-3-1': {
    label: 'OpenStax Calculus Volume 1 — 3.1 Defining the Derivative',
    url: 'https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative',
  },
  'calc1-3-3': {
    label: 'OpenStax Calculus Volume 1 — 3.3 Differentiation Rules',
    url: 'https://openstax.org/books/calculus-volume-1/pages/3-3-differentiation-rules',
  },
  'calc1-3-5': {
    label: 'OpenStax Calculus Volume 1 — 3.5 Derivatives of Trigonometric Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/3-5-derivatives-of-trigonometric-functions',
  },
  'calc1-3-9': {
    label: 'OpenStax Calculus Volume 1 — 3.9 Derivatives of Exponential and Logarithmic Functions',
    url: 'https://openstax.org/books/calculus-volume-1/pages/3-9-derivatives-of-exponential-and-logarithmic-functions',
  },
  'calc1-5-2': {
    label: 'OpenStax Calculus Volume 1 — 5.2 The Definite Integral',
    url: 'https://openstax.org/books/calculus-volume-1/pages/5-2-the-definite-integral',
  },
  'calc1-5-3': {
    label: 'OpenStax Calculus Volume 1 — 5.3 The Fundamental Theorem of Calculus',
    url: 'https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus',
  },
  'calc3-2-1': {
    label: 'OpenStax Calculus Volume 3 — 2.1 Vectors in the Plane',
    url: 'https://openstax.org/books/calculus-volume-3/pages/2-1-vectors-in-the-plane',
  },
  'calc3-2-3': {
    label: 'OpenStax Calculus Volume 3 — 2.3 The Dot Product',
    url: 'https://openstax.org/books/calculus-volume-3/pages/2-3-the-dot-product',
  },
  'calc3-2-4': {
    label: 'OpenStax Calculus Volume 3 — 2.4 The Cross Product',
    url: 'https://openstax.org/books/calculus-volume-3/pages/2-4-the-cross-product',
  },
  'ca-7-7': {
    label: 'OpenStax College Algebra 2e — 7.7 Solving Systems with Inverses',
    url: 'https://openstax.org/books/college-algebra-2e/pages/7-7-solving-systems-with-inverses',
  },
  'ca-7-8': {
    label: 'OpenStax College Algebra 2e — 7.8 Solving Systems with Cramer’s Rule',
    url: 'https://openstax.org/books/college-algebra-2e/pages/7-8-solving-systems-with-cramers-rule',
  },
  'up-4-3': {
    label: 'OpenStax University Physics Volume 1 — 4.3 Projectile Motion',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion',
  },
  'up-3-5': {
    label: 'OpenStax University Physics Volume 1 — 3.5 Free Fall',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall',
  },
  'up-15-1': {
    label: 'OpenStax University Physics Volume 1 — 15.1 Simple Harmonic Motion',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion',
  },
  'up-15-2': {
    label: 'OpenStax University Physics Volume 1 — 15.2 Energy in Simple Harmonic Motion',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/15-2-energy-in-simple-harmonic-motion',
  },
  'chem-2-3': {
    label: 'OpenStax Chemistry 2e — 2.3 Atomic Structure and Symbolism',
    url: 'https://openstax.org/books/chemistry-2e/pages/2-3-atomic-structure-and-symbolism',
  },
  'chem-6-2': {
    label: 'OpenStax Chemistry 2e — 6.2 The Bohr Model',
    url: 'https://openstax.org/books/chemistry-2e/pages/6-2-the-bohr-model',
  },
  'chem-6-3': {
    label: 'OpenStax Chemistry 2e — 6.3 Development of Quantum Theory',
    url: 'https://openstax.org/books/chemistry-2e/pages/6-3-development-of-quantum-theory',
  },
  'chem-6-4': {
    label: 'OpenStax Chemistry 2e — 6.4 Electronic Structure of Atoms (Electron Configurations)',
    url: 'https://openstax.org/books/chemistry-2e/pages/6-4-electronic-structure-of-atoms-electron-configurations',
  },
  'chem-7-1': {
    label: 'OpenStax Chemistry 2e — 7.1 Ionic Bonding',
    url: 'https://openstax.org/books/chemistry-2e/pages/7-1-ionic-bonding',
  },
  'chem-8-3': {
    label: 'OpenStax Chemistry 2e — 8.3 Multiple Bonds',
    url: 'https://openstax.org/books/chemistry-2e/pages/8-3-multiple-bonds',
  },
  'chem-10-5': {
    label: 'OpenStax Chemistry 2e — 10.5 The Solid State of Matter',
    url: 'https://openstax.org/books/chemistry-2e/pages/10-5-the-solid-state-of-matter',
  },
  'nist-isotopes': {
    label: 'NIST — Atomic Weights and Isotopic Compositions for All Elements',
    url: 'https://physics.nist.gov/cgi-bin/Compositions/stand_alone.pl',
  },
  'pubchem-periodic': {
    label: 'PubChem — Periodic Table of Elements (electron configurations, electronegativities)',
    url: 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/',
  },
  'chem-7-2': {
    label: 'OpenStax Chemistry 2e — 7.2 Covalent Bonding',
    url: 'https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding',
  },
  'chem-7-6': {
    label: 'OpenStax Chemistry 2e — 7.6 Molecular Structure and Polarity',
    url: 'https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity',
  },
  'chem-1-4': {
    label: 'OpenStax Chemistry 2e — 1.4 Measurements',
    url: 'https://openstax.org/books/chemistry-2e/pages/1-4-measurements',
  },
  'chem-3-3': {
    label: 'OpenStax Chemistry 2e — 3.3 Molarity',
    url: 'https://openstax.org/books/chemistry-2e/pages/3-3-molarity',
  },
  'bio-5-2': {
    label: 'OpenStax Biology 2e — 5.2 Passive Transport',
    url: 'https://openstax.org/books/biology-2e/pages/5-2-passive-transport',
  },
  'chem-9-1': {
    label: 'OpenStax Chemistry 2e — 9.1 Gas Pressure',
    url: 'https://openstax.org/books/chemistry-2e/pages/9-1-gas-pressure',
  },
  'chem-9-2': {
    label: 'OpenStax Chemistry 2e — 9.2 Relating Pressure, Volume, Amount, and Temperature: The Ideal Gas Law',
    url: 'https://openstax.org/books/chemistry-2e/pages/9-2-relating-pressure-volume-amount-and-temperature-the-ideal-gas-law',
  },
  'up-14-2': {
    label: 'OpenStax University Physics Volume 1 — 14.2 Measuring Pressure',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/14-2-measuring-pressure',
  },
  'chem-4-1': {
    label: 'OpenStax Chemistry 2e — 4.1 Writing and Balancing Chemical Equations',
    url: 'https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations',
  },
  'chem-4-2': {
    label: 'OpenStax Chemistry 2e — 4.2 Classifying Chemical Reactions',
    url: 'https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions',
  },
  'chem-4-3': {
    label: 'OpenStax Chemistry 2e — 4.3 Reaction Stoichiometry',
    url: 'https://openstax.org/books/chemistry-2e/pages/4-3-reaction-stoichiometry',
  },
  'chem-4-4': {
    label: 'OpenStax Chemistry 2e — 4.4 Reaction Yields',
    url: 'https://openstax.org/books/chemistry-2e/pages/4-4-reaction-yields',
  },
  'ciaaw-2024': {
    label: 'CIAAW — Abridged Standard Atomic Weights (2024 table, based on Atomic Weights 2021)',
    url: 'https://www.ciaaw.org/abridged-atomic-weights.htm',
  },
  'up3-1-1': {
    label: 'OpenStax University Physics Volume 3 — 1.1 The Propagation of Light (Table 1.1, indices of refraction)',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/1-1-the-propagation-of-light',
  },
  'up3-1-2': {
    label: 'OpenStax University Physics Volume 3 — 1.2 The Law of Reflection',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/1-2-the-law-of-reflection',
  },
  'up3-1-3': {
    label: 'OpenStax University Physics Volume 3 — 1.3 Refraction',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction',
  },
  'up3-1-4': {
    label: 'OpenStax University Physics Volume 3 — 1.4 Total Internal Reflection',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/1-4-total-internal-reflection',
  },
  'up3-2-2': {
    label: 'OpenStax University Physics Volume 3 — 2.2 Spherical Mirrors (paraxial approximation)',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/2-2-spherical-mirrors',
  },
  'up3-2-4': {
    label: 'OpenStax University Physics Volume 3 — 2.4 Thin Lenses',
    url: 'https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses',
  },
  'stat-2-2': {
    label: 'OpenStax Introductory Statistics 2e — 2.2 Histograms, Frequency Polygons, and Time Series Graphs',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/2-2-histograms-frequency-polygons-and-time-series-graphs',
  },
  'stat-2-3': {
    label: 'OpenStax Introductory Statistics 2e — 2.3 Measures of the Location of the Data',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/2-3-measures-of-the-location-of-the-data',
  },
  'stat-2-4': {
    label: 'OpenStax Introductory Statistics 2e — 2.4 Box Plots',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/2-4-box-plots',
  },
  'stat-2-5': {
    label: 'OpenStax Introductory Statistics 2e — 2.5 Measures of the Center of the Data',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/2-5-measures-of-the-center-of-the-data',
  },
  'stat-2-7': {
    label: 'OpenStax Introductory Statistics 2e — 2.7 Measures of the Spread of the Data',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/2-7-measures-of-the-spread-of-the-data',
  },
  'stat-4-3': {
    label: 'OpenStax Introductory Statistics 2e — 4.3 Binomial Distribution',
    url: 'https://openstax.org/books/introductory-statistics-2e/pages/4-3-binomial-distribution',
  },
  cccbdb: {
    label: 'NIST Computational Chemistry Comparison and Benchmark Database (CCCBDB) — experimental geometries',
    url: 'https://cccbdb.nist.gov/',
  },
  bondi: {
    label: 'Bondi, A. (1964). van der Waals Volumes and Radii. J. Phys. Chem. 68, 441–451',
    url: 'https://doi.org/10.1021/j100785a001',
  },
  'calc3-4-3': {
    label: 'OpenStax Calculus Volume 3 — 4.3 Partial Derivatives',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-3-partial-derivatives',
  },
  'calc3-4-4': {
    label: 'OpenStax Calculus Volume 3 — 4.4 Tangent Planes and Linear Approximations',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-4-tangent-planes-and-linear-approximations',
  },
  'calc3-4-6': {
    label: 'OpenStax Calculus Volume 3 — 4.6 Directional Derivatives and the Gradient',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-6-directional-derivatives-and-the-gradient',
  },
  'calc3-4-7': {
    label: 'OpenStax Calculus Volume 3 — 4.7 Maxima/Minima Problems',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-7-maxima-minima-problems',
  },
}
