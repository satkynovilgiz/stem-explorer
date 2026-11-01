import type { ReferenceEntry } from '../../types'
import { NERVOUS } from './nervous'
import { SKELETAL } from './skeletal'

export const ENTRIES: readonly ReferenceEntry[] = [...SKELETAL, ...NERVOUS]
