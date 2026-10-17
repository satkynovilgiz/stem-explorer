import { ARRANGEMENTS, CIRCUIT_KEYS, DEFAULT_CIRCUIT, isValidCircuitParam, normalizeCircuitParam, type Arrangement, type CircuitParams } from '../physics/circuit'
import { DEFAULT_WAVE, isValidWaveParam, normalizeWaveParam, WAVE_KEYS, type WaveKey, type WaveParams } from '../physics/wave'
import { LAB_URL_KEYS, SPRING_URL_KEYS } from './urlState'

/*
 * Links for the circuit and wave labs:
 *   ?experiment=circuit&arr=series-2&emf=12&r1=100&r2=200[&r3=300]
 *   ?experiment=wave&wamp=0.2&wfreq=0.5&wlen=2&wx=1
 * Shared labs always open paused at t = 0; playback state is never stored.
 */

const WAVE_URL: Record<WaveKey, string> = { amplitude: 'wamp', frequency: 'wfreq', wavelength: 'wlen', probe: 'wx' }
const num = (raw: string | null) => (raw !== null && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(raw.trim()) ? Number(raw) : Number.NaN)

export function parseCircuitParams(search: string): { params: CircuitParams; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const params = { ...DEFAULT_CIRCUIT }
  const arr = q.get('arr')
  if (arr !== null) {
    if ((ARRANGEMENTS as readonly string[]).includes(arr)) params.arrangement = arr as Arrangement
    else invalid.push('arr')
  }
  for (const key of CIRCUIT_KEYS) {
    const raw = q.get(key)
    if (raw === null) continue
    const v = num(raw)
    if (isValidCircuitParam(key, v)) params[key] = normalizeCircuitParam(key, v)!
    else invalid.push(key)
  }
  return { params, invalid }
}

export function circuitParamEntries(p: CircuitParams): Record<string, string> {
  return {
    experiment: 'circuit',
    arr: p.arrangement,
    emf: String(p.emf),
    r1: String(p.r1),
    r2: String(p.r2),
    ...(p.arrangement === 'series-2' || p.arrangement === 'parallel-2' ? {} : { r3: String(p.r3) }),
  }
}

export function parseWaveParams(search: string): { params: WaveParams; invalid: string[] } {
  const q = new URLSearchParams(search)
  const invalid: string[] = []
  const params = { ...DEFAULT_WAVE }
  for (const key of WAVE_KEYS) {
    const raw = q.get(WAVE_URL[key])
    if (raw === null) continue
    const v = num(raw)
    if (isValidWaveParam(key, v)) params[key] = normalizeWaveParam(key, v)!
    else invalid.push(WAVE_URL[key])
  }
  return { params, invalid }
}

export function waveParamEntries(p: WaveParams): Record<string, string> {
  return { experiment: 'wave', ...Object.fromEntries(WAVE_KEYS.map((k) => [WAVE_URL[k], String(p[k])])) }
}

/** `search` with only this lab's keys (other experiments' keys removed, other subjects' kept). */
export function withLabParams(search: string, entries: Record<string, string>): string {
  const q = new URLSearchParams(search)
  for (const k of ['experiment', ...Object.values(SPRING_URL_KEYS), ...LAB_URL_KEYS]) q.delete(k)
  for (const [k, v] of Object.entries(entries)) q.set(k, v)
  return `?${q.toString()}`
}
