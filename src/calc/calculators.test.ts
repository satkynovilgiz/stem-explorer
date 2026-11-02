import { describe, expect, it } from 'vitest'
import { ATOMIC_WEIGHTS } from '../data/chemistry/reactions'
import { SOURCES } from '../data/sources'
import { SUBJECTS } from '../data/subjects'
import { MODULES } from '../data/topics'
import { bmiCategory } from './anatomy'
import { STANDARD_WEIGHTS } from './chemistry'
import { CALCULATORS, calculatorsOf, initialValues, type Calculator } from './index'
import { fmt, parseNumber, type Outcome } from './types'

const byId = (id: string) => CALCULATORS.find((c) => c.id === id)!
const run = (id: string, values: Record<string, string> = {}) => {
  const c = byId(id)
  return c.compute({ ...initialValues(c), ...values })
}
const answers = (o: Outcome) => {
  if (!o.ok) throw new Error(o.reason)
  return Object.fromEntries(o.answers.map((a) => [a.label, a.value]))
}
const reason = (o: Outcome) => (o.ok ? '' : o.reason)

describe('every calculator', () => {
  it('has a unique id, at least three per subject, and real sources', () => {
    expect(new Set(CALCULATORS.map((c) => c.id)).size).toBe(CALCULATORS.length)
    for (const s of SUBJECTS) expect(calculatorsOf(s.id).length, s.id).toBeGreaterThanOrEqual(3)
    for (const c of CALCULATORS) {
      expect(c.sourceIds.length, c.id).toBeGreaterThan(0)
      for (const id of c.sourceIds) expect(SOURCES[id], `${c.id}: ${id}`).toBeDefined()
    }
  })

  it.each(CALCULATORS.map((c) => [c.id, c] as [string, Calculator]))('%s: its worked example calculates', (_, c) => {
    const o = c.compute(initialValues(c))
    expect(o.ok, reason(o)).toBe(true)
    if (o.ok) {
      expect(o.answers.length).toBeGreaterThan(0)
      expect(o.steps.length).toBeGreaterThan(0)
      for (const a of o.answers) expect(a.value).not.toMatch(/NaN|Infinity|undefined/)
    }
  })

  it.each(CALCULATORS.map((c) => [c.id, c] as [string, Calculator]))('%s: an empty required field asks for a value instead of failing', (_, c) => {
    const required = c.fields.find((f) => f.kind === 'number' && !f.optional && (f.showIf?.(initialValues(c)) ?? true))
    if (!required) return
    const o = c.compute({ ...initialValues(c), [required.id]: '' })
    expect(o.ok).toBe(false)
    expect(reason(o)).toMatch(/^Enter /)
  })

  it('links only to sections that exist', () => {
    for (const c of CALCULATORS.filter((x) => x.related)) {
      const [search, subject] = c.related!.href.split('#/')
      expect(MODULES.some((m) => m.subject === subject && m.matches(search)), c.id).toBe(true)
    }
  })
})

describe('number reading and formatting', () => {
  it('reads plain, signed and scientific numbers and nothing else', () => {
    expect(parseNumber('2.5')).toBe(2.5)
    expect(parseNumber('−3')).toBe(-3)
    expect(parseNumber('.5')).toBe(0.5)
    expect(parseNumber('6.02e23')).toBe(6.02e23)
    for (const t of ['', '1,5', '2x', 'e5', '1e']) expect(parseNumber(t)).toBeNaN()
  })

  it('rounds without padding and switches to powers of ten at the extremes', () => {
    expect(fmt(2)).toBe('2')
    expect(fmt(0.1 + 0.2)).toBe('0.3')
    expect(fmt(-12.345678)).toBe('−12.35')
    expect(fmt(6.02214076e23)).toBe('6.022 × 10²³')
    expect(fmt(1e-7)).toBe('1 × 10⁻⁷')
  })
})

