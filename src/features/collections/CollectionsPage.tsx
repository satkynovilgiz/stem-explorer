import { ArrowDown, ArrowUp, Copy, Download, FolderPlus, Plus, Trash2, Upload, X } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { CURATED_COLLECTIONS, type CuratedCollection } from '../../data/collections'
import { canonicalKey, defaultTitle, hrefFor, subjectName, type ShareState } from '../../lib/explorations'
import { browserStorage } from '../../lib/explorationStore'
import {
  addCollection,
  applyCollectionsImport,
  buildCollectionsFile,
  COLLECTION_MESSAGES,
  createCollection,
  deleteCollection,
  duplicateCollection,
  duplicateItem,
  itemHref,
  MAX_COLLECTIONS,
  MAX_DESCRIPTION,
  MAX_IMPORT_BYTES,
  MAX_ITEMS,
  MAX_NOTE,
  moveItem,
  newItem,
  planCollectionsImport,
  readCollections,
  removeItem,
  setItemNote,
  stateFromLink,
  updateCollection,
  type Collection,
  type CollectionFailure,
  type CollectionItem,
  type ImportCandidate,
} from '../../lib/collectionsStore'
import { useExplorationLibrary } from '../../lib/useExplorationLibrary'
import { notifyCollectionsChange, useCollections } from '../../lib/useCollections'
import { SourceLinks } from '../guide/SourceLinks'

