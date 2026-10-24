import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { PresentationBar } from './components/PresentationBar'
import { SubjectBar } from './components/SubjectBar'
import { TopNav } from './components/TopNav'
import { isSubjectId, SUBJECTS } from './data/subjects'
import { AnatomyExplorer } from './features/anatomy/AnatomyExplorer'
import { BiologyExplorer } from './features/biology/BiologyExplorer'
import { ChemistryExplorer } from './features/chemistry/ChemistryExplorer'
import { MathematicsExplorer } from './features/mathematics/MathematicsExplorer'
import { Home } from './features/home/Home'
import { PhysicsExplorer } from './features/physics/PhysicsExplorer'
import { useRoute } from './lib/hooks'
import { useNavigationGeneration } from './lib/location'

// Pages reached from the top bar only; they load on first visit.
const GlossaryPage = lazy(() => import('./features/glossary/GlossaryPage').then((m) => ({ default: m.GlossaryPage })))
const SearchPage = lazy(() => import('./features/search/SearchPage').then((m) => ({ default: m.SearchPage })))
const NotebookPage = lazy(() => import('./features/notebook/NotebookPage').then((m) => ({ default: m.NotebookPage })))
const pageLoading = <p className="muted small panel">Loading…</p>

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