describe('chemistry', () => {
  it('molar mass matches textbook values', () => {
    expect(answers(run('molar-mass', { formula: 'H2O', mass: '' }))['Molar mass']).toBe('18.02 g/mol')
    expect(answers(run('molar-mass', { formula: 'C6H12O6', mass: '' }))['Molar mass']).toBe('180.16 g/mol')
    expect(answers(run('molar-mass', { formula: 'NaCl', mass: '' }))['Molar mass']).toBe('58.44 g/mol')
    expect(answers(run('molar-mass', { formula: 'Ca(OH)2', mass: '' }))['Molar mass']).toBe('74.09 g/mol')
    const a = answers(run('molar-mass', { formula: 'H2O', mass: '36.03' }))
    expect(a.Amount).toBe('2 mol')
  })

  it('molar mass explains what it cannot read', () => {
    expect(reason(run('molar-mass', { formula: 'Xy2' }))).toMatch(/not an element symbol/)
    expect(reason(run('molar-mass', { formula: 'TcO2' }))).toMatch(/no standard atomic weight/)
    expect(reason(run('molar-mass', { formula: 'h2o' }))).toMatch(/Could not read/)
  })

  it('uses the same weights as the reactions lab', () => {
    for (const [el, w] of Object.entries(ATOMIC_WEIGHTS)) expect(Number(STANDARD_WEIGHTS[el]), el).toBe(w.value)
    expect(Object.keys(STANDARD_WEIGHTS)).toHaveLength(84)
  })

  it('pH, pOH and the concentrations agree at 25 °C', () => {
    const acid = answers(run('ph', { known: 'h', h: '0.001' }))
    expect(acid.pH).toBe('3.00')
    expect(acid.pOH).toBe('11.00')
    expect(acid['[OH⁻]']).toBe('1 × 10⁻¹¹ mol/L')
    expect(acid['The solution is']).toMatch(/Acidic/)
    const base = answers(run('ph', { known: 'oh', oh: '1e-4' }))
    expect(base.pH).toBe('10.00')
    expect(answers(run('ph', { known: 'ph', ph: '7' }))['The solution is']).toMatch(/Neutral/)
  })

  it('ideal gas: one mole at 0 °C and 1 atm is 22.4 L', () => {
    expect(answers(run('ideal-gas', { solveFor: 'V', P: '101.325', n: '1', T: '273.15' })).Volume).toBe('22.41 L')
    const t = answers(run('ideal-gas', { solveFor: 'T', P: '101.325', V: '22.414', n: '1' }))
    expect(t['In degrees Celsius']).toMatch(/^−?0(\.\d+)? °C$/)
  })
})

describe('physics', () => {
  it('constant acceleration', () => {
    const a = answers(run('kinematics', { v0: '5', a: '2', t: '3' }))
    expect(a['Final velocity v']).toBe('11 m/s')
    expect(a['Displacement Δx']).toBe('24 m')
  })

  it('projectile from the ground at 45°', () => {
    const a = answers(run('projectile', { v0: '20', angle: '45', h: '0' }))
    expect(a['Time of flight']).toBe('2.883 s')
    expect(a.Range).toBe('40.77 m')
    expect(a['Maximum height']).toBe('10.19 m')
    expect(reason(run('projectile', { angle: '100' }))).toMatch(/0° to 90°/)
  })

  it('Ohm’s law and power', () => {
    const a = answers(run('ohms-law', { solveFor: 'I', V: '12', R: '100' }))
    expect(a.Current).toBe('0.12 A')
    expect(a['Power P']).toBe('1.44 W')
    expect(answers(run('ohms-law', { solveFor: 'R', V: '9', I: '0.03' })).Resistance).toBe('300 Ω')
  })

  it('wave speed', () => {
    expect(answers(run('wave-speed', { f: '440', lambda: '0.78' }))['Wave speed v']).toBe('343.2 m/s')
  })

  it('thin lens: real, virtual and no image', () => {
    const real = answers(run('thin-lens', { f: '10', do: '30' }))
    expect(real['Image distance dᵢ']).toBe('15 cm')
    expect(real.Image).toBe('real, inverted, reduced')
    const virtual = answers(run('thin-lens', { f: '10', do: '5' }))
    expect(virtual['Image distance dᵢ']).toBe('−10 cm')
    expect(virtual.Image).toBe('virtual, upright, enlarged')
    expect(answers(run('thin-lens', { f: '10', do: '10' })).Image).toMatch(/^None/)
    expect(reason(run('thin-lens', { f: '0' }))).toMatch(/cannot be zero/)
  })
})

