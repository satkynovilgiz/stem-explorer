import '../../../styles/chemistry-home.css'
import { ArrowRight } from 'lucide-react'
import { AppLink } from '../../../components/AppLink'
import { TOOLS, VISUALIZATIONS } from './destinations'

/** Visualizations (`csec=visual`) and Tools (`csec=tools`): what exists, what each does, and its limits. */
export function DestinationPage({ kind }: { kind: 'visual' | 'tools' }) {
  const list = kind === 'visual' ? VISUALIZATIONS : TOOLS
  return (
    <div className="chem-home">
      <header className="chem-home-head">
        <div className="chem-home-title-wrap">
          <h1 className="chem-home-title">{kind === 'visual' ? 'Visualizations' : 'Tools'}</h1>
          <p className="chem-home-lead">
            {kind === 'visual'
              ? 'Interactive models you can turn and change. Each says what it demonstrates and what it simplifies.'
              : 'Calculators that show every step, with units and assumptions.'}
          </p>
        </div>
      </header>
      <ul className="chem-dest-list">
        {list.map((d) => (
          <li key={d.href}>
            <AppLink href={d.href} className="chem-dest">
              <span className="chem-dest-title">
                {d.title} <ArrowRight size={16} aria-hidden="true" />
              </span>
              <span className="chem-dest-text">{d.text}</span>
              <span className="chem-dest-meta">
                <span className="chem-dest-label">You can change:</span> {d.inputs}
              </span>
              <span className="chem-dest-meta">{d.note}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
