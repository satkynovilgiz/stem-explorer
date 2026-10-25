import { structureLink } from '../../data/topics'
import { linkTo } from '../../lib/links'

interface Interest {
  title: string
  subjectHint: string
  links: { label: string; href: string }[]
}

/**
 * Starting points grouped by interest, not by level: every destination is an implemented view, and
 * nothing here guesses what a visitor already knows.
 */
export const INTERESTS: Interest[] = [
  {
    title: 'The human body',
    subjectHint: 'anatomy',
    links: [
      { label: 'Find the diaphragm and see what lies around it', href: structureLink('diaphragm') },
      { label: 'Open the heart and follow blood through its valves', href: linkTo('anatomy', { part: 'left-ventricle', heart: 'cutaway' }) },
      { label: 'See which muscles bend the elbow', href: structureLink('biceps-brachii-left') },
    ],
  },
  {
    title: 'How things move',
    subjectHint: 'physics',
    links: [
      { label: 'Launch a projectile and read its path', href: linkTo('physics', {}) },
      { label: 'Watch a mass oscillate on a spring', href: linkTo('physics', { experiment: 'spring' }) },
      { label: 'Change a wave’s frequency and wavelength', href: linkTo('physics', { experiment: 'wave' }) },
    ],
  },
  {
    title: 'Light and seeing',
    subjectHint: 'physics',
    links: [
      { label: 'Bend a ray of light from water into air', href: linkTo('physics', { experiment: 'optics', opt: 'refraction', n1: '1.333', n2: '1.0003', inc: '40' }) },
      { label: 'Make a magnifying glass with a thin lens', href: linkTo('physics', { experiment: 'optics', opt: 'lens', lens: 'converging', f: '10', do: '5' }) },
    ],
  },
  {
    title: 'Matter and reactions',
    subjectHint: 'chemistry',
    links: [
      { label: 'Measure the angle inside a water molecule', href: linkTo('chemistry', { molecule: 'water', view: 'ball-and-stick' }) },
      { label: 'Balance the reaction that makes ammonia', href: linkTo('chemistry', { csec: 'reactions', rx: 'ammonia-synthesis' }) },
      { label: 'Look up iron in the periodic table', href: linkTo('chemistry', { csec: 'periodic', el: '26' }) },
    ],
  },
  {
    title: 'Living things and inheritance',
    subjectHint: 'biology',
    links: [
      { label: 'Explore the parts of an animal cell', href: linkTo('biology', { cell: 'cutaway' }) },
      { label: 'Step through meiosis', href: linkTo('biology', { bsec: 'meiosis' }) },
      { label: 'Cross two pea plants with a Punnett square', href: linkTo('biology', { bsec: 'inheritance', p1: 'Yy', p2: 'Yy' }) },
    ],
  },
  {
    title: 'Patterns, data and chance',
    subjectHint: 'mathematics',
    links: [
      { label: 'Find the slope of a sine curve', href: linkTo('mathematics', { msec: 'functions', fn: 'sine' }) },
      { label: 'Summarize a set of heights', href: linkTo('mathematics', { msec: 'statistics', sv: 'describe', ds: 'heights' }) },
      { label: 'Simulate coin-like trials and compare with theory', href: linkTo('mathematics', { msec: 'statistics', sv: 'binomial', bn: '20', bp: '0.5', br: '1000', seed: '2026' }) },
    ],
  },
]

export const INTEREST_LINKS = INTERESTS.flatMap((i) => i.links.map((l) => l.href))