type Say = (text: string) => void

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Runs a write; on failure says why (a conflict also re-reads, so the newer version is shown). */
function useWrite(say: Say, refresh: () => void) {
  return <T,>(r: { ok: true; value: T } | { ok: false; reason: CollectionFailure }, done?: string): r is { ok: true; value: T } => {
    if (r.ok) {
      if (done) say(done)
      notifyCollectionsChange()
      return true
    }
    if (r.reason === 'conflict' || r.reason === 'not-found') refresh()
    say(COLLECTION_MESSAGES[r.reason])
    return false
  }
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const fileName = (what: string) => `stem-explorer-${what}-${new Date().toISOString().slice(0, 10)}.json`
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'collection'

/* ---------- One item ---------- */

function ItemRow({ item, index, count, collection, write }: { item: CollectionItem; index: number; count: number; collection: Collection; write: (fn: (c: Collection) => Collection | null, done?: string) => boolean }) {
  const id = useId()
  const [note, setNote] = useState(item.note)
  const href = itemHref(item)
  const dirty = note.trim() !== item.note
  return (
    <li className={`collection-item is-${item.subject}${href ? '' : ' is-broken'}`}>
      <div className="collection-item-head">
        <span className="collection-step" aria-hidden="true">
          {index + 1}
        </span>
        <span className={`subject-chip is-${item.subject}`}>{subjectName(item.subject)}</span>
        {href ? (
          <AppLink href={href} className="collection-item-title">
            {item.title}
          </AppLink>
        ) : (
          <span className="collection-item-title">{item.title}</span>
        )}
      </div>
      {!href && (
        <div className="collection-broken" role="note">
          <p>
            <strong>Can’t be opened:</strong> its saved settings are not valid in this version of STEM Explorer (they may come from
            a newer or changed version). The item is kept unchanged so nothing is lost.
          </p>
          <p>
            You can <AppLink href={`#/${item.subject}`}>open {subjectName(item.subject)} with its default view</AppLink>, set it up
            again and add it, then remove this item.
          </p>
        </div>
      )}
      <label className="param-label" htmlFor={`${id}-note`}>
        Observation or question (optional)
      </label>
      <textarea id={`${id}-note`} className="note-body-input collection-note" value={note} maxLength={MAX_NOTE} rows={2} onChange={(e) => setNote(e.target.value)} />
      <div className="share-row collection-item-actions">
        {dirty && (
          <button type="button" className="button" onClick={() => write((c) => setItemNote(c, item.id, note), 'Note saved.')}>
            Save note
          </button>
        )}
        <button type="button" className="tool-button bordered" disabled={index === 0} onClick={() => write((c) => moveItem(c, item.id, -1), `Moved “${item.title}” up to position ${index}.`)}>
          <ArrowUp size={15} aria-hidden="true" />
          <span>
            Move up<span className="visually-hidden"> “{item.title}”</span>
          </span>
        </button>
        <button type="button" className="tool-button bordered" disabled={index === count - 1} onClick={() => write((c) => moveItem(c, item.id, 1), `Moved “${item.title}” down to position ${index + 2}.`)}>
          <ArrowDown size={15} aria-hidden="true" />
          <span>
            Move down<span className="visually-hidden"> “{item.title}”</span>
          </span>
        </button>
        <button type="button" className="tool-button bordered" disabled={count >= MAX_ITEMS} onClick={() => write((c) => duplicateItem(c, item.id), `Duplicated “${item.title}”.`)}>
          <Copy size={15} aria-hidden="true" />
          <span>
            Duplicate<span className="visually-hidden"> “{item.title}”</span>
          </span>
        </button>
        <button type="button" className="tool-button bordered" onClick={() => write((c) => removeItem(c, item.id), `Removed “${item.title}” from “${collection.title}”.`)}>
          <Trash2 size={15} aria-hidden="true" />
          <span>
            Remove<span className="visually-hidden"> “{item.title}”</span>
          </span>
        </button>
      </div>
    </li>
  )
}

/* ---------- Adding items ---------- */

function AddItem({ collection, write }: { collection: Collection; write: (fn: (c: Collection) => Collection | null, done?: string) => boolean }) {
  const id = useId()
  const { saved, recent } = useExplorationLibrary()
  const [choice, setChoice] = useState('')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const options = useMemo(() => {
    const seen = new Set<string>()
    const list: { key: string; group: 'Saved' | 'Recent'; label: string; state: ShareState }[] = []
    for (const [group, entries] of [['Saved', saved], ['Recent', recent]] as const) {
      for (const e of entries) {
        const state = { subject: e.subject, params: e.params }
        const key = canonicalKey(state)
        if (seen.has(key)) continue
        seen.add(key)
        list.push({ key, group, label: `${e.title} (${subjectName(e.subject)})`, state })
      }
    }
    return list
  }, [saved, recent])
  const full = collection.items.length >= MAX_ITEMS

  const add = () => {
    const fromLink = link.trim() ? stateFromLink(link) : null
    if (link.trim() && !fromLink) return setError('That is not a link to an explorer view in STEM Explorer, or its settings are not valid. Use Copy link in an explorer and paste it here.')
    const picked = options.find((o) => o.key === choice)
    const state = fromLink ?? picked?.state
    if (!state) return setError('Choose a saved or recent exploration, or paste an exploration link.')
    const title = picked && !fromLink ? picked.label.replace(/ \([^)]*\)$/, '') : defaultTitle(state)
    if (write((c) => (c.items.length >= MAX_ITEMS ? null : { ...c, items: [...c.items, newItem(state, note, title)] }), `Added “${title}” to “${collection.title}”.`)) {
      setChoice('')
      setLink('')
      setNote('')
      setError('')
    }
  }

  if (full) return <p className="muted small">This collection has the maximum of {MAX_ITEMS} items.</p>
  return (
    <details className="collection-add">
      <summary>
        <Plus size={15} aria-hidden="true" /> Add an exploration
      </summary>
      <div className="collection-add-body">
        <label className="param-label" htmlFor={`${id}-pick`}>
          From your saved explorations or recent views
        </label>
        <select id={`${id}-pick`} className="select" value={choice} onChange={(e) => setChoice(e.target.value)} disabled={options.length === 0}>
          <option value="">{options.length === 0 ? 'Nothing saved or recent yet' : 'Choose…'}</option>
          {(['Saved', 'Recent'] as const).map((g) =>
            options.some((o) => o.group === g) ? (
              <optgroup key={g} label={g}>
                {options
                  .filter((o) => o.group === g)
                  .map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
              </optgroup>
            ) : null,
          )}
        </select>
        <label className="param-label" htmlFor={`${id}-link`}>
          Or paste an exploration link (from Copy link)
        </label>
        <input id={`${id}-link`} className="search-input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…#/physics" />
        <label className="param-label" htmlFor={`${id}-note`}>
          Observation or question (optional)
        </label>
        <textarea id={`${id}-note`} className="note-body-input collection-note" value={note} maxLength={MAX_NOTE} rows={2} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p className="status-error small" role="alert">
            {error}
          </p>
        )}
        <div className="share-row">
          <button type="button" className="button" onClick={add}>
            <Plus size={15} aria-hidden="true" />
            Add to “{collection.title}”
          </button>
        </div>
        <p className="muted small">You can also use “Add to collection” next to Copy link in any explorer.</p>
      </div>
    </details>
  )
}

