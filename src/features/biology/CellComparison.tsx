import type { CellType, OrganelleId } from '../../data/biology/types'
import { findOrganelle } from '../../data/biology/organelles'
import { SourceLinks } from '../guide/SourceLinks'

const SHARED: OrganelleId[] = ['plasma-membrane', 'cytoplasm', 'nucleus', 'nucleolus', 'mitochondrion', 'rough-er', 'smooth-er', 'golgi', 'ribosome']
const PLANT_ONLY: OrganelleId[] = ['cell-wall', 'chloroplast', 'central-vacuole', 'vacuole-membrane']
const ANIMAL_ONLY: OrganelleId[] = ['lysosome']

/**
 * A concise comparison of the two simplified models. Statements describe these models and the cited
 * textbook; real cells vary with their type and role.
 */
export function CellComparison({ cellType, onSelect }: { cellType: CellType; onSelect: (id: OrganelleId) => void }) {
  const chips = (ids: OrganelleId[], selectable: boolean) => (
    <ul className="compare-chips">
      {ids.map((id) => (
        <li key={id}>
          {selectable ? (
            <button type="button" className="relation-link" onClick={() => onSelect(id)}>
              {findOrganelle(id)!.name}
            </button>
          ) : (
            <span className="muted">{findOrganelle(id)!.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
  return (
    <div className="info-section cell-compare">
      <h3 className="section-title">Animal and plant cells compared</h3>
      <p className="small muted">How the two simplified models differ. Real cells vary with their type and role.</p>
      <h4 className="compare-h">In both models</h4>
      {chips(SHARED, true)}
      <h4 className="compare-h">Emphasized in the plant model</h4>
      {chips(PLANT_ONLY, cellType === 'plant')}
      <h4 className="compare-h">Only in the animal model</h4>
      {chips(ANIMAL_ONLY, cellType === 'animal')}
      <h4 className="compare-h">Functional differences</h4>
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
