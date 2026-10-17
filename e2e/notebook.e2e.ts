import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'
import { instrument } from './storage-helpers.ts'

const toast = (page: Page) => page.locator('.home-toast')
const cards = (page: Page) => page.locator('.note-card')
const storedNotes = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('stem-explorer:notes') ?? '[]') as { title: string; body: string; subject: string; params: Record<string, string> }[])

async function addNote(page: Page, title: string, body: string) {
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill(title)
  await page.getByRole('textbox', { name: 'Observations' }).fill(body)
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.save-status')).toContainText(`Note “${title}” saved.`)
}

test('add a note with an explicit Save, find it in the notebook, reopen, edit, delete and undo', async ({ page }) => {
  await page.goto('/?molecule=ammonia&view=space-filling#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Ammonia · space-filling')
  await page.getByRole('textbox', { name: 'Title' }).fill('Ammonia shape')
  await page.getByRole('textbox', { name: 'Observations' }).fill('Trigonal pyramid.\nOne lone pair on N.')
  await page.getByRole('button', { name: 'Save note' }).click()
  await page.locator('.save-status').getByRole('link', { name: 'Open the notebook' }).click()
  await expect(page).toHaveTitle('Notebook · STEM Explorer')
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).first().locator('.note-body')).toHaveText('Trigonal pyramid.\nOne lone pair on N.')
  await expect(page.locator('.notebook')).toContainText('Notes live in this browser only')

  await cards(page).first().getByRole('link', { name: 'Reopen exploration' }).click()
  await expect(page.locator('#molecule-heading')).toHaveText('Ammonia')
  await expect(page.getByRole('button', { name: 'Space-filling' })).toHaveAttribute('aria-pressed', 'true')
  await page.goBack()

  await cards(page).first().getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Ammonia: pyramid')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(cards(page).first().locator('.note-title')).toHaveText('Ammonia: pyramid')
  await expect(cards(page).first().locator('.note-meta')).toContainText('Updated')

  await cards(page).first().getByRole('button', { name: 'Delete' }).click()
  await expect(cards(page)).toHaveCount(0)
  await toast(page).getByRole('button', { name: 'Undo' }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(toast(page)).toContainText('Restored “Ammonia: pyramid”.')
})

test('unsaved changes: Cancel asks first, and a draft left behind is offered back', async ({ page }) => {
  await page.goto('/?structure=golgi#/biology')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Observations' }).fill('Cis face near the ER')
  await expect(page.locator('.note-editor')).toContainText('Unsaved changes, kept as a draft in this tab.')
  await page.locator('.note-editor').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('group', { name: 'Discard unsaved changes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('Cis face near the ER')

  // Leave the explorer without saving, then come back.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Physics' }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Biology' }).click()
  await expect(page.locator('.note-waiting')).toContainText('You have an unsaved Biology note draft')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('.note-restore')).toContainText('unsaved note draft')
  await page.locator('.note-restore').getByRole('button', { name: 'Restore draft' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('Cis face near the ER')
  expect(await storedNotes(page)).toEqual([])
})

const drafts = (page: Page) =>
  page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('stem-explorer:note-draft:')))

test('drafts survive a reload, are kept apart from saved notes, and Save clears them', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Water angle')
  await page.getByRole('textbox', { name: 'Observations' }).fill('About 104.5°')
  await expect(page.locator('.note-draft-status')).toContainText('kept as a draft in this tab')
  // No cleanup step runs before this reload: the draft must already be stored.
  await page.reload()
  await waitForViewport(page)
  expect(await storedNotes(page)).toEqual([])
  await expect(page.locator('.note-waiting')).toContainText('“Water angle”')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('.note-restore')).toContainText('started in Water · ball and stick')
  // Fields stay hidden until you choose, so the earlier draft can’t be overwritten by accident.
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Restore draft' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('About 104.5°')
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.save-status')).toContainText('Note “Water angle” saved.')
  expect(await drafts(page)).toEqual([])
  await page.reload()
  await expect(page.locator('.note-waiting')).toHaveCount(0)
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('.note-restore')).toHaveCount(0)
})

