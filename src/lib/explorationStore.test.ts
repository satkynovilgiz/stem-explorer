import { describe, expect, it } from 'vitest'
import { canonicalize, canonicalKey, defaultTitle, hrefFor } from './explorations'
import {
  clearRecent,
  loadList,
  MAX_RECENT,
  MAX_SAVED,
  parseEntry,
  readRecent,
  readSaved,
  RECENT_KEY,
  recordVisit,
  removeExploration,
  renameExploration,
  SAVED_KEY,
  saveExploration,
  type KeyValueStore,
} from './explorationStore'
import { isLibraryStorageEvent } from './useExplorationLibrary'

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

describe('canonicalize', () => {
  it('validates through each subject’s URL rules and fills defaults', () => {
    expect(canonicalize('chemistry', { molecule: 'benzene' })).toEqual({ subject: 'chemistry', params: { molecule: 'benzene', view: 'ball-and-stick' } })
    expect(canonicalize('anatomy', { part: 'aorta' })).toEqual({ subject: 'anatomy', params: { part: 'aorta', heart: 'whole' } })
    expect(canonicalize('physics', { gravity: '9.806' })?.params.gravity).toBe('9.81')
    expect(canonicalize('physics', { experiment: 'spring', mass: '2', x0: '0.234' })).toEqual({
      subject: 'physics',
      params: { experiment: 'spring', mass: '2', k: '20', x0: '0.23' },
    })
    expect(canonicalize('physics', { experiment: 'spring', k: '-1' })).toBeNull()
    expect(canonicalize('physics', { experiment: 'pendulum' })).toBeNull()
  })

  it('rejects unknown subjects, invalid values and non-string values', () => {
    expect(canonicalize('astronomy', {})).toBeNull()
    expect(canonicalize('chemistry', { molecule: 'gold' })).toBeNull()
    expect(canonicalize('mathematics', { surface: 'sine', amp: '99' })).toBeNull()
    expect(canonicalize('biology', { structure: 1 as unknown as string })).toBeNull()
    expect(canonicalize('chemistry', null as unknown as Record<string, string>)).toBeNull()
  })

  it('gives equal keys to equivalent states regardless of parameter order', () => {
    const a = canonicalize('physics', { speed: '20', angle: '45' })!
    const b = canonicalize('physics', { angle: '45', speed: '20', height: '0', gravity: '9.81' })!
    expect(canonicalKey(a)).toBe(canonicalKey(b))
  })

  it('builds relative links only, and readable titles', () => {
    expect(hrefFor(water)).toBe('?molecule=water&view=ball-and-stick#/chemistry')
    expect(defaultTitle(water)).toBe('Water · ball and stick')
    expect(defaultTitle(canonicalize('mathematics', { surface: 'saddle', slice: 'x', at: '1' })!)).toBe('Saddle (hyperbolic paraboloid) · slice x = 1')
  })
})

describe('saved explorations', () => {
  it('saves, renames and removes, persisting across reads', () => {
    const store = memoryStore()
    const saved = saveExploration(store, water, '  My   water  ')
    expect(saved.ok).toBe(true)
    if (!saved.ok) return
    expect(saved.value.title).toBe('My water')
    expect(readSaved(store)).toHaveLength(1)
    expect(renameExploration(store, saved.value.id, 'Bent molecule').ok).toBe(true)
    expect(readSaved(store)[0].title).toBe('Bent molecule')
    expect(removeExploration(store, saved.value.id).ok).toBe(true)
    expect(readSaved(store)).toEqual([])
  })

  it('does not store the same canonical state twice', () => {
    const store = memoryStore()
    saveExploration(store, water, 'First')
    const again = saveExploration(store, { subject: 'chemistry', params: { view: 'ball-and-stick', molecule: 'water' } }, 'Second')
    expect(again).toMatchObject({ ok: false, reason: 'duplicate' })
    expect(again.ok === false && again.existing?.title).toBe('First')
    expect(readSaved(store)).toHaveLength(1)
  })

  it('uses a default title for empty names and strips control characters', () => {
    const store = memoryStore()
    const r = saveExploration(store, water, '\u0007 \n ')
    expect(r.ok && r.value.title).toBe('Water · ball and stick')
  })

  it('enforces the storage limit with a clear reason', () => {
    const store = memoryStore()
    for (let speed = 1; speed <= MAX_SAVED; speed++) {
      expect(saveExploration(store, { subject: 'physics', params: { speed: String(speed) } }, `Launch ${speed}`).ok).toBe(true)
    }
    expect(readSaved(store)).toHaveLength(MAX_SAVED)
    expect(saveExploration(store, { subject: 'physics', params: { speed: '49' } }, 'one more')).toMatchObject({ ok: false, reason: 'limit' })
  })

  it('reports unavailable storage and quota errors instead of throwing', () => {
    expect(saveExploration(null, water, 'x')).toMatchObject({ ok: false, reason: 'unavailable' })
    const full = memoryStore()
    full.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    expect(saveExploration(full, water, 'x')).toMatchObject({ ok: false, reason: 'quota' })
  })
})

