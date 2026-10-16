import { ArrowRight, BookOpen, ChevronDown, Compass, ExternalLink, Link2, MousePointerClick, Move3d, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { ActivityEntries } from './ActivityEntries'
import { HomeSearch } from './HomeSearch'
import { LibrarySections } from './LibrarySections'
import { SubjectArt } from './SubjectArt'

const ORDER: SubjectId[] = SUBJECTS.map((s) => s.id)

/** What each explorer really offers today (no promises of missing features). */
const CARDS: Record<SubjectId, { title: string; text: string; action: string }> = {
  anatomy: {
    title: 'Explore the human heart',
    text: 'A schematic 3D heart: chambers, valves and great vessels, with a step-by-step blood-flow tour.',
    action: 'Open the heart',
  },
  chemistry: {
    title: 'Inspect molecules',
    text: 'Six molecules from experimental geometry. Measure distances and bond angles between atoms.',
    action: 'Open molecules',
  },
  biology: {
    title: 'Explore an animal cell',
    text: 'A cutaway cell with ten structures: select, isolate and read what each one does.',
    action: 'Open the cell',
  },
  physics: {
    title: 'Experiment with projectile motion',
    text: 'Set speed, angle, height and gravity, then launch, scrub through time and compare two runs.',
    action: 'Open the lab',
  },
  mathematics: {
    title: 'Explore surfaces',
    text: 'Reshape four surfaces z = f(x, y), read exact values at points and cut vertical cross-sections.',
    action: 'Open surfaces',
  },
}

/** Curated deep links using only supported URL parameters; next steps the URL cannot encode are spelled out. */
const FEATURED: { subject: SubjectId; title: string; href: string; next: string }[] = [
  {
    subject: 'chemistry',
    title: 'Inspect water’s molecular shape',
    href: '?molecule=water&view=ball-and-stick#/chemistry',
    next: 'Then choose Angle and pick H1, O1, H2 to measure the H–O–H angle.',
  },
  {
    subject: 'biology',
    title: 'Explore the Golgi apparatus',
    href: '?structure=golgi&cell=cutaway#/biology',
    next: 'Open the Structure & relationships tab to see where its cargo comes from.',
  },
  {
    subject: 'physics',
    title: 'Compare launch angles',
    href: '?speed=20&angle=30&height=0&gravity=9.81#/physics',
    next: 'Press Save as Run A, set the angle to 60°, and compare the landing distances.',
  },
  {
    subject: 'mathematics',
    title: 'Slice a saddle surface',
    href: '?surface=saddle&a=0.5&b=0.5&slice=x&at=1#/mathematics',
    next: 'Switch the slice to y = constant and watch the parabola flip.',
  },
  {
    subject: 'anatomy',
    title: 'Explore the mitral valve',
    href: '?part=mitral-valve&heart=cutaway#/anatomy',
    next: 'Then press Start blood-flow tour to follow blood through the valves.',
  },
]

const GUIDE = [
  { icon: MousePointerClick, title: 'Select', text: 'Click a part of a model, or choose it from the list beside it. The details panel explains what you picked.' },
  { icon: Move3d, title: 'Rotate or adjust', text: 'Drag to rotate and scroll or pinch to zoom. In the labs, move sliders or type values.' },
  { icon: Compass, title: 'Inspect', text: 'Measure atoms, read a point on a surface, isolate a structure or follow a guided tour.' },
  { icon: Link2, title: 'Share or save', text: 'Copy link keeps the current view in a URL; Save exploration keeps it on this browser.' },
]

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

function GuideSteps() {
  return (
    <ol className="guide-steps">
      {GUIDE.map(({ icon: Icon, title, text }) => (
        <li key={title}>
          <span className="guide-icon">
            <Icon size={18} aria-hidden="true" />
          </span>
          <span>
            <strong>{title}.</strong> {text}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** The guide sits near the top while "How it works" is expanded, and at the end of the page otherwise. */
export function Home() {
  const [guideOpen, setGuideOpen] = useState(false)
  const subjectsRef = useRef<HTMLElement>(null)
  const guideRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (guideOpen) guideRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' })
  }, [guideOpen])

  return (
    <div className="home">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-text">
          <p className="eyebrow">Interactive science models</p>
          <h1 id="home-title" className="home-title">
            Explore science. See how it works.
          </h1>
          <p className="home-lead">
            Rotate 3D models, adjust experiments and inspect the details, with each view connected to a short scientific
            explanation and its sources.
          </p>
          <div className="home-actions">
            <button
              type="button"
              className="button home-primary"
              onClick={() => {
                subjectsRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
                subjectsRef.current?.focus({ preventScroll: true })
              }}
            >
              Choose a subject
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tool-button bordered"
              aria-expanded={guideOpen}
              aria-controls="home-guide"
              onClick={() => setGuideOpen((v) => !v)}
            >
              <BookOpen size={16} aria-hidden="true" />
              <span>How it works</span>
              <ChevronDown size={14} aria-hidden="true" className={guideOpen ? 'is-flipped' : ''} />
            </button>
          </div>
        </div>
        <HomeSearch />
      </section>

      {guideOpen && (
        <section id="home-guide" ref={guideRef} className="home-panel home-guide" aria-labelledby="guide-heading">
          <h2 id="guide-heading" className="home-h2">
            How to explore
          </h2>
          <GuideSteps />
        </section>
      )}

      <section ref={subjectsRef} className="home-section" aria-labelledby="subjects-heading" tabIndex={-1}>
        <h2 id="subjects-heading" className="home-h2">
          Subjects
        </h2>
        <ul className="subject-cards">
          {ORDER.map((id) => {
            const subject = SUBJECTS.find((s) => s.id === id)!
            const card = CARDS[id]
            return (
              <li key={id} className={`subject-card is-${id}`}>
                <SubjectArt subject={id} />
                <p className="subject-card-name">{subject.name}</p>
                <h3 className="subject-card-title">{card.title}</h3>
                <p className="subject-card-text">{card.text}</p>
                <a className="button subject-card-action" href={`#/${id}`}>
                  {card.action}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </li>
            )
          })}
        </ul>
        <p className="muted small">Illustrations are simplified previews, not scientific models.</p>
      </section>

      <section className="home-section" aria-labelledby="featured-heading">
        <h2 id="featured-heading" className="home-h2">
          Featured explorations
        </h2>
        <ul className="featured-list">
          {FEATURED.map((f) => (
            <li key={f.href}>
              <AppLink href={f.href} className="featured-item">
                <span className={`subject-chip is-${f.subject}`}>{SUBJECTS.find((s) => s.id === f.subject)!.name}</span>
                <span className="featured-title">{f.title}</span>
                <span className="featured-next">
                  <SlidersHorizontal size={13} aria-hidden="true" /> {f.next}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      </section>

      <ActivityEntries />

      <LibrarySections />

      {!guideOpen && (
        <section className="home-panel home-guide" aria-labelledby="guide-heading-2">
          <h2 id="guide-heading-2" className="home-h2">
            How to explore
          </h2>
          <GuideSteps />
        </section>
      )}

      <footer className="home-footer">
        <nav aria-label="Subjects (footer)">
          <ul>
            {ORDER.map((id) => (
              <li key={id}>
                <a href={`#/${id}`}>{SUBJECTS.find((s) => s.id === id)!.name}</a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="muted small">
          Content is paraphrased from open educational sources (OpenStax) and scientific databases (NIST CCCBDB, PubChem); each
          explorer lists its sources. Models are simplified for learning.{' '}
          <a href="https://github.com/satkynovilgiz/stem-explorer" target="_blank" rel="noreferrer">
            Source code on GitHub
            <ExternalLink size={12} aria-hidden="true" className="external-icon" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </p>
      </footer>
    </div>
  )
}
