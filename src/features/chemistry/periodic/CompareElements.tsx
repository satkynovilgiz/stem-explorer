import { Plus, X } from 'lucide-react'
import { useId, useState } from 'react'
import { ELEMENTS, findElement } from '../../../data/chemistry/periodicTable'
import { PROPERTIES, formatProperty, propertiesOf } from '../../../data/chemistry/elementProperties'

const MAX = 4

/** Up to four elements side by side: every PubChem property, with the highest value of each row marked. */
export function CompareElements({ selected }: { selected: number }) {
  const id = useId()
  const [zs, setZs] = useState<number[]>([])
  const [pick, setPick] = useState('')
  const sel = findElement(selected)!
  const add = (z: number) => setZs((cur) => (cur.includes(z) || cur.length >= MAX ? cur : [...cur, z]))
  const full = zs.length >= MAX

  return (
    <section className="ptable-compare" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="section-title">
        Compare elements
      </h3>
      <div className="ptable-compare-controls">
        <button type="button" className="tool-button bordered" disabled={full || zs.includes(selected)} onClick={() => add(selected)}>
          <Plus size={14} aria-hidden="true" /> Add {sel.name}
        </button>
        <label htmlFor={`${id}-pick`} className="small muted">
          or choose
        </label>
        <select
          id={`${id}-pick`}
          className="select"
          value={pick}
          disabled={full}
          onChange={(e) => {
            if (e.target.value) add(Number(e.target.value))
            setPick('')
          }}
        >
          <option value="">Element…</option>
          {ELEMENTS.filter((e) => !zs.includes(e.number)).map((e) => (
            <option key={e.number} value={e.number}>
              {e.number} {e.symbol} {e.name}
            </option>
          ))}
        </select>
        <span className="small muted" role="status">
          {zs.length === 0 ? `Add up to ${MAX} elements.` : full ? `${MAX} elements (the most) chosen.` : `${zs.length} of ${MAX} chosen.`}
        </span>
      </div>
      {zs.length > 0 && (
        <div className="table-scroll" role="region" aria-label="Element comparison (scrolls sideways on narrow screens)" tabIndex={0}>
          <table className="ptable-compare-table">
            <thead>
              <tr>
                <th scope="col">Property</th>
                {zs.map((z) => {
                  const e = findElement(z)!
                  return (
                    <th key={z} scope="col">
                      <span className="ptable-compare-el">
                        {e.name} ({e.symbol})
                        <button type="button" className="icon-button" aria-label={`Remove ${e.name}`} onClick={() => setZs((cur) => cur.filter((x) => x !== z))}>
                          <X size={14} aria-hidden="true" />
                        </button>
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PROPERTIES.map((p) => {
                const values = zs.map((z) => propertiesOf(z)[p.id])
                const known = values.filter((v): v is number => v !== null)
                const top = zs.length > 1 && known.length > 1 ? Math.max(...known) : null
                return (
                  <tr key={p.id}>
                    <th scope="row">
                      {p.label} <span className="muted small">({p.unit})</span>
                    </th>
                    {values.map((v, i) => (
                      <td key={zs[i]} className={v !== null && v === top ? 'is-top' : undefined}>
                        {formatProperty(p, v)}
                        {v !== null && v === top && <span className="ptable-compare-top"> · highest</span>}
                      </td>
                    ))}
                  </tr>
                )
              })}
              <tr>
                <th scope="row">Standard state</th>
                {zs.map((z) => (
                  <td key={z}>{propertiesOf(z).state}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Block · category</th>
                {zs.map((z) => {
                  const e = findElement(z)!
                  return (
                    <td key={z}>
                      {e.block} · {e.category}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
