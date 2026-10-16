import { Check, ChevronLeft, GitCompare, ChevronRight, Compass, ExternalLink, Eye, Focus, Info, Layers, Route, RotateCcw, ScanSearch, Search, Tag, X } from 'lucide-react'
import { useId, useState } from 'react'
import { ShareActions } from '../../components/ShareActions'
import { Tabs } from '../../components/Tabs'
import {
  COLOR_CONVENTION,
  findHeartPart,
  FLOW_STEPS,
  HEART_DISCLAIMER,
  HEART_PARTS,
  HEART_SOURCES,
  ORIENTATION_NOTE,
  type HeartPart,
  type HeartPartId,
  type HeartView,
} from '../../data/anatomy/heart'
import { normalize } from '../../lib/chemistry'
import { anatomyParamEntries } from '../../lib/urlState'
import { isVessel } from '../../data/anatomy/vessels'
import { HEART_COLORS } from './colors'

const KIND_LABEL = { chamber: 'Chamber', valve: 'Valve', vessel: 'Vessel', wall: 'Wall' } as const

function swatch(part: HeartPart) {
  return part.kind === 'valve' ? HEART_COLORS.valve : part.kind === 'wall' ? HEART_COLORS.wall : part.oxygenation === 'rich' ? HEART_COLORS.rich : HEART_COLORS.poor
}

/* ---------- Structure list ---------- */

