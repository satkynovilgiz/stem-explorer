import { ArrowRight, Compass, LayoutGrid } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { SUBJECTS } from '../../data/subjects'
import { modulesOf } from '../../data/topics'
import { INTERESTS } from './interests'

/** One line per subject with every module as a link: the whole atlas at a glance. */
export function AtlasGlance() {
  return (
    <section className="home-section glance" aria-labelledby="glance-heading">
      <h2 id="glance-heading" className="home-h2">
        <LayoutGrid size={18} aria-hidden="true" /> At a glance
      </h2>
      <ul className="glance-list">
        {SUBJECTS.map((s) => (
          <li key={s.id} className={`glance-row is-${s.id}`}>
            <a className="glance-subject" href={`#/${s.id}`}>
              <SubjectIcon subject={s.id} size={16} />
              {s.name}
            </a>
            <ul className="glance-modules" aria-label={`${s.name} modules`}>
              {modulesOf(s.id).map((m) => (
                <li key={m.id}>
                  <AppLink href={m.href}>{m.name}</AppLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function InterestStarts() {
  return (
    <section className="home-section" aria-labelledby="interests-heading">
      <h2 id="interests-heading" className="home-h2">
        <Compass size={18} aria-hidden="true" /> Starting points by interest
      </h2>
      <p className="muted small">Grouped by topic, not by level. Each opens a real view you can change.</p>
      <ul className="interest-grid">
        {INTERESTS.map((i) => (
          <li key={i.title} className={`interest-card is-${i.subjectHint}`}>
            <h3 className="interest-title">{i.title}</h3>
            <ul className="interest-links">
              {i.links.map((l) => (
                <li key={l.href}>
                  <AppLink href={l.href}>
                    {l.label} <ArrowRight size={13} aria-hidden="true" />
                  </AppLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
