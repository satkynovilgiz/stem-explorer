import type { ReferenceEntry } from '../../types'

const G = 9.81

export const KINEMATICS: ReferenceEntry[] = [
  {
    id: 'free-fall-position',
    type: 'formula',
    kind: 'equation',
    subject: 'physics',
    category: 'Kinematics',
    topic: 'Free fall',
    title: 'Position in free fall',
    summary: 'The height of an object moving only under gravity, as a function of time, when up is taken as positive.',
    aliases: ['vertical throw equation', 'free-fall displacement'],
    tags: ['free fall', 'gravity', 'constant acceleration', 'projectile'],
    level: 'introductory',
    prerequisites: [],
    latex: 'y(t) = y_0 + v_0 t - \\tfrac{1}{2} g t^2',
    plain: 'y = y0 + v0 t - 1/2 g t^2',
    symbols: [
      { symbol: 'y(t)', meaning: 'height (vertical position) at time t', unit: 'm' },
      { symbol: 'y_0', meaning: 'height at t = 0', unit: 'm' },
      { symbol: 'v_0', meaning: 'vertical velocity at t = 0; positive means upward', unit: 'm/s' },
      { symbol: 'g', meaning: 'magnitude of the acceleration due to gravity (about 9.81 m/s² near Earth’s surface)', unit: 'm/s²' },
      { symbol: 't', meaning: 'time since t = 0', unit: 's' },
    ],
    units: 'SI: metres, seconds, m/s and m/s². Any consistent set works (feet with g = 32.2 ft/s²).',
    domain: ['Valid while the object is in flight: from t = 0 until it lands or hits something.', 'g is treated as constant, so the height change must be small compared with Earth’s radius.'],
    vector: 'component',
    exactness: 'model',
    scope: 'special-case',
    quantity: 'instantaneous',
    conventions: ['Up is positive, so the acceleration is −g throughout the flight: on the way up, at the top and on the way down.'],
    explanation: [
      'Near Earth’s surface, an object that moves only under gravity has a constant downward acceleration of magnitude g. Its vertical motion is therefore motion with constant acceleration a = −g, and the general constant-acceleration position equation becomes this one.',
      'The three terms are the starting height, the distance the starting velocity alone would carry the object, and the drop caused by gravity, which grows with the square of time.',
    ],
    conditions: ['Air resistance is ignored; it matters for light or fast objects.', 'g varies slightly with latitude, altitude and local geology (about 9.78–9.83 m/s²).'],
    examples: [
      {
        title: 'When does a thrown ball land?',
        problem: 'A ball leaves a hand 1.0 m above the ground moving upward at 5.0 m/s. When does it reach the ground?',
        steps: [
          'Landing means $y(t) = 0$: $0 = 1.0 + 5.0\\,t - \\tfrac12 (9.81)\\,t^2$.',
          'Solve the quadratic for the positive root: $t = \\dfrac{v_0 + \\sqrt{v_0^2 + 2 g y_0}}{g} = \\dfrac{5.0 + \\sqrt{25 + 19.62}}{9.81}$.',
          '$\\sqrt{44.62} \\approx 6.680$, so $t \\approx 11.68 / 9.81$.',
        ],
        answer: 't ≈ 1.19 s (the negative root, about −0.17 s, is before the throw and is discarded).',
        check: { value: (5 + Math.sqrt(25 + 2 * G * 1)) / G, expected: 1.1906, relTol: 1e-4, unit: 's' },
      },
    ],
    mistakes: [
      'Setting the acceleration to zero at the highest point. The velocity is zero there; the acceleration is still −g.',
      'Using +g with up taken as positive. With up positive, gravity contributes −½gt².',
    ],
    related: [
      { id: 'power-rule', why: 'Differentiating y(t) with the power rule gives the velocity v(t) = v₀ − gt and the acceleration −g.' },
    ],
    sources: [
      { id: 'up-3-5', locator: '§3.5 Free Fall (value of g and its range; up-positive convention)' },
      { id: 'up1-3-4', locator: '§3.4 kinematic equations for constant acceleration' },
    ],
    links: [{ label: 'Vertical throw in Derivatives and motion', href: '?msec=motion&mo=vertical-throw&my0=1&mv0=5&mt=0&mdt=0.5&mex=phys#/mathematics', kind: 'lab' }],
    modelLimitations: ['The motion lab uses g = 9.81 m/s², no air resistance and stops the motion at y = 0.'],
  },
]
