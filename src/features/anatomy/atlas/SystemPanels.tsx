import { ArrowLeft, Layers, Route, ScanSearch } from 'lucide-react'
import type { ReactNode } from 'react'
import { ancestorsOf, ATLAS_STRUCTURES, ATLAS_SYSTEMS, childrenOf, findStructure, getSystem, inSystem, shownWithVariant, type AtlasStructure, type SystemId } from '../../../data/anatomy/atlas'
import { TOURS, type AtlasTour } from '../../../data/anatomy/atlas/tours'
import { SourceLinks } from '../../guide/SourceLinks'
import type { AtlasState } from './atlasState'

/*
 * Body → System → Organ → Structure. The level path names where you are; each level is a button
 * that goes there, and Back goes up exactly one level. The System level has its own overview with
 * layer controls, its organs and structures, and its guided investigations.
 */

/** Top-level entries of a system (its organs, or groups of structures), in list order. */
function systemRoots(system: SystemId, variant: AtlasState['variant']): AtlasStructure[] {
  return ATLAS_STRUCTURES.filter((s) => inSystem(s, system) && (!s.parent || !inSystem(findStructure(s.parent)!, system))).filter((s) => shownWithVariant(s, variant))
}

const toursFor = (system: SystemId): readonly AtlasTour[] => TOURS.filter((t) => t.system === system)

/** Where the current view sits in Body → System → Organ → Structure, plus Back. */
export function LevelPath({ state, onBody, onSystem, onSelect, onBack }: { state: AtlasState; onBody: () => void; onSystem: (s: SystemId) => void; onSelect: (id: string) => void; onBack: () => void }) {
  const s = state.selected ? findStructure(state.selected) : undefined
  const system = state.system ?? s?.system ?? null
  if (!system) return null
  const groups = s ? ancestorsOf(s.id).filter((a) => inSystem(a, system)) : []
  const up = s ? (groups.at(-1)?.name ?? `the ${getSystem(system).name} system`) : 'the whole body'
  return (
    <div className="atlas-levels">
      <nav aria-label="Atlas level">
        <ol className="atlas-level-path">
          <li>
            <button type="button" className="relation-link" onClick={onBody}>
              Body
            </button>
          </li>
          <li>
            {s ? (
              <button type="button" className="relation-link" onClick={() => onSystem(system)}>
                {getSystem(system).name} system
              </button>
            ) : (
              <span aria-current="location">{getSystem(system).name} system</span>
            )}
          </li>
          {groups.map((g) => (
            <li key={g.id}>
              <button type="button" className="relation-link" onClick={() => onSelect(g.id)}>
                {g.name}
              </button>
            </li>
          ))}
          {s && (
            <li>
              <span aria-current="location">{s.name}</span>
            </li>
          )}
        </ol>
      </nav>
      <button type="button" className="tool-button bordered atlas-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden="true" />
        <span>Back to {up}</span>
      </button>
    </div>
  )
}

function Tree({ items, state, onSelect }: { items: readonly AtlasStructure[]; state: AtlasState; onSelect: (id: string) => void }) {
  return (
    <ul className="system-organs">
      {items.map((s) => {
        const kids = childrenOf(s.id).filter((c) => shownWithVariant(c, state.variant))
        return (
          <li key={s.id}>
            <button type="button" className="relation-link" onClick={() => onSelect(s.id)}>
              {s.name}
            </button>
            {s.representation === 'container' && <span className="muted small"> · {kids.length} in this group</span>}
            {kids.length > 0 && <Tree items={kids} state={state} onSelect={onSelect} />}
          </li>
        )
      })}
    </ul>
  )
}

/** The System level: what the system is, what is drawn of it, how to look at it, and its investigations. */
export function SystemOverview({
  state,
  system,
  levelPath,
  onSelect,
  onFocusSystem,
  onIsolateSystem,
  onShowAllLayers,
  onStartTour,
  share,
  extra,
}: {
  state: AtlasState
  system: SystemId
  levelPath: ReactNode
  onSelect: (id: string) => void
  onFocusSystem: () => void
  onIsolateSystem: () => void
  onShowAllLayers: () => void
  onStartTour: (id: AtlasTour['id']) => void
  share: ReactNode
  extra?: ReactNode
}) {
  const sys = getSystem(system)
  const roots = systemRoots(system, state.variant)
  const count = ATLAS_STRUCTURES.filter((s) => inSystem(s, system) && s.representation !== 'container' && shownWithVariant(s, state.variant)).length
  const tours = toursFor(system)
  const needsVariant = system === 'reproductive' && !state.variant
  const only = state.layers.length === 1 && state.layers[0] === system
  return (
    <section className="panel info" aria-labelledby="atlas-system-heading">
      <header className="info-header">
        <p className="eyebrow">
          <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" /> Anatomy · organ system
        </p>
        <h2 id="atlas-system-heading" className="info-title">
          {sys.name} system
        </h2>
        {levelPath}
        <p className="info-summary">{sys.summary}</p>
      </header>
      <div className="info-body">
        <section className="info-section" aria-label="System layers">
          <h3 className="section-title">Look at this system</h3>
          {needsVariant ? (
            <p className="small muted">Choose one of the two typical configurations under Layers to draw this system.</p>
          ) : (
            <div className="share-row">
              <button type="button" className="tool-button bordered" onClick={onFocusSystem}>
                <Layers size={15} aria-hidden="true" />
                <span>Focus: skin outline and this system</span>
              </button>
              <button type="button" className="tool-button bordered" aria-pressed={only} onClick={onIsolateSystem}>
                <ScanSearch size={15} aria-hidden="true" />
                <span>Isolate this system</span>
              </button>
              <button type="button" className="tool-button bordered" onClick={onShowAllLayers}>
                <span>Show all layers</span>
              </button>
            </div>
          )}
          <p className="small muted">
            Visible layers: {state.layers.length ? state.layers.map((l) => getSystem(l).name).join(', ') : 'none'}.
          </p>
        </section>
        {tours.length > 0 && (
          <section className="info-section" aria-label="Guided investigations">
            <h3 className="section-title">Guided investigations</h3>
            <ul className="system-tours">
              {tours.map((t) => (
                <li key={t.id}>
                  <button type="button" className="tool-button bordered" onClick={() => onStartTour(t.id)}>
                    <Route size={15} aria-hidden="true" />
                    <span>{t.title}</span>
                  </button>
                  <p className="small muted">
                    {t.summary} {t.steps.length} steps.
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="info-section" aria-label="Organs and structures">
          <h3 className="section-title">Organs and structures ({count} drawn)</h3>
          {needsVariant ? <p className="small muted">Listed once a configuration is chosen.</p> : <Tree items={roots} state={state} onSelect={onSelect} />}
        </section>
        <section className="info-section">
          <h3 className="section-title">Model limitations</h3>
          <p className="small limitations">{sys.limitation}</p>
          <p className="small muted">Not included: {sys.omissions.join('; ')}.</p>
          <p className="small">
            Sources
            <SourceLinks ids={sys.sources} />
          </p>
        </section>
        {share}
        {extra}
      </div>
    </section>
  )
}

/** Body level: the systems as the next step down. */
export function SystemPicker({ onSystem }: { onSystem: (s: SystemId) => void }) {
  return (
    <section className="info-section" aria-label="Organ systems">
      <h3 className="section-title">Explore a system</h3>
      <ul className="system-picker">
        {ATLAS_SYSTEMS.map((s) => (
          <li key={s.id}>
            <button type="button" className="system-pick" onClick={() => onSystem(s.id)}>
              <span className="legend-chip" style={{ background: s.color }} aria-hidden="true" />
              {s.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
