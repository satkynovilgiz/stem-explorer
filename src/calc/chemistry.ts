import { parseFormula } from '../chem/stoichiometry'
import { ATOMIC_WEIGHT_ROWS } from '../data/chemistry/atomicWeights.data'
import { findElement } from '../data/chemistry/periodicTable'
import { fmt, isBlank, problem, read, solve, type Calculator, type Values } from './types'

/** Standard atomic weights as printed by CIAAW (g/mol), by symbol. */
export const STANDARD_WEIGHTS: Readonly<Record<string, string>> = Object.fromEntries(ATOMIC_WEIGHT_ROWS.map(([, symbol, w]) => [symbol, w]))

const AVOGADRO = 6.02214076e23 // mol⁻¹, exact (SI 2019)
const R = 8.314462618 // J/(mol·K) = kPa·L/(mol·K)
const KW = 1.0e-14 // at 25 °C

export const molarMass: Calculator = {
  id: 'molar-mass',
  keywords: ['molar mass', 'molecular weight', 'formula mass', 'grams to moles', 'mole', 'avogadro'],
  subject: 'chemistry',
  title: 'Molar mass',
  summary: 'The molar mass of any formula from standard atomic weights, and how many moles are in a sample.',
  formula: 'M = Σ (number of atoms × atomic weight);  n = m / M',
  fields: [
    { kind: 'text', id: 'formula', label: 'Formula', initial: 'C6H12O6', hint: 'Capitals matter: Co is cobalt, CO is carbon monoxide. Brackets work: Ca(OH)2.' },
    { kind: 'number', id: 'mass', label: 'Sample mass (optional)', unit: 'g', initial: '90', optional: true },
  ],
  compute: (v: Values) =>
    solve(() => {
      const formula = (v.formula ?? '').replace(/\s+/g, '')
      if (!formula) problem('Enter a formula, such as H2O or Ca(OH)2.')
      let counts: Record<string, number>
      try {
        counts = parseFormula(formula)
      } catch {
        return problem('Could not read that formula. Write element symbols, each followed by its count (H2O, C6H12O6), with brackets for groups: Ca(OH)2.')
      }
      // Sums in units of 10⁻⁵ g/mol (every CIAAW value has at most 5 decimals), so they are exact.
      const scaled = (w: string) => Math.round(Number(w) * 1e5)
      const show = (units: number, decimals: number) => (Math.round(units / 10 ** (5 - decimals)) / 10 ** decimals).toFixed(decimals)
      const steps: string[] = []
      const parts: number[] = []
      for (const [el, n] of Object.entries(counts)) {
        const w = STANDARD_WEIGHTS[el]
        if (!w) problem(findElement(el) ? `${el} has no standard atomic weight (it has no stable isotopes), so a molar mass cannot be given.` : `“${el}” is not an element symbol.`)
        parts.push(n * scaled(w))
        steps.push(`${el}: ${n} × ${w} g/mol = ${show(n * scaled(w), 3)} g/mol`)
      }
      const units = parts.reduce((a, b) => a + b, 0)
      const total = units / 1e5
      if (parts.length > 1) steps.push(`M = ${parts.map((u) => show(u, 3)).join(' + ')} = ${show(units, 3)} g/mol`)
      const answers = [{ label: 'Molar mass', value: `${show(units, 2)} g/mol` }]
      if (!isBlank(v, 'mass')) {
        const m = read(v, 'mass', 'the sample mass')
        const n = m / total
        steps.push(`n = m / M = ${fmt(m)} g / ${show(units, 2)} g/mol = ${fmt(n)} mol`)
        steps.push(`Particles = n × Nₐ = ${fmt(n)} mol × 6.022 × 10²³ mol⁻¹ = ${fmt(n * AVOGADRO)}`)
        answers.push({ label: 'Amount', value: `${fmt(n)} mol` }, { label: 'Formula units (molecules)', value: fmt(n * AVOGADRO) })
      }
      return { answers, steps }
    }),
  assumptions: 'Uses CIAAW abridged standard atomic weights (natural isotope mixtures). Hydrates written with a dot (CuSO₄·5H₂O) are not read; add the water as (H2O)5.',
  sourceIds: ['chem-3-1', 'ciaaw-2024'],
  related: { label: 'Stoichiometry and limiting reactant', href: '?csec=reactions&rx=ammonia-synthesis#/chemistry' },
}

