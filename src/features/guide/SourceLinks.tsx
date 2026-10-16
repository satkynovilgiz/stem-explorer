import { ExternalLink } from 'lucide-react'
import { SOURCES } from '../../data/sources'

/** The sources that support one claim, as compact links next to it. */
export function SourceLinks({ ids }: { ids: readonly string[] }) {
  const sources = ids.map((id) => SOURCES[id]).filter(Boolean)
  if (sources.length === 0) return null
  return (
    <span className="cite">
      {' '}
      Source:{' '}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && '; '}
          <a href={s.url} target="_blank" rel="noreferrer">
            {s.label}
            <ExternalLink size={11} aria-hidden="true" className="external-icon" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </span>
      ))}
    </span>
  )
}