test('a Water draft restored while viewing Benzene stays attached to Water unless you choose otherwise', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Bent shape')
  await page.goto('/?molecule=benzene#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('.note-restore')).toContainText('started in Water')
  await page.getByRole('button', { name: 'Restore draft' }).click()
  const attach = page.locator('.note-attach')
  await expect(attach).toContainText('Attached to: Water · ball and stick')
  await expect(attach).toContainText('started in a different view')
  await expect(attach.getByRole('link', { name: 'Open that view' })).toHaveAttribute('href', /molecule=water/)
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.save-status')).toContainText('Note “Bent shape” saved.')
  expect((await storedNotes(page))[0].params).toMatchObject({ molecule: 'water' })

  // Choosing the view on screen is an explicit action.
  await page.goto('/?molecule=water#/chemistry')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Title' }).fill('Actually about rings')
  await page.goto('/?molecule=benzene#/chemistry')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('button', { name: 'Restore draft' }).click()
  await page.getByRole('button', { name: /^Attach to Benzene/ }).click()
  await expect(page.locator('.note-attach')).not.toContainText('different view')
  await page.getByRole('button', { name: 'Save note' }).click()
  expect((await storedNotes(page))[0]).toMatchObject({ title: 'Actually about rings', params: { molecule: 'benzene' } })
})

test('explicit discard removes the draft; edits to saved notes have their own drafts', async ({ page }) => {
  await page.goto('/?surface=saddle#/mathematics')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Observations' }).fill('throwaway')
  await page.locator('.note-editor').getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('button', { name: 'Discard', exact: true }).click()
  expect(await drafts(page)).toEqual([])
  await page.reload()
  await expect(page.locator('.note-waiting')).toHaveCount(0)

  await addNote(page, 'Saddle', 'level at 0')
  await page.goto('/#/notebook')
  await cards(page).first().getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('textbox', { name: 'Observations' }).fill('level at 0, rising along x')
  await page.reload()
  await expect(cards(page).first().locator('.note-body')).toHaveText('level at 0')
  await expect(cards(page).first()).toContainText('Unsaved edits to this note are kept as a draft')
  await cards(page).first().getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('button', { name: 'Discard draft' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('level at 0')
  expect(await drafts(page)).toEqual([])
})

test('explains when a draft cannot be kept', async ({ page }) => {
  await page.addInitScript(() => {
    const real = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (this === window.sessionStorage && k.startsWith('stem-explorer:note-draft:')) throw new DOMException('full', 'QuotaExceededError')
      return real.call(this, k, v)
    }
  })
  await page.goto('/?molecule=water#/chemistry')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('textbox', { name: 'Observations' }).fill('x')
  await expect(page.getByRole('alert')).toContainText('This draft can’t be kept if the page reloads: this browser reports its storage is full')
  // Saving still works: drafts and notes are stored separately.
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.save-status')).toContainText('saved.')
})

test('filter by subject; notes render text safely; tour state is never stored', async ({ page }) => {
  await page.goto('/?part=aorta&heart=whole#/anatomy')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await addNote(page, 'During the tour', '<img src=x onerror="window.__pwned=1">')
  const [stored] = await storedNotes(page)
  expect(stored.params).toEqual({ part: 'aorta', heart: 'whole' }) // the pre-tour view, no tour step
  // Only the note's own fields and the canonical share parameters are stored.
  expect(Object.keys(stored).sort()).toEqual(['body', 'createdAt', 'id', 'params', 'subject', 'title', 'updatedAt', 'version'])

  await page.goto('/?surface=saddle#/mathematics')
  await addNote(page, 'Saddle', 'level at 0')
  await page.goto('/#/notebook')
  await expect(cards(page)).toHaveCount(2)
  await page.getByRole('group', { name: 'Filter notes by subject' }).getByRole('button', { name: /^Anatomy/ }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page).locator('.note-body')).toHaveText('<img src=x onerror="window.__pwned=1">')
  await expect(page.locator('.note-card img')).toHaveCount(0)
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
})

test('empty, damaged and quota states', async ({ context }) => {
  await instrument(context)
  const page = await context.newPage()
  await page.goto('/#/notebook')
  await expect(page.locator('.notebook')).toContainText('No notes yet.')
  await page.evaluate(() => localStorage.setItem('stem-explorer:notes', '{damaged'))
  await page.reload()
  await expect(page.locator('.notebook')).toContainText('damaged and can’t be read')
  expect(await page.evaluate(() => localStorage.getItem('stem-explorer:notes'))).toBe('{damaged')

  await page.evaluate(() => localStorage.removeItem('stem-explorer:notes'))
  await page.goto('/?molecule=water#/chemistry')
  await page.evaluate(() => (window.__lib.failWrites = true))
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('button', { name: 'Save note' }).click()
  await expect(page.locator('.save-status')).toContainText('The note was not saved: this browser reports its storage is full')
  // The editor stays open with the text, so nothing typed is lost.
  await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Water · ball and stick')
})

