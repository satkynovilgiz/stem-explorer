import { describe, expect, it } from 'vitest'
import type { KeyValueStore } from './explorationStore'
import { clearDraft, draftKey, readDraft, writeDraft } from './noteDrafts'
import { NOTES_KEY } from './notesStore'

function memoryStore(fail?: () => never): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      if (fail) fail()
      data[k] = v
    },
    removeItem: (k) => void delete data[k],
  }
}
const water = { subject: 'chemistry' as const, params: { molecule: 'water', view: 'ball-and-stick' } }

describe('note drafts', () => {
  it('round-trip text and the exploration snapshot, never touching saved notes', () => {
    const s = memoryStore()
    expect(writeDraft(s, 'new:chemistry', { title: 'Water', body: 'bent', state: water })).toEqual({ ok: true })
    expect(readDraft(s, 'new:chemistry')).toEqual({ title: 'Water', body: 'bent', state: water })
    expect(s.data[NOTES_KEY]).toBeUndefined()
    clearDraft(s, 'new:chemistry')
    expect(readDraft(s, 'new:chemistry')).toBeNull()
  })

  it('keeps scopes apart and accepts older drafts without a snapshot', () => {
    const s = memoryStore()
    s.data[draftKey('new:biology')] = JSON.stringify({ title: 'Old', body: 'from before snapshots' })
    expect(readDraft(s, 'new:biology')).toEqual({ title: 'Old', body: 'from before snapshots', state: null })
    expect(readDraft(s, 'new:chemistry')).toBeNull()
  })

  it('ignores malformed drafts, unknown versions and invalid snapshots', () => {
    const s = memoryStore()
    s.data[draftKey('a')] = '{nope'
    s.data[draftKey('b')] = JSON.stringify({ version: 9, title: 't', body: 'b' })
    s.data[draftKey('c')] = JSON.stringify({ version: 1, title: 't', body: 'b', state: { subject: 'alchemy', params: {} } })
    expect(readDraft(s, 'a')).toBeNull()
    expect(readDraft(s, 'b')).toBeNull()
    expect(readDraft(s, 'c')).toEqual({ title: 't', body: 'b', state: null })
  })

  it('reports why a draft could not be kept', () => {
    const quota = memoryStore(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(writeDraft(quota, 'x', { title: 't', body: 'b', state: null })).toEqual({ ok: false, reason: 'quota' })
    const broken = memoryStore(() => {
      throw new Error('denied')
    })
    expect(writeDraft(broken, 'x', { title: 't', body: 'b', state: null })).toEqual({ ok: false, reason: 'write-failed' })
    expect(writeDraft(null, 'x', { title: 't', body: 'b', state: null })).toEqual({ ok: false, reason: 'unavailable' })
  })
})
