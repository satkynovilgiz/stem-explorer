import { ArrowRight, BookA, Bookmark, BookOpen, Compass, ExternalLink, ListOrdered, NotebookPen, Search, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AppLink } from '../../components/AppLink'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { overviewHref } from '../../lib/overviewRoute'
import { useExplorationLibrary } from '../../lib/useExplorationLibrary'
import { SUBJECT_CARDS } from './content'
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
 * 3D tilt for the subject cards: a card leans toward the pointer and a soft light follows it.
 * Only with a mouse (fine pointer that can hover) and when motion is allowed.
 */
function useTilt() {
  const ref = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const list = ref.current
    if (!list || !window.matchMedia('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const cardOf = (e: PointerEvent) => (e.target as Element | null)?.closest<HTMLElement>('.subject-card-action') ?? null
    const move = (e: PointerEvent) => {
      const card = cardOf(e)
      if (!card) return
      const r = card.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      card.style.setProperty('--ry', `${((x - 0.5) * 16).toFixed(2)}deg`)
      card.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`)
      card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
      card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    }
    const out = (e: PointerEvent) => {
      const card = cardOf(e)
      if (!card || card.contains(e.relatedTarget as Node | null)) return
      for (const p of ['--rx', '--ry', '--mx', '--my']) card.style.removeProperty(p)
    }
    list.addEventListener('pointermove', move)
    list.addEventListener('pointerout', out)
    return () => {
      list.removeEventListener('pointermove', move)
      list.removeEventListener('pointerout', out)
    }
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
  const tiltRef = useTilt()

  const jump = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    el?.focus({ preventScroll: true })
  }

  return (
    <div ref={revealRef} className={`home home--design${message ? ' has-toast' : ''}`}>
      <section className="home-hero is-lens" aria-labelledby="home-title">
        <p className="home-eyebrow hero-in" style={{ '--d': '0ms' } as CSSProperties}>
          STEM Explorer
        </p>
        {/* The clearing lens: the title starts blurred, and a magnifying glass slides across it
            leaving it sharp ("made clearer"). The blurred copy and the glass are decoration only. */}
        <div className="lens-head">
          <p className="home-title lens-blur" aria-hidden="true">
            Science, made clearer.
          </p>
          <h1 id="home-title" className="home-title lens-sharp">
            Science, made <span className="ht-accent">clearer.</span>
          </h1>
          <span className="lens-glass" aria-hidden="true" />
        </div>
        {/* Three steps, numbered by CSS so the sentence itself reads as one line. */}
        <p className="home-lead lens-steps hero-in" style={{ '--d': '420ms' } as CSSProperties}>
          <span>Explore a model.</span> <span>Understand an idea.</span> <span>Try it yourself.</span>
        </p>
        <div className="hero-in lens-search" style={{ '--d': '560ms' } as CSSProperties}>
          <HomeSearch />
        </div>
      </section>

      <section className="home-section" aria-labelledby="subjects-heading">
        <h2 id="subjects-heading" className="home-h2" data-reveal>
          Choose a subject
        </h2>
        <ul ref={tiltRef} className="subject-cards subject-tiles is-tilt">
          {ORDER.map((id, i) => {
            const card = SUBJECT_CARDS[id]
            // Each card opens the subject's Overview (contents, search and common questions).
            const href = id === 'chemistry' ? CHEMISTRY_HOME : overviewHref(id)
            return (
              <li key={id} className={`subject-card is-${id}`} data-reveal style={{ '--i': i } as CSSProperties}>
                <AppLink className="subject-card-action" href={href}>
                  <span className="subject-card-pic">
                    <img className="subject-card-img" src={`${import.meta.env.BASE_URL}img/design/${id}-card.webp`} alt="" loading={id === 'chemistry' ? 'eager' : 'lazy'} />
                  </span>
                  <span className="subject-card-text">
                    <span className="subject-card-title">{subjectName(id)}</span>
                    <span className="subject-card-summary">{card.summary}</span>
                    <span className="subject-card-sections">
                      {card.sections.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </span>
                    <span className="subject-card-go">
                      Explore<span className="visually-hidden"> {subjectName(id).toLowerCase()}</span> <ArrowRight size={15} aria-hidden="true" />
                    </span>
                  </span>
                  <span className="subject-card-shine" aria-hidden="true" />
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
