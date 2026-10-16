import { useEffect, useMemo, useRef, useState } from 'react'
import { isWebGLAvailable } from '../../lib/webgl'
import { consumeActivityRequest } from './requests'
import type { ActivityDef, ActivityStep } from './types'

export type ActivityPhase = 'closed' | 'intro' | 'running' | 'finished'

export interface ActivityOps<Snap> {
  /** Snapshot of the exploration configuration before the activity (taken when Start is pressed). */
  capture: () => Snap
  /** Applies the activity's setup. Runs only when the user presses Start. */
  apply: () => void
  /** Restores the snapshot (Exit). */
  restore: (snapshot: Snap) => void
  /**
   * Restores only this subject's own URL keys, used when the explorer unmounts mid-activity
   * (the user went to another subject). Other subjects' keys are never touched.
   */
  restoreUrl: (snapshot: Snap) => void
}

export interface ResolvedStep<S> extends ActivityStep<S> {
  /** True when the step is marked by the user ("I’ve explored this") rather than detected. */
  manual: boolean
}

export interface ActivityController<S> {
  def: ActivityDef<S>
  phase: ActivityPhase
  steps: ResolvedStep<S>[]
  index: number
  completed: boolean[]
  collapsed: boolean
  webgl: boolean
  open: () => void
  cancel: () => void
  start: () => void
  next: () => void
  previous: () => void
  exit: () => void
  markExplored: () => void
  setCollapsed: (v: boolean) => void
}

/**
 * Activity state lives here, separate from the explorer's reducer: progress never reaches the URL,
 * saved explorations or recent history. Steps are completed only by detected state or by the user's
 * own "I’ve explored this" — never by elapsed time.
 */
export function useActivity<S, Snap>(def: ActivityDef<S>, state: S, ops: ActivityOps<Snap>): ActivityController<S> {
  const [phase, setPhase] = useState<ActivityPhase>(() => (consumeActivityRequest(def.subject) ? 'intro' : 'closed'))
  const [index, setIndex] = useState(0)
  const [completed, setCompleted] = useState<boolean[]>(() => def.steps.map(() => false))
  const [collapsed, setCollapsed] = useState(false)
  const [webgl] = useState(isWebGLAvailable)
  const snapshot = useRef<Snap | null>(null)
  const opsRef = useRef(ops)
  useEffect(() => {
    opsRef.current = ops
  })

  const steps = useMemo<ResolvedStep<S>[]>(
    () =>
      def.steps.map((s) =>
        s.needs3D && !webgl
          ? { ...s, text: s.fallback ?? s.text, done: undefined, waitingFor: undefined, manual: true }
          : { ...s, manual: !s.done },
      ),
    [def.steps, webgl],
  )

  // Detected completion is sticky: once the user has done it, later changes don't undo the tick.
  const detected = phase === 'running' || phase === 'finished' ? steps.map((s) => !!s.done?.(state)) : null
  // Adjusting state during render (React's documented pattern for deriving from changed inputs):
  // a newly detected step is ticked in the same render, without an effect.
  if (detected && detected.some((d, i) => d && !completed[i])) {
    setCompleted(completed.map((c, i) => c || detected[i]))
  }

  // Leaving the subject mid-activity: put this subject's own URL keys back to the pre-activity state.
  useEffect(
    () => () => {
      if (snapshot.current !== null) opsRef.current.restoreUrl(snapshot.current)
    },
    [],
  )

  return {
    def,
    phase,
    steps,
    index,
    completed,
    collapsed,
    webgl,
    open: () => setPhase('intro'),
    cancel: () => setPhase('closed'),
    start: () => {
      snapshot.current = ops.capture()
      ops.apply()
      setIndex(0)
      setCompleted(def.steps.map(() => false))
      setCollapsed(false)
      setPhase('running')
    },
    next: () => (index < steps.length - 1 ? setIndex(index + 1) : setPhase('finished')),
    previous: () => (phase === 'finished' ? setPhase('running') : setIndex(Math.max(0, index - 1))),
    exit: () => {
      if (snapshot.current !== null) ops.restore(snapshot.current)
      snapshot.current = null
      setPhase('closed')
    },
    markExplored: () => setCompleted((prev) => prev.map((c, i) => (i === index ? true : c))),
    setCollapsed,
  }
}

/** Replaces the query string without adding a history entry (the hash route stays as it is). */
export function replaceUrlSearch(search: string) {
  if (search !== window.location.search) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }
}

export const ACTIVITY_ENDED = 'Activity ended. Your previous view is restored.'
