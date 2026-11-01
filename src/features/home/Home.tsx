import { ArrowRight, BookA, Bookmark, BookOpen, Compass, ExternalLink, ListOrdered, NotebookPen, Search, X } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AppLink } from '../../components/AppLink'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { overviewHref } from '../../lib/overviewRoute'
import { useExplorationLibrary } from '../../lib/useExplorationLibrary'
import { SUBJECT_CARDS } from './content'
import { HeroAtom } from './HeroAtom'
import { HomeSearch } from './HomeSearch'
import { RecentStrip } from './RecentStrip'
import { SavedPanel } from './SavedPanel'

/** Home's order: Chemistry first (the subject being tested with students), then the others. */
const ORDER: SubjectId[] = ['chemistry', 'anatomy', 'biology', 'physics', 'mathematics']
const subjectName = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!.name

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

/** Chemistry's card opens the Chemistry home page ("What are you working on?"). */
const CHEMISTRY_HOME = '?csec=topics#/chemistry'

/**
 * Scroll reveal: elements marked `data-reveal` rise in as they enter the viewport. Only when motion
 * is allowed and IntersectionObserver exists; otherwise nothing is ever hidden.
 */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    root.classList.add('has-motion')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )
    root.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

/**
 * Home answers one question: what would you like to explore? Search, five subjects, your study
 * space, recent visits and saved explorations. Everything else lives on Discover (#/discover).
 */
export function Home() {
  const library = useExplorationLibrary()
  const [message, setMessage] = useState('')
  const revealRef = useReveal()

  const jump = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    el?.focus({ preventScroll: true })
  }

  return (
    <div ref={revealRef} className={`home home--design${message ? ' has-toast' : ''}`}>
      <section className="home-hero" aria-labelledby="home-title">
        <HeroAtom />
        <p className="home-eyebrow hero-in" style={{ '--d': '0ms' } as CSSProperties}>
          STEM Explorer
        </p>
        {/* Each word rises out of its own mask; the accent word gets a gradient sweep and an underline. */}
        <h1 id="home-title" className="home-title">
          <span className="ht-word">
            <span style={{ '--d': '80ms' } as CSSProperties}>Science,</span>
          </span>{' '}
          <span className="ht-word">
            <span style={{ '--d': '200ms' } as CSSProperties}>made</span>
          </span>{' '}
          <span className="ht-word ht-accent-wrap">
            <span className="ht-accent" style={{ '--d': '320ms' } as CSSProperties}>
              clearer.
            </span>
            <svg className="ht-underline" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path d="M4 14 C 70 4, 150 4, 296 11" />
            </svg>
          </span>
        </h1>
        <p className="home-lead hero-in" style={{ '--d': '520ms' } as CSSProperties}>
          Explore a model. Understand an idea. Try it yourself.
        </p>
        <div className="hero-in" style={{ '--d': '660ms' } as CSSProperties}>
          <HomeSearch />
        </div>
      </section>

      <section className="home-section" aria-labelledby="subjects-heading">
        <h2 id="subjects-heading" className="home-h2" data-reveal>
          Choose a subject
        </h2>
        <ul className="subject-cards subject-tiles">
          {ORDER.map((id, i) => {
            const card = SUBJECT_CARDS[id]
            // Each card opens the subject's Overview (contents, search and common questions).
            const href = id === 'chemistry' ? CHEMISTRY_HOME : overviewHref(id)
            return (
              <li key={id} className={`subject-card is-${id}`} data-reveal style={{ '--i': i } as CSSProperties}>
                <AppLink className="subject-card-action" href={href}>
                  <span className="subject-card-text">
                    <span className="subject-card-title">{subjectName(id)}</span>
                    <span className="subject-card-summary">{card.summary}</span>
                    {id === 'chemistry' && (
                      <span className="subject-card-button">
                        Explore chemistry <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <img className="subject-card-img" src={`${import.meta.env.BASE_URL}img/design/${id}-card.webp`} alt="" loading={id === 'chemistry' ? 'eager' : 'lazy'} />
                </AppLink>
              </li>
            )
          })}
        </ul>
      </section>

      <nav className="home-section study-space" aria-label="Library and saved work" data-reveal>
        <h2 className="home-h2">Your study space</h2>
        <ul className="study-main">
          <li>
            <a href="#/home" className="study-card" onClick={(e) => (e.preventDefault(), jump(document.getElementById('saved-section')))}>
              <span className="study-icon">
                <Bookmark size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="study-title">
                  Saved explorations <ArrowRight size={15} aria-hidden="true" />
                </span>
                <span className="study-text">Pick up where you left off.</span>
              </span>
            </a>
          </li>
          <li>
            <AppLink href="#/reference" className="study-card">
              <span className="study-icon">
                <BookOpen size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="study-title">
                  Reference library <ArrowRight size={15} aria-hidden="true" />
                </span>
                <span className="study-text">Key concepts, formulas, and more.</span>
              </span>
            </AppLink>
          </li>
        </ul>
        <ul className="study-more">
          <li>
            <a href="#/search">
              <Search size={16} aria-hidden="true" /> Search all subjects
            </a>
          </li>
          <li>
            <a href="#/glossary">
              <BookA size={16} aria-hidden="true" /> Glossary
            </a>
          </li>
          <li>
            <a href="#/collections">
              <ListOrdered size={16} aria-hidden="true" /> Collections
            </a>
          </li>
          <li>
            <a href="#/notebook">
              <NotebookPen size={16} aria-hidden="true" /> Notebook
            </a>
          </li>
          <li>
            <a href="#/discover">
              <Compass size={16} aria-hidden="true" /> Discover activities and connections
            </a>
          </li>
        </ul>
      </nav>

      {library.recent.length > 0 && <RecentStrip recent={library.recent} onMessage={setMessage} />}

      <SavedPanel saved={library.saved} savedError={library.savedError} onMessage={setMessage} />

      <footer className="home-footer">
        <nav aria-label="Subjects (footer)">
          <ul>
            {ORDER.map((id) => (
              <li key={id}>
                <a href={`#/${id}`}>{subjectName(id)}</a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="muted small">
          Explanations paraphrase open textbooks (OpenStax) and scientific databases, with sources on every page; models are simplified for
          learning. <a href="#/discover">Sources and model limits</a> ·{' '}
          <a href="https://github.com/satkynovilgiz/stem-explorer" target="_blank" rel="noreferrer">
            Source code on GitHub
            <ExternalLink size={12} aria-hidden="true" className="external-icon" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </p>
      </footer>

      {/* One live region for library messages, so a message survives its section disappearing (e.g. Clear history). */}
      <div className="home-toast" role="status">
        {message && (
          <>
            <p className="library-status">{message}</p>
            <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}>
              <X size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
