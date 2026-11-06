import type { ReactNode } from 'react'
import type { SubjectId } from '../data/subjects'
import { hasRail } from '../data/subjectRails'
import { SubjectRail } from './SubjectRail'

/** A subject's pages, with its left menu when it has one. */
export function SubjectFrame({ subject, name, overview, calculators, children }: { subject: SubjectId; name: string; overview: boolean; calculators: boolean; children: ReactNode }) {
  if (!hasRail(subject)) return <>{children}</>
  return (
    <div className={`chem-shell is-${subject}`}>
      <SubjectRail subject={subject} name={name} overview={overview} calculators={calculators} />
      <div className="chem-shell-main">{children}</div>
    </div>
  )
}
