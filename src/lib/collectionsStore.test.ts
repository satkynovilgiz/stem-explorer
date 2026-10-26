import { describe, expect, it } from 'vitest'
import {
  addCollection,
  applyCollectionsImport,
  buildCollectionsFile,
  collectionsFileText,
  COLLECTIONS_KEY,
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
  MAX_PARAM_KEYS,
  MAX_PARAMS_BYTES,
  moveItem,
  newItem,
  planCollectionsImport,
  readCollections,
  removeItem,
  saveDetailsDraft,
  saveNoteDraft,
  setItemNote,
  startDetailsDraft,
  startNoteDraft,
  stateFromLink,
  updateCollection,
  utf8Bytes,
  type Collection,
} from './collectionsStore'
import { cleanTitle, MAX_TITLE_LENGTH, SAVED_KEY } from './explorationStore'
import { canonicalize, type ShareState } from './explorations'

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
    expect(applyCollectionsImport(b, plan.candidates, false)).toEqual({ ok: true, value: { added: 1, skipped: 0, refused: 0 } })
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
    expect(applyCollectionsImport(s, plan.candidates, false)).toEqual({ ok: true, value: { added: 0, skipped: 1, refused: 0 } })
    expect(applyCollectionsImport(s, plan.candidates, true)).toEqual({ ok: true, value: { added: 1, skipped: 0, refused: 0 } })
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
    expect(planCollectionsImport('x'.repeat(MAX_IMPORT_BYTES + 1), [])).toEqual({ ok: false, error: 'too-large' })
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

const FILE = 'stem-explorer.collections'
const now = new Date('2026-10-26T10:00:00.000Z')

/** The largest content the app lets anyone save: every limit reached, in the most bytes per character. */
function largestCollections(char: string): Collection[] {
  const fill = (n: number) => char.repeat(Math.floor(n / char.length))
  // Settings at both limits at once: MAX_PARAM_KEYS keys, the JSON at MAX_PARAMS_BYTES.
  const params: Record<string, string> = {}
  for (let k = 0; k < MAX_PARAM_KEYS; k++) params[`key${String(k).padStart(2, '0')}`] = ''
  const room = MAX_PARAMS_BYTES - utf8Bytes(JSON.stringify(params))
  for (let k = 0; k < MAX_PARAM_KEYS; k++) params[`key${String(k).padStart(2, '0')}`] = 'v'.repeat(Math.floor(room / MAX_PARAM_KEYS))
  return Array.from({ length: MAX_COLLECTIONS }, (_, c) => ({
    id: `c${c}`,
    title: fill(MAX_TITLE_LENGTH),
    description: fill(MAX_DESCRIPTION),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    revision: 1,
    items: Array.from({ length: MAX_ITEMS }, (_, i) => ({ id: `i${c}-${i}`, subject: 'physics' as const, params, title: fill(MAX_TITLE_LENGTH), note: fill(MAX_NOTE) })),
  }))
}

