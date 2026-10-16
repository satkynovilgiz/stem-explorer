import { useEffect } from 'react'
import { TopNav } from './components/TopNav'
import { SUBJECTS } from './data/subjects'
import { HeartExplorer } from './features/anatomy/HeartExplorer'
import { BiologyExplorer } from './features/biology/BiologyExplorer'
import { ChemistryExplorer } from './features/chemistry/ChemistryExplorer'
import { MathematicsExplorer } from './features/mathematics/MathematicsExplorer'
import { GlossaryPage } from './features/glossary/GlossaryPage'
import { Home } from './features/home/Home'
import { PhysicsExplorer } from './features/physics/PhysicsExplorer'
import { useRoute } from './lib/hooks'

export default function App() {
  const route = useRoute()
  const subjectName = SUBJECTS.find((s) => s.id === route)?.name

  useEffect(() => {
    document.title = subjectName ? `${subjectName} · STEM Explorer` : route === 'glossary' ? 'Glossary · STEM Explorer' : 'STEM Explorer'
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
            <h1 className="visually-hidden">Anatomy Explorer: the human heart</h1>
            <HeartExplorer />
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
          <GlossaryPage />
        ) : (
          <Home />
        )}
      </main>
    </div>
  )
}
