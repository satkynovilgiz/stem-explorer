import type { ReferenceEntry } from '../../types'

export const CALCULUS: ReferenceEntry[] = [
  {
    id: 'power-rule',
    type: 'formula',
    kind: 'theorem',
    subject: 'mathematics',
    category: 'Derivatives',
    title: 'Power rule for derivatives',
    summary: 'The derivative of xⁿ is n·xⁿ⁻¹.',
    tags: ['derivative', 'differentiation rules', 'polynomial'],
    level: 'introductory',
    latex: '\\frac{d}{dx}\\,x^{n} = n\\,x^{n-1}',
    plain: 'd/dx x^n = n x^(n-1)',
    symbols: [
      { symbol: 'x', meaning: 'the variable', unit: 'dimensionless (a real number)' },
      { symbol: 'n', meaning: 'a constant exponent', unit: 'dimensionless' },
    ],
    units: 'Pure mathematics: no units. Applied to a quantity with units, the derivative has the units of y divided by the units of x.',
    domain: [
      'Holds for every integer n, at every x where xⁿ and xⁿ⁻¹ are defined (x ≠ 0 when n − 1 is negative).',
      'For a non-integer real n the rule also holds for x > 0.',
    ],
    explanation: [
      'For a positive integer n, expanding (x + h)ⁿ by the binomial theorem in the limit definition of the derivative leaves n·xⁿ⁻¹ once h → 0: every other term contains a factor of h.',
      'The rule extends to negative integers through the quotient rule, and to real exponents for positive x. Together with the sum and constant-multiple rules it differentiates any polynomial term by term.',
    ],
    conditions: ['n must be a constant. For a variable exponent, such as 2ˣ or xˣ, the power rule does not apply.'],
    examples: [
      {
        problem: 'Differentiate f(x) = 4x³ − 5x + 7, and find the slope at x = 2.',
        steps: ['Term by term: $\\frac{d}{dx}(4x^3) = 12x^2$, $\\frac{d}{dx}(-5x) = -5$, $\\frac{d}{dx}(7) = 0$.', 'So $f\\prime(x) = 12x^2 - 5$ and $f\\prime(2) = 12 \\cdot 4 - 5$.'],
        answer: 'f′(x) = 12x² − 5, and the slope at x = 2 is 43.',
        check: { value: 12 * 2 ** 2 - 5, expected: 43 },
      },
      {
        problem: 'Differentiate g(x) = 1/x² for x ≠ 0.',
        steps: ['Write $g(x) = x^{-2}$, an integer power.', '$g\\prime(x) = -2x^{-3}$.'],
        answer: 'g′(x) = −2/x³, for x ≠ 0.',
      },
    ],
    mistakes: ['Differentiating 2ˣ as x·2ˣ⁻¹. The exponent varies, so the exponential rule applies: (2ˣ)′ = 2ˣ ln 2.'],
    related: [{ id: 'free-fall-position', why: 'The power rule turns the free-fall position y(t) into the velocity and acceleration.' }],
    sources: [
      { id: 'calc1-3-3', locator: '§3.3 The Power Rule; extension to negative integers' },
      { id: 'calc1-3-9', locator: '§3.9 power rule for real exponents' },
    ],
    links: [{ label: 'Derivatives and motion', href: '?msec=motion#/mathematics', kind: 'lab' }],
  },
]
