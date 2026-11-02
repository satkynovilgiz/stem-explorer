import '../../styles/chemistry-home.css'
import { SubjectIcon } from '../../components/SubjectIcon'
import { SUBJECTS } from '../../data/subjects'
import type { OverviewSubject } from '../subjects/overview'
import { CalculatorBench } from './CalculatorBench'

/** A subject's calculators page (#/<subject>/calculators). Chemistry's calculators are on its Tools page. */
export function SubjectCalculators({ subject }: { subject: OverviewSubject }) {
  const name = SUBJECTS.find((s) => s.id === subject)!.name
  return (
    <div className={`chem-home subj-home is-${subject}`}>
      <header className="chem-home-head calc-page-head">
        <div className="chem-home-title-wrap">
          <p className={`subj-eyebrow is-${subject}`}>
            <SubjectIcon subject={subject} size={16} /> {name}
          </p>
          <h1 className="chem-home-title">{name} calculators</h1>
          <p className="chem-home-lead">Each one shows the formula, every step with units, what it assumes, and the textbook section it comes from.</p>
        </div>
      </header>
      <CalculatorBench subject={subject} />
    </div>
  )
}