const PH_KNOWN = [
  { value: 'h', label: '[H₃O⁺]' },
  { value: 'oh', label: '[OH⁻]' },
  { value: 'ph', label: 'pH' },
  { value: 'poh', label: 'pOH' },
] as const

export const phCalc: Calculator = {
  id: 'ph',
  keywords: ['pH', 'pOH', 'acid', 'base', 'hydronium', 'hydroxide', 'acidity'],
  subject: 'chemistry',
  title: 'pH and pOH',
  summary: 'From any one of pH, pOH, [H₃O⁺] or [OH⁻], the other three, and whether the solution is acidic or basic.',
  formula: 'pH = −log[H₃O⁺];  pOH = −log[OH⁻];  pH + pOH = 14.00 (25 °C)',
  fields: [
    { kind: 'choice', id: 'known', label: 'You know', initial: 'h', options: PH_KNOWN },
    { kind: 'number', id: 'h', label: '[H₃O⁺]', unit: 'mol/L', initial: '0.0025', showIf: (v) => v.known === 'h' },
    { kind: 'number', id: 'oh', label: '[OH⁻]', unit: 'mol/L', initial: '1e-4', showIf: (v) => v.known === 'oh' },
    { kind: 'number', id: 'ph', label: 'pH', initial: '3.5', showIf: (v) => v.known === 'ph' },
    { kind: 'number', id: 'poh', label: 'pOH', initial: '4', showIf: (v) => v.known === 'poh' },
  ],
  compute: (v) =>
    solve(() => {
      const steps: string[] = []
      let ph: number
      if (v.known === 'oh' || v.known === 'poh') {
        let poh: number
        if (v.known === 'oh') {
          const oh = read(v, 'oh', '[OH⁻]')
          poh = -Math.log10(oh)
          steps.push(`pOH = −log(${fmt(oh)}) = ${poh.toFixed(2)}`)
        } else {
          poh = read(v, 'poh', 'the pOH', 'any')
        }
        ph = 14 - poh
        steps.push(`pH = 14.00 − pOH = 14.00 − ${poh.toFixed(2)} = ${ph.toFixed(2)}`)
      } else if (v.known === 'ph') {
        ph = read(v, 'ph', 'the pH', 'any')
      } else {
        const h = read(v, 'h', '[H₃O⁺]')
        ph = -Math.log10(h)
        steps.push(`pH = −log(${fmt(h)}) = ${ph.toFixed(2)}`)
      }
      const poh = 14 - ph
      const h = 10 ** -ph
      const oh = KW / h
      if (v.known !== 'oh' && v.known !== 'poh') steps.push(`pOH = 14.00 − ${ph.toFixed(2)} = ${poh.toFixed(2)}`)
      if (v.known !== 'h') steps.push(`[H₃O⁺] = 10^(−pH) = 10^(−${ph.toFixed(2)}) = ${fmt(h, 3)} mol/L`)
      if (v.known !== 'oh') steps.push(`[OH⁻] = Kw / [H₃O⁺] = 1.0 × 10⁻¹⁴ / ${fmt(h, 3)} = ${fmt(oh, 3)} mol/L`)
      const nature = Math.abs(ph - 7) < 0.005 ? 'Neutral (pH 7.00)' : ph < 7 ? 'Acidic (pH below 7)' : 'Basic (pH above 7)'
      return {
        answers: [
          { label: 'pH', value: ph.toFixed(2) },
          { label: 'pOH', value: poh.toFixed(2) },
          { label: '[H₃O⁺]', value: `${fmt(h, 3)} mol/L` },
          { label: '[OH⁻]', value: `${fmt(oh, 3)} mol/L` },
          { label: 'The solution is', value: nature },
        ],
        steps,
        note: ph < 0 || ph > 14 ? 'Outside 0–14: possible only in very concentrated solutions, where concentration is a poor stand-in for activity.' : undefined,
      }
    }),
  assumptions: 'Water at 25 °C (Kw = 1.0 × 10⁻¹⁴, so pH + pOH = 14.00). Concentrations stand in for activities, which is fair for dilute solutions. pH is given to two decimal places.',
  sourceIds: ['chem-14-2'],
}

