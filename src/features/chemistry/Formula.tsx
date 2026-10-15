import { formulaLabel, formulaParts } from '../../lib/chemistry'

/** Chemical formula with real <sub> elements and a plain-text reading for screen readers. */
export function Formula({ formula, className }: { formula: string; className?: string }) {
  return (
    <span className={`formula ${className ?? ''}`}>
      <span aria-hidden="true">
        {formulaParts(formula).map((part, i) =>
          part.sub ? <sub key={i}>{part.text}</sub> : <span key={i}>{part.text}</span>,
        )}
      </span>
      <span className="visually-hidden">{formulaLabel(formula)}</span>
    </span>
  )
}
