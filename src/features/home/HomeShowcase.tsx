import { ArrowRight, BookOpenCheck, Library, Link as LinkIcon, PersonStanding, ShieldCheck } from 'lucide-react'
import { AppLink } from '../../components/AppLink'
import { SubjectIcon } from '../../components/SubjectIcon'
import { ATLAS_SYSTEMS, inventory } from '../../data/anatomy/atlas'
import { RELATION_LABELS, RELATIONS } from '../../data/related'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { findSearchItem } from '../../lib/searchIndex'
import { REFERENCE_COUNTS, REFERENCE_TOTAL } from '../../reference/counts'
import type { EntryType } from '../../reference/types'

const subjectName = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)!.name


/** Drawn structures per system in the current body atlas (individual + grouped). */
const ATLAS_INVENTORY = inventory()
const DRAWN = ATLAS_INVENTORY.reduce((n, s) => n + s.individual.length + s.groups.length, 0)

/** A flat front-view figure with a few systems hinted; decorative (the list beside it is the content). */
function AtlasFigure() {
  return (
    <svg className="atlas-figure" viewBox="0 0 120 260" aria-hidden="true" focusable="false">
      <g className="atlas-figure-skin">
        <ellipse cx="60" cy="24" rx="15" ry="18" />
        <rect x="53" y="40" width="14" height="10" rx="4" />
        <path d="M34 52 Q60 44 86 52 L90 128 Q60 136 30 128 Z" />
        <path d="M33 54 L20 120 L26 122 L40 70 Z" />
        <path d="M87 54 L100 120 L94 122 L80 70 Z" />
        <path d="M34 126 L56 130 L54 250 L42 250 Z" />
        <path d="M86 126 L64 130 L66 250 L78 250 Z" />
      </g>
      <g className="atlas-figure-skeleton">
        <path d="M60 46 V128" />
        <path d="M44 66 Q60 60 76 66 M43 76 Q60 70 77 76 M44 86 Q60 80 76 86 M46 96 Q60 90 74 96" />
        <path d="M42 126 Q60 116 78 126" />
        <path d="M49 132 L48 246 M71 132 L72 246" />
      </g>
      <g className="atlas-figure-organs">
        <path className="atlas-figure-lung" d="M48 62 Q42 80 46 100 L57 98 L57 64 Z" />
        <path className="atlas-figure-lung" d="M72 62 Q78 80 74 100 L63 98 L63 64 Z" />
        <path className="atlas-figure-heart" d="M60 80 q6 -6 9 1 q1 7 -9 14 q-8 -7 -7 -14 q3 -6 7 -1 Z" />
      </g>
    </svg>
  )
}

/** A preview of the body atlas: what it covers, in words, with links straight to a system. No WebGL here. */
export function AtlasPreview() {
  const featured = ATLAS_INVENTORY.filter((s) => s.individual.length + s.groups.length > 0)
  return (
    <section className="home-section atlas-preview is-anatomy" aria-labelledby="atlas-preview-heading">
      <div className="atlas-preview-art">
        <AtlasFigure />
      </div>
      <div className="atlas-preview-body">
        <p className="eyebrow">
          <PersonStanding size={14} aria-hidden="true" /> Human body atlas
        </p>
        <h2 id="atlas-preview-heading" className="home-h2 atlas-preview-title">
          Explore the body system by system
        </h2>
        <p className="atlas-preview-lead">
          {ATLAS_SYSTEMS.length} organ-system layers and {DRAWN} drawn structures you can select, isolate and fade, with guided tours and a list that works
          without 3D. The 3D view loads only when you open the atlas.
        </p>
        <ul className="atlas-systems" aria-label="Open the atlas at a system">
          {featured.map(({ system, individual, groups }) => (
            <li key={system.id}>
              <AppLink href={`?asys=${system.id}&bview=front#/anatomy`} className="atlas-system-link">
                <span className="atlas-system-dot" style={{ background: system.color }} aria-hidden="true" />
                <span>{system.name}</span>
                <span className="atlas-system-count">{individual.length + groups.length}</span>
              </AppLink>
            </li>
          ))}
        </ul>
        <div className="atlas-preview-actions">
          <AppLink href="?bview=front#/anatomy" className="button home-cta">
            Open the body atlas <ArrowRight size={16} aria-hidden="true" />
          </AppLink>
          {REFERENCE_COUNTS.anatomy.total > 0 && (
            <AppLink href="?rs=anatomy#/reference" className="tool-button bordered">
              {REFERENCE_COUNTS.anatomy.total} anatomy reference entries
            </AppLink>
          )}
        </div>
        <p className="muted small">The atlas is schematic: shapes show position and relationships, not exact anatomy. Numbers are drawn structures per system.</p>
      </div>
    </section>
  )
}

const CONNECTION_IDS = ['derivatives-motion', 'breathing-boyle', 'inheritance-binomial', 'catalysis-enzymes', 'circuit-blood-flow', 'photosynthesis-molecules']