/* ---------- One collection ---------- */

function CollectionCard({ collection, say, refresh }: { collection: Collection; say: Say; refresh: () => void }) {
  const id = useId()
  const run = useWrite(say, refresh)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(collection.title)
  const [description, setDescription] = useState(collection.description)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const write = (fn: (c: Collection) => Collection | null, done?: string) => run(updateCollection(browserStorage(), collection.id, collection.revision, fn), done)
  const broken = collection.items.filter((i) => !itemHref(i)).length

  return (
    <li className="collection-card" aria-labelledby={`${id}-title`}>
      {editing ? (
        <form
          className="collection-edit"
          onSubmit={(e) => {
            e.preventDefault()
            if (write((c) => ({ ...c, title, description: description.slice(0, MAX_DESCRIPTION) }), 'Collection details saved.')) setEditing(false)
          }}
        >
          <label className="param-label" htmlFor={`${id}-t`}>
            Title
          </label>
          <input id={`${id}-t`} className="search-input" value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} />
          <label className="param-label" htmlFor={`${id}-d`}>
            Description (optional)
          </label>
          <textarea id={`${id}-d`} className="note-body-input collection-note" value={description} maxLength={MAX_DESCRIPTION} rows={2} onChange={(e) => setDescription(e.target.value)} />
          <div className="share-row">
            <button type="submit" className="button">
              Save
            </button>
            <button type="button" className="tool-button bordered" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="collection-head">
          <h3 id={`${id}-title`} className="note-title">
            {collection.title}
          </h3>
          {collection.description && <p className="note-body">{collection.description}</p>}
          <p className="muted small">
            {plural(collection.items.length, 'item')}
            {broken > 0 && <> · {plural(broken, 'item')} can’t be opened</>}
          </p>
        </div>
      )}

      {collection.items.length === 0 ? (
        <p className="muted small">No items yet. Add explorations below; each one opens in its own explorer.</p>
      ) : (
        <ol className="collection-items" aria-label={`Items in ${collection.title}, in order`}>
          {collection.items.map((item, i) => (
            <ItemRow key={`${item.id}:${item.note}`} item={item} index={i} count={collection.items.length} collection={collection} write={write} />
          ))}
        </ol>
      )}

      <AddItem collection={collection} write={write} />

      <div className="share-row collection-actions">
        {!editing && (
          <button
            type="button"
            className="tool-button bordered"
            onClick={() => {
              setTitle(collection.title)
              setDescription(collection.description)
              setEditing(true)
            }}
          >
            <span>
              Rename or describe<span className="visually-hidden"> “{collection.title}”</span>
            </span>
          </button>
        )}
        <button type="button" className="tool-button bordered" onClick={() => run(duplicateCollection(browserStorage(), collection.id), `Duplicated “${collection.title}”.`)}>
          <Copy size={15} aria-hidden="true" />
          <span>
            Duplicate collection<span className="visually-hidden"> “{collection.title}”</span>
          </span>
        </button>
        <button
          type="button"
          className="tool-button bordered"
          onClick={() => {
            download(fileName(`collection-${slug(collection.title)}`), JSON.stringify(buildCollectionsFile([collection]), null, 2))
            say(`Exported “${collection.title}” as a collection file. It includes your notes on its items.`)
          }}
        >
          <Download size={15} aria-hidden="true" />
          <span>
            Export file<span className="visually-hidden"> for “{collection.title}”</span>
          </span>
        </button>
        {confirmDelete ? (
          <span className="collection-confirm" role="group" aria-label="Confirm deletion">
            <span className="small">Delete “{collection.title}” and its notes?</span>
            <button type="button" className="tool-button bordered is-danger" onClick={() => run(deleteCollection(browserStorage(), collection.id, collection.revision), `Deleted “${collection.title}”.`)}>
              Delete
            </button>
            <button type="button" className="tool-button bordered" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="tool-button bordered" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} aria-hidden="true" />
            <span>
              Delete<span className="visually-hidden"> “{collection.title}”</span>
            </span>
          </button>
        )}
      </div>
    </li>
  )
}

