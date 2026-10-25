import { describe, expect, it } from 'vitest'
import {
  addCollection,
  applyCollectionsImport,
  buildCollectionsFile,
  COLLECTIONS_KEY,
  createCollection,
  deleteCollection,
  duplicateCollection,
  duplicateItem,
  itemHref,
  MAX_COLLECTIONS,
  moveItem,
  newItem,
  planCollectionsImport,
  readCollections,
  removeItem,
  setItemNote,
  stateFromLink,
  updateCollection,
} from './collectionsStore'
import { SAVED_KEY } from './explorationStore'
import type { ShareState } from './explorations'

function memory(failWith?: 'quota' | 'other') {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWith === 'quota') throw new DOMException('full', 'QuotaExceededError')
      if (failWith === 'other') throw new Error('nope')
      data.set(k, v)
    },
    removeItem: (k: string) => void data.delete(k),
  }
}

const water = { subject: 'chemistry' as const, params: { molecule: 'water', view: 'ball-and-stick' } }
const wave = { subject: 'physics' as const, params: { experiment: 'wave', wamp: '0.2', wfreq: '0.5', wlen: '2', wx: '1' } }

describe('collections store', () => {
  it('creates, adds items in order, reorders, duplicates and removes, and the order survives a reload', () => {
    const s = memory()
    const c = createCollection(s, 'How breathing works', 'A short path')
    expect(c.ok).toBe(true)
    if (!c.ok) return
    let rev = c.value.revision
    const add = (state: ShareState, note: string) => {
      const r = updateCollection(s, c.value.id, rev, (x) => ({ ...x, items: [...x.items, newItem(state, note)] }))
      if (!r.ok) throw new Error(r.reason)
      rev = r.value.revision
      return r.value
    }
    add(water, 'Measure the angle')
    const two = add(wave, 'Change the frequency')
    expect(two.items.map((i) => i.note)).toEqual(['Measure the angle', 'Change the frequency'])
    const moved = updateCollection(s, c.value.id, rev, (x) => moveItem(x, two.items[1].id, -1))
    expect(moved.ok && moved.value.items.map((i) => i.subject)).toEqual(['physics', 'chemistry'])
    if (!moved.ok) return
    rev = moved.value.revision
    // Reload from storage.
    const read = readCollections(s)
    expect(read.ok && read.collections[0].items.map((i) => i.subject)).toEqual(['physics', 'chemistry'])
    const dup = updateCollection(s, c.value.id, rev, (x) => duplicateItem(x, x.items[0].id))
    expect(dup.ok && dup.value.items.length).toBe(3)
    if (!dup.ok) return
    expect(new Set(dup.value.items.map((i) => i.id)).size).toBe(3)
    const noted = updateCollection(s, c.value.id, dup.value.revision, (x) => setItemNote(x, x.items[2].id, 'Why bent?'))
    expect(noted.ok && noted.value.items[2].note).toBe('Why bent?')
    if (!noted.ok) return
    const removed = updateCollection(s, c.value.id, noted.value.revision, (x) => removeItem(x, x.items[1].id))
    expect(removed.ok && removed.value.items.length).toBe(2)
    // Moving past either end is refused, not wrapped.
    if (!removed.ok) return
    expect(updateCollection(s, c.value.id, removed.value.revision, (x) => moveItem(x, x.items[0].id, -1))).toEqual({ ok: false, reason: 'invalid' })
  })

  it('refuses a write based on an older revision (another tab changed it), keeping the newer edit', () => {
    const s = memory()
    const c = createCollection(s, 'Tabs')
    if (!c.ok) throw new Error()
    const tabA = c.value.revision
    const tabB = updateCollection(s, c.value.id, tabA, (x) => ({ ...x, title: 'Renamed in tab B' }))
    expect(tabB.ok).toBe(true)
    const stale = updateCollection(s, c.value.id, tabA, (x) => ({ ...x, title: 'Old tab A edit' }))
    expect(stale).toEqual({ ok: false, reason: 'conflict' })
    const read = readCollections(s)
    expect(read.ok && read.collections[0].title).toBe('Renamed in tab B')
    expect(deleteCollection(s, c.value.id, tabA)).toEqual({ ok: false, reason: 'conflict' })
  })

  it('duplicates a whole collection with new ids, and respects the limit', () => {
    const s = memory()
    const c = addCollection(s, { title: 'Original', description: '', items: [{ ...water, title: 'Water', note: 'n' }] })
    if (!c.ok) throw new Error()
    const d = duplicateCollection(s, c.value.id)
    expect(d.ok && d.value.title).toBe('Original (copy)')
    expect(d.ok && d.value.items[0].id).not.toBe(c.value.items[0].id)
    for (let i = 0; i < MAX_COLLECTIONS - 2; i++) createCollection(s, `c${i}`)
    expect(createCollection(s, 'one too many')).toEqual({ ok: false, reason: 'limit' })
  })

  it('reports quota and write failures and leaves data unchanged; never overwrites unreadable data', () => {
    expect(createCollection(memory('quota'), 'x')).toEqual({ ok: false, reason: 'quota' })
    expect(createCollection(memory('other'), 'x')).toEqual({ ok: false, reason: 'write-failed' })
    const s = memory()
    s.data.set(COLLECTIONS_KEY, '{not json')
    expect(createCollection(s, 'x')).toEqual({ ok: false, reason: 'unreadable' })
    expect(s.data.get(COLLECTIONS_KEY)).toBe('{not json')
    expect(createCollection(null, 'x')).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('keeps items whose settings no longer validate, marked as broken (no link)', () => {
    const s = memory()
    const c = addCollection(s, { title: 'Old', description: '', items: [{ subject: 'chemistry', params: { molecule: 'unobtainium' }, title: 'Gone', note: '' }, { ...water, title: 'Water', note: '' }] })
    if (!c.ok) throw new Error()
    expect(itemHref(c.value.items[0])).toBeNull()
    expect(itemHref(c.value.items[1])).toBe('?molecule=water&view=ball-and-stick#/chemistry')
  })

  it('does not touch saved explorations or other keys', () => {
    const s = memory()
    s.data.set(SAVED_KEY, '[1,2,3]')
    createCollection(s, 'x')
    expect(s.data.get(SAVED_KEY)).toBe('[1,2,3]')
  })
})

describe('collections export and import', () => {
  it('round-trips order and content, as new collections', () => {
    const a = memory()
    const c = addCollection(a, { title: 'Path', description: 'Desc', items: [{ ...wave, title: 'Wave', note: 'First' }, { ...water, title: 'Water', note: 'Second' }] })
    if (!c.ok) throw new Error()
    const file = JSON.stringify(buildCollectionsFile([c.value]))
    const b = memory()
    const plan = planCollectionsImport(file, [])
    expect(plan.ok && plan.candidates[0]).toMatchObject({ title: 'Path', description: 'Desc', duplicateOf: null, brokenItems: 0 })
    if (!plan.ok) return
    expect(applyCollectionsImport(b, plan.candidates, false)).toEqual({ ok: true, value: { added: 1, skipped: 0 } })
    const read = readCollections(b)
    expect(read.ok && read.collections[0].items.map((i) => [i.title, i.note])).toEqual([
      ['Wave', 'First'],
      ['Water', 'Second'],
    ])
  })

  it('detects duplicates, skips them by default and never replaces existing collections', () => {
    const s = memory()
    const c = addCollection(s, { title: 'Path', description: '', items: [{ ...water, title: 'Water', note: 'mine' }] })
    if (!c.ok) throw new Error()
    const file = JSON.stringify(buildCollectionsFile([{ ...c.value, items: [{ ...c.value.items[0], note: 'theirs' }] }]))
    const plan = planCollectionsImport(file, [c.value])
    expect(plan.ok && plan.candidates[0].duplicateOf).toBe('Path')
    if (!plan.ok) return
    expect(applyCollectionsImport(s, plan.candidates, false)).toEqual({ ok: true, value: { added: 0, skipped: 1 } })
    expect(applyCollectionsImport(s, plan.candidates, true)).toEqual({ ok: true, value: { added: 1, skipped: 0 } })
    const read = readCollections(s)
    expect(read.ok && read.collections.map((x) => [x.title, x.items[0].note])).toEqual([
      ['Path', 'mine'],
      ['Path (imported)', 'theirs'],
    ])
  })

  it('rejects other files clearly and counts broken items', () => {
    expect(planCollectionsImport('nope', [])).toEqual({ ok: false, error: 'not-json' })
    expect(planCollectionsImport('{"format":"stem-explorer.saved-explorations","version":1}', [])).toEqual({ ok: false, error: 'wrong-format' })
    expect(planCollectionsImport('{"format":"stem-explorer.collections","version":2,"collections":[]}', [])).toEqual({ ok: false, error: 'unsupported-version' })
    expect(planCollectionsImport('{"format":"stem-explorer.collections","version":1,"collections":[]}', [])).toEqual({ ok: false, error: 'empty' })
    expect(planCollectionsImport('x'.repeat(1_000_001), [])).toEqual({ ok: false, error: 'too-large' })
    const plan = planCollectionsImport(JSON.stringify({ format: 'stem-explorer.collections', version: 1, collections: [{ title: 'T', items: [{ subject: 'chemistry', params: { molecule: 'zzz' }, title: 'x', note: '' }] }, 'junk'] }), [])
    expect(plan.ok && plan.candidates[0].brokenItems).toBe(1)
    expect(plan.ok && plan.skippedInvalid).toBe(1)
  })

  it('reports a quota failure on import without changing anything', () => {
    const plan = planCollectionsImport(JSON.stringify({ format: 'stem-explorer.collections', version: 1, collections: [{ title: 'T', items: [] }] }), [])
    if (!plan.ok) throw new Error()
    expect(applyCollectionsImport(memory('quota'), plan.candidates, false)).toEqual({ ok: false, reason: 'quota' })
  })
})

describe('stateFromLink', () => {
  it('reads full and relative exploration links, and rejects others', () => {
    expect(stateFromLink('https://stem-explorer-nine.vercel.app/?molecule=water&view=ball-and-stick#/chemistry')).toEqual({ subject: 'chemistry', params: { molecule: 'water', view: 'ball-and-stick' } })
    expect(stateFromLink('  ?bsec=meiosis#/biology ')?.params.bsec).toBe('meiosis')
    expect(stateFromLink('#/physics')?.subject).toBe('physics')
    expect(stateFromLink('https://example.com/')).toBeNull()
    expect(stateFromLink('#/notebook')).toBeNull()
    expect(stateFromLink('?molecule=unobtainium#/chemistry')).toBeNull()
  })
})