test('notebook backup: export, import round trip, and the formats stay apart', async ({ page }) => {
  await page.goto('/?molecule=benzene#/chemistry')
  await addNote(page, 'Flat ring', 'All atoms in one plane.')
  await page.goto('/#/notebook')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export notebook' }).click()])
  expect(download.suggestedFilename()).toMatch(/^stem-explorer-notebook-\d{4}-\d{2}-\d{2}\.json$/)
  const text = await readFile((await download.path())!, 'utf8')
  expect(JSON.parse(text)).toMatchObject({ format: 'stem-explorer.notebook', version: 1 })

  await page.evaluate(() => localStorage.removeItem('stem-explorer:notes'))
  await page.reload()
  const input = page.locator('.notebook input[type="file"]')
  await input.setInputFiles({ name: 'n.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await page.getByRole('button', { name: 'Import 1 note' }).click()
  await expect(toast(page)).toContainText('Imported 1 note.')
  await expect(cards(page).first().locator('.note-title')).toHaveText('Flat ring')

  // A saved-explorations backup is recognised and sent to the right place, and vice versa.
  await input.setInputFiles({ name: 's.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'stem-explorer.saved-explorations', version: 1, entries: [] })) })
  await expect(toast(page)).toContainText('That is a saved-explorations backup')
  await page.goto('/')
  await page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) }).locator('input[type="file"]').setInputFiles({ name: 'n.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await expect(page.locator('.home-toast')).toContainText('That is a notebook backup')
})

test('a full notebook of maximum-length CJK notes exports and imports into an empty notebook', async ({ page }) => {
  await page.goto('/#/notebook')
  // Build 100 maximum-length notes directly in storage (typing 500 000 characters would be slow).
  await page.evaluate(() => {
    const body = '细胞核与线粒体'.repeat(800).slice(0, 5000)
    const now = new Date().toISOString()
    const notes = Array.from({ length: 100 }, (_, i) => ({
      id: `nfull-${i}-abcdef`, version: 1, title: `${i} ${'细胞'.repeat(40)}`.slice(0, 80), body,
      subject: 'chemistry', params: { molecule: 'water', view: 'ball-and-stick' }, createdAt: now, updatedAt: now,
    }))
    localStorage.setItem('stem-explorer:notes', JSON.stringify(notes))
  })
  await page.reload()
  await expect(cards(page)).toHaveCount(100)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export notebook' }).click()])
  const buffer = await readFile((await download.path())!)
  expect(buffer.byteLength).toBeGreaterThan(1_000_000) // larger than the old 1 MB import limit
  await page.evaluate(() => localStorage.removeItem('stem-explorer:notes'))
  await page.reload()
  await page.locator('.notebook input[type="file"]').setInputFiles({ name: 'full.json', mimeType: 'application/json', buffer })
  await page.getByRole('button', { name: 'Import 100 notes' }).click()
  await expect(toast(page)).toContainText('Imported 100 notes.')
  await expect(cards(page)).toHaveCount(100)
})

test('a note added in one tab appears in another tab’s notebook', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await b.goto('/#/notebook')
  await a.goto('/?structure=nucleus#/biology')
  await addNote(a, 'Nucleus', 'Holds DNA')
  await expect(b.locator('.note-card .note-title')).toHaveText('Nucleus')
})

test('notes on the new sections keep their exact snapshot and reopen it', async ({ page }) => {
  const cases: [string, string, (p: Page) => Promise<void>][] = [
    ['/?msec=vectors&vm=1,2,0.5,1#/mathematics', 'Vectors and a 2×2 transformation', async (p) => expect(p.locator('.vec-det-meaning')).toContainText('flattened onto a line')],
    ['/?experiment=circuit&arr=parallel-2#/physics', 'Circuit: Two resistors in parallel', async (p) => expect(p.getByRole('radio', { name: 'Two resistors in parallel' })).toBeChecked()],
    ['/?bsec=dna#/biology', 'DNA', async (p) => expect(p.locator('.dna-svg')).toBeVisible()],
    ['/?csec=atomic&el=26#/chemistry', 'Atomic structure · Iron', async (p) => expect(p.locator('.atom-svg')).toBeVisible()],
  ]
  for (const [url, title] of cases) {
    await page.goto(url)
    await page.getByRole('button', { name: 'Add note' }).click()
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    await page.getByRole('textbox', { name: 'Observations' }).fill(`Seen at ${url}`)
    await page.getByRole('button', { name: 'Save note' }).click()
    await expect(page.locator('.save-status')).toContainText('saved')
  }
  await page.goto('/#/notebook')
  await expect(cards(page)).toHaveCount(cases.length)
  for (const [url, , check] of cases) {
    await page.goto('/#/notebook')
    await cards(page).filter({ hasText: `Seen at ${url}` }).getByRole('link', { name: 'Reopen exploration' }).click()
    await check(page)
    const want = new URLSearchParams(url.split('#')[0].replace(/^\/\?/, ''))
    for (const [k, v] of want) expect(new URL(page.url()).searchParams.get(k), `${url} ${k}`).toBe(v)
  }
})
