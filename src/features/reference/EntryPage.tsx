import { Box, ExternalLink, FlaskConical, Wrench } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { AppLink } from '../../components/AppLink'
import { CopyLinkButton } from '../../components/CopyLinkButton'
import { findStructure } from '../../data/anatomy/atlas'
import { SUBJECTS, type SubjectId } from '../../data/subjects'
import { atlasLink } from '../../lib/links'
import { loadCatalog } from '../../reference/catalogs'
import { REFERENCE_SOURCES } from '../../reference/sources'
import { ENTRY_TYPE_LABELS, entryHref, FORMULA_KIND_LABELS, type AppLink as EntryLink, type ManifestRow, type ReferenceEntry, type WorkedExample as WorkedExampleT } from '../../reference/types'
import { libraryHref } from './route'
import { RichText, Tex } from './Tex'

const subjectName = (s: SubjectId) => SUBJECTS.find((x) => x.id === s)!.name

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; entry: ReferenceEntry | null }

/** One reference entry at `#/reference/<subject>/<id>`. Loads only that subject's catalog. */
export function EntryPage({ subject, id, manifest }: { subject: SubjectId; id: string; manifest: ReadonlyMap<string, ManifestRow> | null }) {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    loadCatalog(subject).then(
      (entries) => live && setLoad({ state: 'ready', entry: entries.find((e) => e.id === id) ?? null }),
      () => live && setLoad({ state: 'error' }),
    )
    return () => {
      live = false
    }
  }, [subject, id, attempt])

  const entry = load.state === 'ready' ? load.entry : null
  useEffect(() => {
    document.title = entry ? `${entry.title} · Reference · STEM Explorer` : 'Reference · STEM Explorer'
  }, [entry])

  if (load.state === 'loading')
    return (
      <div className="ref-page" aria-busy="true">
        <p className="muted small" role="status">
          Loading the {subjectName(subject)} reference…
        </p>
      </div>
    )
  if (load.state === 'error')
    return (
      <div className="ref-page">
        <div className="ref-state" role="alert">
          <h1 className="ref-state-title">The {subjectName(subject)} reference could not be loaded</h1>
          <p>This usually means the connection dropped or the site was just updated. Check your connection and try again, or reload the page.</p>
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              setLoad({ state: 'loading' })
              setAttempt((a) => a + 1)
            }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  if (!entry)
    return (
      <div className="ref-page">
        <div className="ref-state" role="alert">
          <h1 className="ref-state-title">No entry “{id}” in {subjectName(subject)}</h1>
          <p>The link may be mistyped, or the entry may belong to another subject.</p>
          <p>
            <AppLink href={libraryHref({ q: id.replace(/-/g, ' ') })}>Search the library for “{id.replace(/-/g, ' ')}”</AppLink> ·{' '}
            <AppLink href={libraryHref({ subject })}>Browse {subjectName(subject)}</AppLink>
          </p>
        </div>
      </div>
    )
  return <EntryView entry={entry} manifest={manifest} />
}

function Section({ title, children, open = true, id }: { title: string; children: ReactNode; open?: boolean; id?: string }) {
  return (
    <details className="ref-section" open={open} id={id}>
      <summary>
        <h2 className="ref-section-title">{title}</h2>
      </summary>
      <div className="ref-section-body">{children}</div>
    </details>
  )
}

const LINK_ICON = { lab: FlaskConical, '3d': Box, tool: Wrench } as const
const LINK_KIND = { lab: 'Interactive lab', '3d': '3D structure', tool: 'Tool' } as const

function EntryLinks({ entry }: { entry: ReferenceEntry }) {
  const links: EntryLink[] = [...(entry.links ?? [])]
  if (entry.type === 'structure' && entry.atlasIds?.length) {
    const s = findStructure(entry.atlasIds[0])
    if (s) links.unshift({ label: 'Locate in 3D', href: atlasLink(s.id, s.system, s.variant), kind: '3d' })
  }
  if (!links.length) return null
  return (
    <ul className="ref-links" aria-label="Explore in the app">
      {links.map((l) => {
        const Icon = LINK_ICON[l.kind]
        return (
          <li key={l.href}>
            <AppLink className="ref-link" href={l.href}>
              <Icon size={16} aria-hidden="true" />
              <span>
                <span className="ref-link-kind">{LINK_KIND[l.kind]}</span>
                <span className="ref-link-label">{l.label}</span>
              </span>
            </AppLink>
          </li>
        )
      })}
    </ul>
  )
}

