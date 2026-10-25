import type { BreathPhase } from '../../lib/urlState'

/*
 * Quiet breathing as a schematic, manually controlled sequence (OpenStax Anatomy and Physiology 2e
 * §22.3). The user chooses a phase and how far through it the drawing is (0–100 %); nothing here is
 * a time, a rate or a volume in litres, and nothing describes any person's breathing.
 *
 * - Inspiration: the diaphragm contracts and moves inferiorly, the external intercostals lift the
 *   ribs up and out, the thoracic cavity enlarges, the lungs follow it, intra-alveolar pressure falls
 *   below atmospheric and air flows in (Boyle's law).
 * - Quiet expiration: the muscles relax, the lungs' elastic recoil reduces the volume, intra-alveolar
 *   pressure rises above atmospheric and air flows out. Quiet expiration is passive.
 * - At the end of each phase the pressures are equal and air does not flow.
 * Gas exchange (§22.4) is a separate process: diffusion of O₂ and CO₂ across the respiratory
 * membrane, driven by partial-pressure differences, in the respiratory zone only (§22.1).
 */

export type Airflow = 'in' | 'out' | 'none'

/** How enlarged the thorax is: 0 = resting (end of expiration), 1 = end of a quiet inspiration. */
export function expansion(phase: BreathPhase, position: number): number {
  const f = Math.min(100, Math.max(0, position)) / 100
  return phase === 'inspiration' ? f : 1 - f
}

/** Air moves only while the volume is changing; at either end of a phase the pressures are equal. */
export function airflow(phase: BreathPhase, position: number): Airflow {
  if (position <= 0 || position >= 100) return 'none'
  return phase === 'inspiration' ? 'in' : 'out'
}

/** Intra-alveolar pressure compared with atmospheric pressure. */
export function alveolarPressure(phase: BreathPhase, position: number): 'below' | 'above' | 'equal' {
  const f = airflow(phase, position)
  return f === 'in' ? 'below' : f === 'out' ? 'above' : 'equal'
}

export interface BreathStage {
  title: string
  muscles: string
  pressure: string
  air: string
}

export function describeStage(phase: BreathPhase, position: number): BreathStage {
  const flow = airflow(phase, position)
  if (phase === 'inspiration') {
    if (position <= 0)
      return { title: 'Between breaths', muscles: 'Diaphragm and external intercostals relaxed.', pressure: 'Pressure in the alveoli equals atmospheric pressure.', air: 'No airflow.' }
    if (position >= 100)
      return { title: 'End of inspiration', muscles: 'Diaphragm and external intercostals still contracted.', pressure: 'Pressure in the alveoli has risen back to atmospheric.', air: 'Airflow stops.' }
    return {
      title: 'Inspiration',
      muscles: 'The diaphragm contracts and moves down (inferiorly); the external intercostals lift the ribs up and out. The thoracic cavity enlarges and the lungs follow it.',
      pressure: 'The larger volume lowers the pressure in the alveoli below atmospheric pressure.',
      air: flow === 'in' ? 'Air flows in through the airways, from higher to lower pressure.' : '',
    }
  }
  if (position <= 0)
    return { title: 'Start of expiration', muscles: 'The diaphragm and external intercostals begin to relax.', pressure: 'Pressure in the alveoli equals atmospheric pressure.', air: 'No airflow yet.' }
  if (position >= 100)
    return { title: 'End of expiration', muscles: 'Muscles relaxed; the thorax is back at its resting size.', pressure: 'Pressure in the alveoli equals atmospheric pressure again.', air: 'Airflow stops.' }
  return {
    title: 'Expiration (quiet)',
    muscles: 'The muscles relax and the elastic lungs recoil: quiet expiration is passive. The diaphragm returns upward (superiorly) and the ribs move down and in.',
    pressure: 'The smaller volume raises the pressure in the alveoli above atmospheric pressure.',
    air: 'Air flows out through the airways.',
  }
}

/** Plain-text summary of the drawing, for screen readers and as a caption. */
export function breathingSummary(phase: BreathPhase, position: number): string {
  const s = describeStage(phase, position)
  return `${s.title}, ${position}% through ${phase}. ${s.muscles} ${s.pressure} ${s.air}`.replace(/\s+/g, ' ').trim()
}

export const BREATHING_SOURCES = { mechanics: 'ap-22-3', exchange: 'ap-22-4', airways: 'ap-22-1', lungs: 'ap-22-2' } as const
