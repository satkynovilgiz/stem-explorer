import { FlaskConical, Microscope, Orbit, PersonStanding, Sigma, type LucideProps } from 'lucide-react'
import type { SubjectId } from '../data/subjects'

const ICONS = {
  anatomy: PersonStanding,
  chemistry: FlaskConical,
  physics: Orbit,
  mathematics: Sigma,
  biology: Microscope,
} satisfies Record<SubjectId, unknown>

export function SubjectIcon({ subject, ...props }: { subject: SubjectId } & LucideProps) {
  const Icon = ICONS[subject]
  return <Icon aria-hidden="true" {...props} />
}
