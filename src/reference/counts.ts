import type { SubjectId } from '../data/subjects'
import counts from './generated/counts.json'
import type { EntryType } from './types'

/** Qualifying reference entries per subject and type, from the generated counts (never hard-coded). */
export const REFERENCE_COUNTS = counts as Record<SubjectId, { total: number } & Partial<Record<EntryType, number>>>
export const REFERENCE_TOTAL = Object.values(REFERENCE_COUNTS).reduce((n, c) => n + c.total, 0)
