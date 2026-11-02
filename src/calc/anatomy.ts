import { fmt, problem, read, solve, type Calculator } from './types'

const NOT_MEDICAL = 'For learning only, not for diagnosis or treatment.'

/** WHO adult BMI cut-offs. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Below 18.5: underweight'
  if (bmi < 25) return '18.5 to under 25: the healthy range'
  if (bmi < 30) return '25 to under 30: overweight'
  return '30 or more: obesity'
}

export const bmi: Calculator = {
  id: 'bmi',
  keywords: ['BMI', 'body mass index', 'weight', 'height'],
  subject: 'anatomy',
  title: 'Body mass index (BMI)',
  summary: 'BMI from mass and height, and where it falls in the WHO adult categories.',
  formula: 'BMI = mass (kg) / height (m)²',
  fields: [
    { kind: 'number', id: 'mass', label: 'Body mass', unit: 'kg', initial: '70' },
    { kind: 'number', id: 'height', label: 'Height', unit: 'cm', initial: '175' },
  ],
  compute: (v) =>
    solve(() => {
      const m = read(v, 'mass', 'the body mass')
      const hcm = read(v, 'height', 'the height')
      if (hcm < 50 || hcm > 260) problem('Enter the height in centimetres (for example 175).')
      const h = hcm / 100
      const x = m / (h * h)
      return {
        answers: [
          { label: 'BMI', value: `${x.toFixed(1)} kg/m²` },
          { label: 'WHO adult category', value: bmiCategory(x) },
        ],
        steps: [`Height = ${fmt(hcm)} cm / 100 = ${fmt(h)} m`, `BMI = ${fmt(m)} kg / (${fmt(h)} m)² = ${x.toFixed(1)} kg/m²`],
      }
    }),
  assumptions: `For adults only (children use age- and sex-specific charts). BMI does not measure body fat or tell muscle from fat. ${NOT_MEDICAL}`,
  sourceIds: ['who-bmi', 'who-obesity'],
}

export const cardiacOutput: Calculator = {
  id: 'cardiac-output',
  keywords: ['cardiac output', 'stroke volume', 'heart rate', 'CO = HR × SV'],
  subject: 'anatomy',
  title: 'Cardiac output',
  summary: 'The volume of blood the heart pumps each minute, from heart rate and stroke volume.',
  formula: 'CO = HR × SV',
  fields: [
    { kind: 'number', id: 'hr', label: 'Heart rate HR', unit: 'beats/min', initial: '75' },
    { kind: 'number', id: 'sv', label: 'Stroke volume SV', unit: 'mL/beat', initial: '70' },
  ],
  compute: (v) =>
    solve(() => {
      const hr = read(v, 'hr', 'the heart rate')
      const sv = read(v, 'sv', 'the stroke volume')
      const co = hr * sv
      return {
        answers: [
          { label: 'Cardiac output', value: `${fmt(co / 1000, 3)} L/min` },
          { label: 'In mL/min', value: `${fmt(co)} mL/min` },
        ],
        steps: [`CO = ${fmt(hr)} beats/min × ${fmt(sv)} mL/beat = ${fmt(co)} mL/min`, `${fmt(co)} mL/min ÷ 1000 = ${fmt(co / 1000, 3)} L/min`],
      }
    }),
  assumptions: `Stroke volume is the blood ejected by one ventricle per beat (end-diastolic minus end-systolic volume). ${NOT_MEDICAL}`,
  sourceIds: ['ap-19-4'],
  related: { label: 'Heart explorer', href: '?heart=whole#/anatomy' },
}

export const meanArterialPressure: Calculator = {
  id: 'map',
  keywords: ['blood pressure', 'mean arterial pressure', 'MAP', 'pulse pressure', 'systolic', 'diastolic'],
  subject: 'anatomy',
  title: 'Mean arterial pressure',
  summary: 'Pulse pressure and the mean arterial pressure (MAP) from a blood-pressure reading.',
  formula: 'Pulse pressure = systolic − diastolic;  MAP = diastolic + pulse pressure / 3',
  fields: [
    { kind: 'number', id: 'sys', label: 'Systolic pressure', unit: 'mm Hg', initial: '120' },
    { kind: 'number', id: 'dia', label: 'Diastolic pressure', unit: 'mm Hg', initial: '80' },
  ],
  compute: (v) =>
    solve(() => {
      const sys = read(v, 'sys', 'the systolic pressure')
      const dia = read(v, 'dia', 'the diastolic pressure')
      if (sys <= dia) problem('Systolic pressure (the top number) is higher than diastolic pressure (the bottom number).')
      const pp = sys - dia
      const map = dia + pp / 3
      return {
        answers: [
          { label: 'Pulse pressure', value: `${fmt(pp, 3)} mm Hg` },
          { label: 'Mean arterial pressure', value: `${fmt(map, 3)} mm Hg` },
        ],
        steps: [`Pulse pressure = ${fmt(sys)} − ${fmt(dia)} = ${fmt(pp)} mm Hg`, `MAP = ${fmt(dia)} + ${fmt(pp)} / 3 = ${fmt(map)} mm Hg`],
      }
    }),
  assumptions: `The one-third rule holds at resting heart rates, when diastole lasts about twice as long as systole. ${NOT_MEDICAL}`,
  sourceIds: ['ap-20-2'],
}

export const ventilation: Calculator = {
  id: 'ventilation',
  keywords: ['minute ventilation', 'alveolar ventilation', 'tidal volume', 'dead space', 'breathing rate'],
  subject: 'anatomy',
  title: 'Minute and alveolar ventilation',
  summary: 'How much air moves in and out each minute, and how much of it reaches the alveoli.',
  formula: 'Minute ventilation = tidal volume × rate;  alveolar ventilation = (tidal volume − dead space) × rate',
  fields: [
    { kind: 'number', id: 'vt', label: 'Tidal volume', unit: 'mL', initial: '500' },
    { kind: 'number', id: 'rr', label: 'Respiratory rate', unit: 'breaths/min', initial: '12' },
    { kind: 'number', id: 'vd', label: 'Anatomical dead space', unit: 'mL', initial: '150' },
  ],
  compute: (v) =>
    solve(() => {
      const vt = read(v, 'vt', 'the tidal volume')
      const rr = read(v, 'rr', 'the respiratory rate')
      const vd = read(v, 'vd', 'the dead space', 'nonNegative')
      if (vd >= vt) problem('The dead space must be smaller than the tidal volume, or no fresh air reaches the alveoli.')
      const ve = vt * rr
      const va = (vt - vd) * rr
      return {
        answers: [
          { label: 'Minute ventilation', value: `${fmt(ve / 1000, 3)} L/min` },
          { label: 'Alveolar ventilation', value: `${fmt(va / 1000, 3)} L/min` },
        ],
        steps: [`Minute ventilation = ${fmt(vt)} mL × ${fmt(rr)}/min = ${fmt(ve)} mL/min`, `Alveolar ventilation = (${fmt(vt)} − ${fmt(vd)}) mL × ${fmt(rr)}/min = ${fmt(va)} mL/min`],
        note: 'Dead-space air fills the airways but never reaches the alveoli, so it takes no part in gas exchange.',
      }
    }),
  assumptions: `Every breath has the same tidal volume, and the dead space is the conducting airways only. ${NOT_MEDICAL}`,
  sourceIds: ['ap-22-3'],
  related: { label: 'Breathing mechanics', href: '?breath=inspiration&bpos=0&bshow=airflow#/anatomy' },
}

export const bodySurfaceArea: Calculator = {
  id: 'bsa',
  keywords: ['body surface area', 'BSA', 'Mosteller'],
  subject: 'anatomy',
  title: 'Body surface area (Mosteller)',
  summary: 'An estimate of body surface area from height and mass, as used to scale physiological values.',
  formula: 'BSA (m²) = √(height (cm) × mass (kg) / 3600)',
  fields: [
    { kind: 'number', id: 'height', label: 'Height', unit: 'cm', initial: '175' },
    { kind: 'number', id: 'mass', label: 'Body mass', unit: 'kg', initial: '70' },
  ],
  compute: (v) =>
    solve(() => {
      const h = read(v, 'height', 'the height')
      const m = read(v, 'mass', 'the body mass')
      const bsa = Math.sqrt((h * m) / 3600)
      return {
        answers: [{ label: 'Body surface area', value: `${bsa.toFixed(2)} m²` }],
        steps: [`BSA = √(${fmt(h)} × ${fmt(m)} / 3600) = √${fmt((h * m) / 3600)} = ${bsa.toFixed(2)} m²`],
      }
    }),
  assumptions: `An empirical formula (one of several); it estimates surface area, it does not measure it. ${NOT_MEDICAL}`,
  sourceIds: ['mosteller-1987'],
}

export const ANATOMY_CALCULATORS: readonly Calculator[] = [bmi, cardiacOutput, meanArterialPressure, ventilation, bodySurfaceArea]
