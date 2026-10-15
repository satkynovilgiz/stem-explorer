import { useSyncExternalStore } from 'react'

/**
 * Simulation time (seconds) shared by the scene, readouts, graphs and scrubber.
 * Kept outside React state so 60 fps playback only re-renders the components that read it.
 */
export interface SimClock {
  get: () => number
  set: (t: number) => void
  subscribe: (listener: () => void) => () => void
}

export function createClock(initial = 0): SimClock {
  let t = initial
  const listeners = new Set<() => void>()
  return {
    get: () => t,
    set: (next) => {
      if (next === t) return
      t = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useSimTime(clock: SimClock): number {
  return useSyncExternalStore(clock.subscribe, clock.get)
}
