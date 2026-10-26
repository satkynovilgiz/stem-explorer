import { Check, ChevronRight, Focus, HeartPulse, RotateCcw, ScanSearch, Search, Tag, X } from 'lucide-react'
import { memo, useId, useState, type ReactNode } from 'react'
import { ShareActions } from '../../../components/ShareActions'
import {
  ATLAS_REGIONS,
  ATLAS_STRUCTURES,
  ATLAS_SYSTEMS,
  childrenOf,
  findStructure,
  getRegion,
  getSystem,
  inventory,
  limitationsOf,
  searchAtlas,
  shownWithVariant,
  type AtlasStructure,
  type RegionId,
  type ReproductiveVariant,
  type SystemId,
} from '../../../data/anatomy/atlas'
import { ATLAS_CONFIG } from '../../../data/anatomy/atlas/config'
import { atlasParamEntries, type AtlasView } from '../../../lib/urlState'
import { SourceLinks } from '../../guide/SourceLinks'
import { atlasShareState, VIEW_TEXT, type AtlasState } from './atlasState'
import { RegionPresets, WhereSection } from './WherePanels'
import { LevelPath, SystemOverview, SystemPicker } from './SystemPanels'
import type { AtlasTour } from '../../../data/anatomy/atlas/tours'

const REPRESENTATION_LABEL = { individual: 'Individual structure', group: 'Grouped representation', container: 'Grouping in the list' } as const
const VARIANT_LABEL: Record<ReproductiveVariant, string> = { ovarian: 'Typical ovarian configuration', testicular: 'Typical testicular configuration' }

const isDrawable = (s: AtlasStructure, state: Pick<AtlasState, 'layers' | 'variant'>) =>
  shownWithVariant(s, state.variant) && [s.system, ...(s.alsoIn ?? [])].some((sys) => state.layers.includes(sys))

/* ---------- Structure tree and search ---------- */

function StructureButton({ s, state, onSelect, depth }: { s: AtlasStructure; state: AtlasState; onSelect: (id: string) => void; depth: number }) {
  const active = state.selected === s.id
  const drawable = s.shapes.length === 0 || isDrawable(s, state)
  return (
    <button type="button" className={`structure-item${active ? ' is-active' : ''}`} aria-pressed={active} onClick={() => onSelect(s.id)} style={{ paddingLeft: `${8 + depth * 14}px` }}>
      <span className="structure-swatch" style={{ background: s.representation === 'container' ? 'transparent' : getSystem(s.system).color }} aria-hidden="true">
        {active && <Check size={12} strokeWidth={3} />}
      </span>
      <span className="structure-text">
        <span className="structure-name">{s.name}</span>
        <span className="structure-tag">
          {s.representation === 'group' ? 'Group · ' : s.representation === 'container' ? 'Category · ' : ''}
          {getRegion(s.region).name}
          {!drawable && s.shapes.length > 0 ? ' · layer hidden' : ''}
        </span>
      </span>
    </button>
  )
}