describe('reading stored data defensively', () => {
  const good = {
    id: 'abc123-1',
    version: 1,
    subject: 'anatomy',
    params: { part: 'mitral-valve', heart: 'cutaway' },
    title: 'Mitral',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  }

  it('ignores malformed JSON, non-arrays and throwing storage', () => {
    expect(readSaved(memoryStore({ [SAVED_KEY]: '{not json' }))).toEqual([])
    expect(readSaved(memoryStore({ [SAVED_KEY]: '{"a":1}' }))).toEqual([])
    const broken = memoryStore()
    broken.getItem = () => {
      throw new Error('SecurityError')
    }
    expect(readSaved(broken)).toEqual([])
  })

  it('drops outdated versions, bad IDs, invalid routes and absolute URLs, keeping valid entries', () => {
    const entries = [
      good,
      { ...good, id: 'old000-1', version: 0 },
      { ...good, id: 'BAD ID <script>' },
      { ...good, id: 'route0-1', subject: 'javascript:alert(1)' },
      { ...good, id: 'route1-1', params: { part: 'spleen' } },
      { ...good, id: 'abs000-1', params: { part: 'aorta', href: 'https://evil.example' } },
      { ...good, id: 'date00-1', createdAt: 'yesterday' },
    ]
    const list = readSaved(memoryStore({ [SAVED_KEY]: JSON.stringify(entries) }))
    expect(list.map((e) => e.id)).toEqual(['abc123-1', 'abs000-1'])
    // Unknown keys are dropped by canonicalization; nothing absolute survives.
    expect(list[1].params).toEqual({ part: 'aorta', heart: 'whole' })
    expect(parseEntry(good)?.title).toBe('Mitral')
  })
})

