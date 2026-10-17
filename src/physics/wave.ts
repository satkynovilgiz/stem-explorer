/*
 * An ideal travelling sinusoidal wave y(x, t) = A sin(kx − ωt), moving in +x
 * (OpenStax University Physics Vol. 1 §16.1, 16.2). The user sets amplitude A, frequency f and
 * wavelength λ; the speed is not an independent control but follows from v = fλ. Then k = 2π/λ,
 * ω = 2πf and T = 1/f. SI units: metres, seconds, hertz.
 */

export type WaveKey = 'amplitude' | 'frequency' | 'wavelength' | 'probe'
export type WaveParams = Record<WaveKey, number>

/** The section of medium drawn and graphed. */
export const WAVE_DOMAIN = { min: 0, max: 8 }

export const WAVE_SPECS: Record<WaveKey, { label: string; symbol: string; unit: string; min: number; max: number; step: number; default: number; decimals: number }> = {
  amplitude: { label: 'Amplitude', symbol: 'A', unit: 'm', min: 0.01, max: 0.5, step: 0.01, default: 0.2, decimals: 2 },
  frequency: { label: 'Frequency', symbol: 'f', unit: 'Hz', min: 0.1, max: 3, step: 0.05, default: 0.5, decimals: 2 },
  wavelength: { label: 'Wavelength', symbol: 'λ', unit: 'm', min: 0.2, max: 4, step: 0.05, default: 2, decimals: 2 },
  probe: { label: 'Inspected point x', symbol: 'x₀', unit: 'm', min: 0, max: 8, step: 0.05, default: 1, decimals: 2 },
}
export const WAVE_KEYS: readonly WaveKey[] = ['amplitude', 'frequency', 'wavelength', 'probe']
export const DEFAULT_WAVE: WaveParams = { amplitude: 0.2, frequency: 0.5, wavelength: 2, probe: 1 }

export function isValidWaveParam(key: WaveKey, value: number): boolean {
  const s = WAVE_SPECS[key]
  return Number.isFinite(value) && value >= s.min && value <= s.max
}

export function normalizeWaveParam(key: WaveKey, value: number): number | null {
  if (!Number.isFinite(value)) return null
  const s = WAVE_SPECS[key]
  const stepped = Math.round(value / s.step) * s.step
  return Number(Math.min(s.max, Math.max(s.min, stepped)).toFixed(s.decimals))
}

export interface WaveDerived {
  speed: number
  period: number
  waveNumber: number
  angularFrequency: number
}

export function deriveWave(p: WaveParams): WaveDerived {
  return { speed: p.frequency * p.wavelength, period: 1 / p.frequency, waveNumber: (2 * Math.PI) / p.wavelength, angularFrequency: 2 * Math.PI * p.frequency }
}

/** Displacement of the medium at position x and time t. */
export function displacement(p: WaveParams, x: number, t: number): number {
  const { waveNumber: k, angularFrequency: w } = deriveWave(p)
  return p.amplitude * Math.sin(k * x - w * t)
}

/** Transverse velocity of the medium at x (∂y/∂t) — not the wave speed. */
export function mediumVelocity(p: WaveParams, x: number, t: number): number {
  const { waveNumber: k, angularFrequency: w } = deriveWave(p)
  return -p.amplitude * w * Math.cos(k * x - w * t)
}

/** Samples for a graph, as [abscissa, displacement] pairs. */
export function sample(n: number, from: number, to: number, f: (s: number) => number): [number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const s = from + ((to - from) * i) / n
    return [s, f(s)] as [number, number]
  })
}