function Branch({ s, state, onSelect, depth }: { s: AtlasStructure; state: AtlasState; onSelect: (id: string) => void; depth: number }) {
  const kids = childrenOf(s.id).filter((c) => shownWithVariant(c, state.variant) || !c.variant)
  const visibleKids = kids.filter((c) => inRegion(c, state.region) || childrenOf(c.id).length > 0)
  return (
    <li>
      <StructureButton s={s} state={state} onSelect={onSelect} depth={depth} />
      {visibleKids.length > 0 && (
        <ul className="structure-list structure-subtree">
          {visibleKids.map((c) => (
            <Branch key={c.id} s={c} state={state} onSelect={onSelect} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

const inRegion = (s: AtlasStructure, region: RegionId) => region === 'whole-body' || s.region === region || s.region === 'whole-body'

/** Re-renders only when what it lists changes (not on every frame of a movement demonstration). */
export const AtlasNavigator = memo(AtlasNavigatorImpl, (a, b) =>
  a.state.selected === b.state.selected && a.state.region === b.state.region && a.state.variant === b.state.variant && a.state.layers === b.state.layers && !a.state.tour === !b.state.tour && !a.state.relation === !b.state.relation,
)

function AtlasNavigatorImpl({ state, onSelect, onRegion }: { state: AtlasState; onSelect: (id: string) => void; onRegion: (r: RegionId) => void }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const results = searchAtlas(query, state.variant)
  const trimmed = query.trim()
  return (
    <section className="panel library atlas-nav" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        Body structures
      </h2>
      <div className="search">
        <label htmlFor={id} className="visually-hidden">
          Search body structures
        </label>
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input id={id} type="search" className="search-input" placeholder="e.g. kidney, spine, thymus" value={query} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="search-status" role="status">
        {trimmed ? `${results.length} match${results.length === 1 ? '' : 'es'}` : `${ATLAS_STRUCTURES.length} entries in ${ATLAS_SYSTEMS.length} systems`}
      </p>
      {state.tour && <p className="muted small">Selection is paused during the tour. Exit the tour to explore freely.</p>}
      {trimmed ? (
        results.length ? (
          <ul className="structure-list" aria-label="Search results">
            {results.map((s) => (
              <li key={s.id}>
                <StructureButton s={s} state={state} onSelect={onSelect} depth={0} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <p>Nothing in the atlas matches “{trimmed}”.</p>
            <p className="muted">Try an organ (liver), a bone group (skull) or a system name (lymphatic). Open “What is included” to see what is modelled.</p>
          </div>
        )
      ) : (
        <>
          <RegionPresets region={state.region} onRegion={onRegion} disabled={!!state.tour || !!state.relation} />
          <label className="param-label" htmlFor={`${id}-region`}>
            Region
          </label>
          <select id={`${id}-region`} className="select" value={state.region} onChange={(e) => onRegion(e.target.value as RegionId)}>
            {ATLAS_REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {state.region !== 'whole-body' && <p className="muted small">Listing structures in this region. Structures elsewhere are drawn faintly for context and can’t be clicked.</p>}
          <div className="atlas-tree" aria-label="Structures by system">
            {ATLAS_SYSTEMS.map((sys) => {
              const roots = ATLAS_STRUCTURES.filter((s) => s.system === sys.id && (!s.parent || findStructure(s.parent)?.system !== sys.id))
                .filter((s) => shownWithVariant(s, state.variant) || sys.id === 'reproductive')
                .filter((s) => inRegion(s, state.region) || childrenOf(s.id).some((c) => inRegion(c, state.region)))
              if (roots.length === 0) return null
              return (
                <details key={sys.id} className="atlas-system" open={state.selected ? findStructure(state.selected)?.system === sys.id : undefined}>
                  <summary>
                    <ChevronRight size={14} aria-hidden="true" className="atlas-chevron" />
                    <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" />
                    {sys.name}
                    {!state.layers.includes(sys.id) && <span className="muted small"> (hidden)</span>}
                  </summary>
                  {sys.id === 'reproductive' && !state.variant ? (
                    <p className="muted small atlas-note">Choose a configuration under Layers to list and draw these structures.</p>
                  ) : (
                    <ul className="structure-list">
                      {roots
                        .filter((s) => shownWithVariant(s, state.variant))
                        .map((s) => (
                          <Branch key={s.id} s={s} state={state} onSelect={onSelect} depth={0} />
                        ))}
                    </ul>
                  )}
                </details>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

/* ---------- Layers ---------- */

export function LayerPanel({
  state,
  onToggle,
  onOpacity,
  onVariant,
  onPreset,
  onMusculoskeletal,
}: {
  state: AtlasState
  onToggle: (s: SystemId) => void
  onOpacity: (s: SystemId, v: number) => void
  onVariant: (v: ReproductiveVariant | null) => void
  onPreset: (layers: SystemId[]) => void
  onMusculoskeletal: () => void
}) {
  const bothMsk = state.layers.includes('skeletal') && state.layers.includes('muscular')
  const id = useId()
  return (
    <section className="info-section atlas-layers" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="section-title">
        Layers
      </h3>
      <div className="share-row">
        <button type="button" className="tool-button bordered" onClick={() => onPreset(ATLAS_CONFIG.defaultLayers as SystemId[])}>
          Default layers
        </button>
        <button type="button" className="tool-button bordered" aria-pressed={bothMsk} onClick={onMusculoskeletal}>
          Skeleton and muscles together
        </button>
        <button type="button" className="tool-button bordered" onClick={() => onPreset([])}>
          Hide all
        </button>
      </div>
      <ul className="layer-list">
        {ATLAS_SYSTEMS.map((sys) => {
          const on = state.layers.includes(sys.id)
          const repro = sys.id === 'reproductive'
          return (
            <li key={sys.id} className={`layer-row${on ? ' is-on' : ''}`}>
              <div className="layer-head">
                {repro ? (
                  <span className="layer-name">
                    <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" />
                    {sys.name}
                  </span>
                ) : (
                  <label className="layer-name">
                    <input type="checkbox" checked={on} onChange={() => onToggle(sys.id)} />
                    <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" />
                    {sys.name}
                  </label>
                )}
                {on && (
                  <label className="layer-opacity">
                    <span className="visually-hidden">{sys.name} opacity</span>
                    <input type="range" min={10} max={100} step={5} value={Math.round(state.opacity[sys.id] * 100)} onChange={(e) => onOpacity(sys.id, Number(e.target.value) / 100)} />
                    <span className="layer-opacity-value" aria-hidden="true">
                      {Math.round(state.opacity[sys.id] * 100)}%
                    </span>
                  </label>
                )}
              </div>
              {repro && (
                <fieldset className="variant-choice">
                  <legend className="small">Show reproductive organs as</legend>
                  {([null, 'ovarian', 'testicular'] as const).map((v) => (
                    <label key={v ?? 'none'} className="small">
                      <input type="radio" name={`${id}-variant`} checked={state.variant === v} onChange={() => onVariant(v)} />
                      {v ? VARIANT_LABEL[v] : 'Not shown'}
                    </label>
                  ))}
                  <p className="muted small">
                    Two typical configurations are offered; neither is universal. Reproductive anatomy varies between people, including intersex variations that this
                    atlas does not model.
                    <SourceLinks ids={['ap-27-1', 'ap-27-2']} />
                  </p>
                </fieldset>
              )}
            </li>
          )
        })}
      </ul>
      <p className="muted small">Opacity is not saved in links.</p>
    </section>
  )
}

/* ---------- Toolbar ---------- */

export function AtlasToolbar({
  view,
  showLabels,
  canAct,
  isolated,
  onView,
  onReset,
  onLabels,
  onFocus,
  onIsolate,
  onShowAll,
}: {
  view: AtlasView
  showLabels: boolean
  canAct: boolean
  isolated: boolean
  onView: (v: AtlasView) => void
  onReset: () => void
  onLabels: () => void
  onFocus: () => void
  onIsolate: () => void
  onShowAll: () => void
}) {
  return (
    <div className="scene-controls" role="toolbar" aria-label="Body atlas view controls">
      <div className="control-group" role="group" aria-label="View">
        <div className="segmented segmented--modes">
          {(['front', 'back', 'side'] as const).map((v) => (
            <button key={v} type="button" className="segmented-option" aria-pressed={view === v} onClick={() => onView(v)}>
              {v === 'front' ? 'Front' : v === 'back' ? 'Back' : 'Side'}
            </button>
          ))}
        </div>
        <button type="button" className="tool-button" aria-label="Reset camera" title="Reset camera" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          <span className="tool-text">Reset</span>
        </button>
        <button type="button" className="tool-button" aria-label="Labels" title="Orientation labels" aria-pressed={showLabels} onClick={onLabels}>
          <Tag size={16} aria-hidden="true" />
          <span className="tool-text">Labels</span>
        </button>
      </div>
      <div className="control-group control-group--modes" role="group" aria-label="Selection">
        <button type="button" className="tool-button" disabled={!canAct} title={canAct ? 'Move the camera to the selection' : 'Select a drawn structure first'} onClick={onFocus}>
          <Focus size={16} aria-hidden="true" />
          <span>Focus</span>
        </button>
        {isolated ? (
          <button type="button" className="tool-button is-on" onClick={onShowAll}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>Show all</span>
          </button>
        ) : (
          <button type="button" className="tool-button" disabled={!canAct} onClick={onIsolate}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>Isolate</span>
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Details ---------- */


function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="info-section">
      <h3 className="section-title">{title}</h3>
      {children}
    </section>
  )
}

export interface LevelActions {
  onSystem: (s: SystemId) => void
  onBack: () => void
  onFocusSystem: () => void
  onIsolateSystem: () => void
  onShowAllLayers: () => void
  onStartTour: (id: AtlasTour['id']) => void
}

export function AtlasDetails({
  state,
  onSelect,
  onClear,
  onIsolatePair,
  onOpenHeart,
  levels,
  extra,
}: {
  state: AtlasState
  onSelect: (id: string) => void
  onClear: () => void
  onIsolatePair: () => void
  onOpenHeart: () => void
  levels: LevelActions
  /** Panels shown below the details (layers, inventory). */
  extra?: ReactNode
}) {
  const s = state.selected ? findStructure(state.selected) : undefined
  const share = atlasShareState(state)
  const shareActions = (
    <ShareActions
      subject="anatomy"
      params={atlasParamEntries(share, ATLAS_CONFIG.defaultLayers)}
      restores={s ? `${s.name} in the body atlas, with this view, layers and region` : state.system ? `the ${getSystem(state.system).name.toLowerCase()} system in the body atlas, with this view, layers and region` : 'this body-atlas view, layers and region'}
    />
  )
  const levelPath = <LevelPath state={state} onBody={onClear} onSystem={levels.onSystem} onSelect={onSelect} onBack={levels.onBack} />
  if (!s && state.system) {
    return (
      <SystemOverview
        state={state}
        system={state.system}
        levelPath={levelPath}
        onSelect={onSelect}
        onFocusSystem={levels.onFocusSystem}
        onIsolateSystem={levels.onIsolateSystem}
        onShowAllLayers={levels.onShowAllLayers}
        onStartTour={levels.onStartTour}
        share={shareActions}
        extra={extra}
      />
    )
  }
  if (!s) {
    return (
      <section className="panel info" aria-labelledby="atlas-heading">
        <header className="info-header">
          <p className="eyebrow">Anatomy · whole body</p>
          <h2 id="atlas-heading" className="info-title">
            Body atlas
          </h2>
          <p className="info-summary">
            A schematic figure in the anatomical position with the eleven organ systems as layers. Select a structure in the model or the list to read about it.
          </p>
        </header>
        <div className="info-body">
          <p className="inline-note">{VIEW_TEXT[state.view]} Left and right always mean the body’s own left and right.</p>
          <p className="small">
            <strong>Schematic model.</strong> Every shape is a simple primitive placed to show position and relationships. Shapes and sizes are not anatomically
            precise, and no part of it is drawn from a scan or licensed anatomical model.
          </p>
          <SystemPicker onSystem={levels.onSystem} />
          <button type="button" className="button" onClick={onOpenHeart}>
            <HeartPulse size={16} aria-hidden="true" />
            Open the detailed heart explorer
          </button>
          {shareActions}
          {extra}
        </div>
      </section>
    )
  }
  const sys = getSystem(s.system)
  const kids = childrenOf(s.id)
  const pair = s.pairId ? findStructure(s.pairId) : undefined
  return (
    <section className="panel info" aria-labelledby="atlas-structure-heading">
      <header className="info-header">
        <p className="eyebrow">
          <span className="legend-chip" style={{ background: sys.color }} aria-hidden="true" /> {sys.name} system
          {s.alsoIn?.length ? ` · also ${s.alsoIn.map((a) => getSystem(a).name).join(', ')}` : ''}
        </p>
        <h2 id="atlas-structure-heading" className="info-title">
          {s.name}
        </h2>
        {levelPath}
        <p className="info-summary">{s.description}</p>
        <div className="header-actions">
          <button type="button" className="tool-button bordered" onClick={onClear}>
            <X size={15} aria-hidden="true" />
            <span>Clear selection</span>
          </button>
          {pair && (
            <>
              <button type="button" className="tool-button bordered" onClick={() => onSelect(pair.id)}>
                <span>Select the {pair.side} side</span>
              </button>
              <button type="button" className="tool-button bordered" aria-pressed={state.isolated && state.isolatePair} onClick={onIsolatePair}>
                <span>Isolate both sides</span>
              </button>
            </>
          )}
        </div>
      </header>
      <div className="info-body">
        {s.module === 'heart' && (
          <button type="button" className="button" onClick={onOpenHeart}>
            <HeartPulse size={16} aria-hidden="true" />
            Open the detailed heart explorer
          </button>
        )}
        <Section title="Function">
          <p className="prose">
            {s.function}
            <SourceLinks ids={s.sources} />
          </p>
        </Section>
        <Section title="Where is it?">
          {s.location && <p className="prose">{s.location}</p>}
          <WhereSection s={s} state={state} onSelect={onSelect} />
        </Section>
        <dl className="readout atlas-facts">
          <div>
            <dt>Region</dt>
            <dd>{getRegion(s.region).name}</dd>
          </div>
          <div>
            <dt>Shown as</dt>
            <dd>{REPRESENTATION_LABEL[s.representation]}</dd>
          </div>
          {s.side && (
            <div>
              <dt>Side</dt>
              <dd>Body’s {s.side}</dd>
            </div>
          )}
          {s.variant && (
            <div className="is-wide">
              <dt>Configuration</dt>
              <dd>{VARIANT_LABEL[s.variant]} — one of two shown; anatomy varies between people.</dd>
            </div>
          )}
        </dl>
        {s.grouping && <p className="inline-note">{s.grouping}</p>}
        {s.system === 'muscular' && s.representation !== 'container' && (
          <Section title="Attachments">
            {s.attachments ? (
              <dl className="readout atlas-facts">
                {s.attachments.origin && (
                  <div className="is-wide">
                    <dt>Origin</dt>
                    <dd>{s.attachments.origin}</dd>
                  </div>
                )}
                {s.attachments.insertion && (
                  <div className="is-wide">
                    <dt>Insertion</dt>
                    <dd>{s.attachments.insertion}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="small muted">Not listed: the cited section does not state them in its text, so the atlas leaves them out.</p>
            )}
            {s.attachments && (
              <p className="small muted">
                As stated in the cited section.
                <SourceLinks ids={[s.attachments.sourceId]} />
              </p>
            )}
          </Section>
        )}
        {(s.related?.length || kids.length) && (
          <Section title="Connections">
            <ul className="relation-list">
              {s.related?.map((r) => (
                <li key={r.id}>
                  <span className="muted small">{r.relation}: </span>
                  <button type="button" className="relation-link" onClick={() => onSelect(r.id)}>
                    {findStructure(r.id)!.name}
                  </button>
                </li>
              ))}
              {kids.map((k) => (
                <li key={k.id}>
                  <span className="muted small">Includes: </span>
                  <button type="button" className="relation-link" onClick={() => onSelect(k.id)}>
                    {k.name}
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}
        {s.terms && s.terms.length > 0 && (
          <Section title="Key terms">
            <dl className="atlas-terms">
              {s.terms.map((t) => (
                <div key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </Section>
        )}
        <Section title="Model limitations">
          <p className="small limitations">{limitationsOf(s)}</p>
        </Section>
        {shareActions}
        {extra}
      </div>
    </section>
  )
}

/* ---------- Inventory ---------- */

export function AtlasInventory({ onSelect }: { onSelect: (id: string) => void }) {
  const inv = inventory()
  const drawn = inv.reduce((n, i) => n + i.individual.length + i.groups.length, 0)
  return (
    <details className="info-section atlas-inventory">
      <summary className="section-title">What is included</summary>
      <p className="small">
        {drawn} drawn entries: individual structures and grouped representations, all schematic. Systems below list what is modelled and what is left out.
      </p>
      {inv.map(({ system, individual, groups, alsoShown }) => (
        <div key={system.id} className="inventory-system">
          <h4 className="inventory-title">
            <span className="legend-chip" style={{ background: system.color }} aria-hidden="true" /> {system.name}
          </h4>
          <p className="small muted">{system.summary}</p>
          <p className="small">
            <strong>Individual ({individual.length}):</strong>{' '}
            {individual.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                <button type="button" className="relation-link" onClick={() => onSelect(s.id)}>
                  {s.name}
                </button>
              </span>
            ))}
            {individual.length === 0 && 'none'}
          </p>
          {groups.length > 0 && (
            <p className="small">
              <strong>Grouped ({groups.length}):</strong> {groups.map((g) => g.name).join(', ')}
            </p>
          )}
          {alsoShown.length > 0 && (
            <p className="small">
              <strong>Also part of this system:</strong> {alsoShown.map((s) => s.name).join(', ')}
            </p>
          )}
          <p className="small">
            <strong>Not included:</strong> {system.omissions.join('; ')}.
          </p>
          <p className="small muted">
            {system.limitation}
            <SourceLinks ids={system.sources} />
          </p>
        </div>
      ))}
      <p className="small muted">
        Assets: none. The figure is generated from simple shapes in this app’s code (src/data/anatomy/atlas); no third-party anatomical model is used.
      </p>
    </details>
  )
}
