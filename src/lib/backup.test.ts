import { describe, expect, it } from 'vitest'
import { applyImport, BACKUP_FORMAT, backupFileName, buildBackup, MAX_BACKUP_BYTES, planImport } from './backup'
import { MAX_SAVED, readSaved, recordVisit, SAVED_KEY, saveExploration, type KeyValueStore } from './explorationStore'

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {}
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

const now = new Date('2026-10-15T12:00:00.000Z')
const water = { subject: 'chemistry' as const, params: { molecule: 'water', view: 'ball-and-stick' } }
const golgi = { subject: 'biology' as const, params: { structure: 'golgi', cell: 'cutaway' } }

function file(entries: unknown[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), entries, ...extra })
}

describe('export', () => {
  it('writes saved entries only, with format, version, timestamp and relative state', () => {
    const store = memoryStore()
    saveExploration(store, water, 'My water')
    saveExploration(store, golgi, 'Golgi')
    recordVisit(store, { subject: 'physics', params: { speed: '30' } })
    const backup = buildBackup(readSaved(store), now)
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe('2026-10-15T12:00:00.000Z')
    expect(backup.entries.map((e) => e.title)).toEqual(['Golgi', 'My water'])
    const text = JSON.stringify(backup)
    expect(text).not.toContain('http')
    expect(text).not.toContain('physics')
    expect(text).not.toContain('"id"')
    expect(backupFileName(now)).toBe('stem-explorer-saved-2026-10-15.json')
  })
})

describe('planning an import', () => {
  it('round-trips an export into an empty library', () => {
    const source = memoryStore()
    saveExploration(source, water, 'My water')
    saveExploration(source, golgi, 'Golgi')
    const text = JSON.stringify(buildBackup(readSaved(source), now))
    const r = planImport(text, [], now)
    expect(r.ok && r.plan.toImport.map((e) => e.title)).toEqual(['Golgi', 'My water'])

    const target = memoryStore()
    expect(applyImport(target, text, 2, now)).toEqual({ ok: true, value: { imported: 2 } })
    const imported = readSaved(target)
    expect(imported.map((e) => [e.title, e.subject])).toEqual([
      ['Golgi', 'biology'],
      ['My water', 'chemistry'],
    ])
    // Fresh local IDs.
    expect(imported.map((e) => e.id)).not.toEqual(readSaved(source).map((e) => e.id))
  })

  it('rejects oversized, malformed, foreign and unsupported files before reading entries', () => {
    expect(planImport('x'.repeat(MAX_BACKUP_BYTES + 1), [])).toEqual({ ok: false, error: { kind: 'too-large' } })
    expect(planImport('{not json', [])).toEqual({ ok: false, error: { kind: 'not-json' } })
    expect(planImport('[]', [])).toEqual({ ok: false, error: { kind: 'wrong-format' } })
    expect(planImport(JSON.stringify({ format: 'other', version: 1, entries: [] }), [])).toEqual({ ok: false, error: { kind: 'wrong-format' } })
    expect(planImport(file([], { version: 2 }), [])).toEqual({ ok: false, error: { kind: 'unsupported-version', version: '2' } })
    expect(planImport(file([], { entries: 'nope' }), [])).toEqual({ ok: false, error: { kind: 'wrong-format' } })
  })

  it('sorts mixed entries into new, duplicates and invalid, keeping existing titles', () => {
    const store = memoryStore()
    saveExploration(store, water, 'Kept title')
    const text = file([
      { title: 'Imported water', subject: 'chemistry', params: { molecule: 'water' } },
      { title: 'Golgi', ...golgi },
      { title: 'Golgi again', subject: 'biology', params: { cell: 'cutaway', structure: 'golgi' } },
      { title: 'Evil', subject: 'javascript:alert(1)', params: {} },
      { title: 'Gold', subject: 'chemistry', params: { molecule: 'gold' } },
      { title: 'Numbers', subject: 'physics', params: { speed: 20 } },
      'not an object',
      { subject: 'anatomy', params: { part: 'aorta' }, url: 'https://evil.example' },
    ])
    const r = planImport(text, readSaved(store), now)
    if (!r.ok) throw new Error('expected a plan')
    expect(r.plan.toImport.map((e) => [e.position, e.title])).toEqual([
      [2, 'Golgi'],
      [8, 'Aorta · whole heart'],
    ])
    expect(r.plan.duplicates).toEqual([
      { position: 1, title: 'Imported water', existingTitle: 'Kept title' },
      { position: 3, title: 'Golgi again', existingTitle: 'Golgi' },
    ])
    expect(r.plan.invalid.map((e) => e.position)).toEqual([4, 5, 6, 7])
    // The URL field is ignored: only subject state is imported.
    expect(JSON.stringify(r.plan.toImport)).not.toContain('evil')

    expect(applyImport(store, text, 2, now).ok).toBe(true)
    expect(readSaved(store).map((e) => e.title)).toEqual(['Kept title', 'Golgi', 'Aorta · whole heart'])
  })

  it('treats titles as plain text', () => {
    const r = planImport(file([{ title: '<img src=x onerror=alert(1)>\u0007  spaced ', ...water }]), [], now)
    expect(r.ok && r.plan.toImport[0].title).toBe('<img src=x onerror=alert(1)> spaced')
  })

  it('stops at the saved-item limit and lists the rest', () => {
    const store = memoryStore()
    for (let s = 1; s <= MAX_SAVED - 1; s++) saveExploration(store, { subject: 'physics', params: { speed: String(s) } }, `Speed ${s}`)
    const text = file([water, golgi, { subject: 'anatomy', params: { part: 'aorta' } }].map((e) => ({ title: 'x', ...e })))
    const r = planImport(text, readSaved(store), now)
    if (!r.ok) throw new Error('expected a plan')
    expect(r.plan.toImport).toHaveLength(1)
    expect(r.plan.overLimit.map((e) => e.position)).toEqual([2, 3])
    expect(applyImport(store, text, 1, now).ok).toBe(true)
    expect(readSaved(store)).toHaveLength(MAX_SAVED)
  })
})

describe('applying an import', () => {
  it('writes once, and leaves saved data unchanged when the write fails', () => {
    const store = memoryStore()
    saveExploration(store, water, 'Existing')
    const before = store.data[SAVED_KEY]
    let writes = 0
    store.setItem = () => {
      writes++
      throw new DOMException('full', 'QuotaExceededError')
    }
    expect(applyImport(store, file([{ title: 'G', ...golgi }]), 1, now)).toMatchObject({ ok: false, reason: 'quota' })
    expect(writes).toBe(1)
    expect(store.data[SAVED_KEY]).toBe(before)
  })

  it('refuses when the library changed since the preview', () => {
    const store = memoryStore()
    const text = file([{ title: 'G', ...golgi }])
    saveExploration(store, golgi, 'Saved in another tab')
    expect(applyImport(store, text, 1, now)).toEqual({ ok: false, reason: 'changed' })
    expect(readSaved(store).map((e) => e.title)).toEqual(['Saved in another tab'])
  })

  it('never overwrites a damaged saved list', () => {
    const store = memoryStore()
    store.data[SAVED_KEY] = '{damaged'
    expect(applyImport(store, file([{ title: 'G', ...golgi }]), 1, now)).toMatchObject({ ok: false, reason: 'unreadable' })
    expect(store.data[SAVED_KEY]).toBe('{damaged')
  })
})
