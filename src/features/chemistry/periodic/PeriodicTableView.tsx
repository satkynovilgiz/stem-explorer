import { ExternalLink, Search, X } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  BLOCK_NOTES,
  CATEGORIES,
  ELEMENTS,
  findElement,
  moleculesWith,
  searchElements,
  type Block,
  type ElementInfo,
} from '../../../data/chemistry/periodicTable'

type FilterKind = 'block' | 'category'
const BLOCKS: Block[] = ['s', 'p', 'd', 'f']
const PUBCHEM_URL = 'https://pubchem.ncbi.nlm.nih.gov/periodic-table/'

function gridPlacement(e: ElementInfo) {
  // Column 1 holds period numbers, so group g is grid column g + 1. Rows 1–7 are periods; row 8 is
  // a spacer; rows 9 and 10 are the lanthanoid and actinoid rows.
  const row = e.row === 'main' ? e.period : e.row === 'lanthanoids' ? 9 : 10
  return { gridRow: row, gridColumn: e.column + 1 }
}

/** Arrow-key movement: the nearest element in that direction (same row first, then the next row that has one). */
function neighbour(e: ElementInfo, key: string): ElementInfo | undefined {
  const { gridRow, gridColumn } = gridPlacement(e)
  const placed = ELEMENTS.map((x) => ({ x, ...gridPlacement(x) }))
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const dir = key === 'ArrowLeft' ? -1 : 1
    return placed
      .filter((p) => p.gridRow === gridRow && Math.sign(p.gridColumn - gridColumn) === dir)
      .sort((a, b) => Math.abs(a.gridColumn - gridColumn) - Math.abs(b.gridColumn - gridColumn))[0]?.x
  }
  const dir = key === 'ArrowUp' ? -1 : 1
  const rows = [...new Set(placed.map((p) => p.gridRow))].sort((a, b) => a - b)
  for (let r = gridRow + dir; dir < 0 ? r >= rows[0] : r <= rows[rows.length - 1]; r += dir) {
    const inRow = placed.filter((p) => p.gridRow === r)
    if (inRow.length === 0) continue
    return inRow.sort((a, b) => Math.abs(a.gridColumn - gridColumn) - Math.abs(b.gridColumn - gridColumn))[0].x
  }
  return undefined
}

export interface PeriodicTableViewProps {
  selected: number
  onSelect: (z: number) => void
}

