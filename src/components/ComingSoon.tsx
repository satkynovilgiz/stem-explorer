import { ArrowRight, CircleDashed } from 'lucide-react'
import type { Subject } from '../data/subjects'
import { SubjectIcon } from './SubjectIcon'

export function ComingSoon({ subject }: { subject: Subject }) {
  return (
    <section className="coming-soon" aria-labelledby="coming-soon-title">
      <div className="coming-soon-card">
        <span className="coming-soon-icon">
          <SubjectIcon subject={subject.id} size={28} />
        </span>
        <p className="status-pill">
          <CircleDashed size={14} aria-hidden="true" />
          Coming soon
        </p>
        <h1 id="coming-soon-title" className="coming-soon-title">
          {subject.name} Explorer
        </h1>
        <p className="coming-soon-tagline">{subject.tagline}</p>

        <h2 className="section-title">Planned experience</h2>
        <ul className="planned-list">
          {subject.planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="muted small">
          This subject is not built yet. Nothing on this page is interactive besides navigation.
        </p>

        <a className="button" href="#/chemistry">
          Open Chemistry Explorer
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </section>
  )
}
