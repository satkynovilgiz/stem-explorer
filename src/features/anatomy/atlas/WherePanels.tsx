import { Compass, Crosshair, MapPin, Search, X } from 'lucide-react'
import { useId, useState } from 'react'
import { ATLAS_STRUCTURES, findStructure, getRegion, getSystem, searchAtlas, type AtlasStructure, type RegionId } from '../../../data/anatomy/atlas'
import { DIRECTION_TERMS, findRelationExploration, RELATION_EXPLORATIONS, RELATIONSHIPS, relationshipsOf, type Relationship } from '../../../data/anatomy/atlas/relationships'
import { SourceLinks } from '../../guide/SourceLinks'
import type { AtlasState } from './atlasState'

/* ---------- Where is it? ---------- */

/** The six region presets (plus the whole body); the back stays in the Region list. */
const REGION_PRESETS: readonly RegionId[] = ['whole-body', 'head-neck', 'thorax', 'abdomen', 'pelvis', 'upper-limb', 'lower-limb']

export function RegionPresets({ region, onRegion, disabled }: { region: RegionId; onRegion: (r: RegionId) => void; disabled?: boolean }) {
  return (
    <div className="region-presets" role="group" aria-label="Region presets">
      {REGION_PRESETS.map((r) => (
        <button key={r} type="button" className="chip-button" aria-pressed={region === r} disabled={disabled} onClick={() => onRegion(r)}>
          {r === 'whole-body' ? 'Whole body' : getRegion(r).name.replace(/ \(chest\)$/, '')}
        </button>
      ))}
    </div>
  )
}

