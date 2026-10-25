import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'
import { instrument } from './storage-helpers.ts'

const KEY = 'stem-explorer:collections'
const toast = (page: Page) => page.locator('.home-toast')
const mine = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'My collections' }) })
const starter = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Starter collections' }) })
const files = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Collection files' }) })
const card = (page: Page, title: string) => mine(page).locator('.collection-card', { has: page.getByRole('heading', { name: title, exact: true }) })
const itemTitles = (page: Page, title: string) => card(page, title).locator('.collection-item-title')
type Stored = { version: number; collections: { id: string; title: string; revision: number; items: { title: string; note: string; subject: string; params: Record<string, string> }[] }[] }
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored | null, KEY)

async function create(page: Page, title: string) {
  await mine(page).getByLabel('New collection title').fill(title)
  await mine(page).getByRole('button', { name: 'Create collection' }).click()
  await expect(card(page, title)).toBeVisible()
}

test('build a collection from an explorer and a pasted link, reorder, and the order survives a reload', async ({ page }) => {
  await page.goto('/?molecule=water&view=ball-and-stick#/chemistry')
  await waitForViewport(page)
  const before = page.url()
  await page.getByRole('button', { name: 'Add to collection' }).click()
  await page.getByLabel('New collection title').fill('Molecules and cells')
  await page.getByLabel('Observation or question (optional)').fill('Bond angle about 104.5°?')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.locator('.save-status')).toContainText('Added to “Molecules and cells”.')
  // Adding to a collection never changes the share URL.
  expect(page.url()).toBe(before)

  await page.locator('.save-status').getByRole('link', { name: 'Open collections' }).click()
  await expect(page).toHaveTitle('Collections · STEM Explorer')
  const c = card(page, 'Molecules and cells')
  await c.getByText('Add an exploration').click()
  await c.getByLabel('Or paste an exploration link (from Copy link)').fill('https://stem-explorer-nine.vercel.app/?bsec=meiosis#/biology')
  await c.getByRole('button', { name: /^Add to/ }).click()
  await expect(itemTitles(page, 'Molecules and cells')).toHaveCount(2)
  await expect(itemTitles(page, 'Molecules and cells').first()).toContainText('Water')
  await expect(itemTitles(page, 'Molecules and cells').nth(1)).toContainText('Meiosis')

  // Reorder: move the second item up, then reload.
  const second = (await itemTitles(page, 'Molecules and cells').nth(1).textContent())!
  await c.getByRole('button', { name: `Move up “${second}”` }).click()
  await expect(toast(page)).toContainText(`Moved “${second}” up to position 1.`)
  await page.reload()
  await expect(itemTitles(page, 'Molecules and cells').first()).toHaveText(second)
  await expect(c.locator('.collection-item').nth(1).getByRole('textbox')).toHaveValue('Bond angle about 104.5°?')

  // Duplicate and remove.
  await c.getByRole('button', { name: `Duplicate “${second}”` }).click()
  await expect(itemTitles(page, 'Molecules and cells')).toHaveCount(3)
  await c.getByRole('button', { name: `Remove “${second}”` }).first().click()
  await expect(itemTitles(page, 'Molecules and cells')).toHaveCount(2)

  // Edit a note with an explicit Save.
  await c.locator('.collection-item').first().getByRole('textbox').fill('Count the chromosomes.')
  await c.locator('.collection-item').first().getByRole('button', { name: 'Save note' }).click()
  await expect(toast(page)).toContainText('Note saved.')
  expect((await stored(page))!.collections[0].items[0].note).toBe('Count the chromosomes.')

  // Opening an item goes to its real module.
  await itemTitles(page, 'Molecules and cells').first().click()
  await expect(page).toHaveURL(/bsec=meiosis.*#\/biology$/)
})

test('every starter destination opens its real view, unchanged', async ({ page }) => {
  await page.goto('/#/collections')
  const links = starter(page).locator('.collection-item-title')
  await expect(links).toHaveCount(20)
  const hrefs = await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
  for (const href of hrefs) {
    await page.goto(`/${href}`)
    const [query, subject] = href.split('#/')
    await expect(page).toHaveTitle(new RegExp(`^${subject[0].toUpperCase()}${subject.slice(1)} · STEM Explorer$`))
    // A link that failed validation would have its parameters corrected or dropped.
    await expect.poll(() => page.evaluate(() => window.location.search)).toBe(query)
  }
})

