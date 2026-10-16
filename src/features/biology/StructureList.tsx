import { Check, Search, X } from 'lucide-react'
import { useId } from 'react'
import { instanceCount, structuresOf } from '../../data/biology/organelles'
import type { CellType, OrganelleId } from '../../data/biology/types'
import { searchOrganelles } from './search'

interface Props {
  cellType: CellType
  query: string
  onQueryChange: (q: string) => void
  selectedId: OrganelleId | null
  onSelect: (id: OrganelleId) => void
}

export function StructureList({ cellType, query, onQueryChange, selectedId, onSelect }: Props) {
  const inputId = useId()
  const statusId = useId()
  const results = searchOrganelles(query, cellType)
  const total = structuresOf(cellType).length

  return (
    <section className="panel library" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} className="panel-title">
        Cell structures
      </h2>

      <div className="search">
        <label htmlFor={inputId} className="visually-hidden">
          Search cell structures
        </label>
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          className="search-input"
          placeholder="e.g. Golgi, ATP, cytosol"
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={statusId}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => onQueryChange('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <p id={statusId} className="search-status" role="status">
        {query ? `${results.length} of ${total} structures` : `${total} structures in the ${cellType} cell`}
      </p>

      {results.length > 0 ? (
        <ul className="structure-list">
          {results.map((o) => {
            const selected = o.id === selectedId
            const count = instanceCount(cellType, o.id)
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className={`structure-item${selected ? ' is-active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(o.id)}
                >
                  <span className="structure-swatch" style={{ background: o.color }} aria-hidden="true">
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="structure-text">
                    <span className="structure-name">
                      {o.name}
                      {count && <span className="structure-count"> ×{count} in model</span>}
                    </span>
                    <span className="structure-tag">{o.tag}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <p>No structures match “{query.trim()}”.</p>
          <p className="muted">Try a name (nucleus), a role (ATP, protein) or a term (cytosol, cristae).</p>
        </div>
      )}
    </section>
  )
}
