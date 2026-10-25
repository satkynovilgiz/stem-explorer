import { describe, expect, it } from 'vitest'
import { canCross, concentration, createDiffusion, DEFAULT_DIFFUSION, GRID, MAX_STEPS, netMovement, runDiffusion, validDiffusionParams } from './diffusion'

describe('two-compartment diffusion (seeded)', () => {
  it('conserves the number of particles of each kind at every step', () => {
    const sim = runDiffusion({ ...DEFAULT_DIFFUSION, blocked: 50, mode: 'membrane' }, 500)
    for (const h of sim.history) {
      expect(h.aLeft + h.aRight).toBe(200)
      expect(h.bLeft + h.bRight).toBe(50)
    }
  })

  it('is reproducible: the same seed gives the same run; a different seed a different one', () => {
    const a = runDiffusion(DEFAULT_DIFFUSION, 300)
    const b = runDiffusion(DEFAULT_DIFFUSION, 300)
    expect(b.history).toEqual(a.history)
    expect(Array.from(b.x)).toEqual(Array.from(a.x))
    const c = runDiffusion({ ...DEFAULT_DIFFUSION, seed: 7 }, 300)
    expect(c.history).not.toEqual(a.history)
    // Stepping one at a time equals running in one go.
    const inc = createDiffusion(DEFAULT_DIFFUSION)
    for (let k = 0; k < 300; k++) inc.step()
    expect(inc.history).toEqual(a.history)
  })

  it('starts at step 0 with the chosen split, and particles never leave the box', () => {
    const sim = createDiffusion({ ...DEFAULT_DIFFUSION, startLeft: 150 })
    expect(sim.steps).toBe(0)
    expect(sim.history[0]).toMatchObject({ aLeft: 150, aRight: 50, toRight: 0, toLeft: 0 })
    for (let k = 0; k < 400; k++) sim.step()
    for (let i = 0; i < sim.x.length; i++) {
      expect(sim.x[i]).toBeGreaterThanOrEqual(0)
      expect(sim.x[i]).toBeLessThan(GRID.width)
      expect(sim.y[i]).toBeGreaterThanOrEqual(0)
      expect(sim.y[i]).toBeLessThan(GRID.height)
    }
  })

  it('net movement goes from the crowded side to the empty side, then the counts even out while crossings continue both ways', () => {
    const sim = runDiffusion(DEFAULT_DIFFUSION, MAX_STEPS)
    expect(sim.history[0].aRight).toBe(0)
    expect(sim.history[200].aRight).toBeGreaterThan(0)
    const late = sim.history.slice(-500)
    const meanRight = late.reduce((s, h) => s + h.aRight, 0) / late.length
    expect(meanRight).toBeGreaterThan(80)
    expect(meanRight).toBeLessThan(120)
    const recent = netMovement(sim.history, 500)
    expect(recent.toRight).toBeGreaterThan(50)
    expect(recent.toLeft).toBeGreaterThan(50)
    expect(Math.abs(recent.net)).toBeLessThan(0.25 * (recent.toRight + recent.toLeft))
  })

  it('the membrane lets A cross anywhere but never B; a gap lets both cross only at its rows', () => {
    const mem = runDiffusion({ ...DEFAULT_DIFFUSION, blocked: 80, mode: 'membrane' }, 1500)
    for (const h of mem.history) expect(h.bRight).toBe(0)
    expect(mem.history.at(-1)!.aRight).toBeGreaterThan(40)
    const gap = runDiffusion({ ...DEFAULT_DIFFUSION, blocked: 80, mode: 'gap' }, 3000)
    expect(gap.history.at(-1)!.bRight).toBeGreaterThan(0)
    expect(canCross('gap', 0, GRID.gap[0] - 1)).toBe(false)
    expect(canCross('gap', 1, GRID.gap[0])).toBe(true)
    expect(canCross('membrane', 1, GRID.gap[0])).toBe(false)
  })

  it('stops at the step limit and validates parameters', () => {
    const sim = runDiffusion({ ...DEFAULT_DIFFUSION, count: 10, startLeft: 10 }, MAX_STEPS + 50)
    expect(sim.steps).toBe(MAX_STEPS)
    sim.step()
    expect(sim.steps).toBe(MAX_STEPS)
    expect(validDiffusionParams({ ...DEFAULT_DIFFUSION, startLeft: 201 })).toBe(false)
    expect(validDiffusionParams({ ...DEFAULT_DIFFUSION, count: 5, startLeft: 5 })).toBe(false)
    expect(validDiffusionParams({ ...DEFAULT_DIFFUSION, seed: -1 })).toBe(false)
    expect(() => createDiffusion({ ...DEFAULT_DIFFUSION, count: 0, startLeft: 0 })).toThrow()
  })

  it('reports concentration as particles per 100 cells (exact for the particles shown)', () => {
    expect(concentration(400)).toBe(100)
    expect(concentration(100)).toBe(25)
  })
})