test('copying a starter collection, then export and import round-trip order and notes; duplicates are never silent', async ({ page }) => {
  await page.goto('/#/collections')
  await starter(page).getByRole('button', { name: /Copy to my collections.*From DNA to inheritance/ }).click()
  const before = (await stored(page))!.collections[0]
  expect(before.items.map((i) => i.title)).toEqual(['DNA structure', 'Mitosis', 'Meiosis', 'A Yy × Yy cross', 'Binomial distribution, n = 100, p = 0.25'])

  const [download] = await Promise.all([page.waitForEvent('download'), files(page).getByRole('button', { name: 'Export all collections' }).click()])
  expect(download.suggestedFilename()).toMatch(/^stem-explorer-collections-\d{4}-\d{2}-\d{2}\.json$/)
  const text = await readFile((await download.path())!, 'utf8')
  expect(JSON.parse(text).format).toBe('stem-explorer.collections')

  // Importing into the same browser: detected as a duplicate, skipped unless asked.
  await files(page).locator('input[type="file"]').setInputFiles({ name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await expect(page.locator('.import-preview')).toContainText('same as your “From DNA to inheritance”')
  await expect(page.locator('.import-preview').getByRole('button', { name: 'Import' })).toBeDisabled()
  await page.locator('.import-preview').getByLabel(/Also import the 1 duplicate/).check()
  await page.locator('.import-preview').getByRole('button', { name: 'Import' }).click()
  await expect(toast(page)).toContainText('Imported 1 collection. Existing collections were not changed.')
  const after = (await stored(page))!.collections
  expect(after.map((c) => c.title)).toEqual(['From DNA to inheritance', 'From DNA to inheritance (imported)'])
  expect(after[1].items.map((i) => [i.title, i.note, i.params])).toEqual(before.items.map((i) => [i.title, i.note, i.params]))
  expect(after[1].id).not.toBe(after[0].id)

  // Into an empty browser: added as-is, in order.
  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.reload()
  await files(page).locator('input[type="file"]').setInputFiles({ name: 'c.json', mimeType: 'application/json', buffer: Buffer.from(text) })
  await page.locator('.import-preview').getByRole('button', { name: 'Import' }).click()
  await expect(itemTitles(page, 'From DNA to inheritance')).toHaveText(before.items.map((i) => i.title))

  // Other files are refused clearly.
  await files(page).locator('input[type="file"]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"stem-explorer.notebook","version":1}') })
  await expect(toast(page)).toContainText('not a STEM Explorer collection file')
})

test('an item whose settings no longer validate is kept, labelled, and offers recovery', async ({ page }) => {
  await page.goto('/#/collections')
  const t = '2026-10-20T10:00:00.000Z'
  await page.evaluate(
    ([k, t]) =>
      localStorage.setItem(
        k,
        JSON.stringify({ version: 1, collections: [{ id: 'c1', title: 'Old path', description: '', createdAt: t, updatedAt: t, revision: 1, items: [{ id: 'i1', subject: 'chemistry', params: { molecule: 'future-molecule' }, title: 'From a newer version', note: 'keep me' }] }] }),
      ),
    [KEY, t],
  )
  await page.reload()
  const c = card(page, 'Old path')
  await expect(c).toContainText('1 item can’t be opened')
  await expect(c.locator('.collection-broken')).toContainText('Can’t be opened')
  await expect(c.locator('.collection-item').getByRole('link', { name: 'From a newer version' })).toHaveCount(0)
  await expect(c.getByRole('link', { name: 'open Chemistry with its default view' })).toHaveAttribute('href', '#/chemistry')
  expect((await stored(page))!.collections[0].items[0].params).toEqual({ molecule: 'future-molecule' })
  await c.getByRole('button', { name: 'Remove “From a newer version”' }).click()
  await expect(c).toContainText('0 items')
})

test('a change made in another tab is shown, and a stale edit never overwrites it', async ({ context }) => {
  const a = await context.newPage()
  const b = await context.newPage()
  await a.goto('/#/collections')
  await create(a, 'Shared path')
  await b.goto('/#/collections')
  await expect(card(b, 'Shared path')).toBeVisible()

  // Tab B renames; tab A updates through the storage event.
  await card(b, 'Shared path').getByRole('button', { name: /Rename or describe/ }).click()
  await b.locator('.collection-edit').getByLabel('Title').fill('Renamed in B')
  await b.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(card(a, 'Renamed in B')).toBeVisible()

  // A write that A has not heard about yet (no storage event in the same tab): A's next edit is refused.
  await a.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k)!)
    d.collections[0].description = 'Newer edit'
    d.collections[0].revision += 1
    localStorage.setItem(k, JSON.stringify(d))
  }, KEY)
  await card(a, 'Renamed in B').getByRole('button', { name: /^Delete/ }).click()
  await card(a, 'Renamed in B').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(toast(a)).toContainText('changed in another tab')
  const d = (await stored(a))!
  expect(d.collections).toHaveLength(1)
  await expect(card(a, 'Renamed in B')).toContainText('Newer edit')
})

test('a full storage quota is reported and nothing changes', async ({ context }) => {
  await instrument(context)
  const page = await context.newPage()
  await page.goto('/#/collections')
  await page.evaluate(() => (window.__lib.failWrites = true))
  await mine(page).getByLabel('New collection title').fill('Will not fit')
  await mine(page).getByRole('button', { name: 'Create collection' }).click()
  await expect(toast(page)).toContainText('Browser storage is full, so nothing was changed.')
  expect(await stored(page)).toBeNull()
})
