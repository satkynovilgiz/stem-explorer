import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { configurationOf, isotopesOf, neutronCount, NIST_ISOTOPES_URL, shellCounts, subshellsOf, type SubshellType } from '../../../data/chemistry/atomic'
import { ELEMENTS, findElement, moleculesWith } from '../../../data/chemistry/periodicTable'
import { SourceLinks } from '../../guide/SourceLinks'

/** "[Ar]4s2 3d6" → [Ar]4s²3d⁶ with real superscripts (configuration text is PubChem's). */
export function ConfigText({ text }: { text: string }) {
  const parts = text.split(/(\d[spdf]\d+)/).filter(Boolean)
  return (
    <span className="config-text">
      {parts.map((p, i) => {
        const m = p.match(/^(\d[spdf])(\d+)$/)
        return m ? (
          <span key={i}>
            {m[1]}
            <sup>{m[2]}</sup>
          </span>
        ) : (
          <span key={i}>{p.trim() ? p : ' '}</span>
        )
      })}
    </span>
  )
}

/* ---------- Element picker ---------- */

export function ElementPicker({ z, onChange }: { z: number; onChange: (z: number) => void }) {
  const id = useId()
  return (
    <div className="element-picker">
      <button type="button" className="icon-button" aria-label="Previous element" disabled={z <= 1} onClick={() => onChange(z - 1)}>
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <label htmlFor={id} className="visually-hidden">
        Element
      </label>
      <select id={id} className="select" value={z} onChange={(e) => onChange(Number(e.target.value))}>
        {ELEMENTS.map((e) => (
          <option key={e.number} value={e.number}>
            {e.number} · {e.symbol} · {e.name}
          </option>
        ))}
      </select>
      <button type="button" className="icon-button" aria-label="Next element" disabled={z >= 118} onClick={() => onChange(z + 1)}>
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

/* ---------- Diagrams ---------- */

/** Electrons are drawn as evenly spaced, motionless dots on circles: a counting aid, not a picture of motion. */
function ShellDiagram({ z }: { z: number }) {
  const shells = shellCounts(z)
  const e = findElement(z)!
  const size = 300
  const c = size / 2
  const gap = Math.min(24, (c - 34) / Math.max(1, shells.length))
  return (
    <svg className="atom-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Simplified shell diagram of ${e.name}: a nucleus with ${z} protons and ${shells.length} shells holding ${shells.join(', ')} electrons.`}>
      {shells.map((count, i) => {
        const r = 30 + gap * (i + 1)
        return (
          <g key={i}>
            <circle cx={c} cy={c} r={r} className="atom-shell" />
            {Array.from({ length: count }, (_, k) => {
              const a = (2 * Math.PI * k) / count - Math.PI / 2
              return <circle key={k} cx={c + r * Math.cos(a)} cy={c + r * Math.sin(a)} r={3.4} className="atom-electron" />
            })}
            <text x={c + 4} y={c - r - 3} className="atom-shell-label">
              n = {i + 1}: {count}
            </text>
          </g>
        )
      })}
      <circle cx={c} cy={c} r={24} className="atom-nucleus" />
      <text x={c} y={c - 2} textAnchor="middle" className="atom-nucleus-label">
        {e.symbol}
      </text>
      <text x={c} y={c + 11} textAnchor="middle" className="atom-nucleus-sub">
        {z} p⁺
      </text>
    </svg>
  )
}

const TYPE_LABEL: Record<SubshellType, string> = { s: 's (spherical)', p: 'p (dumbbell-shaped)', d: 'd', f: 'f' }

/** The occupied subshells, plus generic s and p shapes: regions where an electron is likely to be found. */
function OrbitalPicture({ z }: { z: number }) {
  const subs = subshellsOf(z)
  return (
    <div className="orbital-picture">
      <svg className="atom-svg orbital-svg" viewBox="0 0 300 150" role="img" aria-label="Generic orbital shapes: a spherical s orbital and dumbbell-shaped p orbitals along three axes.">
        <g transform="translate(70 75)">
          <circle r="42" className="orbital-s" />
          <text y="62" textAnchor="middle" className="atom-shell-label">
            s
          </text>
        </g>
        <g transform="translate(210 75)">
          <ellipse rx="44" ry="15" className="orbital-p" />
          <ellipse rx="15" ry="44" className="orbital-p" />
          <ellipse rx="30" ry="30" className="orbital-p is-z" />
          <circle r="3" className="atom-electron" />
          <text y="62" textAnchor="middle" className="atom-shell-label">
            p (three orientations)
          </text>
        </g>
      </svg>
      <table className="compare-table subshell-table">
        <caption className="small">Occupied subshells (configuration as PubChem lists it)</caption>
        <thead>
          <tr>
            <th scope="col">Subshell</th>
            <th scope="col">Type</th>
            <th scope="col">Electrons</th>
          </tr>
        </thead>
        <tbody>
          {subs.map((s, i) => (
            <tr key={i}>
              <th scope="row">
                {s.n}
                {s.type}
              </th>
              <td>{TYPE_LABEL[s.type]}</td>
              <td>{s.electrons}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AtomicStructureView({ z, onChange }: { z: number; onChange: (z: number) => void }) {
  const [view, setView] = useState<'shells' | 'orbitals'>('shells')
  const e = findElement(z)!
  return (
    <section className="panel atomic-view" aria-labelledby="atomic-view-heading">
      <div className="atomic-head">
        <h2 id="atomic-view-heading" className="panel-title">
          Atomic structure
        </h2>
        <ElementPicker z={z} onChange={onChange} />
      </div>
      <div className="segmented" role="group" aria-label="Picture of the electrons">
        <button type="button" className="segmented-option" aria-pressed={view === 'shells'} onClick={() => setView('shells')}>
          Shell diagram (simplified)
        </button>
        <button type="button" className="segmented-option" aria-pressed={view === 'orbitals'} onClick={() => setView('orbitals')}>
          Orbitals (quantum picture)
        </button>
      </div>
      {view === 'shells' ? <ShellDiagram z={z} /> : <OrbitalPicture z={z} />}
      <p className="note-block small">
        {view === 'shells' ? (
          <>
            <strong>A counting picture, not orbits.</strong> The circles group {e.name}’s electrons by shell n. Electrons do not travel on these circles like planets: the
            Bohr model’s precise orbits were found to be untenable, and it does not account for electron–electron interactions in atoms with more than one electron.
            <SourceLinks ids={['chem-6-2']} />
          </>
        ) : (
          <>
            <strong>Orbitals are probability regions.</strong> Quantum mechanics describes each electron with a wavefunction; |ψ|² gives the probability of finding it near a
            point. The shapes are three-dimensional regions where an electron is likely to be found — s is spherical, p dumbbell-shaped — not paths. The drawings are
            generic, not to scale and not specific to this element.
            <SourceLinks ids={['chem-6-3']} />
          </>
        )}
      </p>
    </section>
  )
}

/* ---------- Details panel ---------- */

export function AtomPanel({
  z,
  shareParams,
  onOpenMolecule,
  onShowInTable,
}: {
  z: number
  shareParams: Record<string, string>
  onOpenMolecule: (id: string) => void
  onShowInTable: () => void
}) {
  const e = findElement(z)!
  const conf = configurationOf(z)
  const shells = shellCounts(z)
  const isotopes = isotopesOf(z)
  const molecules = moleculesWith(e.symbol)
  return (
    <section className="panel info" aria-labelledby="atom-heading">
      <header className="info-header">
        <p className="eyebrow">Atomic structure</p>
        <h2 id="atom-heading" className="info-title">
          {e.name} ({e.symbol})
        </h2>
        <div className="header-actions">
          <button type="button" className="tool-button bordered" onClick={onShowInTable}>
            Show in the periodic table
          </button>
        </div>
      </header>
      <div className="info-body">
        <dl className="readout">
          <div>
            <dt>Protons (atomic number Z)</dt>
            <dd>{z}</dd>
          </div>
          <div>
            <dt>Electrons in the neutral atom</dt>
            <dd>{z}</dd>
          </div>
          <div className="is-wide">
            <dt>Neutrons</dt>
            <dd>Depends on the isotope: N = A − Z (see below)</dd>
          </div>
          <div className="is-wide">
            <dt>Electron configuration</dt>
            <dd>
              <ConfigText text={conf.text} />
              {conf.note && <span className="muted"> ({conf.note}, as marked by PubChem)</span>}
            </dd>
          </div>
          <div className="is-wide">
            <dt>Electrons per shell</dt>
            <dd>{shells.map((n, i) => `n=${i + 1}: ${n}`).join(' · ')}</dd>
          </div>
        </dl>
        <p className="small">
          A neutral atom has as many electrons as protons. Any atom with {z} protons is {e.name.toLowerCase()}, whatever its numbers of neutrons or electrons.
          <SourceLinks ids={['chem-2-3']} />
        </p>
        <section className="info-section">
          <h3 className="section-title">Isotopes and neutrons</h3>
          {isotopes.length ? (
            <table className="compare-table">
              <caption className="visually-hidden">Isotopes of {e.name} in this app’s library</caption>
              <thead>
                <tr>
                  <th scope="col">Isotope</th>
                  <th scope="col">Mass number A</th>
                  <th scope="col">Neutrons N = A − Z</th>
                </tr>
              </thead>
              <tbody>
                {isotopes.map((i) => (
                  <tr key={i.massNumber}>
                    <th scope="row">
                      {e.symbol}-{i.massNumber}
                      {i.name ? ` (${i.name})` : ''}
                    </th>
                    <td>{i.massNumber}</td>
                    <td>
                      {i.massNumber} − {z} = {neutronCount(i.massNumber, z)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="small">No isotope of {e.name.toLowerCase()} is in this app’s verified library yet, so no neutron number is shown.</p>
          )}
          <p className="small muted">
            The neutron number belongs to a specific isotope. It is never estimated from the element’s atomic weight, which is an average over isotopes (and for elements
            without stable isotopes is not a standard value at all).
            <SourceLinks ids={['chem-2-3']} />
            {isotopes.length > 0 && (
              <>
                {' '}
                Isotope list:{' '}
                <a href={NIST_ISOTOPES_URL(e.symbol)} target="_blank" rel="noreferrer">
                  NIST, {e.name}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
                .
              </>
            )}
          </p>
        </section>
        {molecules.length > 0 && (
          <section className="info-section">
            <h3 className="section-title">In this app’s molecules</h3>
            <ul className="relation-list">
              {molecules.map((m) => (
                <li key={m.id}>
                  <button type="button" className="relation-link" onClick={() => onOpenMolecule(m.id)}>
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="muted small">
          Configurations: <SourceLinks ids={['pubchem-periodic', 'chem-6-4']} /> Ground-state configurations follow the usual filling order with some exceptions (for
          example chromium, [Ar]3d⁵4s¹).
        </p>
        <ShareActions subject="chemistry" params={shareParams} restores={`the atomic structure of ${e.name.toLowerCase()}`} />
      </div>
    </section>
  )
}
