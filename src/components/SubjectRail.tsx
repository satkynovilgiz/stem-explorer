import { locate } from '../data/topics'
import { RAILS, railHref, type RailItem, type RailSubject } from '../data/subjectRails'
import { useLocationSearch } from '../lib/location'
import { AppLink } from './AppLink'

/** Whether an item is the page being shown. */
function isCurrent(item: RailItem, module: string | null, search: string) {
  if (item.module !== module) return false
  if (item.asys === undefined) return true
  const asys = new URLSearchParams(search).get('asys')
  // The whole-body item stands for every atlas view that is not one of the listed systems.
  return item.asys === null ? asys !== 'skeletal' && asys !== 'muscular' : asys === item.asys
}

/** The subject's menu, beside every page of the subject. Nothing is marked on its Overview. */
export function SubjectRail({ subject, name, overview, calculators }: { subject: RailSubject; name: string; overview: boolean; calculators: boolean }) {
  const search = useLocationSearch()
  const module = calculators ? 'calculators' : overview ? null : locate(subject, search).module.id
  return (
    <nav className="chem-rail" aria-label={name}>
      <ul>
        {RAILS[subject].map((g) => (
          <li key={g.heading ?? 'all'} className="rail-group">
            {g.heading && <span className="rail-group-name">{g.heading}</span>}
            <ul>
              {g.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.label}>
                    <AppLink href={railHref(subject, item)} className="chem-rail-link" aria-current={isCurrent(item, module, search) ? 'page' : undefined}>
                      <Icon size={26} strokeWidth={1.75} aria-hidden="true" />
                      {item.label}
                    </AppLink>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  )
}