describe('mathematics', () => {
  it('quadratic: real, repeated and complex roots', () => {
    const a = answers(run('quadratic', { a: '1', b: '-3', c: '-10' }))
    expect(a.Roots).toBe('x = −2 or x = 5')
    expect(a.Vertex).toBe('(1.5, −12.25), a minimum')
    expect(answers(run('quadratic', { a: '1', b: '-2', c: '1' })).Roots).toBe('x = 1 (a repeated root)')
    expect(answers(run('quadratic', { a: '1', b: '2', c: '5' })).Roots).toBe('x = −1 ± 2i')
    expect(reason(run('quadratic', { a: '0' }))).toMatch(/cannot be zero/)
  })

  it('descriptive statistics', () => {
    const a = answers(run('statistics', { data: '4, 8, 15, 16, 23, 42' }))
    expect(a['Mean x̄']).toBe('18')
    expect(a.Median).toBe('15.5')
    expect(a['Sample standard deviation s']).toBe('13.49')
    expect(a['Population standard deviation σ']).toBe('12.32')
    expect(answers(run('statistics', { data: '7' }))['Sample standard deviation s']).toMatch(/at least 2/)
    expect(reason(run('statistics', { data: '1, 2, x' }))).toMatch(/“x” is not a number/)
  })

  it('vectors', () => {
    const a = answers(run('vectors'))
    expect(a['a · b']).toBe('2')
    expect(a['a × b']).toBe('(3, 12, −9)')
    const perp = run('vectors', { ax: '1', ay: '0', az: '0', bx: '0', by: '1', bz: '0' })
    expect(answers(perp)['Angle between a and b']).toBe('90°')
    expect(perp.ok && perp.note).toMatch(/perpendicular/)
  })

  it('line through two points', () => {
    expect(answers(run('line', { x1: '1', y1: '2', x2: '4', y2: '8' })).Equation).toBe('y = 2x')
    expect(answers(run('line', { x1: '0', y1: '3', x2: '2', y2: '-1' })).Equation).toBe('y = −2x + 3')
    expect(answers(run('line', { x1: '2', y1: '1', x2: '2', y2: '5' })).Equation).toBe('x = 2')
  })
})

describe('biology', () => {
  it('Hardy–Weinberg from the recessive phenotype', () => {
    const a = answers(run('hardy-weinberg', { known: 'q2', q2: '0.16', N: '500' }))
    expect(a['Allele frequencies p, q']).toBe('0.6, 0.4')
    expect(a['Heterozygous carriers (2pq)']).toBe('48%')
    expect(a['Expected in 500']).toBe('180 AA, 240 Aa, 80 aa')
    expect(reason(run('hardy-weinberg', { q2: '16' }))).toMatch(/between 0 and 1/)
  })

  it('Michaelis–Menten: half of Vmax at [S] = Km', () => {
    const a = answers(run('michaelis-menten', { vmax: '50', km: '2', s: '2' }))
    expect(a['Initial rate v₀']).toBe('25 µmol/min')
    expect(a['Share of Vmax']).toBe('50%')
  })

  it('exponential growth and doubling time', () => {
    const a = answers(run('population-growth', { n0: '1000', r: '0.3', t: '10' }))
    expect(a['Population N(t)']).toBe('20090')
    expect(a['Doubling time']).toBe('2.31 hours')
    expect(answers(run('population-growth', { r: '-0.1' }))['Halving time']).toBe('6.931 hours')
  })

  it('magnification', () => {
    expect(answers(run('magnification', { find: 'actual', image: '30', mag: '400' }))['Actual size']).toBe('75 µm')
    expect(answers(run('magnification', { find: 'mag', image: '30', actual: '75' })).Magnification).toBe('×400')
  })
})

describe('anatomy and physiology', () => {
  it('BMI and the WHO categories', () => {
    expect(answers(run('bmi', { mass: '70', height: '175' })).BMI).toBe('22.9 kg/m²')
    expect(bmiCategory(18.4)).toMatch(/underweight/)
    expect(bmiCategory(18.5)).toMatch(/healthy/)
    expect(bmiCategory(25)).toMatch(/overweight/)
    expect(bmiCategory(30)).toMatch(/obesity/)
    expect(reason(run('bmi', { height: '1.75' }))).toMatch(/centimetres/)
  })

  it('cardiac output, MAP, ventilation and BSA', () => {
    expect(answers(run('cardiac-output', { hr: '75', sv: '70' }))['Cardiac output']).toBe('5.25 L/min')
    const map = answers(run('map', { sys: '120', dia: '80' }))
    expect(map['Pulse pressure']).toBe('40 mm Hg')
    expect(map['Mean arterial pressure']).toBe('93.3 mm Hg')
    expect(reason(run('map', { sys: '80', dia: '120' }))).toMatch(/higher/)
    const vent = answers(run('ventilation', { vt: '500', rr: '12', vd: '150' }))
    expect(vent['Minute ventilation']).toBe('6 L/min')
    expect(vent['Alveolar ventilation']).toBe('4.2 L/min')
    expect(answers(run('bsa', { height: '175', mass: '70' }))['Body surface area']).toBe('1.84 m²')
  })
})
