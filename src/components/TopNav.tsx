import { useEffect, useRef } from 'react'
import { House } from 'lucide-react'
import { SUBJECTS } from '../data/subjects'
import type { Route } from '../lib/hooks'
import { SubjectIcon } from './SubjectIcon'

export function TopNav({ active }: { active: Route }) {
  const navRef = useRef<HTMLElement>(null)

  // On narrow screens the subject list scrolls horizontally; keep the active one visible.
  useEffect(() => {
    const nav = navRef.current
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2
  }, [active])

  return (
    <header className="topnav">
      <a className="brand" href="#/home" aria-label="STEM Explorer home">
        <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <circle cx="4.5" cy="7" r="2" />
          <circle cx="19.5" cy="7" r="2" />
          <circle cx="12" cy="20.5" r="2" />
          <path d="M9.4 10.4 6.2 8.1M14.6 10.4l3.2-2.3M12 15.2v3.3" />
        </svg>
        <span className="brand-name">STEM Explorer</span>
      </a>

      <nav ref={navRef} aria-label="Main" className="subject-nav">
        <ul>
          <li>
            <a
              href="#/home"
              className={`subject-link${active === 'home' ? ' is-active' : ''}`}
              aria-current={active === 'home' ? 'page' : undefined}
            >
              <House size={16} aria-hidden="true" />
              <span>Home</span>
            </a>
          </li>
          {SUBJECTS.map((s) => (
            <li key={s.id}>
              <a
                href={`#/${s.id}`}
                className={`subject-link${s.id === active ? ' is-active' : ''}`}
                aria-current={s.id === active ? 'page' : undefined}
              >
                <SubjectIcon subject={s.id} size={16} />
                <span>{s.name}</span>
                {!s.available && (
                  <>
                    <span className="soon-dot" title="Coming soon" aria-hidden="true" />
                    <span className="visually-hidden">(coming soon)</span>
                  </>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
