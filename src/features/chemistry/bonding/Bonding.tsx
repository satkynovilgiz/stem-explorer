import { useId, useState } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import { electronegativityOf } from '../../../data/chemistry/atomic'
import { BOND_TYPES, DISCRETE_MODEL_NOTE, ELECTRONEGATIVITY_LIMITS, POLARITY, SOLID_KINDS } from '../../../data/chemistry/bonding'
import { MOLECULES } from '../../../data/chemistry/molecules'
import { ELEMENTS, findElement } from '../../../data/chemistry/periodicTable'
import { SourceLinks } from '../../guide/SourceLinks'
import { ElementPicker } from '../atomic/AtomicStructure'

const METAL_CATEGORIES = new Set(['Alkali metal', 'Alkaline earth metal', 'Transition metal', 'Post-transition metal', 'Lanthanide', 'Actinide'])
const kindOf = (z: number) => {
  const c = findElement(z)!.category
  return METAL_CATEGORIES.has(c) ? 'metal' : c === 'Metalloid' ? 'metalloid' : c === 'Noble gas' ? 'noble gas' : 'nonmetal'
}

/** Compare two elements: PubChem electronegativities, the difference, and the rule of thumb by element kind. */
function ElectronegativityCompare() {
  const [a, setA] = useState(1)
  const [b, setB] = useState(9)
  const ea = electronegativityOf(a)
  const eb = electronegativityOf(b)
  const diff = ea !== null && eb !== null ? Math.abs(ea - eb) : null
  const [ka, kb] = [kindOf(a), kindOf(b)]
  const thumb =
    ka === 'noble gas' || kb === 'noble gas'
      ? 'Includes a noble gas: no rule of thumb is given here.'
      : ka === 'metal' && kb === 'metal'
        ? 'Two metals: think of metallic bonding in the solid.'
        : (ka === 'metal') !== (kb === 'metal') && ka !== 'metalloid' && kb !== 'metalloid'
          ? 'A metal with a nonmetal: often ionic.'
          : ka === 'nonmetal' && kb === 'nonmetal'
            ? 'Two nonmetals: generally covalent.'
            : 'Involves a metalloid: the simple rule of thumb does not decide this.'
  return (
    <section className="info-section" aria-labelledby="en-heading">
      <h3 id="en-heading" className="section-title">
        Electronegativity: a rough guide with limits
      </h3>
      <div className="en-pickers">
        <div>
          <span className="param-label">First element</span>
          <ElementPicker z={a} onChange={setA} />
        </div>
        <div>
          <span className="param-label">Second element</span>
          <ElementPicker z={b} onChange={setB} />
        </div>
      </div>
      <dl className="readout">
        <div>
          <dt>{findElement(a)!.symbol} (PubChem)</dt>
          <dd>{ea ?? 'none listed'}</dd>
        </div>
        <div>
          <dt>{findElement(b)!.symbol} (PubChem)</dt>
          <dd>{eb ?? 'none listed'}</dd>
        </div>
        <div className="is-wide">
          <dt>Difference |ΔEN|</dt>
          <dd>{diff === null ? 'not available (an element has no listed value)' : diff.toFixed(2)}</dd>
        </div>
        <div className="is-wide">
          <dt>Rule of thumb by element kind</dt>
          <dd>
            {thumb} ({ka} + {kb})
          </dd>
        </div>
      </dl>
      <p className="small">{ELECTRONEGATIVITY_LIMITS.rule}</p>
      <p className="small">{ELECTRONEGATIVITY_LIMITS.exceptions}</p>
      <p className="small">
        {ELECTRONEGATIVITY_LIMITS.betterGuide}
        <SourceLinks ids={ELECTRONEGATIVITY_LIMITS.sources} />
      </p>
      <p className="muted small">
        Values are PubChem’s Pauling electronegativities; other tables differ slightly, so a difference computed here may not match a textbook’s. No bond type is
        assigned from ΔEN alone. <SourceLinks ids={['pubchem-periodic']} />
      </p>
    </section>
  )
}

