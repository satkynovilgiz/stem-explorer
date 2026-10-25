import { mulberry32 } from '../../lib/random'

/*
 * A conceptual two-compartment diffusion model (OpenStax Biology 2e §5.2). Particles take random
 * steps on a grid; a barrier between the two equal compartments lets particles cross only where
 * the chosen setting allows. Net movement from the more to the less concentrated side emerges from
 * random motion, and continues until the counts even out; at dynamic equilibrium particles still
 * cross both ways but the net movement is about zero.
 *
 * Time is counted in steps (each particle makes one random move per step). Steps are not seconds,
 * the grid is not a physical scale, and the particles are not any particular molecule. No water is
 * modelled, so this is solute diffusion, not osmosis.
 *
 * The random motion is seeded (mulberry32), so a seed always gives the same run. The counts and
 * concentrations reported are exact for the particles shown; only the motion is random.
 */

export type BarrierMode = 'gap' | 'membrane'

export interface DiffusionParams {
  /** Particles of kind A (they can cross). */
  count: number
  /** How many A particles start in the left compartment (the rest start on the right). */
  startLeft: number
  /** Particles of kind B, all starting on the left; they cross only through a gap, never the membrane. */
  blocked: number
  mode: BarrierMode
  seed: number
}

export const GRID = { width: 40, height: 20, wall: 20, gap: [8, 11] as const }
/** Cells per compartment (both compartments are the same size). */
export const COMPARTMENT_AREA = GRID.wall * GRID.height
export const MAX_STEPS = 3000
export const DIFFUSION_LIMITS = { count: [10, 400], blocked: [0, 200] } as const
export const DEFAULT_DIFFUSION: DiffusionParams = { count: 200, startLeft: 200, blocked: 0, mode: 'gap', seed: 2026 }

export interface Counts {
  aLeft: number
  aRight: number
  bLeft: number
  bRight: number
}

export interface StepRecord extends Counts {
  /** A particles that crossed left → right and right → left during this step. */
  toRight: number
  toLeft: number
}

export interface DiffusionSim {
  readonly params: DiffusionParams
  readonly x: Int16Array
  readonly y: Int16Array
  /** 0 = A (can cross), 1 = B. */
  readonly kind: Uint8Array
  /** history[0] is the starting state; history[k] the state after k steps. */
  readonly history: StepRecord[]
  step(): void
  readonly steps: number
}

const MOVES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export function validDiffusionParams(p: DiffusionParams): boolean {
  const [cMin, cMax] = DIFFUSION_LIMITS.count
  const [bMin, bMax] = DIFFUSION_LIMITS.blocked
  return (
    Number.isInteger(p.count) &&
    p.count >= cMin &&
    p.count <= cMax &&
    Number.isInteger(p.startLeft) &&
    p.startLeft >= 0 &&
    p.startLeft <= p.count &&
    Number.isInteger(p.blocked) &&
    p.blocked >= bMin &&
    p.blocked <= bMax &&
    (p.mode === 'gap' || p.mode === 'membrane') &&
    Number.isInteger(p.seed) &&
    p.seed >= 0 &&
    p.seed <= 4294967295
  )
}

/** Whether a particle of `kind` may cross the barrier at row `row`. */
export function canCross(mode: BarrierMode, kind: number, row: number): boolean {
  if (mode === 'membrane') return kind === 0
  return row >= GRID.gap[0] && row <= GRID.gap[1]
}

function counts(x: Int16Array, kind: Uint8Array): Counts {
  const c = { aLeft: 0, aRight: 0, bLeft: 0, bRight: 0 }
  for (let i = 0; i < x.length; i++) {
    const left = x[i] < GRID.wall
    if (kind[i] === 0) {
      if (left) c.aLeft++
      else c.aRight++
    } else if (left) c.bLeft++
    else c.bRight++
  }
  return c
}

export function createDiffusion(params: DiffusionParams): DiffusionSim {
  if (!validDiffusionParams(params)) throw new Error('Invalid diffusion parameters')
  const rand = mulberry32(params.seed)
  const n = params.count + params.blocked
  const x = new Int16Array(n)
  const y = new Int16Array(n)
  const kind = new Uint8Array(n)
  const place = (i: number, left: boolean) => {
    x[i] = Math.floor(rand() * GRID.wall) + (left ? 0 : GRID.wall)
    y[i] = Math.floor(rand() * GRID.height)
  }
  for (let i = 0; i < params.count; i++) place(i, i < params.startLeft)
  for (let i = params.count; i < n; i++) {
    kind[i] = 1
    place(i, true)
  }
  const history: StepRecord[] = [{ ...counts(x, kind), toRight: 0, toLeft: 0 }]

  const sim: DiffusionSim = {
    params,
    x,
    y,
    kind,
    history,
    get steps() {
      return history.length - 1
    },
    step() {
      if (history.length - 1 >= MAX_STEPS) return
      let toRight = 0
      let toLeft = 0
      for (let i = 0; i < n; i++) {
        const [dx, dy] = MOVES[Math.floor(rand() * 4)]
        const nx = x[i] + dx
        const ny = y[i] + dy
        // The box walls reflect: a move outside the box is simply not taken.
        if (nx < 0 || nx >= GRID.width || ny < 0 || ny >= GRID.height) continue
        const crossing = (x[i] < GRID.wall) !== (nx < GRID.wall)
        if (crossing && !canCross(params.mode, kind[i], y[i])) continue
        if (crossing && kind[i] === 0) {
          if (nx >= GRID.wall) toRight++
          else toLeft++
        }
        x[i] = nx
        y[i] = ny
      }
      history.push({ ...counts(x, kind), toRight, toLeft })
    },
  }
  return sim
}

/** Runs a fresh simulation for `steps` steps (pure: the same params always give the same result). */
export function runDiffusion(params: DiffusionParams, steps: number): DiffusionSim {
  const sim = createDiffusion(params)
  for (let k = 0; k < Math.min(steps, MAX_STEPS); k++) sim.step()
  return sim
}

/** Particles per 100 grid cells: an exact concentration for the particles shown, in arbitrary units. */
export const concentration = (count: number) => (count / COMPARTMENT_AREA) * 100

/** Which way the net movement of A went over the last `window` steps. */
export function netMovement(history: readonly StepRecord[], window = 50): { toRight: number; toLeft: number; net: number } {
  const recent = history.slice(Math.max(1, history.length - window))
  const toRight = recent.reduce((s, r) => s + r.toRight, 0)
  const toLeft = recent.reduce((s, r) => s + r.toLeft, 0)
  return { toRight, toLeft, net: toRight - toLeft }
}
