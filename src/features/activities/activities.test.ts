import { describe, expect, it } from 'vitest'
import { ANATOMY_ACTIVITY, anatomySnapshot, pulmonarySetup } from '../anatomy/activity'
import { anatomyReducer, initialAnatomyState } from '../anatomy/state'
import { BIOLOGY_ACTIVITY, golgiSetup } from '../biology/activity'
import { biologyReducer } from '../biology/state'
import { CHEMISTRY_ACTIVITY, waterSetup } from '../chemistry/activity'
import { chemistryReducer } from '../chemistry/state'
import { MATHEMATICS_ACTIVITY, saddleSetup } from '../mathematics/activity'
import { mathReducer } from '../mathematics/state'
import { anglesSetup, HIGH, LOW, PHYSICS_ACTIVITY } from '../physics/activity'
import { initialPhysicsState, physicsReducer } from '../physics/state'
import { DEFAULT_PARAMS, solveTrajectory } from '../../physics/projectile'

const physicsStart = initialPhysicsState({ ...DEFAULT_PARAMS })
const ALL = [
  { def: CHEMISTRY_ACTIVITY, setup: waterSetup() },
  { def: BIOLOGY_ACTIVITY, setup: golgiSetup() },
  { def: PHYSICS_ACTIVITY, setup: anglesSetup(physicsStart) },
  { def: MATHEMATICS_ACTIVITY, setup: saddleSetup() },
  { def: ANATOMY_ACTIVITY, setup: pulmonarySetup() },
] as const

