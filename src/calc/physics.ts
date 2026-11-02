import { thinLens } from '../physics/optics'
import { fmt, problem, read, solve, type Calculator } from './types'

const G = 9.81 // m/s², the value the Physics labs start from

export const kinematics: Calculator = {
  id: 'kinematics',
  keywords: ['suvat', 'kinematics', 'velocity', 'acceleration', 'displacement', 'equations of motion'],
  subject: 'physics',
  title: 'Constant acceleration',
  summary: 'Final velocity and displacement after a time, from the initial velocity and a constant acceleration.',
  formula: 'v = v₀ + at;  Δx = v₀t + ½at²',
  fields: [
    { kind: 'number', id: 'v0', label: 'Initial velocity v₀', unit: 'm/s', initial: '5' },
    { kind: 'number', id: 'a', label: 'Acceleration a', unit: 'm/s²', initial: '2' },
    { kind: 'number', id: 't', label: 'Time t', unit: 's', initial: '3' },
  ],
  compute: (v) =>
    solve(() => {
      const v0 = read(v, 'v0', 'the initial velocity', 'any')
      const a = read(v, 'a', 'the acceleration', 'any')
      const t = read(v, 't', 'the time', 'nonNegative')
      const vf = v0 + a * t
      const dx = v0 * t + 0.5 * a * t * t
      return {
        answers: [
          { label: 'Final velocity v', value: `${fmt(vf)} m/s` },
          { label: 'Displacement Δx', value: `${fmt(dx)} m` },
          { label: 'Average velocity', value: t > 0 ? `${fmt(dx / t)} m/s` : '—' },
        ],
        steps: [
          `v = v₀ + at = ${fmt(v0)} + (${fmt(a)})(${fmt(t)}) = ${fmt(vf)} m/s`,
          `Δx = v₀t + ½at² = (${fmt(v0)})(${fmt(t)}) + ½(${fmt(a)})(${fmt(t)})² = ${fmt(dx)} m`,
        ],
      }
    }),
  assumptions: 'Motion in a straight line with constant acceleration. Signs give direction: choose one direction as positive and keep to it.',
  sourceIds: ['up1-3-4'],
  related: { label: 'Derivatives and motion (Mathematics)', href: '?msec=motion#/mathematics' },
}

const OHM_SOLVE = [
  { value: 'I', label: 'Current I' },
  { value: 'V', label: 'Voltage V' },
  { value: 'R', label: 'Resistance R' },
] as const

export const ohmsLaw: Calculator = {
  id: 'ohms-law',
  keywords: ['ohm', 'V = IR', 'current', 'voltage', 'resistance', 'electrical power'],
  subject: 'physics',
  title: 'Ohm’s law and power',
  summary: 'Solve V = IR for current, voltage or resistance, and find the power dissipated.',
  formula: 'V = IR;  P = IV = I²R = V²/R',
  fields: [
    { kind: 'choice', id: 'solveFor', label: 'Solve for', initial: 'I', options: OHM_SOLVE },
    { kind: 'number', id: 'V', label: 'Voltage V', unit: 'V', initial: '12', showIf: (v) => v.solveFor !== 'V' },
    { kind: 'number', id: 'I', label: 'Current I', unit: 'A', initial: '0.5', showIf: (v) => v.solveFor !== 'I' },
    { kind: 'number', id: 'R', label: 'Resistance R', unit: 'Ω', initial: '100', showIf: (v) => v.solveFor !== 'R' },
  ],
  compute: (v) =>
    solve(() => {
      let V: number, I: number, R: number, step: string
      if (v.solveFor === 'V') {
        I = read(v, 'I', 'the current')
        R = read(v, 'R', 'the resistance')
        V = I * R
        step = `V = IR = ${fmt(I)} A × ${fmt(R)} Ω = ${fmt(V)} V`
      } else if (v.solveFor === 'R') {
        V = read(v, 'V', 'the voltage')
        I = read(v, 'I', 'the current')
        R = V / I
        step = `R = V / I = ${fmt(V)} V / ${fmt(I)} A = ${fmt(R)} Ω`
      } else {
        V = read(v, 'V', 'the voltage')
        R = read(v, 'R', 'the resistance')
        I = V / R
        step = `I = V / R = ${fmt(V)} V / ${fmt(R)} Ω = ${fmt(I)} A`
      }
      const P = I * V
      const solved = v.solveFor === 'V' ? { label: 'Voltage', value: `${fmt(V)} V` } : v.solveFor === 'R' ? { label: 'Resistance', value: `${fmt(R)} Ω` } : { label: 'Current', value: `${fmt(I)} A` }
      const extra = v.solveFor === 'I' ? [{ label: 'In milliamps', value: `${fmt(I * 1000)} mA` }] : []
      return {
        answers: [solved, ...extra, { label: 'Power P', value: `${fmt(P)} W` }],
        steps: [step, `P = IV = ${fmt(I)} A × ${fmt(V)} V = ${fmt(P)} W`],
      }
    }),
  assumptions: 'An ohmic resistor: its resistance does not change with current (a filament lamp, for one, is not ohmic). Wires are ideal.',
  sourceIds: ['up2-9-4', 'up2-9-5'],
  related: { label: 'DC circuits lab', href: '?experiment=circuit#/physics' },
}

