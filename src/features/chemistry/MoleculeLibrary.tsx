import { Search, X } from 'lucide-react'
import { useId } from 'react'
import type { Molecule } from '../../data/chemistry/types'
import { searchMolecules } from '../../lib/chemistry'
import { Formula } from './Formula'

interface Props {
  molecules: readonly Molecule[]
  activeId: string
  query: string
  onQueryChange: (q: string) => void
  onSelect: (id: string) => void
}

export function MoleculeLibrary({ molecules, activeId, query, onQueryChange, onSelect }: Props) {
  const inputId = useId()
  const statusId = useId()
  const results = searchMolecules(molecules, query)

  return (
    <section className="panel library" aria-labelledby={`${inputId}-heading`}>
      <h2 id={`${inputId}-heading`} className="panel-title">
        Molecule library
      </h2>

      <div className="search">
        <label htmlFor={inputId} className="visually-hidden">
          Search molecules by name or formula
        </label>
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          className="search-input"
          placeholder="Name or formula, e.g. CO2"
          value={query}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={statusId}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className="icon-button search-clear"
            aria-label="Clear search"
            onClick={() => onQueryChange('')}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <p id={statusId} className="search-status" role="status">
        {query ? `${results.length} of ${molecules.length} molecules` : `${molecules.length} molecules`}
      </p>

      {results.length > 0 ? (
        <ul className="molecule-list">
          {results.map((m) => {
            const active = m.id === activeId
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={`molecule-card${active ? ' is-active' : ''}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(m.id)}
                >
                  <Formula formula={m.formula} className="molecule-card-formula" />
                  <span className="molecule-card-text">
                    <span className="molecule-card-name">{m.name}</span>
                    <span className="molecule-card-shape">{m.shapeSummary}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <p>No molecules match “{query.trim()}”.</p>
          <p className="muted">
            Search by name (benzene) or formula (NH3, C₂H₆O). Available: water, carbon dioxide, methane,
            ammonia, ethanol and benzene.
          </p>
        </div>
      )}

      <p className="library-footnote muted">More molecules are planned for future releases.</p>
    </section>
  )
}
