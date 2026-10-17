import { Lightbulb } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
import { SUBJECTS } from '../../data/subjects'
import { requestActivity } from '../activities/requests'
import { ANATOMY_ACTIVITY } from '../anatomy/activity'
import { BIOLOGY_ACTIVITY } from '../biology/activity'
import { CHEMISTRY_ACTIVITY } from '../chemistry/activity'
import { MATHEMATICS_ACTIVITY } from '../mathematics/activity'
import { PHYSICS_ACTIVITY } from '../physics/activity'

const ACTIVITIES = [ANATOMY_ACTIVITY, CHEMISTRY_ACTIVITY, PHYSICS_ACTIVITY, MATHEMATICS_ACTIVITY, BIOLOGY_ACTIVITY]

/**
 * Entry points to the guided activities. A click opens the subject with the activity's introduction
 * showing; nothing changes until Start is pressed there. The link itself is the plain subject route,
 * so opening it in a new tab simply opens the explorer.
 */
export function ActivityEntries() {
  return (
    <section className="home-section enter" aria-labelledby="activities-heading">
      <h2 id="activities-heading" className="home-h2">
        <Lightbulb size={20} aria-hidden="true" /> Guided activities
      </h2>
      <p className="muted small home-section-lead">
        Short, optional walkthroughs of three to five steps inside each explorer. Your current view comes back when you exit.
      </p>
      <ul className="featured-list">
        {ACTIVITIES.map((a) => (
          <li key={a.id}>
            <AppLink href={`#/${a.subject}`} className="featured-item" onClick={() => requestActivity(a.subject)}>
              <span className={`subject-chip is-${a.subject}`}>{SUBJECTS.find((s) => s.id === a.subject)!.name}</span>
              <span className="featured-title">{a.title}</span>
              <span className="featured-next">
                {a.goal} {a.steps.length} steps.
              </span>
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
