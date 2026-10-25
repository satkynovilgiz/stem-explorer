import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { PresentationBar } from './components/PresentationBar'
import { SubjectBar } from './components/SubjectBar'
import { KeyboardHelp } from './components/KeyboardHelp'
import { getPeek, isTypingTarget, setPeek, toggleFocus, toggleSide, usePeek, useWorkspace } from './lib/workspace'
import { TopNav } from './components/TopNav'
import { isSubjectId, SUBJECTS } from './data/subjects'
import { AnatomyExplorer } from './features/anatomy/AnatomyExplorer'
import { BiologyExplorer } from './features/biology/BiologyExplorer'
import { ChemistryExplorer } from './features/chemistry/ChemistryExplorer'
import { MathematicsExplorer } from './features/mathematics/MathematicsExplorer'
import { Home } from './features/home/Home'
import { PhysicsExplorer } from './features/physics/PhysicsExplorer'
import { navigateTo, routeFromHash, useRoute } from './lib/hooks'
import { useNavigationGeneration } from './lib/location'

// Pages reached from the top bar only; they load on first visit.
const GlossaryPage = lazy(() => import('./features/glossary/GlossaryPage').then((m) => ({ default: m.GlossaryPage })))
const SearchPage = lazy(() => import('./features/search/SearchPage').then((m) => ({ default: m.SearchPage })))
const NotebookPage = lazy(() => import('./features/notebook/NotebookPage').then((m) => ({ default: m.NotebookPage })))
const pageLoading = <p className="muted small panel">Loading…</p>

/** The current route, read at event time (handlers registered once). */
const routeFromLocation = () => routeFromHash(window.location.hash)

export default function App() {
  const route = useRoute()
  const subjectName = SUBJECTS.find((s) => s.id === route)?.name
  // Presentation mode belongs to one explorer visit: leaving the route ends it.
  const [presenting, setPresenting] = useState<string | null>(null)
  const exitPresentation = useCallback(() => {
    setPresenting(null)
    // Back on the Present button, which is visible again.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.present-toggle')?.focus())
  }, [])
  // Adjusting state while rendering (not in an effect) when the route changes.
  if (presenting !== null && presenting !== route) setPresenting(null)
  const isPresenting = presenting !== null && isSubjectId(route)
  // Back, Forward and in-app links remount the explorer so it re-reads its state from the URL.
  const generation = useNavigationGeneration()
  const [helpOpen, setHelpOpen] = useState(false)
  const workspace = useWorkspace()
  const peek = usePeek()
  const inExplorer = isSubjectId(route)

  // A peeking panel belongs to one explorer visit.
  useEffect(() => setPeek(null), [route])

  // Workspace layout classes (explorers only; phone layouts ignore them in CSS).
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('ws-hide-left', inExplorer && workspace.hideLeft && !workspace.focus)
    root.classList.toggle('ws-hide-right', inExplorer && workspace.hideRight && !workspace.focus)
    root.classList.toggle('ws-focus', inExplorer && workspace.focus)
    root.classList.toggle('ws-peek-left', inExplorer && workspace.focus && peek === 'left')
    root.classList.toggle('ws-peek-right', inExplorer && workspace.focus && peek === 'right')
  }, [inExplorer, workspace, peek])

  // Single-key shortcuts: never while typing, never with Ctrl/⌘/Alt, never when another dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
      if (e.key === 'Escape' && getPeek()) {
        setPeek(null)
        return
      }
      if (document.querySelector('dialog[open]') && e.key !== '?') return
      const explorer = isSubjectId(routeFromLocation())
      switch (e.key) {
        case '?':
          setHelpOpen((v) => !v)
          break
        case '/':
          navigateTo('#/search')
          break
        case 't':
          if (!explorer) return
          window.dispatchEvent(new Event('stem:open-topics'))
          break
        case 'f':
          if (!explorer) return
          toggleFocus()
          break
        case '[':
          if (!explorer) return
          toggleSide('left')
          break
        case ']':
          if (!explorer) return
          toggleSide('right')
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.title = subjectName ? `${subjectName} · STEM Explorer` : route === 'glossary' ? 'Glossary · STEM Explorer' : route === 'notebook' ? 'Notebook · STEM Explorer' : route === 'search' ? 'Search · STEM Explorer' : 'STEM Explorer'
  }, [subjectName, route])

  return (
    <div className={`app${isSubjectId(route) ? ' has-subject-bar' : ''}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopNav active={route} onPresent={isSubjectId(route) ? () => setPresenting(route) : undefined} />
      {isPresenting && isSubjectId(route) && <PresentationBar subject={route} onExit={exitPresentation} />}
      {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
      {isSubjectId(route) && <SubjectBar subject={route} />}
      <main id="main" className="main" tabIndex={-1} key={isSubjectId(route) ? `${route}:${generation}` : route}>
        {route === 'anatomy' ? (
          <>
            <h1 className="visually-hidden">Anatomy Explorer: body atlas and heart</h1>
            <AnatomyExplorer />
          </>
        ) : route === 'chemistry' ? (
          <>
            <h1 className="visually-hidden">Chemistry Explorer</h1>
            <ChemistryExplorer />
          </>
        ) : route === 'physics' ? (
          <>
            <h1 className="visually-hidden">Physics Explorer: projectile motion lab</h1>
            <PhysicsExplorer />
          </>
        ) : route === 'mathematics' ? (
          <>
            <h1 className="visually-hidden">Mathematics Explorer: interactive 3D surfaces</h1>
            <MathematicsExplorer />
          </>
        ) : route === 'biology' ? (
          <>
            <h1 className="visually-hidden">Biology Explorer: cells, DNA, division and energy</h1>
            <BiologyExplorer />
          </>
        ) : route === 'glossary' ? (
          <Suspense fallback={pageLoading}>
            <GlossaryPage />
          </Suspense>
        ) : route === 'search' ? (
          <Suspense fallback={pageLoading}>
            <SearchPage />
          </Suspense>
        ) : route === 'notebook' ? (
          <Suspense fallback={pageLoading}>
            <NotebookPage />
          </Suspense>
        ) : (
          <Home />
        )}
      </main>
    </div>
  )
}
