import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import type { ShareState } from '../lib/explorations'
import { browserStorage, MAX_TITLE_LENGTH } from '../lib/explorationStore'
import { COLLECTION_MESSAGES, createCollection, MAX_ITEMS, MAX_NOTE, newItem, updateCollection } from '../lib/collectionsStore'
import { notifyCollectionsChange, useCollections } from '../lib/useCollections'

const NEW = '__new__'

/** Adds the current view (its validated settings only) to an existing or new collection, with an optional note. */
export function AddToCollection({ state, suggestedTitle, onDone, onError, onCancel }: { state: ShareState; suggestedTitle: string; onDone: (collectionTitle: string) => void; onError: (text: string) => void; onCancel: () => void }) {
  const id = useId()
  const data = useCollections()
  const collections = data.ok ? data.collections : []
  const [target, setTarget] = useState(collections[0]?.id ?? NEW)
  const [newTitle, setNewTitle] = useState('')
  const [title, setTitle] = useState(suggestedTitle)
  const [note, setNote] = useState('')

  if (!data.ok) return <p className="status-error small">{COLLECTION_MESSAGES[data.reason]}</p>

  const add = () => {
    const store = browserStorage()
    let collection = collections.find((c) => c.id === target)
    if (!collection) {
      const created = createCollection(store, newTitle)
      if (!created.ok) return onError(COLLECTION_MESSAGES[created.reason])
      collection = created.value
    }
    if (collection.items.length >= MAX_ITEMS) return onError(COLLECTION_MESSAGES.limit)
    const r = updateCollection(store, collection.id, collection.revision, (c) => ({ ...c, items: [...c.items, newItem(state, note, title)] }))
    notifyCollectionsChange()
    if (!r.ok) return onError(COLLECTION_MESSAGES[r.reason])
    onDone(r.value.title)
  }

  return (
    <form
      className="save-form"
      onSubmit={(e) => {
        e.preventDefault()
        add()
      }}
    >
      <label htmlFor={`${id}-target`} className="param-label">
        Collection
      </label>
      <select id={`${id}-target`} className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
        {collections.map((c) => (
          <option key={c.id} value={c.id} disabled={c.items.length >= MAX_ITEMS}>
            {c.title} ({c.items.length} item{c.items.length === 1 ? '' : 's'})
          </option>
        ))}
        <option value={NEW}>New collection…</option>
      </select>
      {target === NEW && (
        <>
          <label htmlFor={`${id}-new`} className="param-label">
            New collection title
          </label>
          <input id={`${id}-new`} className="search-input save-input" value={newTitle} maxLength={MAX_TITLE_LENGTH} required onChange={(e) => setNewTitle(e.target.value)} />
        </>
      )}
      <label htmlFor={`${id}-title`} className="param-label">
        Item name
      </label>
      <input id={`${id}-title`} className="search-input save-input" value={title} maxLength={MAX_TITLE_LENGTH} onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor={`${id}-note`} className="param-label">
        Observation or question (optional)
      </label>
      <textarea id={`${id}-note`} className="note-body-input" rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="share-row">
        <button type="submit" className="button">
          <Check size={16} aria-hidden="true" />
          Add
        </button>
        <button type="button" className="tool-button bordered" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="muted small">Only this view’s settings and your note are stored, in this browser. Copy link never includes collections or notes.</p>
    </form>
  )
}