describe('collection file sizes', () => {
  it('measures UTF-8 bytes, not string length', () => {
    expect(utf8Bytes('abc')).toBe(3)
    expect(utf8Bytes('語')).toBe(3)
    expect(utf8Bytes('😀')).toBe(4)
    // 1.7 million CJK characters: under the limit as a string length, over it in bytes, so refused.
    const cjk = '語'.repeat(1_700_000)
    expect(cjk.length).toBeLessThan(MAX_IMPORT_BYTES)
    expect(planCollectionsImport(cjk, [])).toEqual({ ok: false, error: 'too-large' })
  })

  it.each([
    ['3-byte characters', '語'],
    ['4-byte emoji (surrogate pairs)', '😀'],
    ['quotes and backslashes (escaped in JSON)', '"\\'],
  ])('the largest possible export, in %s, is under the import limit and imports back without loss', (_, char) => {
    const all = largestCollections(char)
    const file = collectionsFileText(all, now)
    if (!file.ok) throw new Error(`export too large: ${file.bytes}`)
    expect(file.bytes).toBeLessThanOrEqual(MAX_IMPORT_BYTES)
    const plan = planCollectionsImport(file.text, [])
    if (!plan.ok) throw new Error(plan.error)
    expect(plan.candidates.flatMap((c) => c.problems)).toEqual([])
    const s = memory()
    expect(applyCollectionsImport(s, plan.candidates, false, now)).toEqual({ ok: true, value: { added: MAX_COLLECTIONS, skipped: 0, refused: 0 } })
    const read = readCollections(s)
    if (!read.ok) throw new Error()
    expect(read.collections.map((c) => [c.title, c.description, c.items.map((i) => [i.title, i.note, i.params])])).toEqual(all.map((c) => [c.title, c.description, c.items.map((i) => [i.title, i.note, i.params])]))
  })

  it('every valid explorer link fits the per-item settings limit (largest: 100 typed statistics values)', () => {
    const value = '-0.000000123456789012'
    const state = canonicalize('mathematics', { msec: 'statistics', sv: 'describe', ds: 'custom', data: Array(100).fill(value).join(',') })
    expect(state?.params.data?.split(',')).toHaveLength(100)
    const item = newItem(state!, '')
    expect(Object.keys(item.params).length).toBeLessThanOrEqual(MAX_PARAM_KEYS)
    expect(utf8Bytes(JSON.stringify(item.params))).toBeLessThanOrEqual(MAX_PARAMS_BYTES)
  })

  it('refuses over-limit collections in a file with a reason instead of shortening them, and imports the rest', () => {
    const ok = { title: 'Fine', description: '', items: [{ ...water, title: 'Water', note: 'kept' }] }
    const file = JSON.stringify({
      format: FILE,
      version: 1,
      collections: [
        ok,
        { title: 'Long note', items: [{ ...water, title: 'W', note: 'n'.repeat(MAX_NOTE + 1) }] },
        { title: 'Too many', items: Array(MAX_ITEMS + 1).fill({ ...water, title: 'W', note: '' }) },
        { title: 'T'.repeat(MAX_TITLE_LENGTH + 1), items: [] },
        { title: 'Big settings', items: [{ subject: 'physics', params: { x: 'v'.repeat(MAX_PARAMS_BYTES) }, title: 'P', note: '' }] },
        { title: 'Has junk', items: [{ ...water, title: 'W', note: '' }, 42, null] },
      ],
    })
    const plan = planCollectionsImport(file, [])
    if (!plan.ok) throw new Error()
    expect(plan.candidates.map((c) => c.problems.length > 0)).toEqual([false, true, true, true, true, false])
    expect(plan.candidates[1].problems.join()).toContain('1 note is longer than 500 characters')
    expect(plan.candidates[2].problems.join()).toContain('31 items (the limit is 30)')
    expect(plan.candidates[5].unreadableItems).toBe(2)
    const s = memory()
    expect(applyCollectionsImport(s, plan.candidates, false, now)).toEqual({ ok: true, value: { added: 2, skipped: 0, refused: 4 } })
    const read = readCollections(s)
    expect(read.ok && read.collections.map((c) => c.title)).toEqual(['Fine', 'Has junk'])
  })

  it('a malformed file, or a failed write, leaves the stored collections exactly as they were', () => {
    const s = memory()
    addCollection(s, { title: 'Mine', description: '', items: [] }, now)
    const before = s.data.get(COLLECTIONS_KEY)
    for (const bad of ['{', '[]', 'null', '{"format":"stem-explorer.collections","version":1,"collections":"x"}']) expect(planCollectionsImport(bad, []).ok).toBe(false)
    const plan = planCollectionsImport(JSON.stringify({ format: FILE, version: 1, collections: [{ title: 'New', items: [] }] }), [])
    if (!plan.ok) throw new Error()
    const failing = { ...s, setItem: () => { throw new DOMException('full', 'QuotaExceededError') } }
    expect(applyCollectionsImport(failing, plan.candidates, false)).toEqual({ ok: false, reason: 'quota' })
    expect(s.data.get(COLLECTIONS_KEY)).toBe(before)
  })

  it('never splits a character or writes an unpaired surrogate', () => {
    expect(cleanTitle('a'.repeat(79) + '😀', 'x')).toBe('a'.repeat(79))
    const s = memory()
    const c = addCollection(s, { title: 'Bad \uD800 title', description: '\uDC00', items: [{ ...water, title: 'W', note: 'x\uD83D' }] })
    if (!c.ok) throw new Error()
    expect(c.value.title).toBe('Bad \uFFFD title')
    expect(c.value.items[0].note).toBe('x\uFFFD')
    expect(s.data.get(COLLECTIONS_KEY)).not.toMatch(/\\ud[89a-f]/i)
  })

  it('reading never shortens stored data: an over-long collection keeps every item and note, can shrink but not grow', () => {
    const s = memory()
    const items = Array.from({ length: MAX_ITEMS + 2 }, (_, i) => ({ id: `i${i}`, ...water, title: `W${i}`, note: 'n'.repeat(MAX_NOTE + 10) }))
    s.data.set(COLLECTIONS_KEY, JSON.stringify({ version: 1, collections: [{ id: 'c', title: 'Old', description: '', createdAt: now.toISOString(), updatedAt: now.toISOString(), revision: 3, items }] }))
    const read = readCollections(s)
    if (!read.ok) throw new Error()
    expect(read.collections[0].items).toHaveLength(MAX_ITEMS + 2)
    expect(read.collections[0].items[0].note).toHaveLength(MAX_NOTE + 10)
    expect(updateCollection(s, 'c', 3, (c) => duplicateItem(c, 'i0')).ok).toBe(false)
    expect(updateCollection(s, 'c', 3, (c) => removeItem(c, 'i0')).ok).toBe(true)
  })
})

