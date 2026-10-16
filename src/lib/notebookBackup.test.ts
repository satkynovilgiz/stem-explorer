import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, planImport } from './backup'
import type { KeyValueStore } from './explorationStore'
import { applyNotebookImport, buildNotebookBackup, NOTEBOOK_FORMAT, planNotebookImport } from './notebookBackup'
import { addNote, loadNotes, MAX_NOTES, NOTES_KEY } from './notesStore'

function memoryStore(): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] }
}
const water = { subject: 'chemistry' as const, params: { molecule: 'water' } }
const notes = (s: KeyValueStore) => {
  const r = loadNotes(s)
  return r.ok ? r.notes : []
}
const file = (n: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ format: NOTEBOOK_FORMAT, version: 1, exportedAt: 'x', notes: n, ...extra })

describe('notebook backups', () => {
  it('export and import round-trip notes with their explorations', () => {
    const a = memoryStore()
    addNote(a, water, { title: 'Water', body: 'bent' })
    addNote(a, { subject: 'mathematics', params: { surface: 'saddle' } }, { title: 'Saddle', body: 'level at 0' })
    const text = JSON.stringify(buildNotebookBackup(notes(a)))
    expect(text).not.toContain('"id"')
    const b = memoryStore()
    const plan = planNotebookImport(text, [])
    if (!plan.ok) throw new Error('plan failed')
    expect(applyNotebookImport(b, text, plan.plan.toImport)).toEqual({ ok: true, value: { imported: 2 } })
    expect(notes(b).map((n) => [n.title, n.subject])).toEqual([
      ['Saddle', 'mathematics'],
      ['Water', 'chemistry'],
    ])
  })

  it('keeps the two backup formats apart', () => {
    expect(planNotebookImport(JSON.stringify({ format: BACKUP_FORMAT, version: 1, entries: [] }), [])).toEqual({ ok: false, error: { kind: 'saved-explorations-file' } })
    expect(planImport(file([]), [])).toEqual({ ok: false, error: { kind: 'notebook-file' } })
    expect(planNotebookImport(file([], { version: 3 }), [])).toEqual({ ok: false, error: { kind: 'unsupported-version', version: '3' } })
    expect(planNotebookImport('nope', [])).toEqual({ ok: false, error: { kind: 'not-json' } })
  })

  it('skips duplicates and invalid notes, respects the limit, treats text as text', () => {
    const s = memoryStore()
    addNote(s, water, { title: 'Water', body: 'bent' })
    const text = file([
      { title: 'Water', body: 'bent', subject: 'chemistry', params: { molecule: 'water' } },
      { title: '<b>Golgi</b>', body: 'ships\nproteins', subject: 'biology', params: { structure: 'golgi' } },
      { title: 'Bad', body: '', subject: 'astronomy', params: {} },
      { body: 'no title', subject: 'chemistry', params: {} },
    ])
    const r = planNotebookImport(text, notes(s))
    if (!r.ok) throw new Error('plan failed')
    expect(r.plan.toImport.map((n) => n.title)).toEqual(['<b>Golgi</b>'])
    expect(r.plan.duplicates.map((d) => d.position)).toEqual([1])
    expect(r.plan.invalid.map((d) => d.position)).toEqual([3, 4])
    const full = planNotebookImport(text, Array.from({ length: MAX_NOTES }, () => notes(s)[0]))
    expect(full.ok && full.plan.overLimit).toHaveLength(1)
  })

  it('writes nothing when the plan changed since the preview, or when the write fails', () => {
    const s = memoryStore()
    const text = file([{ title: 'Golgi', body: '', subject: 'biology', params: { structure: 'golgi' } }])
    const preview = planNotebookImport(text, [])
    if (!preview.ok) throw new Error('plan failed')
    addNote(s, { subject: 'biology', params: { structure: 'golgi' } }, { title: 'Golgi', body: '' })
    expect(applyNotebookImport(s, text, preview.plan.toImport)).toMatchObject({ ok: false, reason: 'changed' })
    const before = s.data[NOTES_KEY]
    const fresh = memoryStore()
    fresh.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
    expect(applyNotebookImport(fresh, text, preview.plan.toImport)).toMatchObject({ ok: false, reason: 'quota' })
    expect(s.data[NOTES_KEY]).toBe(before)
  })
})