const GAS_SOLVE = [
  { value: 'P', label: 'Pressure P' },
  { value: 'V', label: 'Volume V' },
  { value: 'n', label: 'Amount n' },
  { value: 'T', label: 'Temperature T' },
] as const

export const idealGas: Calculator = {
  id: 'ideal-gas',
  keywords: ['PV = nRT', 'gas law', 'pressure', 'volume', 'temperature', 'moles of gas'],
  subject: 'chemistry',
  title: 'Ideal gas law',
  summary: 'Solve PV = nRT for pressure, volume, amount or temperature.',
  formula: 'PV = nRT,  R = 8.314 kPa·L/(mol·K)',
  fields: [
    { kind: 'choice', id: 'solveFor', label: 'Solve for', initial: 'V', options: GAS_SOLVE },
    { kind: 'number', id: 'P', label: 'Pressure P', unit: 'kPa', initial: '101.325', showIf: (v) => v.solveFor !== 'P' },
    { kind: 'number', id: 'V', label: 'Volume V', unit: 'L', initial: '22.4', showIf: (v) => v.solveFor !== 'V' },
    { kind: 'number', id: 'n', label: 'Amount n', unit: 'mol', initial: '1', showIf: (v) => v.solveFor !== 'n' },
    { kind: 'number', id: 'T', label: 'Temperature T', unit: 'K', initial: '273.15', showIf: (v) => v.solveFor !== 'T' },
  ],
  compute: (v) =>
    solve(() => {
      const get = (k: string, label: string) => (v.solveFor === k ? Number.NaN : read(v, k, label))
      const P = get('P', 'the pressure')
      const V = get('V', 'the volume')
      const n = get('n', 'the amount')
      const T = get('T', 'the temperature (in kelvin)')
      let answer: { label: string; value: string }
      let step: string
      let extra: { label: string; value: string } | null = null
      if (v.solveFor === 'P') {
        const x = (n * R * T) / V
        step = `P = nRT / V = ${fmt(n)} mol × 8.314 × ${fmt(T)} K / ${fmt(V)} L = ${fmt(x)} kPa`
        answer = { label: 'Pressure', value: `${fmt(x)} kPa` }
        extra = { label: 'In atmospheres', value: `${fmt(x / 101.325)} atm` }
      } else if (v.solveFor === 'n') {
        const x = (P * V) / (R * T)
        step = `n = PV / RT = ${fmt(P)} kPa × ${fmt(V)} L / (8.314 × ${fmt(T)} K) = ${fmt(x)} mol`
        answer = { label: 'Amount', value: `${fmt(x)} mol` }
      } else if (v.solveFor === 'T') {
        const x = (P * V) / (n * R)
        step = `T = PV / nR = ${fmt(P)} kPa × ${fmt(V)} L / (${fmt(n)} mol × 8.314) = ${fmt(x)} K`
        answer = { label: 'Temperature', value: `${fmt(x)} K` }
        extra = { label: 'In degrees Celsius', value: `${fmt(x - 273.15)} °C` }
      } else {
        const x = (n * R * T) / P
        step = `V = nRT / P = ${fmt(n)} mol × 8.314 × ${fmt(T)} K / ${fmt(P)} kPa = ${fmt(x)} L`
        answer = { label: 'Volume', value: `${fmt(x)} L` }
      }
      return { answers: extra ? [answer, extra] : [answer], steps: ['R = 8.314 kPa·L/(mol·K), because 1 kPa·L = 1 J', step] }
    }),
  assumptions: 'An ideal gas: no attraction between particles and no particle volume. Real gases follow it well at low pressure and high temperature. Temperature must be in kelvin (°C + 273.15).',
  sourceIds: ['chem-9-2'],
  related: { label: 'Boyle’s law lab (Physics)', href: '?experiment=gas#/physics' },
}

export const CHEMISTRY_CALCULATORS: readonly Calculator[] = [molarMass, phCalc, idealGas]