export const projectile: Calculator = {
  id: 'projectile',
  keywords: ['projectile', 'range', 'time of flight', 'maximum height', 'launch angle'],
  subject: 'physics',
  title: 'Projectile range and flight time',
  summary: 'Time of flight, range and maximum height of a launch, from its speed, angle and launch height.',
  formula: 'vₓ = v₀cos θ;  v_y = v₀sin θ;  y = h + v_y t − ½gt²;  R = vₓ t',
  fields: [
    { kind: 'number', id: 'v0', label: 'Launch speed v₀', unit: 'm/s', initial: '20' },
    { kind: 'number', id: 'angle', label: 'Launch angle θ (above horizontal)', unit: '°', initial: '45' },
    { kind: 'number', id: 'h', label: 'Launch height h', unit: 'm', initial: '0' },
  ],
  compute: (v) =>
    solve(() => {
      const v0 = read(v, 'v0', 'the launch speed')
      const deg = read(v, 'angle', 'the launch angle', 'any')
      if (deg < 0 || deg > 90) problem('Use a launch angle from 0° to 90°.')
      const h = read(v, 'h', 'the launch height', 'nonNegative')
      const th = (deg * Math.PI) / 180
      const vx = v0 * Math.cos(th)
      const vy = v0 * Math.sin(th)
      const t = (vy + Math.sqrt(vy * vy + 2 * G * h)) / G
      const range = vx * t
      const top = h + (vy * vy) / (2 * G)
      return {
        answers: [
          { label: 'Time of flight', value: `${fmt(t)} s` },
          { label: 'Range', value: `${fmt(range)} m` },
          { label: 'Maximum height', value: `${fmt(top)} m` },
        ],
        steps: [
          `vₓ = ${fmt(v0)} cos ${fmt(deg, 3)}° = ${fmt(vx)} m/s;  v_y = ${fmt(v0)} sin ${fmt(deg, 3)}° = ${fmt(vy)} m/s`,
          `Lands when h + v_y t − ½gt² = 0:  t = (v_y + √(v_y² + 2gh)) / g = ${fmt(t)} s`,
          `Range = vₓ t = ${fmt(vx)} × ${fmt(t)} = ${fmt(range)} m`,
          `Maximum height = h + v_y² / 2g = ${fmt(h)} + ${fmt(vy)}² / (2 × 9.81) = ${fmt(top)} m`,
        ],
      }
    }),
  assumptions: 'No air resistance, g = 9.81 m/s², and it lands at height 0 (flat ground below the launch point).',
  sourceIds: ['up-4-3'],
  related: { label: 'Projectile motion lab', href: '#/physics' },
}

