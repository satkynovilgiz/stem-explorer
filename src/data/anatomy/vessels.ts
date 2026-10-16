import type { HeartPartId } from './heart'

/*
 * Facts for comparing the great vessels in the model. They restate the heart entries (OpenStax A&P 2e
 * §19.1) in a comparable form; naming by direction follows §20.1. Context: a normal adult heart after
 * birth, as drawn in this schematic model.
 */

export const VESSEL_IDS = ['aorta', 'pulmonary-trunk', 'pulmonary-veins', 'superior-vena-cava', 'inferior-vena-cava'] as const
export type VesselId = (typeof VESSEL_IDS)[number]

export interface VesselFacts {
  /** Relative to the heart. */
  direction: 'away' | 'toward'
  /** Named by direction: away = artery, toward = vein. */
  type: 'artery' | 'vein'
  /** The chamber the vessel leaves or enters, and how. */
  connection: string
  connectedChamber: HeartPartId
  circuit: 'pulmonary' | 'systemic'
  /** In the model's normal adult circulation (diagram colour). */
  oxygenation: 'poor' | 'rich'
  function: string
  sourceIds: string[]
}

export const VESSEL_FACTS: Record<VesselId, VesselFacts> = {
  aorta: {
    direction: 'away',
    type: 'artery',
    connection: 'Leaves the left ventricle through the aortic valve',
    connectedChamber: 'left-ventricle',
    circuit: 'systemic',
    oxygenation: 'rich',
    function: 'Carries oxygen-rich blood from the left ventricle out to the body.',
    sourceIds: ['ap-19-1', 'ap-20-1'],
  },
  'pulmonary-trunk': {
    direction: 'away',
    type: 'artery',
    connection: 'Leaves the right ventricle through the pulmonary valve',
    connectedChamber: 'right-ventricle',
    circuit: 'pulmonary',
    oxygenation: 'poor',
    function: 'Carries oxygen-poor blood from the right ventricle to the lungs, dividing into the left and right pulmonary arteries.',
    sourceIds: ['ap-19-1', 'ap-20-1'],
  },
  'pulmonary-veins': {
    direction: 'toward',
    type: 'vein',
    connection: 'Empty into the left atrium',
    connectedChamber: 'left-atrium',
    circuit: 'pulmonary',
    oxygenation: 'rich',
    function: 'Return oxygen-rich blood from the lungs to the heart.',
    sourceIds: ['ap-19-1', 'ap-20-1'],
  },
  'superior-vena-cava': {
    direction: 'toward',
    type: 'vein',
    connection: 'Empties into the right atrium from above',
    connectedChamber: 'right-atrium',
    circuit: 'systemic',
    oxygenation: 'poor',
    function: 'Returns oxygen-poor blood from the body to the right atrium.',
    sourceIds: ['ap-19-1', 'ap-20-1'],
  },
  'inferior-vena-cava': {
    direction: 'toward',
    type: 'vein',
    connection: 'Empties into the right atrium from below',
    connectedChamber: 'right-atrium',
    circuit: 'systemic',
    oxygenation: 'poor',
    function: 'Returns oxygen-poor blood from the body to the right atrium.',
    sourceIds: ['ap-19-1', 'ap-20-1'],
  },
}

export function isVessel(id: string): id is VesselId {
  return (VESSEL_IDS as readonly string[]).includes(id)
}

/** Suggested pairs. The pulmonary trunk entry includes the pulmonary arteries. */
export const COMPARE_PRESETS: { label: string; a: VesselId; b: VesselId }[] = [
  { label: 'Aorta vs pulmonary trunk', a: 'aorta', b: 'pulmonary-trunk' },
  { label: 'Pulmonary arteries vs pulmonary veins', a: 'pulmonary-trunk', b: 'pulmonary-veins' },
  { label: 'Venae cavae vs aorta', a: 'superior-vena-cava', b: 'aorta' },
]