describe('drafts across tabs', () => {
  function setup() {
    const s = memory()
    const c = addCollection(s, { title: 'Path', description: 'Original', items: [{ ...water, title: 'Water', note: 'first note' }] }, now)
    if (!c.ok) throw new Error()
    return { s, c: c.value }
  }
  const latest = (s: ReturnType<typeof memory>) => {
    const r = readCollections(s)
    if (!r.ok) throw new Error()
    return r.collections[0]
  }

  it('an older title draft never overwrites a newer save; the draft is kept and can replace it on request', () => {
    const { s, c } = setup()
    const draftA = { ...startDetailsDraft(c), title: 'Title from A' }
    // Tab B saves first.
    expect(saveDetailsDraft(s, c.id, { ...startDetailsDraft(c), title: 'Title from B' }).ok).toBe(true)
    expect(saveDetailsDraft(s, c.id, draftA)).toEqual({ ok: false, reason: 'conflict' })
    expect(latest(s).title).toBe('Title from B')
    expect(draftA.title).toBe('Title from A')
    // The person chooses to replace B's version.
    const r = saveDetailsDraft(s, c.id, draftA, true)
    expect(r.ok && r.value.title).toBe('Title from A')
  })

  it('a title draft saves over unrelated changes made meanwhile and keeps them', () => {
    const { s, c } = setup()
    const draft = { ...startDetailsDraft(c), title: 'Renamed' }
    updateCollection(s, c.id, c.revision, (x) => setItemNote(x, x.items[0].id, 'note from B'))
    const r = saveDetailsDraft(s, c.id, draft)
    expect(r.ok && [r.value.title, r.value.description, r.value.items[0].note]).toEqual(['Renamed', 'Original', 'note from B'])
  })

  it('note drafts: conflict when the note changed, item removed, collection deleted, storage full', () => {
    const { s, c } = setup()
    const item = c.items[0]
    const draft = { ...startNoteDraft(c, item), note: 'note from A' }
    updateCollection(s, c.id, c.revision, (x) => setItemNote(x, item.id, 'note from B'))
    expect(saveNoteDraft(s, c.id, item.id, draft)).toEqual({ ok: false, reason: 'conflict' })
    expect(latest(s).items[0].note).toBe('note from B')
    const before = s.data.get(COLLECTIONS_KEY)
    const full = { ...s, setItem: () => { throw new DOMException('full', 'QuotaExceededError') } }
    expect(saveNoteDraft(full, c.id, item.id, draft, true)).toEqual({ ok: false, reason: 'quota' })
    expect(s.data.get(COLLECTIONS_KEY)).toBe(before)
    const r = saveNoteDraft(s, c.id, item.id, draft, true)
    expect(r.ok && r.value.items[0].note).toBe('note from A')
    const now2 = latest(s)
    updateCollection(s, c.id, now2.revision, (x) => removeItem(x, item.id))
    expect(saveNoteDraft(s, c.id, item.id, draft, true)).toEqual({ ok: false, reason: 'item-not-found' })
    deleteCollection(s, c.id, latest(s).revision)
    expect(saveNoteDraft(s, c.id, item.id, draft, true)).toEqual({ ok: false, reason: 'not-found' })
    expect(saveDetailsDraft(s, c.id, startDetailsDraft(c), true)).toEqual({ ok: false, reason: 'not-found' })
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