/* ---------- Curated ---------- */

function CuratedCard({ collection, onCopy }: { collection: CuratedCollection; onCopy: () => void }) {
  const id = `curated-${collection.id}`
  return (
    <li className="collection-card is-curated" aria-labelledby={id}>
      <div className="collection-head">
        <h3 id={id} className="note-title">
          {collection.title}
        </h3>
        <p className="note-body">{collection.summary}</p>
      </div>
      <ol className="collection-items" aria-label={`Steps in ${collection.title}`}>
        {collection.steps.map((s, i) => (
          <li key={i} className={`collection-item is-${s.subject}`}>
            <div className="collection-item-head">
              <span className="collection-step" aria-hidden="true">
                {i + 1}
              </span>
              <span className={`subject-chip is-${s.subject}`}>{subjectName(s.subject)}</span>
              <AppLink href={hrefFor(s)} className="collection-item-title">
                {s.title}
              </AppLink>
            </div>
            <p className="small">{s.prompt}</p>
          </li>
        ))}
      </ol>
      <details className="collection-why">
        <summary>How these connect, and where the connection stops</summary>
        <ul className="collection-connections">
          {collection.connections.map((k, i) => (
            <li key={i}>
              <p className="small">
                {k.text}
                <SourceLinks ids={k.sources} />
              </p>
              <p className="small muted">
                <strong>Limits:</strong> {k.limits}
              </p>
            </li>
          ))}
        </ul>
        <p className="small muted">
          <strong>Simplifications:</strong> {collection.limitations}
        </p>
      </details>
      <div className="share-row">
        <button type="button" className="tool-button bordered" onClick={onCopy}>
          <FolderPlus size={15} aria-hidden="true" />
          <span>
            Copy to my collections<span className="visually-hidden"> (“{collection.title}”)</span>
          </span>
        </button>
      </div>
    </li>
  )
}

/* ---------- Import ---------- */

