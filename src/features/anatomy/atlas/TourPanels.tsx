import { ChevronLeft, ChevronRight, HeartPulse, Microscope, Route, X } from 'lucide-react'
import { findStructure, getSystem, type SystemId } from '../../../data/anatomy/atlas'
import { findTour, type AtlasTour } from '../../../data/anatomy/atlas/tours'
import { SourceLinks } from '../../guide/SourceLinks'

export type CloseUp = 'alveolus' | 'nephron'

const MODULES: { system: SystemId; tour: AtlasTour['id']; blurb: string; closeUp?: { id: CloseUp; label: string } }[] = [
  { system: 'respiratory', tour: 'airflow', blurb: 'Airways from nose to bronchi, the lungs and the diaphragm.', closeUp: { id: 'alveolus', label: 'Gas exchange in an alveolus' } },
  { system: 'digestive', tour: 'food', blurb: 'The tract from mouth to anus, with the liver, gallbladder and pancreas.' },
  { system: 'urinary', tour: 'urine', blurb: 'Kidneys, ureters, bladder and urethra.', closeUp: { id: 'nephron', label: 'A nephron' } },
  { system: 'nervous', tour: 'signal', blurb: 'Brain regions, spinal cord, and cranial, spinal and limb nerves: central vs peripheral.' },
  { system: 'cardiovascular', tour: 'circulation', blurb: 'The systemic circuit through the body, connected to the detailed heart.' },
]

export function AtlasModules({
  onShowSystem,
  onStartTour,
  onCloseUp,
  onOpenHeart,
}: {
  onShowSystem: (s: SystemId) => void
  onStartTour: (t: AtlasTour['id']) => void
  onCloseUp: (c: CloseUp) => void
  onOpenHeart: () => void
}) {
  return (
    <details className="info-section atlas-modules" open>
      <summary className="section-title">Organ systems and tours</summary>
      <ul className="module-list">
        {MODULES.map((m) => {
          const sys = getSystem(m.system)
          const tour = findTour(m.tour)!
          return (
            <li key={m.system} className="module-card">
              <p className="module-name">
                <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" /> {sys.name}
              </p>
              <p className="small muted">{m.blurb}</p>
              <div className="share-row">
                <button type="button" className="tool-button bordered" onClick={() => onShowSystem(m.system)}>
                  Show this system
                </button>
                <button type="button" className="tool-button bordered" onClick={() => onStartTour(m.tour)}>
                  <Route size={15} aria-hidden="true" />
                  <span>Tour: {tour.title}</span>
                </button>
                {m.closeUp && (
                  <button type="button" className="tool-button bordered" onClick={() => onCloseUp(m.closeUp!.id)}>
                    <Microscope size={15} aria-hidden="true" />
                    <span>{m.closeUp.label}</span>
                  </button>
                )}
                {m.system === 'cardiovascular' && (
                  <button type="button" className="tool-button bordered" onClick={onOpenHeart}>
                    <HeartPulse size={15} aria-hidden="true" />
                    <span>Detailed heart</span>
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="muted small">Tours start only when you choose one. Exit returns you to the view you had before. Tours are not stored in links.</p>
    </details>
  )
}

const KIND_LABEL = { route: 'Route', contribution: 'Contribution (not part of the route)', process: 'What happens here' } as const

export function AtlasTourBar({
  tourId,
  step,
  reducedMotion,
  onPrevious,
  onNext,
  onGoTo,
  onExit,
  onCloseUp,
  onOpenHeart,
}: {
  tourId: AtlasTour['id']
  step: number
  reducedMotion: boolean
  onPrevious: () => void
  onNext: () => void
  onGoTo: (i: number) => void
  onExit: () => void
  onCloseUp: (c: CloseUp) => void
  onOpenHeart: () => void
}) {
  const tour = findTour(tourId)!
  const current = tour.steps[step]
  const last = step === tour.steps.length - 1
  return (
    <section className="tour-bar atlas-tour" aria-labelledby="atlas-tour-heading">
      <div className="tour-head">
        <p className="eyebrow">
          {tour.title} · step {step + 1} of {tour.steps.length}
        </p>
        <button type="button" className="tool-button bordered" onClick={onExit}>
          <X size={16} aria-hidden="true" />
          <span>Exit tour</span>
        </button>
      </div>
      <h2 id="atlas-tour-heading" className="tour-title">
        {current.title}
      </h2>
      <p className="tour-tags">
        <span className={`tour-kind is-${current.kind}`}>{KIND_LABEL[current.kind]}</span>
        {current.division && <span className="tour-kind is-division">{current.division === 'CNS' ? 'Central nervous system' : 'Peripheral nervous system'}</span>}
      </p>
      <p className="tour-text">
        {current.text}
        <SourceLinks ids={current.sources} />
      </p>
      <p className="small muted">Highlighted: {current.focus.map((id) => findStructure(id)!.name).join(', ')}.</p>
      {current.detail && (
        <div className="share-row">
          {current.detail === 'heart' ? (
            <button type="button" className="tool-button bordered" onClick={onOpenHeart}>
              <HeartPulse size={15} aria-hidden="true" />
              <span>Open the detailed heart explorer</span>
            </button>
          ) : (
            <button type="button" className="tool-button bordered" onClick={() => onCloseUp(current.detail as CloseUp)}>
              <Microscope size={15} aria-hidden="true" />
              <span>{current.detail === 'alveolus' ? 'Open the gas-exchange close-up' : 'Open the nephron close-up'}</span>
            </button>
          )}
        </div>
      )}
      <div className="tour-nav">
        <button type="button" className="tool-button bordered" onClick={onPrevious} disabled={step === 0}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <ol className="tour-dots" aria-label="Tour steps">
          {tour.steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`tour-dot${i === step ? ' is-current' : ''}${s.kind === 'contribution' ? ' is-contribution' : ''}`}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => onGoTo(i)}
              />
            </li>
          ))}
        </ol>
        {last ? (
          <button type="button" className="button" onClick={onExit}>
            Finish tour
          </button>
        ) : (
          <button type="button" className="button" onClick={onNext}>
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="muted small">
        {tour.conceptualNote}
        {reducedMotion && ' The marker is shown still because reduced motion is on.'}
      </p>
      <details className="small">
        <summary>All steps as text</summary>
        <ol>
          {tour.steps.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong> ({KIND_LABEL[s.kind].toLowerCase()}
              {s.division ? `; ${s.division}` : ''}). {s.text}
            </li>
          ))}
        </ol>
      </details>
    </section>
  )
}

