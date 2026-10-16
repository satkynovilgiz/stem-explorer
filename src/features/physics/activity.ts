import { formatSig, solveTrajectory, type LaunchParams } from '../../physics/projectile'
import type { ActivityDef } from '../activities/types'
import type { PhysicsState } from './state'

export const LOW: LaunchParams = { speed: 20, angleDeg: 30, height: 0, gravity: 9.81 }
export const HIGH: LaunchParams = { ...LOW, angleDeg: 60 }

/** Setup: 20 m/s at 30° from the ground with g = 9.81 m/s², no comparison, paused at t = 0. */
export const anglesSetup = (s: PhysicsState): PhysicsState => ({ ...s, params: { ...LOW }, runA: null, status: 'ready' })

const same = (p: LaunchParams | null, target: LaunchParams) =>
  !!p && p.speed === target.speed && p.angleDeg === target.angleDeg && p.height === target.height && p.gravity === target.gravity

const low = solveTrajectory(LOW)
const high = solveTrajectory(HIGH)

export const PHYSICS_ACTIVITY: ActivityDef<PhysicsState> = {
  id: 'complementary-angles',
  subject: 'physics',
  title: 'Compare 30° and 60° launches',
  goal: 'Compare two launches that differ only in angle, and explain why they land in the same place.',
  setup: 'Both launches use 20 m/s, gravity 9.81 m/s² and a start on the ground, so the angle is the only thing that changes.',
  changes: (s) => [
    `Launch speed → 20 m/s (now ${formatSig(s.params.speed)} m/s)`,
    `Launch angle → 30° (now ${formatSig(s.params.angleDeg)}°)`,
    `Initial height → 0 m (now ${formatSig(s.params.height)} m)`,
    `Gravity → 9.81 m/s² (now ${formatSig(s.params.gravity)} m/s²)`,
    ...(s.runA ? ['Run A comparison cleared'] : []),
    s.status === 'playing' ? 'The flight that is playing is paused, then time resets to t = 0' : 'Time resets to t = 0 (paused)',
  ],
  steps: [
    {
      title: 'Launch at 30°',
      text: 'Press Launch and let the ball land. Note the range and flight time under Results.',
      hint: 'Set the playback speed to 2× to make it faster.',
      done: (s) => s.status === 'landed' && same(s.params, LOW),
      waitingFor: 'the 30° launch to land',
    },
    {
      title: 'Save it as Run A',
      text: 'Press Save as Run A under Launch inputs. The 30° path stays on screen as a dotted reference.',
      done: (s) => same(s.runA, LOW),
      waitingFor: 'Run A to hold the 30° launch',
    },
    {
      title: 'Change only the angle to 60°',
      text: 'Set the launch angle to 60°. Leave speed, height and gravity as they are.',
      hint: 'Type 60 in the angle field and press Enter, or drag the slider.',
      done: (s) => same(s.params, HIGH) && same(s.runA, LOW),
      waitingFor: 'a 60° launch with the same speed, height and gravity',
    },
    {
      title: 'Launch at 60° and compare',
      text: 'Launch again. Which path goes higher, which stays in the air longer, and where does each one land?',
      done: (s) => s.status === 'landed' && same(s.params, HIGH) && same(s.runA, LOW),
      waitingFor: 'the 60° launch to land beside Run A',
    },
  ],
  conclusion:
    `On level ground the range is R = v₀²·sin(2θ)/g. Because sin 60° = sin 120°, two angles that add up to 90° give the same range: ` +
    `both launches land ${formatSig(low.range)} m away. The 60° launch has a larger vertical velocity component, so it rises to ` +
    `${formatSig(high.maxHeight)} m and stays up ${formatSig(high.flightTime)} s. The 30° launch peaks at ${formatSig(low.maxHeight)} m ` +
    `after ${formatSig(low.flightTime)} s in the air, but moves faster horizontally. The two effects balance exactly. ` +
    'This holds for the model’s ideal motion without air resistance.',
  sources: [
    { label: 'OpenStax University Physics Volume 1 — 4.3 Projectile Motion', url: 'https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion' },
  ],
}