function ImportExport({ collections, disabled, say, refresh }: { collections: Collection[]; disabled: boolean; say: Say; refresh: () => void }) {
  const id = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const run = useWrite(say, refresh)
  const [pending, setPending] = useState<{ name: string; text: string; candidates: ImportCandidate[]; skippedInvalid: number } | null>(null)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)

  const choose = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setPending(null)
    if (file.size > MAX_IMPORT_BYTES) return say(`That file is larger than ${MAX_IMPORT_BYTES / 1_000_000} MB, so it was not read.`)
    const text = await file.text().catch(() => null)
    if (text === null) return say('That file could not be read.')
    const plan = planCollectionsImport(text, collections)
    if (!plan.ok) {
      const why = {
        'too-large': `That file is larger than ${MAX_IMPORT_BYTES / 1_000_000} MB.`,
        'not-json': 'That file is not valid JSON.',
        'wrong-format': 'That file is not a STEM Explorer collection file. (Saved-exploration backups are imported on Home; notebook backups in the Notebook.)',
        'unsupported-version': 'That collection file comes from a newer version of STEM Explorer and can’t be read here.',
        empty: 'That collection file contains no collections.',
      }[plan.error]
      return say(`${why} Nothing was imported.`)
    }
    say('')
    setIncludeDuplicates(false)
    setPending({ name: file.name, text, candidates: plan.candidates, skippedInvalid: plan.skippedInvalid })
  }

  const confirm = () => {
    if (!pending) return
    // Re-plan against what is stored now: another tab may have changed the collections since the preview.
    const latest = readCollections(browserStorage())
    const fresh = planCollectionsImport(pending.text, latest.ok ? latest.collections : collections)
    if (!fresh.ok) return
    if (fresh.candidates.some((c, i) => c.duplicateOf !== pending.candidates[i]?.duplicateOf)) {
      refresh()
      setPending({ ...pending, candidates: fresh.candidates })
      return say('Your collections changed since the preview (perhaps in another tab). Nothing was imported. Check the updated preview and confirm again.')
    }
    const candidates = fresh.candidates
    const r = applyCollectionsImport(browserStorage(), candidates, includeDuplicates)
    if (run(r)) {
      say(`Imported ${plural(r.value.added, 'collection')}${r.value.skipped ? `; skipped ${plural(r.value.skipped, 'duplicate')}` : ''}. Existing collections were not changed.`)
      setPending(null)
    }
  }

  const dupes = pending?.candidates.filter((c) => c.duplicateOf).length ?? 0
  return (
    <div className="backup">
      <div className="share-row">
        <button
          type="button"
          className="tool-button bordered"
          disabled={disabled || collections.length === 0}
          onClick={() => {
            download(fileName('collections'), JSON.stringify(buildCollectionsFile(collections), null, 2))
            say(`Exported ${plural(collections.length, 'collection')}.`)
          }}
        >
          <Download size={15} aria-hidden="true" />
          <span>Export all collections</span>
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={(e) => void choose(e.target.files?.[0])} />
        <button type="button" className="tool-button bordered" disabled={disabled} onClick={() => fileRef.current?.click()}>
          <Upload size={15} aria-hidden="true" />
          <span>Import collections</span>
        </button>
      </div>
      <p className="muted small">
        A collection file (format “stem-explorer.collections”, version 1) holds whole collections: titles, descriptions, each
        item’s explorer settings <strong>and your notes</strong>. It is a file you keep or hand to someone deliberately. It is not
        the same as <strong>Copy link</strong>, which shares one explorer view and never includes notes or collections. Importing
        always adds collections; it never replaces or merges into existing ones.
      </p>
      {pending && (
        <section className="import-preview" aria-labelledby={`${id}-preview`}>
          <h3 id={`${id}-preview`} className="import-title">
            Import from “{pending.name}”
          </h3>
          <ul className="import-list">
            {pending.candidates.map((c, i) => (
              <li key={i}>
                <strong>{c.title}</strong> · {plural(c.items.length, 'item')}
                {c.brokenItems > 0 && <> · {plural(c.brokenItems, 'item')} can’t be opened in this version (kept, shown with recovery options)</>}
                {c.duplicateOf && <> · <em>same as your “{c.duplicateOf}”</em></>}
              </li>
            ))}
          </ul>
          {pending.skippedInvalid > 0 && <p className="small muted">{plural(pending.skippedInvalid, 'entry', 'entries')} in the file could not be read and will be skipped.</p>}
          {dupes > 0 && (
            <label className="toggle-row small">
              <input type="checkbox" checked={includeDuplicates} onChange={(e) => setIncludeDuplicates(e.target.checked)} />
              Also import the {plural(dupes, 'duplicate')} as separate copies (marked “(imported)”)
            </label>
          )}
          <div className="share-row">
            <button type="button" className="button" onClick={confirm} disabled={!includeDuplicates && dupes === pending.candidates.length}>
              Import
            </button>
            <button type="button" className="tool-button bordered" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

/* ---------- Page ---------- */

export function CollectionsPage() {
  const id = useId()
  const data = useCollections()
  const [message, setMessage] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const run = useWrite(setMessage, data.refresh)
  const collections = data.ok ? data.collections : []
  const blocked = !data.ok

  const copyCurated = (c: CuratedCollection) => {
    const r = addCollection(browserStorage(), { title: c.title, description: c.summary, items: c.steps.map((s) => ({ subject: s.subject, params: s.params, title: s.title, note: s.prompt })) })
    run(r, `Copied “${c.title}” to your collections. Its questions became item notes you can edit.`)
  }

  return (
    <div className={`glossary notebook collections${message ? ' has-toast' : ''}`}>
      <header className="glossary-head">
        <p className="eyebrow">Paths through the explorers</p>
        <h1 className="home-title">Collections</h1>
        <p className="home-lead">Ordered sets of explorer views, each with a question or observation. Every item opens in its own explorer.</p>
        <p className="muted small">Your collections live in this browser only: no account, nothing sent anywhere. Export a file to keep a copy.</p>
      </header>

      <section className="home-panel" aria-labelledby={`${id}-mine`}>
        <h2 id={`${id}-mine`} className="home-h2">
          My collections
        </h2>
        {data.ok === false ? (
          <p className="empty-state">{COLLECTION_MESSAGES[data.reason]}</p>
        ) : (
          <>
            <form
              className="collection-new"
              onSubmit={(e) => {
                e.preventDefault()
                if (run(createCollection(browserStorage(), title, description), `Created “${title.trim() || 'Untitled collection'}”.`)) {
                  setTitle('')
                  setDescription('')
                }
              }}
            >
              <label className="param-label" htmlFor={`${id}-title`}>
                New collection title
              </label>
              <input id={`${id}-title`} className="search-input" value={title} maxLength={80} required onChange={(e) => setTitle(e.target.value)} disabled={collections.length >= MAX_COLLECTIONS} />
              <label className="param-label" htmlFor={`${id}-desc`}>
                Description (optional)
              </label>
              <textarea id={`${id}-desc`} className="note-body-input collection-note" rows={2} maxLength={MAX_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} disabled={collections.length >= MAX_COLLECTIONS} />
              <div className="share-row">
                <button type="submit" className="button" disabled={collections.length >= MAX_COLLECTIONS}>
                  <FolderPlus size={15} aria-hidden="true" />
                  Create collection
                </button>
              </div>
            </form>
            {collections.length === 0 ? (
              <p className="empty-state">No collections yet. Create one above, or copy a starter collection below.</p>
            ) : (
              <ul className="collection-list">
                {collections.map((c) => (
                  <CollectionCard key={c.id} collection={c} say={setMessage} refresh={data.refresh} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="home-panel" aria-labelledby={`${id}-starter`}>
        <h2 id={`${id}-starter`} className="home-h2">
          Starter collections
        </h2>
        <p className="muted small">
          Short paths across subjects. Each says how its steps connect, which sources support that, and where the connection stops.
          Nothing is tracked or scored.
        </p>
        <ul className="collection-list">
          {CURATED_COLLECTIONS.map((c) => (
            <CuratedCard key={c.id} collection={c} onCopy={() => copyCurated(c)} />
          ))}
        </ul>
      </section>

      <section className="home-panel" aria-labelledby={`${id}-files`}>
        <h2 id={`${id}-files`} className="home-h2">
          Collection files
        </h2>
        <ImportExport collections={collections} disabled={blocked} say={setMessage} refresh={data.refresh} />
      </section>

      <div className="home-toast" role="status">
        {message && (
          <>
            <p className="library-status">{message}</p>
            <button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setMessage('')}>
              <X size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
