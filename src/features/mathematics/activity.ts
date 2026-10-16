import { defaultParams, getSurface, MATH_SOURCES } from '../../math/surfaces'
import type { ActivityDef } from '../activities/types'
import { initialMathState, type MathState } from './state'

/** Setup: the saddle with its default a = b = 0.5 and a cross-section at x = 1. */
export const saddleSetup = (): MathState => initialMathState('saddle', defaultParams(getSurface('saddle')), { axis: 'x', value: 1 })

const onSaddle = (s: MathState) => s.surfaceId === 'saddle'

export const MATHEMATICS_ACTIVITY: ActivityDef<MathState> = {
  id: 'saddle-sections',
  subject: 'mathematics',
  title: 'Slice a saddle two ways',
  goal: 'Compare the x = constant and y = constant cross-sections of a saddle and find its saddle point.',
  setup: 'Opens z = a·x² − b·y² with a = b = 0.5 and a vertical cross-section at x = 1. Any inspected point is cleared.',
  changes: (s) => [
    `Surface → Saddle (hyperbolic paraboloid)${onSaddle(s) ? ' (already)' : ` (now ${getSurface(s.surfaceId).name})`}`,
    'Parameters → a = 0.5, b = 0.5 (the defaults)',
    `Cross-section → x = 1${s.slice ? '' : ' (now off)'}`,
    ...(s.point ? ['Inspected point cleared'] : []),
  ],
  steps: [
    {
      title: 'Read the x = 1 section',
      text: 'The cross-section graph shows z = 0.5·1² − 0.5·y² = 0.5 − 0.5y². Look at it under Cross-section: which way does the parabola open?',
    },
    {
      title: 'Switch to y = constant',
      text: 'Under Cross-section, change the direction to y = constant.',
      done: (s) => onSaddle(s) && s.slice?.axis === 'y',
      waitingFor: 'a y = constant cross-section on the saddle',
    },
    {
      title: 'Compare the two shapes',
      text: 'Now the section is z = 0.5x² − 0.5c². It opens the other way. Move the position slider: the curve shifts up or down, but keeps opening upward.',
    },
    {
      title: 'Inspect the point (0, 0)',
      text: 'Under Point, enter x = 0 and y = 0 (or click the centre of the surface). Here the surface is level, yet it rises along x and falls along y.',
      hint: 'Type 0 in both coordinate fields and press Enter.',
      done: (s) => onSaddle(s) && !!s.point && Math.abs(s.point.x) <= 0.1 && Math.abs(s.point.y) <= 0.1,
      waitingFor: 'a point inspected within 0.1 of (0, 0)',
    },
  ],
  conclusion:
    'A vertical section at x = c cuts the saddle in a downward-opening parabola (z = a·c² − b·y²). A section at y = c gives an upward-opening one (z = a·x² − b·c²). Because the surface curves up in one direction and down in the other, the origin is a saddle point: the surface is level there, but it is neither a highest nor a lowest point.',
  sources: [
    { label: 'OpenStax Calculus Volume 3 — 4.7 Maxima/Minima Problems', url: 'https://openstax.org/books/calculus-volume-3/pages/4-7-maxima-minima-problems' },
    { label: MATH_SOURCES['calc3-2-6'].label, url: MATH_SOURCES['calc3-2-6'].url },
  ],
}