/** Curated cross-subject links, each labelled as the same mathematics, a real connection or an analogy. */
export function Connections() {
  const items = CONNECTION_IDS.map((id) => RELATIONS.find((r) => r.id === id)).filter((r) => r !== undefined)
  return (
    <section className="home-section" aria-labelledby="connections-heading">
      <h2 id="connections-heading" className="home-h2">
        <LinkIcon size={18} aria-hidden="true" /> Connections between subjects
      </h2>
      <p className="muted small home-section-lead">Each link says what kind it is. An analogy is a similarity in form only, and says where it breaks down.</p>
      <ul className="connection-grid">
        {items.map((r) => {
          const [a, b] = r.between.map((side) => findSearchItem(side[0])!)
          return (
            <li key={r.id} className={`connection is-${r.kind}`}>
              <span className={`connection-kind is-${r.kind}`}>{RELATION_LABELS[r.kind]}</span>
              <p className="connection-ends">
                <AppLink href={a.href} className={`connection-end is-${a.subject}`}>
                  <SubjectIcon subject={a.subject} size={14} /> {a.name}
                </AppLink>
                <span aria-hidden="true" className="connection-arrow">
                  ↔
                </span>
                <span className="visually-hidden"> and </span>
                <AppLink href={b.href} className={`connection-end is-${b.subject}`}>
                  <SubjectIcon subject={b.subject} size={14} /> {b.name}
                </AppLink>
              </p>
              <p className="connection-text">{r.text}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const PLURALS: Record<EntryType, [string, string]> = {
  formula: ['formula', 'formulas'],
  concept: ['concept', 'concepts'],
  structure: ['structure', 'structures'],
  process: ['process', 'processes'],
  substance: ['substance or molecule', 'substances and molecules'],
  'worked-example': ['worked example', 'worked examples'],
}

const TYPE_ORDER: EntryType[] = ['formula', 'concept', 'structure', 'process', 'substance', 'worked-example']

/** The reference library in numbers, per subject, linked to filtered views. Hidden when empty. */
export function LibraryTeaser() {
  if (REFERENCE_TOTAL === 0) return null
  const byType = TYPE_ORDER.map((t) => [t, Object.values(REFERENCE_COUNTS).reduce((n, c) => n + (c[t] ?? 0), 0)] as const).filter(([, n]) => n > 0)
  return (
    <section className="home-section library-teaser" aria-labelledby="library-heading">
      <div className="library-teaser-head">
        <h2 id="library-heading" className="home-h2">
          <Library size={18} aria-hidden="true" /> Reference library
        </h2>
        <p className="muted small home-section-lead">
          {REFERENCE_TOTAL} entries with conditions of use, a worked example, related entries and sources:{' '}
          {byType.map(([t, n], i) => (
            <span key={t}>
              {i > 0 && ', '}
              {n} {PLURALS[t][n === 1 ? 0 : 1]}
            </span>
          ))}
          .
        </p>
      </div>
      <ul className="library-subjects">
        {SUBJECTS.map((s) => (
          <li key={s.id}>
            <AppLink href={`?rs=${s.id}#/reference`} className={`library-subject is-${s.id}`}>
              <SubjectIcon subject={s.id} size={16} />
              <span className="library-subject-name">{subjectName(s.id)}</span>
              <span className="library-subject-count">{REFERENCE_COUNTS[s.id].total}</span>
            </AppLink>
          </li>
        ))}
      </ul>
      <AppLink href="#/reference" className="search-all-link">
        Browse the whole library <ArrowRight size={14} aria-hidden="true" />
      </AppLink>
    </section>
  )
}

/** What the sources are and what the models can't do, in brief. */
export function SourcesNote() {
  return (
    <section className="home-section sources-note" aria-labelledby="sources-note-heading">
      <h2 id="sources-note-heading" className="home-h2">
        <ShieldCheck size={18} aria-hidden="true" /> Sources and model limits
      </h2>
      <div className="sources-note-grid">
        <div>
          <h3 className="home-h3">
            <BookOpenCheck size={16} aria-hidden="true" /> Where the content comes from
          </h3>
          <p className="small">
            Explanations are written for this app and paraphrase open textbooks (OpenStax) and scientific databases (NIST, PubChem, CIAAW). Every explorer
            and reference entry links the sections it relies on, so you can check a statement at its source.
          </p>
        </div>
        <div>
          <h3 className="home-h3">What the models can’t do</h3>
          <p className="small">
            Models are simplified to show one idea clearly: the body atlas uses schematic shapes, molecule coordinates are illustrative, and labs ignore
            effects such as air resistance unless they say otherwise. Each view lists its own limitations.
          </p>
        </div>
        <div>
          <h3 className="home-h3">What has been checked</h3>
          <p className="small">
            Automated tests check that entries are complete, links work and worked examples compute to their stated answers. That is not an expert
            review: nothing here is medical advice, and no content has been reviewed by a subject specialist.
          </p>
        </div>
      </div>
    </section>
  )
}