export function BondingView({ onOpenMolecule }: { onOpenMolecule: (id: string) => void }) {
  const id = useId()
  return (
    <section className="panel bonding-view" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        Bonding and geometry
      </h2>
      <div className="bond-cards">
        {BOND_TYPES.map((b) => (
          <article key={b.id} className="bond-card">
            <h3 className="section-title">{b.name}</h3>
            <p className="small">{b.what}</p>
            <p className="small">
              <strong>Example:</strong> {b.example}
            </p>
            <p className="small muted">
              {b.properties}
              <SourceLinks ids={b.sources} />
            </p>
          </article>
        ))}
      </div>

      <section className="info-section" aria-labelledby={`${id}-solids`}>
        <h3 id={`${id}-solids`} className="section-title">
          When a single-molecule model does not apply
        </h3>
        <p className="small">{DISCRETE_MODEL_NOTE}</p>
        <table className="compare-table">
          <caption className="visually-hidden">Types of crystalline solid</caption>
          <thead>
            <tr>
              <th scope="col">Type of solid</th>
              <th scope="col">Made of</th>
              <th scope="col">Discrete molecules?</th>
              <th scope="col">Examples</th>
            </tr>
          </thead>
          <tbody>
            {SOLID_KINDS.map((k) => (
              <tr key={k.name}>
                <th scope="row">{k.name}</th>
                <td>{k.particles}</td>
                <td>{k.discreteMolecules ? 'Yes — ball-and-stick fits' : 'No — bonding extends through the crystal'}</td>
                <td>{k.examples}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          <SourceLinks ids={['chem-10-5', 'chem-7-1']} />
        </p>
      </section>

      <section className="info-section" aria-labelledby={`${id}-geo`}>
        <h3 id={`${id}-geo`} className="section-title">
          Geometry and polarity of this app’s molecules
        </h3>
        <p className="small">
          A single, double or triple bond counts as one region of electron density: two regions give a linear shape, three trigonal planar, four tetrahedral. A molecule is
          polar when its bond dipoles do not cancel, which depends on both bond polarity and shape.
          <SourceLinks ids={['chem-7-6']} />
        </p>
        <table className="compare-table">
          <caption className="visually-hidden">Molecular shape and polarity</caption>
          <thead>
            <tr>
              <th scope="col">Molecule</th>
              <th scope="col">Shape</th>
              <th scope="col">Polarity</th>
            </tr>
          </thead>
          <tbody>
            {MOLECULES.map((m) => {
              const p = POLARITY[m.id]
              return (
                <tr key={m.id}>
                  <th scope="row">
                    <button type="button" className="relation-link" onClick={() => onOpenMolecule(m.id)}>
                      {m.name}
                    </button>
                  </th>
                  <td>{m.shapeSummary}</td>
                  <td>
                    {p ? (
                      <>
                        <strong>{p.polar ? 'Polar' : 'Nonpolar'}.</strong> {p.reason}
                        <SourceLinks ids={p.sources} />
                      </>
                    ) : (
                      <span className="muted">Not stated in this app’s sources, so not given.</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <ElectronegativityCompare />
    </section>
  )
}

export function BondingPanel({ shareParams }: { shareParams: Record<string, string> }) {
  return (
    <section className="panel info" aria-labelledby="bonding-heading">
      <header className="info-header">
        <p className="eyebrow">Chemistry</p>
        <h2 id="bonding-heading" className="info-title">
          Bonding and geometry
        </h2>
        <p className="info-summary">How atoms are held together, when a molecule model fits, and how shape decides polarity.</p>
      </header>
      <div className="info-body">
        <p className="small">
          The sharing of electrons between two atoms ranges from completely equal (nonpolar covalent) through unequal (polar covalent) to not at all (ionic). In metals, electrons are delocalized through the solid.
          <SourceLinks ids={['chem-7-2', 'chem-10-5']} />
        </p>
        <p className="muted small">{ELEMENTS.length} elements are available in the electronegativity comparison.</p>
        <ShareActions subject="chemistry" params={shareParams} restores="the bonding and geometry section" />
      </div>
    </section>
  )
}
