import type { SubjectId } from '../../data/subjects'

/** One short step. Without `done`, the step is a reading/reflection step the user marks themselves. */
export interface ActivityStep<S> {
  title: string
  text: string
  hint?: string
  /** Detects the step from real explorer state. */
  done?: (state: S) => boolean
  /** What `done` waits for, shown until it happens (e.g. "the Angle tool is selected"). */
  waitingFor?: string
  /** The step needs the 3D view; without WebGL `fallback` replaces the text and the step becomes self-marked. */
  needs3D?: boolean
  fallback?: string
}

export interface ActivitySource {
  label: string
  url: string
}

export interface ActivityDef<S> {
  id: string
  subject: SubjectId
  title: string
  /** One-sentence learning goal. */
  goal: string
  /** What the setup does and why. */
  setup: string
  /** Every parameter or selection that Start will change, given the current state. */
  changes: (state: S) => string[]
  steps: ActivityStep<S>[]
  /** Final explanation connecting the observation to the concept. */
  conclusion: string
  sources: ActivitySource[]
  /** Link that opens the explorer where the activity runs (default `#/<subject>`). */
  entryHref?: string
}

/** Activities listed on Home (entry points into the explorers). */
export interface ActivitySummary {
  subject: SubjectId
  title: string
  goal: string
}
