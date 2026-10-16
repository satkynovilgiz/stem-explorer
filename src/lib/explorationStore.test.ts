import { describe, expect, it } from 'vitest'
import { canonicalize, canonicalKey, defaultTitle, hrefFor } from './explorations'
import {
  clearRecent,
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
