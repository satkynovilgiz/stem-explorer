import { ArrowRight, Compass } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
import { INTERESTS } from './interests'

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