export const waveSpeed: Calculator = {
  id: 'wave-speed',
  keywords: ['wave', 'frequency', 'wavelength', 'period', 'v = f lambda'],
  subject: 'physics',
  title: 'Wave speed, frequency and wavelength',
  summary: 'The speed and period of a wave from its frequency and wavelength.',
  formula: 'v = fλ;  T = 1/f',
  fields: [
    { kind: 'number', id: 'f', label: 'Frequency f', unit: 'Hz', initial: '440' },
    { kind: 'number', id: 'lambda', label: 'Wavelength λ', unit: 'm', initial: '0.78' },
  ],
  compute: (v) =>
    solve(() => {
      const f = read(v, 'f', 'the frequency')
      const l = read(v, 'lambda', 'the wavelength')
      return {
        answers: [
          { label: 'Wave speed v', value: `${fmt(f * l)} m/s` },
          { label: 'Period T', value: `${fmt(1 / f)} s` },
        ],
        steps: [`v = fλ = ${fmt(f)} Hz × ${fmt(l)} m = ${fmt(f * l)} m/s`, `T = 1 / f = 1 / ${fmt(f)} Hz = ${fmt(1 / f)} s`],
      }
    }),
  assumptions: 'A periodic wave in a uniform medium. The speed is set by the medium; changing the frequency changes the wavelength, not the speed.',
  sourceIds: ['up1-16-1', 'up1-16-2'],
  related: { label: 'Wave lab', href: '?experiment=wave#/physics' },
}

export const thinLensCalc: Calculator = {
  id: 'thin-lens',
  keywords: ['lens', 'lens equation', 'focal length', 'image distance', 'magnification'],
  subject: 'physics',
  title: 'Thin lens',
  summary: 'Where a lens forms an image, how large it is, and whether it is real or virtual, upright or inverted.',
  formula: '1/dₒ + 1/dᵢ = 1/f;  m = −dᵢ/dₒ',
  fields: [
    { kind: 'number', id: 'f', label: 'Focal length f (negative for a diverging lens)', unit: 'cm', initial: '10' },
    { kind: 'number', id: 'do', label: 'Object distance dₒ', unit: 'cm', initial: '30' },
  ],
  compute: (v) =>
    solve(() => {
      const f = read(v, 'f', 'the focal length', 'nonZero')
      const d0 = read(v, 'do', 'the object distance')
      const r = thinLens(f, d0)!
      if (r.atInfinity) {
        return {
          answers: [{ label: 'Image', value: 'None: the object is at the focal point, so the rays leave parallel' }],
          steps: [`1/dᵢ = 1/f − 1/dₒ = 1/${fmt(f)} − 1/${fmt(d0)} = 0`],
        }
      }
      const m = r.magnification!
      return {
        answers: [
          { label: 'Image distance dᵢ', value: `${fmt(r.di)} cm` },
          { label: 'Magnification m', value: fmt(m, 3) },
          { label: 'Image', value: `${r.type}, ${r.orientation}, ${Math.abs(m) > 1 ? 'enlarged' : Math.abs(m) < 1 ? 'reduced' : 'same size'}` },
        ],
        steps: [
          `1/dᵢ = 1/f − 1/dₒ = 1/${fmt(f)} − 1/${fmt(d0)} = ${fmt(1 / f - 1 / d0)} cm⁻¹`,
          `dᵢ = ${fmt(r.di)} cm (${r.di > 0 ? 'positive: a real image on the far side of the lens' : 'negative: a virtual image on the same side as the object'})`,
          `m = −dᵢ/dₒ = −(${fmt(r.di)}) / ${fmt(d0)} = ${fmt(m, 3)} (${m > 0 ? 'positive: upright' : 'negative: inverted'})`,
        ],
      }
    }),
  assumptions: 'A thin lens and rays close to the axis. Sign convention as in OpenStax: f > 0 for converging lenses, dᵢ > 0 for real images.',
  sourceIds: ['up3-2-4'],
  related: { label: 'Optics lab', href: '?experiment=optics#/physics' },
}

export const PHYSICS_CALCULATORS: readonly Calculator[] = [kinematics, projectile, ohmsLaw, waveSpeed, thinLensCalc]
