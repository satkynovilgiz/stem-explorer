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
  await expect(page.locator('.note-editor')).toContainText('Unsaved changes.')
  await page.locator('.note-editor').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('group', { name: 'Discard unsaved changes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('Cis face near the ER')

  // Leave the explorer without saving, then come back.
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Physics' }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Biology' }).click()
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('.note-restore')).toContainText('unsaved note from earlier')
  await page.locator('.note-restore').getByRole('button', { name: 'Restore it' }).click()
  await expect(page.getByRole('textbox', { name: 'Observations' })).toHaveValue('Cis face near the ER')
  expect(await storedNotes(page)).toEqual([])
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

test('a note added in one tab appears in another tab’s notebook', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await b.goto('/#/notebook')
  await a.goto('/?structure=nucleus#/biology')
  await addNote(a, 'Nucleus', 'Holds DNA')
  await expect(b.locator('.note-card .note-title')).toHaveText('Nucleus')
})