export function PartList({
  selected,
  disabled,
  onSelect,
  onStartTour,
  touring,
  compare,
  onToggleCompare,
}: {
  selected: HeartPartId | null
  disabled: boolean
  onSelect: (id: HeartPartId) => void
  onStartTour: () => void
  touring: boolean
  /** Vessel comparison slots while comparing, otherwise null. */
  compare: { a: HeartPartId | null; b: HeartPartId | null } | null
  onToggleCompare: () => void
}) {
  const [query, setQuery] = useState('')
  const id = useId()
  const q = normalize(query)
  const results = q ? HEART_PARTS.filter((p) => [p.name, p.tag, p.kind].some((t) => normalize(t).includes(q))) : HEART_PARTS
  return (
    <section className="panel library" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="panel-title">
        Heart structures
      </h2>
      <button type="button" className="button tour-start" onClick={onStartTour} disabled={touring}>
        <Route size={16} aria-hidden="true" />
        {touring ? 'Tour in progress' : 'Start blood-flow tour'}
      </button>
      <button
        type="button"
        className="tool-button bordered compare-toggle"
        aria-pressed={!!compare}
        onClick={onToggleCompare}
        disabled={touring}
        title={touring ? 'Exit the tour to compare vessels' : undefined}
      >
        <GitCompare size={16} aria-hidden="true" />
        <span>{compare ? 'Comparing vessels' : 'Compare vessels'}</span>
      </button>
      {compare && <p className="muted small">Choose two vessels. Chambers, valves and the septum can’t be compared and are disabled.</p>}
      <div className="search">
        <label htmlFor={id} className="visually-hidden">
          Search heart structures
        </label>
        <Search className="search-icon" size={16} aria-hidden="true" />
        <input
          id={id}
          type="search"
          className="search-input"
          placeholder="e.g. valve, aorta, left"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="icon-button search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="search-status" role="status">
        {q ? `${results.length} of ${HEART_PARTS.length} structures` : `${HEART_PARTS.length} structures`}
      </p>
      {disabled && <p className="muted small">Selection is paused during the tour. Exit the tour to explore freely.</p>}
      {results.length > 0 ? (
        <ul className="structure-list">
          {results.map((p) => {
            const slot = compare ? (compare.a === p.id ? 'A' : compare.b === p.id ? 'B' : null) : null
            const active = compare ? !!slot : p.id === selected
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`structure-item${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  disabled={disabled || (!!compare && !isVessel(p.id))}
                  onClick={() => onSelect(p.id)}
                >
                  <span className="structure-swatch" style={{ background: swatch(p) }} aria-hidden="true">
                    {slot ? <span className={`compare-badge is-${slot.toLowerCase()}`}>{slot}</span> : active && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="structure-text">
                    <span className="structure-name">
                      {p.name}
                      {slot && <span className="visually-hidden"> (vessel {slot})</span>}
                    </span>
                    <span className="structure-tag">
                      {KIND_LABEL[p.kind]} · {p.tag}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="empty-state">
          <p>No structures match “{query.trim()}”.</p>
          <p className="muted">Try a chamber (atrium), a valve, or a vessel (aorta).</p>
        </div>
      )}
    </section>
  )
}

/* ---------- Details ---------- */

type DetailTab = 'overview' | 'connections' | 'sources'

export function PartDetails({
  selected,
  view,
  share,
  onSelect,
  onClear,
}: {
  selected: HeartPartId | null
  view: HeartView
  /** Canonical share state (the pre-tour state while touring), used by Copy link. */
  share: { partId: HeartPartId | null; heartView: HeartView }
  onSelect: (id: HeartPartId) => void
  onClear: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const part = selected ? findHeartPart(selected) : undefined
  const copyLink = (
    <ShareActions
      subject="anatomy"
      params={anatomyParamEntries(share)}
      restores={share.partId ? `this structure (${findHeartPart(share.partId)?.name}) and view` : 'this view'}
    />
  )

  if (!part) {
    return (
      <section className="panel info" aria-labelledby="heart-heading">
        <header className="info-header">
          <p className="eyebrow">Anatomy</p>
          <h2 id="heart-heading" className="info-title">
            Human heart
          </h2>
          <p className="info-summary">Explore the chambers, valves and great vessels, and follow blood through the heart.</p>
        </header>
        <div className="info-body">
          <div className="info-section">
            <h3 className="section-title">How to explore</h3>
            <ol className="orientation">
              <li>
                <Compass size={15} aria-hidden="true" /> Drag to rotate and scroll or pinch to zoom.
              </li>
              <li>
                Choose <strong>Cutaway</strong> to see the valves and the septum inside.
              </li>
              <li>Click a structure, or pick one from the list.</li>
              <li>
                Start the <strong>blood-flow tour</strong> to follow the pathway step by step.
              </li>
            </ol>
          </div>
          <HeartNotes />
          {copyLink}
        </div>
      </section>
    )
  }

  return (
    <section className="panel info" aria-labelledby="part-heading">
      <header className="info-header">
        <p className="eyebrow">{KIND_LABEL[part.kind]}</p>
        <h2 id="part-heading" className="info-title">
          {part.name}
        </h2>
        <p className="info-summary">{part.summary}</p>
        {view === 'whole' && part.internal && <p className="inline-note">Inside the heart — switch to Cutaway to see it.</p>}
        <div className="header-actions">
          {copyLink}
          <button type="button" className="tool-button bordered" onClick={onClear}>
            Clear selection
          </button>
        </div>
      </header>
      <Tabs
        label={`${part.name} information`}
        className="info-tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <div className="info-body">
                <ul className="bullets">
                  {part.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
                {part.oxygenation !== 'none' && (
                  <p className="muted small">
                    Diagram colour: {part.oxygenation === 'rich' ? 'red — oxygen-rich pathway' : 'blue — relatively oxygen-poor pathway'}.
                  </p>
                )}
                <div className="info-section">
                  <h3 className="section-title">In this model</h3>
                  <ul className="limitations">
                    {part.simplifications.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          },
          {
            id: 'connections',
            label: 'Connections',
            content: (
              <div className="info-body">
                <ul className="relations">
                  {part.connections.map((c) => (
                    <li key={c.targetId + c.text}>
                      <button type="button" className="relation-link" onClick={() => onSelect(c.targetId)}>
                        {findHeartPart(c.targetId)?.name}
                      </button>
                      <span className="relation-text">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          },
          {
            id: 'sources',
            label: 'Sources',
            content: (
              <div className="info-body">
                <Sources ids={part.sourceIds} />
                <HeartNotes />
              </div>
            ),
          },
        ]}
      />
    </section>
  )
}

function Sources({ ids }: { ids: readonly string[] }) {
  return (
    <ul className="sources">
      {ids.map((id) => (
        <li key={id}>
          <a href={HEART_SOURCES[id].url} target="_blank" rel="noreferrer">
            {HEART_SOURCES[id].label}
            <ExternalLink size={12} aria-hidden="true" className="external-icon" />
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function HeartNotes() {
  return (
    <div className="note">
      <p className="note-title">
        <Info size={14} aria-hidden="true" /> About this model
      </p>
      <p className="prose">{HEART_DISCLAIMER}</p>
      <p className="prose">{ORIENTATION_NOTE}</p>
      <p className="prose">
        {COLOR_CONVENTION} <span className="muted">(Blood colour: OpenStax A&amp;P 2e §18.3.)</span>
      </p>
      <p className="muted small">The content is paraphrased from OpenStax and has not been reviewed by a medical expert.</p>
    </div>
  )
}

/* ---------- Tour ---------- */

export function TourBar({
  step,
  onPrevious,
  onNext,
  onGoTo,
  onExit,
  reducedMotion,
}: {
  step: number
  onPrevious: () => void
  onNext: () => void
  onGoTo: (index: number) => void
  onExit: () => void
  reducedMotion: boolean
}) {
  const current = FLOW_STEPS[step]
  const last = step === FLOW_STEPS.length - 1
  return (
    <section className="tour-bar" aria-labelledby="tour-heading">
      <div className="tour-head">
        <p className="eyebrow">
          Blood-flow tour · step {step + 1} of {FLOW_STEPS.length}
        </p>
        <button type="button" className="tool-button bordered" onClick={onExit}>
          <X size={16} aria-hidden="true" />
          <span>Exit tour</span>
        </button>
      </div>
      <h2 id="tour-heading" className="tour-title">
        {current.title}
        {current.external && <span className="external-tag">outside the heart</span>}
      </h2>
      <p className="tour-text">{current.text}</p>
      <div className="tour-nav">
        <button type="button" className="tool-button bordered" onClick={onPrevious} disabled={step === 0}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span>Previous</span>
        </button>
        <ol className="tour-dots" aria-label="Tour steps">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`tour-dot${i === step ? ' is-current' : ''}`}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === step ? 'step' : undefined}
                onClick={() => onGoTo(i)}
              />
            </li>
          ))}
        </ol>
        {last ? (
          <button type="button" className="button" onClick={onExit}>
            Finish tour
          </button>
        ) : (
          <button type="button" className="button" onClick={onNext}>
            <span>Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="muted small">
        Conceptual pathway: the dashed path and marker show direction only, not real speed, timing, pressure or valve motion.
        {reducedMotion && ' The marker is shown still because reduced motion is on.'}
      </p>
    </section>
  )
}

/* ---------- Toolbar ---------- */

export function HeartToolbar({
  view,
  showLabels,
  canAct,
  isolated,
  touring,
  onView,
  onReset,
  onLabels,
  onFocus,
  onIsolate,
  onShowAll,
}: {
  view: HeartView
  showLabels: boolean
  canAct: boolean
  isolated: boolean
  touring: boolean
  onView: (v: HeartView) => void
  onReset: () => void
  onLabels: () => void
  onFocus: () => void
  onIsolate: () => void
  onShowAll: () => void
}) {
  return (
    <div className="scene-controls" role="toolbar" aria-label="Heart view controls">
      <div className="control-group" role="group" aria-label="View">
        <div className="segmented segmented--modes">
          <button type="button" className="segmented-option" aria-pressed={view === 'whole'} disabled={touring} onClick={() => onView('whole')}>
            <Eye size={15} aria-hidden="true" />
            Whole
          </button>
          <button type="button" className="segmented-option" aria-pressed={view === 'cutaway'} disabled={touring} onClick={() => onView('cutaway')}>
            <Layers size={15} aria-hidden="true" />
            Cutaway
          </button>
        </div>
        <button type="button" className="tool-button" aria-label="Reset camera" title="Reset camera" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          <span className="tool-text">Reset</span>
        </button>
        <button type="button" className="tool-button" aria-label="Labels" title="Structure labels" aria-pressed={showLabels} onClick={onLabels}>
          <Tag size={16} aria-hidden="true" />
          <span className="tool-text">Labels</span>
        </button>
      </div>
      <div className="control-group control-group--modes" role="group" aria-label="Selection">
        <button type="button" className="tool-button" disabled={!canAct} title={canAct ? 'Move the camera to the selection' : 'Select a visible structure first'} onClick={onFocus}>
          <Focus size={16} aria-hidden="true" />
          <span>Focus</span>
        </button>
        {isolated ? (
          <button type="button" className="tool-button is-on" onClick={onShowAll}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>Show all</span>
          </button>
        ) : (
          <button type="button" className="tool-button" disabled={!canAct || touring} onClick={onIsolate}>
            <ScanSearch size={16} aria-hidden="true" />
            <span>Isolate</span>
          </button>
        )}
      </div>
    </div>
  )
}