/** The periodic table (with a list alternative), search and one classification filter. */
export default function PeriodicTableView({ selected, onSelect }: PeriodicTableViewProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<FilterKind>('block')
  const [filter, setFilter] = useState<string>('all')
  const [layout, setLayout] = useState<'table' | 'list'>('table')
  const buttons = useRef(new Map<number, HTMLButtonElement>())

  const matches = useMemo(() => {
    const found = new Set(searchElements(query).map((e) => e.number))
    return new Set(
      ELEMENTS.filter((e) => found.has(e.number) && (filter === 'all' || (kind === 'block' ? e.block === filter : e.category === filter))).map(
        (e) => e.number,
      ),
    )
  }, [query, kind, filter])

  const onKey = (e: KeyboardEvent, el: ElementInfo) => {
    if (!e.key.startsWith('Arrow')) return
    const next = neighbour(el, e.key)
    if (!next) return
    e.preventDefault()
    onSelect(next.number)
    buttons.current.get(next.number)?.focus()
  }

  const options = kind === 'block' ? BLOCKS : CATEGORIES
  const label = (e: ElementInfo) => `${e.name}, ${e.symbol}, atomic number ${e.number}`

  return (
    <section className="ptable" aria-labelledby={`${id}-title`}>
      <div className="ptable-head">
        <h2 id={`${id}-title`} className="panel-title">
          Periodic table
        </h2>
        <div className="segmented" role="group" aria-label="Layout">
          {(['table', 'list'] as const).map((l) => (
            <button key={l} type="button" className="segmented-option" aria-pressed={layout === l} onClick={() => setLayout(l)}>
              {l === 'table' ? 'Table' : 'List'}
            </button>
          ))}
        </div>
      </div>

      <div className="ptable-controls">
        <div className="search">
          <Search className="search-icon" size={16} aria-hidden="true" />
          <label htmlFor={`${id}-q`} className="visually-hidden">
            Search elements by name, symbol or atomic number
          </label>
          <input
            id={`${id}-q`}
            type="search"
            className="search-input"
            placeholder="Name, symbol or number, e.g. Fe or 26"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="icon-button search-clear" aria-label="Clear element search" onClick={() => setQuery('')}>
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="ptable-filter">
          <label htmlFor={`${id}-kind`} className="small muted">
            Filter by
          </label>
          <select
            id={`${id}-kind`}
            className="select"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as FilterKind)
              setFilter('all')
            }}
          >
            <option value="block">Block (s, p, d, f)</option>
            <option value="category">Category (PubChem)</option>
          </select>
          <label htmlFor={`${id}-value`} className="visually-hidden">
            {kind === 'block' ? 'Block' : 'Category'}
          </label>
          <select id={`${id}-value`} className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {kind === 'block' ? `${o} block` : o}
              </option>
            ))}
          </select>
        </div>
        <p className="muted small" role="status">
          {matches.size === 118 ? 'All 118 elements' : `${matches.size} of 118 elements match`}
          {filter !== 'all' && kind === 'block' ? ` · ${BLOCK_NOTES[filter as Block]}` : ''}
        </p>
      </div>

      {layout === 'table' ? (
        <div className="ptable-scroll" role="region" aria-label="Periodic table (scrolls sideways on narrow screens)" tabIndex={0}>
          <div className="ptable-grid">
            {[1, 2, 3, 4, 5, 6, 7].map((p) => (
              <span key={`p${p}`} className="ptable-period" style={{ gridRow: p, gridColumn: 1 }} aria-hidden="true">
                {p}
              </span>
            ))}
            <span className="ptable-placeholder" style={{ gridRow: 6, gridColumn: 4 }} aria-hidden="true">
              57–71
            </span>
            <span className="ptable-placeholder" style={{ gridRow: 7, gridColumn: 4 }} aria-hidden="true">
              89–103
            </span>
            {ELEMENTS.map((e) => (
              <button
                key={e.number}
                ref={(el) => {
                  if (el) buttons.current.set(e.number, el)
                  else buttons.current.delete(e.number)
                }}
                type="button"
                className={`ptable-cell is-${e.block}${matches.has(e.number) ? '' : ' is-dimmed'}`}
                style={gridPlacement(e)}
                aria-label={label(e)}
                aria-pressed={selected === e.number}
                tabIndex={selected === e.number ? 0 : -1}
                onClick={() => onSelect(e.number)}
                onKeyDown={(ev) => onKey(ev, e)}
              >
                <span className="ptable-z">{e.number}</span>
                <span className="ptable-sym">{e.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ol className="ptable-list" aria-label="Elements">
          {ELEMENTS.filter((e) => matches.has(e.number)).map((e) => (
            <li key={e.number}>
              <button type="button" className="ptable-list-item" aria-pressed={selected === e.number} onClick={() => onSelect(e.number)}>
                <span className="ptable-list-z">{e.number}</span>
                <span className="ptable-list-sym">{e.symbol}</span>
                <span>{e.name}</span>
                <span className="muted small">
                  {e.block} block · {e.category}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {layout === 'table' && (
        <ul className="ptable-legend small" aria-label="Block colours">
          {BLOCKS.map((b) => (
            <li key={b}>
              <span className={`ptable-swatch is-${b}`} aria-hidden="true" /> {b} block
            </li>
          ))}
        </ul>
      )}
      {layout === 'table' && (
        <p className="muted small ptable-hint">Arrow keys move between elements. Dimmed elements don’t match the search or filter.</p>
      )}
    </section>
  )
}

/** Details for the selected element, with links to the app's molecules that contain it. */
export function ElementPanel({ z, onOpenMolecule }: { z: number; onOpenMolecule: (moleculeId: string) => void }) {
  const e = findElement(z)!
  const molecules = moleculesWith(e.symbol)
  return (
    <section className="panel info" aria-labelledby="element-heading">
      <header className="info-header">
        <p className="eyebrow">Element</p>
        <h2 id="element-heading" className="info-title">
          {e.name}
        </h2>
        <p className="element-symbol" aria-hidden="true">
          {e.symbol}
        </p>
      </header>
      <dl className="element-facts">
        <div>
          <dt>Symbol</dt>
          <dd>{e.symbol}</dd>
        </div>
        <div>
          <dt>Atomic number</dt>
          <dd>{e.number}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>{e.period}</dd>
        </div>
        <div>
          <dt>Group</dt>
          <dd>{e.group ?? (e.row === 'lanthanoids' ? 'Lanthanoid row (no group number in this layout)' : 'Actinoid row (no group number in this layout)')}</dd>
        </div>
        <div>
          <dt>Block</dt>
          <dd>{BLOCK_NOTES[e.block]}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{e.category} (PubChem)</dd>
        </div>
      </dl>
      <div className="info-section">
        <h3 className="section-title">In this app’s molecules</h3>
        {molecules.length ? (
          <ul className="element-molecules">
            {molecules.map((m) => (
              <li key={m.id}>
                <button type="button" className="tool-button bordered" onClick={() => onOpenMolecule(m.id)}>
                  Open {m.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">None of the six molecules here contain {e.name.toLowerCase()}.</p>
        )}
      </div>
      <div className="info-section">
        <p className="muted small">
          Names, symbols, atomic numbers and categories come from the{' '}
          <a href={PUBCHEM_URL} target="_blank" rel="noreferrer">
            PubChem Periodic Table
            <ExternalLink size={11} aria-hidden="true" className="external-icon" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          . Atomic weights and isotope data are not shown.
        </p>
      </div>
    </section>
  )
}
