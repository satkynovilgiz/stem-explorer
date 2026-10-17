import type { CellType, OrganelleId } from '../../data/biology/types'
import { SourceLinks } from '../guide/SourceLinks'


/**
 * A concise comparison of the three simplified models. Statements describe these models and the cited
 * textbook; real cells vary with their type and role.
 */
export function CellComparison({ cellType, onSelect }: { cellType: CellType; onSelect: (id: OrganelleId) => void }) {
  const Y = 'Yes'
  const rows: { feature: string; animal: string; plant: string; bacterium: string; ids?: Partial<Record<CellType, OrganelleId>> }[] = [
    { feature: 'Plasma membrane', animal: Y, plant: Y, bacterium: Y, ids: { animal: 'plasma-membrane', plant: 'plasma-membrane', bacterium: 'bacterial-membrane' } },
    { feature: 'Cytoplasm and ribosomes', animal: Y, plant: Y, bacterium: Y, ids: { animal: 'ribosome', plant: 'ribosome', bacterium: 'bacterial-ribosomes' } },
    { feature: 'DNA', animal: 'In a membrane-bound nucleus', plant: 'In a membrane-bound nucleus', bacterium: 'In the nucleoid (no membrane)', ids: { animal: 'nucleus', plant: 'nucleus', bacterium: 'nucleoid' } },
    { feature: 'Membrane-bound organelles (ER, Golgi, mitochondria…)', animal: Y, plant: Y, bacterium: 'No' },
    { feature: 'Chloroplasts', animal: 'No', plant: Y, bacterium: 'No', ids: { plant: 'chloroplast' } },
    { feature: 'Cell wall', animal: 'No', plant: 'Yes (cellulose)', bacterium: 'Yes (peptidoglycan in most)', ids: { plant: 'cell-wall', bacterium: 'bacterial-wall' } },
    { feature: 'Capsule, flagella, pili, fimbriae', animal: 'No', plant: 'No', bacterium: 'Some bacteria; varies', ids: { bacterium: 'flagellum' } },
    { feature: 'Typical diameter', animal: '10–100 µm (eukaryotic)', plant: '10–100 µm (eukaryotic)', bacterium: '0.1–5.0 µm (prokaryotic)' },
  ]
  const cell = (r: (typeof rows)[number], t: CellType) =>
    r.ids?.[t] && t === cellType ? (
      <button type="button" className="relation-link" onClick={() => onSelect(r.ids![t]!)}>
        {r[t]}
      </button>
    ) : (
      r[t]
    )
  return (
    <div className="info-section cell-compare">
      <h3 className="section-title">Animal, plant and bacterial cells compared</h3>
      <p className="small muted">How the three simplified models differ. Real cells vary with their type and role; links select the structure in the model on screen.</p>
      <table className="compare-table">
        <caption className="visually-hidden">Features of the three cell models</caption>
        <thead>
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">Animal</th>
            <th scope="col">Plant</th>
            <th scope="col">Bacterium</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <th scope="row">{r.feature}</th>
              <td>{cell(r, 'animal')}</td>
              <td>{cell(r, 'plant')}</td>
              <td>{cell(r, 'bacterium')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="small muted">
        Eukaryotic cells have a membrane-bound nucleus and membrane-bound organelles; prokaryotes have neither.
        <SourceLinks ids={['bio-4-2', 'bio-4-3']} />
      </p>
      <h4 className="compare-h">In the bacterium model: representative or variable?</h4>
      <ul className="guide-list small">
        <li>
          <strong>Representative</strong> (OpenStax lists them for prokaryotes in general): chromosomal DNA in a nucleoid, ribosomes, a cell membrane and a cell wall.
        </li>
        <li>
          <strong>Variable</strong>: a capsule (many bacteria), and flagella, pili or fimbriae (some prokaryotes). Shape and size also vary; this model is one rod-shaped
          example.
          <SourceLinks ids={['bio-4-2']} />
        </li>
      </ul>
      <h4 className="compare-h">Animal and plant cells: functional differences</h4>
      <ul className="guide-list small">
        <li>
          Plant cells make glucose by photosynthesis in chloroplasts, and they also have mitochondria, which release usable
          energy, just as animal cells do.
          <SourceLinks ids={['bio-4-3']} />
        </li>
        <li>
          The cell wall, outside the plasma membrane, gives a plant cell a rigid shape and support. The membrane, not the wall,
          is the selective barrier.
          <SourceLinks ids={['bio-4-3']} />
        </li>
        <li>
          The large central vacuole regulates water and, by pressing the cell against its wall, keeps it firm.
          <SourceLinks ids={['bio-4-3']} />
        </li>
        <li>
          The textbook describes digestion in plant cells as taking place in vacuoles, so this plant model shows no separate
          lysosomes.
          <SourceLinks ids={['bio-4-3']} />
        </li>
        <li>
          In plant cells the Golgi apparatus also makes polysaccharides, some of which become part of the cell wall.
          <SourceLinks ids={['bio-4-4']} />
        </li>
      </ul>
    </div>
  )
}
