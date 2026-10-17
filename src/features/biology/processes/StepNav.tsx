import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SourceLinks } from '../../guide/SourceLinks'

/** Manual step navigation shared by the biology process sections: Previous, Next and direct steps. */
export function StepNav({
  steps,
  index,
  onChange,
  label,
}: {
  steps: readonly { title: string; text: string; sources?: readonly string[] }[]
  index: number
  onChange: (i: number) => void
  label: string
}) {
  const step = steps[index]
  return (
    <div className="step-nav">
      <div className="tour-nav">
        <button type="button" className="tool-button bordered" disabled={index === 0} onClick={() => onChange(index - 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <ol className="tour-dots" aria-label={label}>
          {steps.map((s, i) => (
            <li key={s.title}>
              <button type="button" className={`tour-dot${i === index ? ' is-current' : ''}`} aria-label={`Step ${i + 1}: ${s.title}`} aria-current={i === index ? 'step' : undefined} onClick={() => onChange(i)} />
            </li>
          ))}
        </ol>
        <button type="button" className="button" disabled={index === steps.length - 1} onClick={() => onChange(index + 1)}>
          <span>Next</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="eyebrow">
        Step {index + 1} of {steps.length}
      </p>
      <h3 className="tour-title">{step.title}</h3>
      <p className="prose" aria-live="polite">
        {step.text}
        {step.sources && <SourceLinks ids={step.sources} />}
      </p>
    </div>
  )
}
