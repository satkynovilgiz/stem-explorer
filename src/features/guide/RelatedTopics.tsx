import { useSyncExternalStore } from 'react'
import { AppLink } from '../../components/AppLink'
import { RELATION_LABELS } from '../../data/related'
import type { SubjectId } from '../../data/subjects'
import { subjectName } from '../../lib/explorations'
import { relatedForLocation } from '../../lib/relatedTopics'
import { SourceLinks } from './SourceLinks'

/*
 * Explorers rewrite their query with history.replaceState, which fires no event, so while this
 * list is open it re-reads the address a few times a second (and on Back/Forward).
 */
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 400)
  window.addEventListener('popstate', onChange)
  return () => {
    window.clearInterval(timer)
    window.removeEventListener('popstate', onChange)
  }
}

/** Curated links from what the explorer shows now to other subjects, each with its kind and limits. */
export function RelatedTopics({ subject }: { subject: SubjectId }) {
  const search = useSyncExternalStore(subscribe, () => window.location.search)
  const related = relatedForLocation(subject, search)
  return (
    <>
      <h3 className="guide-h">Related across subjects</h3>
      {related.length === 0 ? (
        <p className="small muted">No curated cross-subject link for this view. Links exist only where a cited source supports them.</p>
      ) : (
        <ul className="related-topics small">
          {related.map(({ relation, others }) => (
            <li key={relation.id}>
              <span>
                <span className={`relation-kind is-${relation.kind}`}>{RELATION_LABELS[relation.kind]}</span>
                {' · '}
                {others.map((o, i) => (
                  <span key={o.id}>
                    {i > 0 && ', '}
                    <AppLink href={o.href}>{o.name}</AppLink> <span className="muted">({subjectName(o.subject)})</span>
                  </span>
                ))}
              </span>
              <span>
                {relation.text}
                <SourceLinks ids={relation.sources} />
              </span>
              <span className="muted">{relation.kind === 'analogy' ? 'Where the analogy breaks down: ' : 'Scope: '}{relation.limits}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
