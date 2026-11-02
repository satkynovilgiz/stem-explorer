import type { SubjectId } from '../data/subjects'
import { ANATOMY_CALCULATORS } from './anatomy'
import { BIOLOGY_CALCULATORS } from './biology'
import { CHEMISTRY_CALCULATORS } from './chemistry'
import { MATHEMATICS_CALCULATORS } from './mathematics'
import { PHYSICS_CALCULATORS } from './physics'
import type { Calculator } from './types'

export type { Calculator } from './types'

export const CALCULATORS: readonly Calculator[] = [...CHEMISTRY_CALCULATORS, ...PHYSICS_CALCULATORS, ...MATHEMATICS_CALCULATORS, ...BIOLOGY_CALCULATORS, ...ANATOMY_CALCULATORS]

export const calculatorsOf = (s: SubjectId) => CALCULATORS.filter((c) => c.subject === s)

/** The opening values of a calculator: its worked example. */
export const initialValues = (c: Calculator): Record<string, string> => Object.fromEntries(c.fields.map((f) => [f.id, f.initial]))
