import { useEffect } from 'react'
import { ComingSoon } from './components/ComingSoon'
import { TopNav } from './components/TopNav'
import { SUBJECTS } from './data/subjects'
import { BiologyExplorer } from './features/biology/BiologyExplorer'
import { ChemistryExplorer } from './features/chemistry/ChemistryExplorer'
import { PhysicsExplorer } from './features/physics/PhysicsExplorer'
import { useHashSubject } from './lib/hooks'

export default function App() {
  const subjectId = useHashSubject()
  const subject = SUBJECTS.find((s) => s.id === subjectId)!

  useEffect(() => {
    document.title = `${subject.name} · STEM Explorer`
  }, [subject.name])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopNav active={subjectId} />
      <main id="main" className="main" tabIndex={-1}>
        {subject.id === 'chemistry' ? (
          <>
            <h1 className="visually-hidden">Chemistry Explorer</h1>
            <ChemistryExplorer />
          </>
        ) : subject.id === 'physics' ? (
          <>
            <h1 className="visually-hidden">Physics Explorer: projectile motion lab</h1>
            <PhysicsExplorer />
          </>
        ) : subject.id === 'biology' ? (
          <>
            <h1 className="visually-hidden">Biology Explorer: animal cell</h1>
            <BiologyExplorer />
          </>
        ) : (
          <ComingSoon subject={subject} />
        )}
      </main>
    </div>
  )
}
