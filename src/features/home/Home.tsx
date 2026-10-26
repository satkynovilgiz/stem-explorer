import { ArrowRight, BookOpen, ChevronDown, Compass, ExternalLink, FlaskConical, HelpCircle, Link2, ListOrdered, MousePointerClick, Move3d, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { CURATED_COLLECTIONS } from '../../data/collections'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { availableQuestions, modulesOf } from '../../data/topics'
import { useExplorationLibrary } from '../../lib/useExplorationLibrary'
import { requestActivity } from '../activities/requests'
import { ACTIVITIES } from './activities'
import { SUBJECT_CARDS } from './content'
import { HomeSearch } from './HomeSearch'
import { RecentStrip } from './RecentStrip'
import { SavedPanel } from './SavedPanel'
import { HeroIllustration } from './HeroIllustration'
import { InterestStarts } from './HomeSections'
import { SubjectArt } from './SubjectArt'

const ORDER: SubjectId[] = SUBJECTS.map((s) => s.id)
const subjectName = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!.name

/** Curated deep links using only supported URL parameters; next steps the URL cannot encode are spelled out. */
const SPOTLIGHT = {
  subject: 'mathematics' as SubjectId,
  title: 'Find where a saddle is level',
  href: '?surface=saddle&a=0.5&b=0.5#/mathematics',
  text: 'The saddle z = a·x² − b·y² curves up along x and down along y. At one point its tangent plane is horizontal, yet that point is neither a maximum nor a minimum.',
  next: 'Under Inspect a point, enter x = 0 and y = 0: Local slope shows ∇f = 0. Then try x = 1 and turn on the tangent plane.',
}

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

const CHEMISTRY_START = ACTIVITIES.find((a) => a.subject === 'chemistry')!
const FIRST_PATH = CURATED_COLLECTIONS[0]

/** Counts shown under the hero, all derived from the project's data (nothing about visitors). */
const FACTS = [
  { value: SUBJECTS.length, label: 'subjects' },
  { value: SUBJECTS.reduce((n, s) => n + modulesOf(s.id).length, 0), label: 'modules' },
  { value: ACTIVITIES.length, label: 'guided activities' },
  { value: CURATED_COLLECTIONS.length, label: 'starter paths' },
]

/** First visit (no history and nothing saved): concrete starting points and how exploring works. */
function WelcomePanel() {
  return (
    <section className="home-panel welcome" aria-labelledby="welcome-heading">
      <h2 id="welcome-heading" className="home-h2">
        <Sparkles size={18} aria-hidden="true" /> New here? Start with one of these
      </h2>
      <div className="welcome-starts">
        <AppLink href={CHEMISTRY_START.entryHref ?? '#/chemistry'} className="welcome-start is-chemistry" onClick={() => requestActivity('chemistry')}>
          <span className="welcome-start-kind">Guided activity · {CHEMISTRY_START.steps.length} steps</span>
          <span className="welcome-start-title">{CHEMISTRY_START.title}</span>
        </AppLink>
        <a href="?heart=cutaway#/anatomy" className="welcome-start is-anatomy">
          <span className="welcome-start-kind">Explore freely</span>
          <span className="welcome-start-title">Rotate and cut away a model heart</span>
        </a>
        <AppLink href="#/collections" className="welcome-start is-biology">
          <span className="welcome-start-kind">Starter path · {FIRST_PATH.steps.length} steps</span>
          <span className="welcome-start-title">{FIRST_PATH.title}</span>
        </AppLink>
      </div>
      <h3 className="welcome-subhead">How exploring works</h3>
      <GuideSteps />
    </section>
  )
}

/** Curated questions; only those whose destination module exists are listed (src/data/topics.ts). */
function QuestionLinks() {
  const questions = availableQuestions()
  if (questions.length === 0) return null
  return (
    <section className="home-section" aria-labelledby="questions-heading">
      <h2 id="questions-heading" className="home-h2">
        <HelpCircle size={18} aria-hidden="true" /> Explore by question
      </h2>
      <ul className="question-list">
        {questions.map((q) => (
          <li key={q.question}>
            <AppLink href={q.href} className={`question-link is-${q.subject}`}>
              <span className="question-text">{q.question}</span>
              <span className="question-answer">{q.answer}</span>
              <span className={`subject-chip is-${q.subject}`}>{subjectName(q.subject)}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** "Start exploring" target: guided activities, starter paths and curated deep links, from the catalog. */
function Investigations({ sectionRef }: { sectionRef: React.RefObject<HTMLElement | null> }) {
  return (
    <section ref={sectionRef} id="investigations" className="home-section" aria-labelledby="investigations-heading" tabIndex={-1}>
      <h2 id="investigations-heading" className="home-h2">
        <FlaskConical size={18} aria-hidden="true" /> Start an investigation
      </h2>
      <p className="muted small home-section-lead">Each one opens a real explorer view you can change. Nothing is scored or tracked.</p>

      <AppLink href={SPOTLIGHT.href} className={`spotlight is-${SPOTLIGHT.subject}`}>
        <SubjectArt subject={SPOTLIGHT.subject} />
        <span className="spotlight-text">
          <span className="spotlight-kind">
            <span className={`subject-chip is-${SPOTLIGHT.subject}`}>{subjectName(SPOTLIGHT.subject)}</span> Featured
          </span>
          <span className="spotlight-title">{SPOTLIGHT.title}</span>
          <span className="spotlight-body">{SPOTLIGHT.text}</span>
          <span className="featured-next">{SPOTLIGHT.next}</span>
          <span className="spotlight-action">
            Open the saddle <ArrowRight size={16} aria-hidden="true" />
          </span>
        </span>
      </AppLink>

      <h3 className="home-h3">Guided activities</h3>
      <p className="muted small">Short walkthroughs inside each explorer. Your current view comes back when you exit.</p>
      <ul className="investigation-grid">
        {ACTIVITIES.map((a) => (
          <li key={a.id}>
            <AppLink href={a.entryHref ?? `#/${a.subject}`} className={`investigation is-${a.subject}`} onClick={() => requestActivity(a.subject)}>
              <span className="investigation-kind">
                <SubjectIcon subject={a.subject} size={14} /> {subjectName(a.subject)} · {a.steps.length} steps
              </span>
              <span className="investigation-title">{a.title}</span>
              <span className="investigation-text">{a.goal}</span>
            </AppLink>
          </li>
        ))}
      </ul>

      <h3 className="home-h3">Starter paths across subjects</h3>
      <ul className="investigation-grid">
        {CURATED_COLLECTIONS.map((c) => {
          const subjects = [...new Set(c.steps.map((s) => s.subject))]
          return (
            <li key={c.id}>
              <AppLink href="#/collections" className="investigation is-path">
                <span className="investigation-kind">
                  <ListOrdered size={14} aria-hidden="true" /> Path · {c.steps.length} steps · {subjects.map(subjectName).join(', ')}
                </span>
                <span className="investigation-title">{c.title}</span>
                <span className="investigation-text">{c.summary}</span>
              </AppLink>
            </li>
          )
        })}
      </ul>

      <h3 className="home-h3">More starting points</h3>
      <ul className="investigation-grid is-compact">
        {FEATURED.map((f) => (
          <li key={f.href}>
            <AppLink href={f.href} className={`investigation is-${f.subject}`}>
              <span className="investigation-kind">
                <SubjectIcon subject={f.subject} size={14} /> {subjectName(f.subject)}
              </span>
              <span className="investigation-title">{f.title}</span>
              <span className="investigation-text">{f.next}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Home() {
  const library = useExplorationLibrary()
  const firstVisit = library.recent.length === 0 && library.saved.length === 0 && library.savedError === null
  const [guideOpen, setGuideOpen] = useState(false)
  const [message, setMessage] = useState('')
  const subjectsRef = useRef<HTMLElement>(null)
  const investigationsRef = useRef<HTMLElement>(null)
  const guideRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (guideOpen) guideRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' })
  }, [guideOpen])

  const jump = (el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    el?.focus({ preventScroll: true })
  }

  return (
    <div className={`home${message ? ' has-toast' : ''}`}>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-text">
          <p className="eyebrow">Interactive science models</p>
          <h1 id="home-title" className="home-title">
            Explore science.
            <span className="home-title-sub">See how it works.</span>
          </h1>
          <p className="home-lead">
            Hands-on explorers for anatomy, chemistry, physics, mathematics and biology. Rotate a model or change a number, and
            see what happens. Short explanations cite their sources.
          </p>
          <div className="home-actions">
            <button type="button" className="button home-cta" onClick={() => jump(investigationsRef.current)}>
              Start exploring
              <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="tool-button bordered" onClick={() => jump(subjectsRef.current)}>
              <span>Browse subjects</span>
            </button>
            {!firstVisit && (
              <button type="button" className="tool-button bordered" aria-expanded={guideOpen} aria-controls="home-guide" onClick={() => setGuideOpen((v) => !v)}>
                <BookOpen size={15} aria-hidden="true" />
                <span>How it works</span>
                <ChevronDown size={14} aria-hidden="true" className={guideOpen ? 'is-flipped' : ''} />
              </button>
            )}
          </div>
          <ul className="home-facts" aria-label="What is here">
            {FACTS.map((f) => (
              <li key={f.label}>
                <strong>{f.value}</strong> {f.label}
              </li>
            ))}
          </ul>
        </div>
        <HeroIllustration />
      </section>

      <div className="home-search-band">
        <HomeSearch />
      </div>

      {guideOpen && !firstVisit && (
        <section id="home-guide" ref={guideRef} className="home-panel home-guide" aria-labelledby="guide-heading">
          <h2 id="guide-heading" className="home-h2">
            How to explore
          </h2>
          <GuideSteps />
        </section>
      )}

      {firstVisit ? <WelcomePanel /> : library.recent.length > 0 && <RecentStrip recent={library.recent} onMessage={setMessage} />}

      <section ref={subjectsRef} className="home-section" aria-labelledby="subjects-heading" tabIndex={-1}>
        <h2 id="subjects-heading" className="home-h2">
          Explore subjects
        </h2>
        <ul className="subject-cards">
          {ORDER.map((id, i) => {
            const card = SUBJECT_CARDS[id]
            const modules = modulesOf(id)
            return (
              <li key={id} className={`subject-card is-${id}`} style={{ '--i': i } as CSSProperties}>
                <div className="subject-card-preview">
                  <SubjectArt subject={id} />
                </div>
                <div className="subject-card-body">
                  <p className="subject-card-name">
                    <SubjectIcon subject={id} size={14} /> {subjectName(id)} · {modules.length} module{modules.length === 1 ? '' : 's'}
                  </p>
                  <h3 className="subject-card-title">{card.title}</h3>
                  <p className="subject-card-text">{card.summary}</p>
                  <ul className="subject-card-modules" aria-label={`${subjectName(id)} modules`}>
                    {modules.map((m) => (
                      <li key={m.id}>
                        <AppLink href={m.href} className="subject-module">
                          <span className="subject-module-name">{m.name}</span>
                          <span className="visually-hidden subject-module-summary">: {m.summary}</span>
                        </AppLink>
                      </li>
                    ))}
                  </ul>
                </div>
                <AppLink className="subject-card-action" href={modules[0].href}>
                  Open {modules[0].name.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}
                  <ArrowRight size={16} aria-hidden="true" />
                </AppLink>
              </li>
            )
          })}
        </ul>
        <p className="muted small">Card illustrations are simplified previews, not the scientific models.</p>
      </section>

      <Investigations sectionRef={investigationsRef} />

      <QuestionLinks />

      <InterestStarts />

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
          Content is paraphrased from open educational sources (OpenStax) and scientific databases (NIST CCCBDB, PubChem); each
          explorer lists its sources. Models are simplified for learning.{' '}
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