function Facts({ items }: { items: [string, ReactNode][] }) {
  const shown = items.filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!shown.length) return null
  return (
    <dl className="ref-facts">
      {shown.map(([k, v]) => (
        <div key={k} className="ref-fact">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const List = ({ items }: { items?: readonly string[] }) =>
  items?.length ? (
    <ul className="ref-list">
      {items.map((t) => (
        <li key={t}>
          <RichText text={t} />
        </li>
      ))}
    </ul>
  ) : null

const VECTOR = { vector: 'Vector equation', scalar: 'Scalar equation', component: 'One component (one axis)' } as const
const EXACT = { exact: 'Exact relationship', approximation: 'Approximation', definition: 'Definition', empirical: 'Empirical relationship', model: 'Idealized model' } as const

function TypeBody({ entry: e }: { entry: ReferenceEntry }) {
  switch (e.type) {
    case 'formula':
      return (
        <>
          <figure className="ref-equation">
            <div className="ref-equation-math">
              <Tex tex={e.latex} display />
            </div>
            <figcaption className="small muted">
              Plain text: <code>{e.plain}</code>
            </figcaption>
          </figure>
          <div className="ref-table-wrap">
            <table className="data-table ref-symbols">
              <caption className="small">Symbols</caption>
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">Meaning</th>
                  <th scope="col">Unit</th>
                </tr>
              </thead>
              <tbody>
                {e.symbols.map((s) => (
                  <tr key={s.symbol}>
                    <th scope="row">
                      <Tex tex={s.symbol} />
                    </th>
                    <td>{s.meaning}</td>
                    <td>
                      <RichText text={s.unit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Facts
            items={[
              ['Units', e.units],
              ['Form', e.vector ? VECTOR[e.vector] : undefined],
              ['Status', e.exactness ? EXACT[e.exactness] : undefined],
              ['Scope', e.scope === 'special-case' ? 'Special case of a more general relationship' : e.scope === 'general' ? 'General form' : undefined],
              ['Quantity', e.quantity === 'average' ? 'Average over an interval' : e.quantity === 'instantaneous' ? 'Instantaneous value' : undefined],
            ]}
          />
          <h3 className="ref-sub">Domain and conditions of use</h3>
          <List items={e.domain} />
          {e.conventions?.length ? (
            <>
              <h3 className="ref-sub">Sign and coordinate conventions</h3>
              <List items={e.conventions} />
            </>
          ) : null}
        </>
      )
    case 'structure':
      return (
        <>
          <Facts
            items={[
              ['System', e.system],
              ['Region', e.region],
              ['Location', e.location],
              ['3D coverage', e.atlasIds?.length ? 'Selectable in the body atlas (schematic shape)' : 'Reference only: the body atlas has no geometry for this structure'],
            ]}
          />
          <h3 className="ref-sub">Main functions</h3>
          <List items={e.functions} />
          <h3 className="ref-sub">Relationships to nearby structures</h3>
          <List items={e.neighbours} />
          {e.subdivisions?.length ? (
            <>
              <h3 className="ref-sub">Subdivisions</h3>
              <List items={e.subdivisions} />
            </>
          ) : null}
        </>
      )
    case 'process':
      return (
        <>
          {e.equation && (
            <figure className="ref-equation">
              <div className="ref-equation-math">
                <Tex tex={e.equation} display />
              </div>
              {(e.reactionType || e.reactionConditions) && <figcaption className="small muted">{[e.reactionType, e.reactionConditions].filter(Boolean).join(' · ')}</figcaption>}
            </figure>
          )}
          <Facts
            items={[
              ['Where', e.where],
              ['Inputs', e.inputs.join('; ')],
              ['Outputs', e.outputs.join('; ')],
              ['Diagram', e.diagram === 'conceptual' ? 'The app’s diagram is conceptual (order of events, not a simulation)' : e.diagram === 'quantitative' ? 'The app’s lab is a quantitative model' : undefined],
            ]}
          />
          <h3 className="ref-sub">Steps</h3>
          <ol className="ref-steps">
            {e.steps.map((s) => (
              <li key={s.title}>
                <strong>{s.title}.</strong> <RichText text={s.text} />
              </li>
            ))}
          </ol>
        </>
      )
    case 'substance':
      return (
        <>
          <figure className="ref-equation">
            <div className="ref-equation-math">
              <Tex tex={e.formula} display />
            </div>
          </figure>
          <Facts
            items={[
              ['Composition', e.composition],
              ['Bonding', e.bonding],
              ['Geometry', e.geometry],
              ['Relevance', e.relevance],
            ]}
          />
          <div className="ref-table-wrap">
            <table className="data-table">
              <caption className="small">Properties</caption>
              <thead>
                <tr>
                  <th scope="col">Property</th>
                  <th scope="col">Value</th>
                  <th scope="col">Conditions</th>
                </tr>
              </thead>
              <tbody>
                {e.properties.map((p) => (
                  <tr key={p.name}>
                    <th scope="row">{p.name}</th>
                    <td>
                      <RichText text={p.value} />
                    </td>
                    <td>{p.conditions ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )
    case 'concept':
      return (
        <>
          <Facts items={[['Where it applies', e.where]]} />
          {e.terms?.length ? (
            <dl className="ref-terms">
              {e.terms.map((t) => (
                <div key={t.term}>
                  <dt>{t.term}</dt>
                  <dd>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      )
    case 'worked-example':
      return null
  }
}

/** A worked example; structured steps (given, find, relationship, conversions) are shown when present. */
function ExampleView({ x }: { x: WorkedExampleT }) {
  const structured = Boolean(x.given || x.find || x.relationship)
  return (
    <div className="ref-example">
      {x.title && <h3 className="ref-sub">{x.title}</h3>}
      <p>
        <strong>Problem.</strong> <RichText text={x.problem} />
      </p>
      {structured ? (
        <ol className="ref-worked">
          {x.given?.length ? (
            <li>
              <span className="ref-worked-q">What is given?</span>
              <ul>
                {x.given.map((g) => (
                  <li key={g}>
                    <RichText text={g} />
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          {x.find && (
            <li>
              <span className="ref-worked-q">What are we finding?</span> <RichText text={x.find} />
            </li>
          )}
          {x.relationship && (
            <li>
              <span className="ref-worked-q">Which relationship applies?</span> <RichText text={x.relationship} />
            </li>
          )}
          {x.convert && (
            <li>
              <span className="ref-worked-q">Are unit conversions needed?</span> <RichText text={x.convert} />
            </li>
          )}
          {x.steps.length > 0 && (
            <li>
              <span className="ref-worked-q">Substitute and calculate</span>
              <ol className="ref-steps">
                {x.steps.map((s) => (
                  <li key={s}>
                    <RichText text={s} />
                  </li>
                ))}
              </ol>
            </li>
          )}
        </ol>
      ) : (
        x.steps.length > 0 && (
          <ol className="ref-steps">
            {x.steps.map((s) => (
              <li key={s}>
                <RichText text={s} />
              </li>
            ))}
          </ol>
        )
      )}
      <p className="ref-answer">
        <strong>Answer.</strong> <RichText text={x.answer} />
      </p>
    </div>
  )
}

function EntryView({ entry: e, manifest }: { entry: ReferenceEntry; manifest: ReadonlyMap<string, ManifestRow> | null }) {
  const title = (id: string) => manifest?.get(id)?.title ?? id.replace(/-/g, ' ')
  const hrefOf = (id: string) => {
    const row = manifest?.get(id)
    return row ? entryHref(row) : libraryHref({ q: id.replace(/-/g, ' ') })
  }
  const typeLabel = e.type === 'formula' ? FORMULA_KIND_LABELS[e.kind] : ENTRY_TYPE_LABELS[e.type]
  // Student-first layout when the entry has a plain-words summary (see types.ts).
  const student = Boolean(e.simple)
  return (
    <article className={`ref-page ref-entry subject-${e.subject}`} aria-labelledby="ref-title">
      <nav className="ref-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <AppLink href={libraryHref({})}>Reference library</AppLink>
          </li>
          <li>
            <AppLink href={libraryHref({ subject: e.subject })}>{subjectName(e.subject)}</AppLink>
          </li>
          <li>
            <AppLink href={libraryHref({ subject: e.subject, category: e.category })}>{e.category}</AppLink>
          </li>
          <li aria-current="page">{e.title}</li>
        </ol>
      </nav>
      <header className="ref-head">
        <p className="ref-badges">
          <span className="ref-badge ref-badge-type">{typeLabel}</span>
          <span className="ref-badge">{e.level[0].toUpperCase() + e.level.slice(1)}</span>
          {e.topic && <span className="ref-badge">{e.topic}</span>}
        </p>
        <h1 id="ref-title" className="ref-title">
          {e.title}
        </h1>
        <p className="ref-summary">
          <RichText text={e.summary} />
        </p>
        {e.aliases?.length ? <p className="small muted">Also called: {e.aliases.join(', ')}</p> : null}
        {e.prerequisites?.length ? (
          <p className="small">
            Read first:{' '}
            {e.prerequisites.map((p, i) => (
              <span key={p}>
                {i > 0 && ', '}
                <AppLink href={hrefOf(p)}>{title(p)}</AppLink>
              </span>
            ))}
          </p>
        ) : null}
        <div className="ref-actions">
          <CopyLinkButton getUrl={() => `${window.location.origin}${window.location.pathname}${entryHref(e)}`} restores="this reference entry" />
        </div>
      </header>
      {student ? (
        <>
          <section className="ref-plain" aria-labelledby="ref-simple">
            <h2 id="ref-simple" className="ref-plain-title">
              In simple words
            </h2>
            <p>
              <RichText text={e.simple!} />
            </p>
          </section>
          {e.why && (
            <section className="ref-plain" aria-labelledby="ref-why">
              <h2 id="ref-why" className="ref-plain-title">
                Why it matters
              </h2>
              <p>
                <RichText text={e.why} />
              </p>
            </section>
          )}
          {e.keyTerms?.length ? (
            <section className="ref-plain" aria-labelledby="ref-terms">
              <h2 id="ref-terms" className="ref-plain-title">
                Key terms
              </h2>
              <dl className="ref-terms">
                {e.keyTerms.map((t) => (
                  <div key={t.term}>
                    <dt>{t.term}</dt>
                    <dd>{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          {e.type !== 'concept' && e.type !== 'worked-example' && (
            <section className="ref-plain" aria-labelledby="ref-formula">
              <h2 id="ref-formula" className="ref-plain-title">
                {e.type === 'formula' ? 'Formula' : e.type === 'process' ? 'Steps' : 'Facts'}
              </h2>
              <div className="ref-body">
                <TypeBody entry={e} />
              </div>
            </section>
          )}
          <Section title={e.examples.length > 1 ? 'Worked examples' : 'Worked example'}>
            {e.examples.map((x, i) => (
              <ExampleView key={i} x={x} />
            ))}
          </Section>
          {e.mistakes?.length ? (
            <Section title={e.mistakes.length > 1 ? 'Common mistakes' : 'Common mistake'}>
              <List items={e.mistakes} />
            </Section>
          ) : null}
          {e.links?.length || (e.type === 'structure' && e.atlasIds?.length) ? (
            <section className="ref-plain" aria-labelledby="ref-explore">
              <h2 id="ref-explore" className="ref-plain-title">
                Explore it
              </h2>
              <EntryLinks entry={e} />
            </section>
          ) : null}
          <Section title="More detail" open={false}>
            {e.explanation.map((p) => (
              <p key={p}>
                <RichText text={p} />
              </p>
            ))}
            <h3 className="ref-sub">Conditions and limitations</h3>
            <List items={e.conditions} />
            {e.modelLimitations?.length ? (
              <>
                <h3 className="ref-sub">How the app’s model simplifies this</h3>
                <List items={e.modelLimitations} />
              </>
            ) : null}
          </Section>
        </>
      ) : (
        <>
          <EntryLinks entry={e} />
          <div className="ref-body">
            <TypeBody entry={e} />
          </div>
          <Section title="Explanation">
            {e.explanation.map((p) => (
              <p key={p}>
                <RichText text={p} />
              </p>
            ))}
          </Section>
          <Section title={e.examples.length > 1 ? 'Examples' : 'Example'}>
            {e.examples.map((x, i) => (
              <ExampleView key={i} x={x} />
            ))}
          </Section>
          <Section title="Conditions and limitations">
            <List items={e.conditions} />
            {e.modelLimitations?.length ? (
              <>
                <h3 className="ref-sub">How the app’s model simplifies this</h3>
                <List items={e.modelLimitations} />
              </>
            ) : null}
          </Section>
          {e.mistakes?.length ? (
            <Section title="Common mistakes">
              <List items={e.mistakes} />
            </Section>
          ) : null}
        </>
      )}
      <Section title="Related entries">
        <ul className="ref-related">
          {e.related.map((r) => {
            const row = manifest?.get(r.id)
            return (
              <li key={r.id}>
                <AppLink href={hrefOf(r.id)}>{title(r.id)}</AppLink>
                {row && row.subject !== e.subject && <span className="ref-badge ref-badge-cross">{subjectName(row.subject)}</span>}
                <span className="small muted"> — {r.why}</span>
              </li>
            )
          })}
        </ul>
      </Section>
      <Section title="Sources" id="sources">
        <ul className="ref-sources">
          {e.sources.map((s) => {
            const src = REFERENCE_SOURCES[s.id]
            return (
              <li key={s.id + (s.locator ?? '')}>
                <a href={src.url} target="_blank" rel="noreferrer">
                  {src.label}
                  <ExternalLink size={12} aria-hidden="true" />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
                {s.locator && <span className="small muted"> — {s.locator}</span>}
              </li>
            )
          })}
        </ul>
        <p className="small muted">
          The text is written for this app and paraphrases the cited sources. Each entry passes an automated completeness check; that check does not establish
          scientific accuracy, and no entry has been reviewed by a subject expert.
        </p>
      </Section>
    </article>
  )
}
