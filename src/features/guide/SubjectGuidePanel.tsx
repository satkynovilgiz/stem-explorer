import { BookOpen, ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { GUIDES, type SubjectGuide } from '../../data/guides'
import type { SubjectId } from '../../data/subjects'
import { RelatedTopics } from './RelatedTopics'
import { SourceLinks } from './SourceLinks'
import { TermButton } from './TermButton'

/**
 * "About this explorer": the same structure in every subject. A plain-language summary is always
 * visible once opened; the deeper explanation is a further disclosure, so beginners aren't flooded.
 */
export function SubjectGuidePanel({ subject, guide: override }: { subject: SubjectId; guide?: SubjectGuide }) {
  const guide = override ?? GUIDES[subject]
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <section className="guide" aria-labelledby={`${id}-title`}>
      <button type="button" className="guide-toggle" aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen((v) => !v)}>
        <BookOpen size={16} aria-hidden="true" />
        <span id={`${id}-title`} className="guide-title">
          About this explorer
        </span>
        <ChevronDown size={16} aria-hidden="true" className={open ? 'is-flipped' : ''} />
      </button>
      {open && (
        <div id={`${id}-body`} className="guide-body">
          <p className="guide-summary">{guide.summary}</p>

          <details className="guide-more">
            <summary>Go deeper</summary>
            {guide.deeper.map((d) => (
              <p key={d.text} className="small">
                {d.text}
                <SourceLinks ids={d.sourceIds} />
              </p>
            ))}
          </details>

          <h3 className="guide-h">Key terms</h3>
          <ul className="term-list">
            {guide.keyTerms.map((t) => (
              <TermButton key={t} id={t} />
            ))}
          </ul>

          {guide.relations.length > 0 && (
            <>
              <h3 className="guide-h">{subject === 'biology' || subject === 'anatomy' ? 'Relationships' : 'Equations'}</h3>
              <ul className="guide-list">
                {guide.relations.map((r) => (
                  <li key={r.expression}>
                    <code className="guide-expr">{r.expression}</code>
                    <span className="small">
                      {r.text}
                      <SourceLinks ids={r.sourceIds} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {guide.symbols.length > 0 && (
            <table className="guide-symbols">
              <caption className="guide-h">Symbols and units</caption>
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">Meaning</th>
                  <th scope="col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {guide.symbols.map((s) => (
                  <tr key={s.symbol}>
                    <td>{s.symbol}</td>
                    <td>{s.meaning}</td>
                    <td>{s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 className="guide-h">Common misconceptions</h3>
          <ul className="guide-list">
            {guide.misconceptions.map((m) => (
              <li key={m.claim}>
                <span className="small">
                  <strong>“{m.claim}”</strong> {m.text}
                  <SourceLinks ids={m.sourceIds} />
                </span>
              </li>
            ))}
          </ul>

          <h3 className="guide-h">What this model simplifies</h3>
          <ul className="guide-list small">
            {guide.simplifications.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <h3 className="guide-h">Measured, computed or illustrative?</h3>
          <dl className="guide-kinds small">
            {(['measured', 'computed', 'illustrative'] as const).map((k) => (
              <div key={k}>
                <dt>{k[0].toUpperCase() + k.slice(1)}</dt>
                <dd>{guide.modelKinds[k].length ? guide.modelKinds[k].join('. ') : 'Nothing in this model.'}</dd>
              </div>
            ))}
          </dl>

          <RelatedTopics subject={subject} />
        </div>
      )}
    </section>
  )
}
