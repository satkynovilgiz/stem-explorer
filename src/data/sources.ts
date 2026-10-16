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
  'up-4-3': {
    label: 'OpenStax University Physics Volume 1 — 4.3 Projectile Motion',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion',
  },
  'up-3-5': {
    label: 'OpenStax University Physics Volume 1 — 3.5 Free Fall',
    url: 'https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall',
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
  'calc3-4-7': {
    label: 'OpenStax Calculus Volume 3 — 4.7 Maxima/Minima Problems',
    url: 'https://openstax.org/books/calculus-volume-3/pages/4-7-maxima-minima-problems',
  },
}
