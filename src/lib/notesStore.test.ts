import { describe, expect, it } from 'vitest'
import { addNote, cleanNoteBody, deleteNote, loadNotes, MAX_NOTE_TITLE, MAX_NOTES, NOTES_KEY, restoreNote, updateNote } from './notesStore'
import type { KeyValueStore } from './explorationStore'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v
    },
    removeItem: (k) => {
      delete data[k]
    },
  }
}

const water = { subject: 'chemistry' as const, params: { molecule: 'water', view: 'ball-and-stick' } }
const quota = () => {
  throw new DOMException('full', 'QuotaExceededError')
}

describe('notebook storage', () => {
  it('adds, edits, deletes and undoes, storing the canonical exploration snapshot', () => {
    const store = memoryStore()
    const added = addNote(store, { subject: 'chemistry', params: { molecule: 'water' } }, { title: '  Bent  water ', body: 'Angle about 104.5°.\nLess than 109.5°.' })
    if (!added.ok) throw new Error('add failed')
    expect(added.value.title).toBe('Bent water')
    expect(added.value.params).toEqual({ molecule: 'water', view: 'ball-and-stick' })
    expect(added.value.body).toBe('Angle about 104.5°.\nLess than 109.5°.')
    expect(JSON.stringify(JSON.parse(store.data[NOTES_KEY]))).not.toMatch(/tourStep|activity|time/)

    const edited = updateNote(store, added.value.id, { title: 'Water angle', body: 'Edited' })
    expect(edited.ok && edited.value.title).toBe('Water angle')
    const del = deleteNote(store, added.value.id)
    if (!del.ok) throw new Error('delete failed')
    expect(loadNotes(store)).toMatchObject({ ok: true, notes: [] })
    expect(restoreNote(store, del.value.note, del.value.index).ok).toBe(true)
    const back = loadNotes(store)
    expect(back.ok && back.notes.map((n) => n.title)).toEqual(['Water angle'])
  })

  it('refuses empty titles and invalid explorations; caps lengths; strips control characters but keeps line breaks', () => {
    const store = memoryStore()
    expect(addNote(store, water, { title: '   ', body: 'x' })).toMatchObject({ ok: false, reason: 'invalid' })
    expect(addNote(store, { subject: 'chemistry', params: { molecule: 'gold' } }, { title: 'x', body: '' })).toMatchObject({ ok: false, reason: 'invalid' })
    const long = addNote(store, water, { title: 'T'.repeat(200), body: 'a\u0007b\r\nc\td' })
    expect(long.ok && long.value.title.length).toBe(MAX_NOTE_TITLE)
    expect(long.ok && long.value.body).toBe('ab\nc\td')
    expect(cleanNoteBody('<script>alert(1)</script>')).toBe('<script>alert(1)</script>') // kept as text; React renders it as text
  })

  it('enforces the note limit', () => {
    const store = memoryStore()
    for (let i = 0; i < MAX_NOTES; i++) addNote(store, water, { title: `Note ${i}`, body: '' })
    expect(addNote(store, water, { title: 'one more', body: '' })).toMatchObject({ ok: false, reason: 'limit' })
  })

  it('reports unavailable, malformed and quota states without changing data', () => {
    expect(loadNotes(null)).toEqual({ ok: false, reason: 'unavailable' })
    const damaged = memoryStore({ [NOTES_KEY]: '{oops' })
    expect(loadNotes(damaged)).toEqual({ ok: false, reason: 'unreadable' })
    expect(addNote(damaged, water, { title: 'x', body: '' })).toMatchObject({ ok: false, reason: 'unreadable' })
    expect(damaged.data[NOTES_KEY]).toBe('{oops')

    const full = memoryStore()
    addNote(full, water, { title: 'Kept', body: '' })
    const before = full.data[NOTES_KEY]
    full.setItem = quota
    expect(addNote(full, water, { title: 'New', body: '' })).toMatchObject({ ok: false, reason: 'quota' })
    expect(full.data[NOTES_KEY]).toBe(before)
  })

  it('drops invalid entries, keeps newer-version entries on write', () => {
    const future = { version: 2, id: 'future-1', title: 'From the future' }
    const store = memoryStore({ [NOTES_KEY]: JSON.stringify([future, { version: 1, id: 'bad', title: 'x' }]) })
    expect(loadNotes(store)).toMatchObject({ ok: true, notes: [] })
    addNote(store, water, { title: 'Now', body: '' })
    expect(JSON.parse(store.data[NOTES_KEY])).toContainEqual(future)
  })
})