/** Search a structure, then select it, focus its region and frame it in the view. */
export function WhereIsIt({ state, onLocate }: { state: AtlasState; onLocate: (id: string) => void }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const results = trimmed ? searchAtlas(query, state.variant).filter((s) => s.representation !== 'container').slice(0, 8) : []
  const busy = !!state.tour || !!state.relation
  return (
    <section className="panel where-panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        <MapPin size={16} aria-hidden="true" /> Where is it?
      </h2>
      <p className="small muted">Find a structure: it is selected, its body region is focused and the camera frames it. The details panel then says where it is in words.</p>
      <div className="search">
        <label htmlFor={id} className="visually-hidden">
          Find a structure
        </label>
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input id={id} type="search" className="search-input" placeholder="e.g. diaphragm, ureter, radius" value={query} autoComplete="off" disabled={busy} onChange={(e) => setQuery(e.target.value)} />
        {query && (
          <button type="button" className="icon-button search-clear" aria-label="Clear" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {busy && <p className="muted small">Close the tour or exploration first.</p>}
      {trimmed && (
        <>
          <p className="search-status" role="status">
            {results.length ? `${results.length} match${results.length === 1 ? '' : 'es'}` : `Nothing in the atlas matches “${trimmed}”.`}
          </p>
          <ul className="where-results" aria-label="Structures to locate">
            {results.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="where-result"
                  onClick={() => {
                    onLocate(s.id)
                    setQuery('')
                  }}
                >
                  <Crosshair size={14} aria-hidden="true" />
                  <span className="where-result-name">{s.name}</span>
                  <span className="muted small">{getRegion(s.region).name}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

const VIEW_SIDE: Record<AtlasState['view'], Record<'left' | 'right', string>> = {
  front: { left: 'on your right in this front view', right: 'on your left in this front view' },
  back: { left: 'on your left in this back view', right: 'on your right in this back view' },
  side: { left: 'facing you in this left-side view', right: 'on the far side in this left-side view' },
}

/** Other structures tagged with the same region (from the atlas data, not measured distances). */
function sameRegion(s: AtlasStructure): AtlasStructure[] {
  if (s.region === 'whole-body') return []
  return ATLAS_STRUCTURES.filter((o) => o.id !== s.id && o.region === s.region && o.representation !== 'container' && (!o.side || o.side === (s.side ?? o.side)) && !o.variant)
    .sort((a, b) => a.system.localeCompare(b.system) || a.name.localeCompare(b.name))
    .slice(0, 10)
}

function RelationItem({ r, onSelect }: { r: Relationship; onSelect: (id: string) => void }) {
  const object = r.object ? findStructure(r.object) : undefined
  return (
    <li className="where-relation">
      {r.term ? (
        <span className="term-badge" title={DIRECTION_TERMS[r.term]}>
          {r.term}
        </span>
      ) : (
        <span className="term-badge is-plain">relation</span>
      )}
      <span>
        {r.statement}
        {r.term && <span className="visually-hidden"> ({r.term}: {DIRECTION_TERMS[r.term]})</span>}
        {object && (
          <>
            {' '}
            <button type="button" className="relation-link" onClick={() => onSelect(object.id)}>
              Select {object.name}
            </button>
          </>
        )}
        {r.derivedFrom && <span className="small muted where-derived"> How this follows: {r.derivedFrom}</span>}
        <SourceLinks ids={[r.source]} />
        <details className="source-wording">
          <summary>Where in the source</summary>
          <span>{r.basis}</span>
        </details>
      </span>
    </li>
  )
}

/** "Where is it?" for the selected structure: region, side in words, sourced relationships, neighbours by region. */
export function WhereSection({ s, state, onSelect }: { s: AtlasStructure; state: AtlasState; onSelect: (id: string) => void }) {
  const rels = relationshipsOf(s.id)
  const neighbours = sameRegion(s)
  const layerShown = [s.system, ...(s.alsoIn ?? [])].some((sys) => state.layers.includes(sys))
  return (
    <div className="where-section">
      <p className="prose">
        <Compass size={15} aria-hidden="true" className="inline-icon" /> <strong>In words:</strong> {s.name} is in the {getRegion(s.region).name.toLowerCase()}
        {s.side ? `, on the body’s ${s.side} (${VIEW_SIDE[state.view][s.side]})` : ''}. It belongs to the {getSystem(s.system).name.toLowerCase()} system
        {layerShown ? '' : ', whose layer is hidden'}.
      </p>
      {state.revealNote && state.selected === s.id && <p className="inline-note reveal-note">{state.revealNote}</p>}
      <h4 className="where-h">Stated relationships</h4>
      {rels.length ? (
        <ul className="where-relations">
          {rels.map((r) => (
            <RelationItem key={r.id} r={r} onSelect={onSelect} />
          ))}
        </ul>
      ) : (
        <p className="small muted">
          No directional relationship for this structure is recorded in this release. Relationships are only given where a cited section states them in words; they are
          never read off the schematic shapes.
        </p>
      )}
      {neighbours.length > 0 && (
        <>
          <h4 className="where-h">Also in this region</h4>
          <p className="small muted">From the atlas’s region tags, not from measured distances.</p>
          <ul className="where-neighbours">
            {neighbours.map((n) => (
              <li key={n.id}>
                <button type="button" className="relation-link" onClick={() => onSelect(n.id)}>
                  {n.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/* ---------- Curated relationship explorations ---------- */

export function RelationPanel({ state, onStart, onExit, onSelect }: { state: AtlasState; onStart: (id: (typeof RELATION_EXPLORATIONS)[number]['id']) => void; onExit: () => void; onSelect: (id: string) => void }) {
  const id = useId()
  const active = state.relation ? findRelationExploration(state.relation.id)! : null
  if (active) {
    return (
      <section className="panel relation-panel is-active" aria-labelledby={`${id}-h`}>
        <p className="eyebrow">Relationship exploration</p>
        <h2 id={`${id}-h`} className="panel-title">
          {active.title}
        </h2>
        <p className="prose">{active.question}</p>
        {active.tip && <p className="inline-note">{active.tip}</p>}
        <ol className="relation-focus" aria-label="Highlighted structures, as numbered in the view">
          {active.focus.map((f) => (
            <li key={f}>{findStructure(f)!.name}</li>
          ))}
        </ol>
        <ul className="where-relations">
          {active.relationships.map((rid) => (
            <RelationItem key={rid} r={RELATIONSHIPS.find((r) => r.id === rid)!} onSelect={onSelect} />
          ))}
        </ul>
        <p className="small limitations">
          <strong>What the model can’t show:</strong> {active.limits} Relationships come from the cited text, not from the drawn shapes, which are schematic and not to scale.
        </p>
        <button type="button" className="button" onClick={onExit}>
          Close and restore my view
        </button>
      </section>
    )
  }
  return (
    <section className="panel relation-panel" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        Relationships
      </h2>
      <p className="small muted">Curated explorations: the structures are highlighted and numbered, and each relationship is quoted from its source.</p>
      <ul className="relation-cards">
        {RELATION_EXPLORATIONS.map((e) => (
          <li key={e.id}>
            <button type="button" className="relation-card" disabled={!!state.tour} onClick={() => onStart(e.id)}>
              <span className="relation-card-title">{e.title}</span>
              <span className="small muted">{e.question}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
