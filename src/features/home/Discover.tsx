import { ArrowRight, Compass, FlaskConical, HelpCircle, Link2, ListOrdered, MousePointerClick, Move3d, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { CURATED_COLLECTIONS } from '../../data/collections'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { availableQuestions } from '../../data/topics'
import { requestActivity } from '../activities/requests'
import { ACTIVITIES } from './activities'
import { InterestStarts } from './HomeSections'
import { AtlasPreview, Connections, LibraryTeaser, SourcesNote } from './HomeShowcase'
import { SubjectArt } from './SubjectArt'

/*
 * Discover (`#/discover`): the starting points that used to fill Home (investigations, starter
 * paths, cross-subject connections, questions, interests, the body-atlas overview, the reference
 * library in numbers, and sources and model limits). Home keeps one obvious start: search or pick a
 * subject. Everything here keeps its links and behaviour.
 */
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

/** Where an activity's link goes: its own link, the subject (keeping its state), or a fresh start. */
function activityHref(a: (typeof ACTIVITIES)[number]): string {
  if (a.entryHref) return a.entryHref
  // Chemistry keeps a viewer state only when a molecule is open and the home page is not the section.
  const q = new URLSearchParams(window.location.search)
  const hasState = a.subject === 'chemistry' ? q.has('molecule') && q.get('csec') !== 'topics' : true
  return !hasState && a.freshHref ? a.freshHref : `#/${a.subject}`
}
const FIRST_PATH = CURATED_COLLECTIONS[0]


/** Concrete starting points and how exploring works. */
function WelcomePanel() {
  return (
    <section className="home-panel welcome" aria-labelledby="welcome-heading">
      <h2 id="welcome-heading" className="home-h2">
        <Sparkles size={18} aria-hidden="true" /> New here? Start with one of these
      </h2>
      <div className="welcome-starts">
        <AppLink href={activityHref(CHEMISTRY_START)} className="welcome-start is-chemistry" onClick={() => requestActivity('chemistry')}>
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
function Investigations() {
  return (
    <section id="investigations" className="home-section" aria-labelledby="investigations-heading" tabIndex={-1}>
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
            <AppLink href={activityHref(a)} className={`investigation is-${a.subject}`} onClick={() => requestActivity(a.subject)}>
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

export function DiscoverPage() {
  useEffect(() => {
    document.title = 'Discover · STEM Explorer'
  }, [])
  return (
    <div className="home home--design discover">
      <header className="home-hero">
        <h1 className="home-title discover-title">Discover</h1>
        <p className="home-lead">Guided activities, starting points and connections across the five subjects.</p>
      </header>
      <WelcomePanel />
      <Investigations />
      <QuestionLinks />
      <InterestStarts />
      <AtlasPreview />
      <Connections />
      <LibraryTeaser />
      <div id="sources" tabIndex={-1}>
        <SourcesNote />
      </div>
    </div>
  )
}
