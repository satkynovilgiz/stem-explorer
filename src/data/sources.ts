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
  'chem-7-2': {
    label: 'OpenStax Chemistry 2e — 7.2 Covalent Bonding',
    url: 'https://openstax.org/books/chemistry-2e/pages/7-2-covalent-bonding',
  },
  'chem-7-6': {
    label: 'OpenStax Chemistry 2e — 7.6 Molecular Structure and Polarity',
    url: 'https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity',
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
