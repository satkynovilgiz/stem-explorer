import { AppLink } from './AppLink'

/*
 * Chemistry's six destinations, as a small tab row inside the page (there is no global header).
 * Every Chemistry page belongs to one, so the current place is always marked: a calculator is
 * under Tools, an explanation under Topics, the atomic-structure model under Visualizations.
 */
const TABS = [
  { id: 'overview', label: 'Overview', href: '?csec=topics#/chemistry', modules: ['chemistry.topics'] },
  { id: 'elements', label: 'Elements', href: '?csec=periodic#/chemistry', modules: ['chemistry.periodic'] },
  { id: 'molecules', label: 'Molecules', href: '?csec=library#/chemistry', modules: ['chemistry.library', 'chemistry.molecules'] },
  { id: 'topics', label: 'Topics', href: '?csec=contents#/chemistry', modules: ['chemistry.contents', 'chemistry.learn'] },
  { id: 'visual', label: 'Visualizations', href: '?csec=visual#/chemistry', modules: ['chemistry.visual', 'chemistry.atomic', 'chemistry.bonding'] },
  { id: 'tools', label: 'Tools', href: '?csec=tools#/chemistry', modules: ['chemistry.tools', 'chemistry.solutions', 'chemistry.reactions'] },
] as const

export function ChemNav({ moduleId }: { moduleId: string }) {
  return (
    <nav className="chem-nav" aria-label="Chemistry">
      <ul>
        {TABS.map((t) => {
          const here = (t.modules as readonly string[]).includes(moduleId)
          return (
            <li key={t.id}>
              <AppLink href={t.href} className="chem-nav-link" aria-current={here ? 'page' : undefined}>
                {t.label}
              </AppLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