describe('recent explorations', () => {
  it('keeps the newest first, deduplicates and caps the list', () => {
    const store = memoryStore()
    for (const m of ['water', 'methane', 'water']) recordVisit(store, { subject: 'chemistry', params: { molecule: m } })
    expect(readRecent(store).map((e) => e.params.molecule)).toEqual(['water', 'methane'])
    for (let s = 1; s <= 10; s++) recordVisit(store, { subject: 'physics', params: { speed: String(s) } })
    expect(readRecent(store)).toHaveLength(MAX_RECENT)
    expect(readRecent(store)[0].params.speed).toBe('10')
  })

  it('stays separate from saved entries and can be cleared', () => {
    const store = memoryStore()
    saveExploration(store, water, 'Saved')
    recordVisit(store, water)
    expect(clearRecent(store).ok).toBe(true)
    expect(store.data[RECENT_KEY]).toBeUndefined()
    expect(readSaved(store)).toHaveLength(1)
  })

  it('ignores invalid states', () => {
    expect(recordVisit(memoryStore(), { subject: 'chemistry', params: { molecule: 'gold' } })).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('storage reliability', () => {
  const quota = () => {
    throw new DOMException('full', 'QuotaExceededError')
  }

  it('tells a failed read apart from an empty list', () => {
    expect(loadList(null, SAVED_KEY)).toEqual({ ok: false, reason: 'unavailable' })
    expect(loadList(memoryStore(), SAVED_KEY)).toEqual({ ok: true, entries: [], preserved: [] })
    expect(loadList(memoryStore({ [SAVED_KEY]: '{not json' }), SAVED_KEY)).toEqual({ ok: false, reason: 'unreadable' })
    const blocked = memoryStore()
    blocked.getItem = () => {
      throw new Error('SecurityError')
    }
    expect(loadList(blocked, SAVED_KEY)).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('never overwrites a saved list it could not read', () => {
    const store = memoryStore({ [SAVED_KEY]: '{damaged' })
    expect(saveExploration(store, water, 'x')).toMatchObject({ ok: false, reason: 'unreadable' })
    expect(removeExploration(store, 'abc123-1')).toMatchObject({ ok: false, reason: 'unreadable' })
    expect(store.data[SAVED_KEY]).toBe('{damaged')

    const blocked = memoryStore()
    saveExploration(blocked, water, 'Kept')
    const before = blocked.data[SAVED_KEY]
    blocked.getItem = () => {
      throw new Error('SecurityError')
    }
    expect(saveExploration(blocked, { subject: 'chemistry', params: { molecule: 'methane' } }, 'y')).toMatchObject({ ok: false, reason: 'unavailable' })
    expect(blocked.data[SAVED_KEY]).toBe(before)
  })

  it('keeps entries readable when writes fail, and reports quota without changing data', () => {
    const store = memoryStore()
    saveExploration(store, water, 'Kept')
    const before = store.data[SAVED_KEY]
    store.setItem = quota
    expect(saveExploration(store, { subject: 'chemistry', params: { molecule: 'methane' } }, 'y')).toMatchObject({ ok: false, reason: 'quota' })
    const id = readSaved(store)[0].id
    expect(renameExploration(store, id, 'New')).toMatchObject({ ok: false, reason: 'quota' })
    expect(store.data[SAVED_KEY]).toBe(before)
    expect(readSaved(store).map((e) => e.title)).toEqual(['Kept'])
  })

  it('can still remove the last entry when storage is full (removal needs no space)', () => {
    const store = memoryStore()
    saveExploration(store, water, 'Only')
    store.setItem = quota
    expect(removeExploration(store, readSaved(store)[0].id).ok).toBe(true)
    expect(store.data[SAVED_KEY]).toBeUndefined()
  })

  it('reports other write refusals distinctly', () => {
    const store = memoryStore()
    store.setItem = () => {
      throw new Error('SecurityError')
    }
    expect(saveExploration(store, water, 'x')).toMatchObject({ ok: false, reason: 'write-failed' })
  })

  it('preserves entries from newer schema versions when writing', () => {
    const future = { id: 'future-1', version: 2, subject: 'chemistry', params: { molecule: 'water' }, title: 'From v2', extra: [1, 2] }
    const store = memoryStore({ [SAVED_KEY]: JSON.stringify([future]) })
    expect(readSaved(store)).toEqual([])
    expect(saveExploration(store, water, 'Now').ok).toBe(true)
    const raw = JSON.parse(store.data[SAVED_KEY]) as unknown[]
    expect(raw).toHaveLength(2)
    expect(raw[1]).toEqual(future)
  })

  it('reports a failed history clear and keeps the entries', () => {
    const store = memoryStore()
    recordVisit(store, water)
    store.removeItem = () => {
      throw new Error('SecurityError')
    }
    expect(clearRecent(store)).toMatchObject({ ok: false, reason: 'write-failed' })
    expect(readRecent(store)).toHaveLength(1)
    expect(clearRecent(null)).toMatchObject({ ok: false, reason: 'unavailable' })
  })

  it('replaces a damaged history list, but never writes when storage is blocked', () => {
    const store = memoryStore({ [RECENT_KEY]: 'garbage' })
    expect(recordVisit(store, water).ok).toBe(true)
    expect(readRecent(store)).toHaveLength(1)
    const blocked = memoryStore()
    let writes = 0
    blocked.getItem = () => {
      throw new Error('SecurityError')
    }
    blocked.setItem = () => {
      writes++
    }
    expect(recordVisit(blocked, water)).toMatchObject({ ok: false, reason: 'unavailable' })
    expect(writes).toBe(0)
  })

  it('only library keys (or clear()) on localStorage count as library storage events', () => {
    const local = {} as Storage
    const session = {} as Storage
    expect(isLibraryStorageEvent({ key: SAVED_KEY, storageArea: local }, local)).toBe(true)
    expect(isLibraryStorageEvent({ key: RECENT_KEY, storageArea: local }, local)).toBe(true)
    expect(isLibraryStorageEvent({ key: null, storageArea: local }, local)).toBe(true)
    expect(isLibraryStorageEvent({ key: 'other-app', storageArea: local }, local)).toBe(false)
    expect(isLibraryStorageEvent({ key: '__stem-explorer-probe__', storageArea: local }, local)).toBe(false)
    expect(isLibraryStorageEvent({ key: SAVED_KEY, storageArea: session }, local)).toBe(false)
  })
})

describe('anatomy: atlas and heart modules share the subject', () => {
  it('older heart states keep their canonical form; atlas states have their own keys', () => {
    expect(canonicalize('anatomy', { part: 'mitral-valve', heart: 'cutaway' })).toEqual({ subject: 'anatomy', params: { part: 'mitral-valve', heart: 'cutaway' } })
    expect(canonicalize('anatomy', { heart: 'whole' })).toEqual({ subject: 'anatomy', params: { heart: 'whole' } })
    expect(canonicalize('anatomy', {})).toEqual({ subject: 'anatomy', params: { bview: 'front' } })
    expect(canonicalize('anatomy', { atlas: 'liver', bview: 'back' })).toEqual({ subject: 'anatomy', params: { atlas: 'liver', bview: 'back' } })
    expect(canonicalize('anatomy', { atlas: 'not-a-structure' })).toBeNull()
    expect(canonicalize('anatomy', { atlas: 'uterus', bview: 'front' })).toBeNull() // reproductive needs its layer and variant
  })

  it('titles and links say which module they open', () => {
    expect(defaultTitle({ subject: 'anatomy', params: { atlas: 'kidney-left', bview: 'side' } })).toBe('Body atlas · Left kidney · side view')
    expect(defaultTitle({ subject: 'anatomy', params: { part: 'aorta', heart: 'whole' } })).toMatch(/Aorta/)
    expect(hrefFor({ subject: 'anatomy', params: { atlas: 'liver', bview: 'front' } })).toBe('?atlas=liver&bview=front#/anatomy')
  })
})
