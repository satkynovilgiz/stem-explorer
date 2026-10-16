import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { entry, instrument, savedPanel, seed, status } from './storage-helpers.ts'

const FORMAT = 'stem-explorer.saved-explorations'

function backup(entries: unknown[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: '2026-10-15T12:00:00.000Z', entries, ...extra })
}

async function chooseFile(page: Page, text: string | Buffer, name = 'backup.json') {
  await savedPanel(page).locator('input[type="file"]').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) })
}

const preview = (page: Page) => page.locator('.import-preview')
const storedTitles = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('stem-explorer:saved') ?? '[]') as { title: string }[]).map((e) => e.title))

test('export, then import into an empty library, round-trips titles and state', async ({ page }) => {
  await page.goto('/')
  await seed(page, 'saved', [entry('seed01-1', 'water', 'Bent water'), entry('seed02-1', 'benzene', 'Flat ring')])
  await seed(page, 'recent', [entry('rec001-1', 'ammonia', 'Ammonia · ball and stick')])
  await page.reload()

  await expect(savedPanel(page)).toContainText('saved titles and explorer settings')
  const [download] = await Promise.all([page.waitForEvent('download'), savedPanel(page).getByRole('button', { name: 'Export' }).click()])
  expect(download.suggestedFilename()).toMatch(/^stem-explorer-saved-\d{4}-\d{2}-\d{2}\.json$/)
  const text = await readFile((await download.path())!, 'utf8')
  const file = JSON.parse(text)
  expect([file.format, file.version, typeof file.exportedAt]).toEqual([FORMAT, 1, 'string'])
  expect(file.entries.map((e: { title: string }) => e.title)).toEqual(['Bent water', 'Flat ring'])
  expect(text).not.toContain('http')
  expect(text).not.toContain('Ammonia') // recent history is excluded
  expect(text).not.toContain('seed01-1') // local IDs are not exported

  await page.evaluate(() => localStorage.removeItem('stem-explorer:saved'))
  await page.reload()
  await chooseFile(page, text)
  await expect(preview(page)).toContainText('These 2 explorations will be added')
  await expect(preview(page).getByRole('listitem')).toHaveText(['Chemistry Bent water', 'Chemistry Flat ring'])
  // Nothing changes before confirming.
  expect(await storedTitles(page)).toEqual([])
  await preview(page).getByRole('button', { name: 'Import 2 explorations' }).click()
  await expect(status(page)).toHaveText('Imported 2 explorations.')
  await expect(savedPanel(page).getByRole('link', { name: /Flat ring/ })).toHaveAttribute('href', '?molecule=benzene&view=ball-and-stick#/chemistry')
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('stem-explorer:saved')!).map((e: { id: string }) => e.id))
  expect(ids).not.toContain('seed01-1')
})

test('mixed files: duplicates and invalid entries are listed and skipped, existing titles kept', async ({ page }) => {
  await page.goto('/')
  await seed(page, 'saved', [entry('seed01-1', 'water', 'My water')])
  await page.reload()
  await chooseFile(
    page,
    backup([
      { title: 'Their water', subject: 'chemistry', params: { molecule: 'water' } },
      { title: 'Golgi', subject: 'biology', params: { structure: 'golgi' } },
      { title: 'Evil', subject: 'javascript:alert(1)', params: {} },
      { title: '<b>Gold</b>', subject: 'chemistry', params: { molecule: 'gold' } },
      { title: 'Link', subject: 'anatomy', params: { part: 'aorta' }, href: 'https://evil.example/' },
    ]),
  )
  await expect(preview(page)).toContainText('These 2 explorations will be added')
  await expect(preview(page)).toContainText('1 duplicate skipped (already saved)')
  await expect(preview(page)).toContainText('2 invalid entries skipped')
  await preview(page).getByText('1 duplicate skipped').click()
  await expect(preview(page)).toContainText('Their water — same as “My water”')
  await preview(page).getByText('2 invalid entries skipped').click()
  // Titles are plain text, not markup.
  await expect(preview(page)).toContainText('Entry 4 (“<b>Gold</b>”): unknown subject or unsupported settings')

  await preview(page).getByRole('button', { name: 'Import 2 explorations' }).click()
  await expect(status(page)).toHaveText('Imported 2 explorations.')
  expect(await storedTitles(page)).toEqual(['My water', 'Golgi', 'Link'])
  // The imported anatomy entry opens its own subject state, not the URL from the file.
  await savedPanel(page).getByRole('link', { name: /Link/ }).click()
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
  const url = new URL(page.url())
  expect([url.hostname, url.searchParams.get('part'), url.hash]).toEqual(['127.0.0.1', 'aorta', '#/anatomy'])
})