describe('activity definitions', () => {
  it('one per subject, each with a goal, setup, 3–5 steps, a conclusion and https sources', () => {
    expect(ALL.map((a) => a.def.subject).sort()).toEqual(['anatomy', 'biology', 'chemistry', 'mathematics', 'physics'])
    for (const { def } of ALL) {
      expect(def.goal.length).toBeGreaterThan(20)
      expect(def.setup.length).toBeGreaterThan(20)
      expect(def.steps.length).toBeGreaterThanOrEqual(3)
      expect(def.steps.length).toBeLessThanOrEqual(5)
      expect(def.conclusion.length).toBeGreaterThan(80)
      expect(def.sources.length).toBeGreaterThan(0)
      for (const s of def.sources) expect(s.url).toMatch(/^https:\/\//)
      for (const step of def.steps) {
        if (step.done) expect(step.waitingFor, step.title).toBeTruthy()
        if (step.needs3D) expect(step.fallback, step.title).toBeTruthy()
      }
    }
  })

  it('setup never completes a step by itself', () => {
    for (const { def, setup } of ALL) {
      for (const step of def.steps) {
        // The generic signature is per subject; each setup belongs to its own definition.
        expect((step.done as ((s: unknown) => boolean) | undefined)?.(setup) ?? false, `${def.id}: ${step.title}`).toBe(false)
      }
    }
  })

  it('lists every change Start will make', () => {
    const benzene = chemistryReducer(waterSetup(), { type: 'selectMolecule', moleculeId: 'benzene' })
    expect(CHEMISTRY_ACTIVITY.changes(benzene)).toContain('Molecule → Water (now Benzene)')
    const playing = physicsReducer({ ...physicsStart, runA: { ...LOW } }, { type: 'launch' })
    const changes = PHYSICS_ACTIVITY.changes(playing)
    expect(changes).toContain('Run A comparison cleared')
    expect(changes.at(-1)).toMatch(/is paused/)
  })
})

describe('detection from real state', () => {
  it('chemistry: only H–O–H with oxygen as the vertex counts', () => {
    const [, pick] = CHEMISTRY_ACTIVITY.steps
    let s = chemistryReducer(waterSetup(), { type: 'setMode', mode: 'angle' })
    expect(CHEMISTRY_ACTIVITY.steps[0].done!(s)).toBe(true)
    for (const id of ['O1', 'H1', 'H2']) s = chemistryReducer(s, { type: 'pickAtom', atomId: id })
    expect(pick.done!(s)).toBe(false)
    s = chemistryReducer(s, { type: 'clearSelection' })
    for (const id of ['H1', 'O1', 'H2']) s = chemistryReducer(s, { type: 'pickAtom', atomId: id })
    expect(pick.done!(s)).toBe(true)
  })

  it('biology: selecting, isolating, then following the link to the rough ER', () => {
    const [find, isolate, upstream] = BIOLOGY_ACTIVITY.steps
    let s = biologyReducer(golgiSetup(), { type: 'select', organelleId: 'golgi' })
    expect(find.done!(s)).toBe(true)
    expect(isolate.done!(s)).toBe(false)
    s = biologyReducer(s, { type: 'isolate' })
    expect(isolate.done!(s)).toBe(true)
    s = biologyReducer(s, { type: 'select', organelleId: 'rough-er' })
    expect(upstream.done!(s)).toBe(true)
  })

  it('physics: needs both launches with identical speed, height and gravity', () => {
    const [low, saveA, change, high] = PHYSICS_ACTIVITY.steps
    let s = anglesSetup(physicsStart)
    s = physicsReducer(physicsReducer(s, { type: 'launch' }), { type: 'landed' })
    expect(low.done!(s)).toBe(true)
    s = physicsReducer(s, { type: 'saveRunA' })
    expect(saveA.done!(s)).toBe(true)
    s = physicsReducer(s, { type: 'setParam', key: 'angleDeg', value: 60 })
    expect(change.done!(s)).toBe(true)
    expect(high.done!(s)).toBe(false)
    expect(high.done!(physicsReducer(physicsReducer(s, { type: 'setParam', key: 'speed', value: 25 }), { type: 'landed' }))).toBe(false)
    expect(high.done!(physicsReducer(physicsReducer(s, { type: 'launch' }), { type: 'landed' }))).toBe(true)
  })

  it('mathematics: y = constant on the saddle, then a point near the origin', () => {
    const [, switchAxis, , origin] = MATHEMATICS_ACTIVITY.steps
    let s = mathReducer(saddleSetup(), { type: 'setSliceAxis', axis: 'y' })
    expect(switchAxis.done!(s)).toBe(true)
    s = mathReducer(s, { type: 'setPoint', x: 0.5, y: 0, source: 'input' })
    expect(origin.done!(s)).toBe(false)
    s = mathReducer(s, { type: 'setPoint', x: 0, y: 0, source: 'input' })
    expect(origin.done!(s)).toBe(true)
    expect(switchAxis.done!(mathReducer(s, { type: 'selectSurface', surfaceId: 'plane' }))).toBe(false)
  })

  it('anatomy: the tour must reach the lungs step', () => {
    const [rv, valve, tour, lungs] = ANATOMY_ACTIVITY.steps
    let s = anatomyReducer(pulmonarySetup(), { type: 'select', partId: 'right-ventricle' })
    expect(rv.done!(s)).toBe(true)
    s = anatomyReducer(s, { type: 'select', partId: 'pulmonary-valve' })
    expect(valve.done!(s)).toBe(true)
    s = anatomyReducer(s, { type: 'startTour' })
    expect(tour.done!(s)).toBe(true)
    while (!lungs.done!(s) && s.tourStep! < 20) s = anatomyReducer(s, { type: 'nextStep' })
    expect(s.tourStep).toBe(6)
  })
})

describe('restoring', () => {
  it('anatomy: a running tour is ended, and the snapshot is the view from before that tour', () => {
    const touring = anatomyReducer(initialAnatomyState('aorta', 'whole'), { type: 'startTour' })
    const snap = anatomySnapshot(touring)
    expect([snap.selected, snap.view, snap.tourStep, snap.beforeTour]).toEqual(['aorta', 'whole', null, null])
  })

  it('physics: replacing state never resumes playback', () => {
    const playing = physicsReducer(physicsStart, { type: 'launch' })
    expect(physicsReducer(physicsStart, { type: 'replace', state: playing, announcement: '' }).status).toBe('paused')
  })

  it('physics: the conclusion quotes the app’s own calculation', () => {
    const r = solveTrajectory(LOW).range
    expect(Math.abs(r - solveTrajectory(HIGH).range)).toBeLessThan(1e-9)
    expect(r).toBeCloseTo(35.31, 2)
    expect(PHYSICS_ACTIVITY.conclusion).toContain('both launches land 35.3 m away')
    expect(PHYSICS_ACTIVITY.conclusion).toContain('rises to 15.3 m and stays up 3.53 s')
    expect(PHYSICS_ACTIVITY.conclusion).toContain('peaks at 5.10 m after 2.04 s')
  })
})
