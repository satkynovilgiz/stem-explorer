import { X } from 'lucide-react'
import { findHeartPart } from '../../data/anatomy/heart'
import { COMPARE_PRESETS, VESSEL_FACTS, type VesselId } from '../../data/anatomy/vessels'
import { SourceLinks } from '../guide/SourceLinks'

const ROWS: { label: string; value: (id: VesselId) => string }[] = [
  { label: 'Direction relative to the heart', value: (id) => (VESSEL_FACTS[id].direction === 'away' ? 'Away from the heart' : 'Toward the heart') },
  { label: 'Named', value: (id) => (VESSEL_FACTS[id].type === 'artery' ? 'Artery (carries blood away)' : 'Vein (carries blood toward)') },
  { label: 'Connected to', value: (id) => VESSEL_FACTS[id].connection },
  { label: 'Circulation', value: (id) => (VESSEL_FACTS[id].circuit === 'pulmonary' ? 'Pulmonary (heart ↔ lungs)' : 'Systemic (heart ↔ body)') },
  { label: 'Oxygenation (normal adult)', value: (id) => (VESSEL_FACTS[id].oxygenation === 'rich' ? 'Oxygen-rich' : 'Oxygen-poor') },
  { label: 'Main function', value: (id) => VESSEL_FACTS[id].function },
]

/** Side-by-side comparison of two vessels; fully usable from HTML controls, with or without WebGL. */
export function ComparePanel({
  a,
  b,
  onClear,
  onPreset,
  onExit,
}: {
  a: VesselId | null
  b: VesselId | null
  onClear: (slot: 'a' | 'b' | 'both') => void
  onPreset: (a: VesselId, b: VesselId) => void
  onExit: () => void
}) {
  const name = (id: VesselId | null) => (id ? findHeartPart(id)!.name : null)
  const slot = (letter: 'A' | 'B', id: VesselId | null) => (
    <div className={`compare-slot is-${letter.toLowerCase()}`}>
      <span className={`compare-badge is-${letter.toLowerCase()}`} aria-hidden="true">
        {letter}
      </span>
      <span className="compare-slot-name">
        <span className="visually-hidden">Vessel {letter}: </span>
        {name(id) ?? <span className="muted">Choose a vessel</span>}
      </span>
      {id && (
        <button type="button" className="icon-button" aria-label={`Clear vessel ${letter}`} onClick={() => onClear(letter === 'A' ? 'a' : 'b')}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
  return (
    <section className="panel info compare" aria-labelledby="compare-heading">
      <header className="info-header">
        <p className="eyebrow">Anatomy</p>
        <h2 id="compare-heading" className="info-title">
          Compare vessels
        </h2>
        <p className="info-summary">
          Pick two vessels in the list or the model. The first fills A, the next fills B, and later picks replace B.
        </p>
      </header>
      <div className="info-body">
        <div className="compare-slots">
          {slot('A', a)}
          {slot('B', b)}
        </div>
        <div className="compare-presets">
          {COMPARE_PRESETS.map((p) => (
            <button key={p.label} type="button" className="tool-button bordered" onClick={() => onPreset(p.a, p.b)}>
              {p.label}
            </button>
          ))}
        </div>
        {a && b ? (
          <table className="compare-table">
            <caption className="visually-hidden">
              {name(a)} compared with {name(b)}
            </caption>
            <thead>
              <tr>
                <th scope="col">Property</th>
                <th scope="col">
                  <span className="compare-badge is-a" aria-hidden="true">
                    A
                  </span>{' '}
                  {name(a)}
                </th>
                <th scope="col">
                  <span className="compare-badge is-b" aria-hidden="true">
                    B
                  </span>{' '}
                  {name(b)}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{r.value(a)}</td>
                  <td>{r.value(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">Choose {a ? 'a second vessel' : 'two vessels'} to see them side by side.</p>
        )}
        <div className="note">
          <p className="note-title">Named by direction, not by oxygen</p>
          <p className="prose">
            Arteries carry blood away from the heart and veins carry it toward the heart, whatever its oxygen content. In the
            pulmonary circuit the usual pattern is reversed: the pulmonary arteries carry oxygen-poor blood and the pulmonary veins
            carry oxygen-rich blood.
            <SourceLinks ids={['ap-20-1']} />
          </p>
          <p className="prose muted">
            Context: a normal adult heart after birth, drawn as a simplified schematic. Oxygen levels describe that normal
            circulation; the blue and red colours are a diagram convention. The pulmonary trunk entry includes the left and right
            pulmonary arteries.
            <SourceLinks ids={['ap-19-1']} />
          </p>
        </div>
        <div className="header-actions">
          {(a || b) && (
            <button type="button" className="tool-button bordered" onClick={() => onClear('both')}>
              Clear both
            </button>
          )}
          <button type="button" className="button" onClick={onExit}>
            Exit comparison
          </button>
        </div>
      </div>
    </section>
  )
}