test('rejects malformed, foreign, unsupported and oversized files without changing anything', async ({ page }) => {
  await page.goto('/')
  await seed(page, 'saved', [entry('seed01-1', 'water', 'My water')])
  await page.reload()

  await chooseFile(page, '{not json')
  await expect(status(page)).toHaveText('That file is not valid JSON. Choose a backup exported from STEM Explorer.')
  await chooseFile(page, JSON.stringify({ hello: 'world' }))
  await expect(status(page)).toHaveText('That file is not a STEM Explorer saved-explorations backup.')
  await chooseFile(page, backup([], { version: 7 }))
  await expect(status(page)).toContainText('format version 7')
  await chooseFile(page, Buffer.alloc(1_000_001, 32))
  await expect(status(page)).toContainText('larger than 1 MB')
  await expect(preview(page)).toHaveCount(0)
  expect(await storedTitles(page)).toEqual(['My water'])
})

test('respects the saved-item limit and lists what does not fit', async ({ page }) => {
  await page.goto('/')
  const t = '2026-10-15T10:00:00.000Z'
  const many = Array.from({ length: 29 }, (_, i) => ({
    id: `fill${String(i).padStart(2, '0')}-1`,
    version: 1,
    subject: 'physics',
    params: { speed: String(i + 1), angle: '45', height: '0', gravity: '9.81' },
    title: `Speed ${i + 1}`,
    createdAt: t,
    updatedAt: t,
  }))
  await seed(page, 'saved', many)
  await page.reload()
  await chooseFile(
    page,
    backup(['water', 'methane', 'benzene'].map((m) => ({ title: m, subject: 'chemistry', params: { molecule: m } }))),
  )
  await expect(preview(page)).toContainText('This exploration will be added')
  await expect(preview(page)).toContainText('2 entries skipped: over the 30-item limit')
  await preview(page).getByRole('button', { name: 'Import 1 exploration' }).click()
  await expect(status(page)).toHaveText('Imported 1 exploration.')
  expect(await storedTitles(page)).toHaveLength(30)
})

test('a failing write during import keeps existing data and reports it', async ({ context }) => {
  await instrument(context)
  const page = await context.newPage()
  await page.goto('/')
  await seed(page, 'saved', [entry('seed01-1', 'water', 'My water')])
  await page.reload()
  await chooseFile(page, backup([{ title: 'Golgi', subject: 'biology', params: { structure: 'golgi' } }]))
  await page.evaluate(() => (window.__lib.failWrites = true))
  await preview(page).getByRole('button', { name: 'Import 1 exploration' }).click()
  await expect(status(page)).toContainText('Nothing was imported: this browser reports its storage is full')
  await expect(status(page)).not.toContainText('Imported')
  await expect(savedPanel(page).getByRole('link')).toHaveCount(1)
  await page.evaluate(() => (window.__lib.failWrites = false))
  expect(await storedTitles(page)).toEqual(['My water'])
})

test('another tab shows imported entries after a successful import', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await a.goto('/')
  await b.goto('/')
  await chooseFile(a, backup([{ title: 'Shared golgi', subject: 'biology', params: { structure: 'golgi' } }]))
  await preview(a).getByRole('button', { name: 'Import 1 exploration' }).click()
  await expect(savedPanel(b).getByRole('link', { name: /Shared golgi/ })).toBeVisible()
})
