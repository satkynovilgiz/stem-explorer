import { lazy, Suspense, useEffect } from 'react'
import { TopNav } from './components/TopNav'
import { SUBJECTS } from './data/subjects'
import { AnatomyExplorer } from './features/anatomy/AnatomyExplorer'
import { BiologyExplorer } from './features/biology/BiologyExplorer'
import { ChemistryExplorer } from './features/chemistry/ChemistryExplorer'
import { MathematicsExplorer } from './features/mathematics/MathematicsExplorer'
import { Home } from './features/home/Home'
import { PhysicsExplorer } from './features/physics/PhysicsExplorer'
import { useRoute } from './lib/hooks'

// Pages reached from the top bar only; they load on first visit.
const GlossaryPage = lazy(() => import('./features/glossary/GlossaryPage').then((m) => ({ default: m.GlossaryPage })))
const NotebookPage = lazy(() => import('./features/notebook/NotebookPage').then((m) => ({ default: m.NotebookPage })))
const pageLoading = <p className="muted small panel">Loading…</p>

export default function App() {
  const route = useRoute()
  const subjectName = SUBJECTS.find((s) => s.id === route)?.name

  useEffect(() => {
    document.title = subjectName ? `${subjectName} · STEM Explorer` : route === 'glossary' ? 'Glossary · STEM Explorer' : route === 'notebook' ? 'Notebook · STEM Explorer' : 'STEM Explorer'
  }, [subjectName, route])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopNav active={route} />
      <main id="main" className="main" tabIndex={-1}>
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
            <h1 className="visually-hidden">Biology Explorer: animal cell</h1>
            <BiologyExplorer />
          </>
        ) : route === 'glossary' ? (
          <Suspense fallback={pageLoading}>
            <GlossaryPage />
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
