import type { ReferenceEntry } from '../../types'
import { BASICS } from './basics'
import { MOLECULES } from './molecules'
import { MORE } from './more'

export const ENTRIES: readonly ReferenceEntry[] = [...BASICS, ...MOLECULES, ...MORE]
