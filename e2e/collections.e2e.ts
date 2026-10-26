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
  await expect(links).toHaveCount(21)
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

/* ---------- Drafts across tabs ---------- */

async function twoTabs(context: import('@playwright/test').BrowserContext, title: string) {
  const a = await context.newPage()
  const b = await context.newPage()
  await a.goto('/#/collections')
  await create(a, title)
  await b.goto('/#/collections')
  await expect(card(b, title)).toBeVisible()
  return { a, b }
}

test('an older title draft is never saved over a newer one: the conflict keeps the draft and offers both choices', async ({ context }) => {
  const { a, b } = await twoTabs(context, 'Draft path')
  // Tab A starts editing.
  await card(a, 'Draft path').getByRole('button', { name: /Rename or describe/ }).click()
  await a.locator('.collection-edit').getByLabel('Title').fill('Title from A')
  await a.locator('.collection-edit').getByLabel('Description (optional)').fill('Description from A')
  // Tab B saves first.
  await card(b, 'Draft path').getByRole('button', { name: /Rename or describe/ }).click()
  await b.locator('.collection-edit').getByLabel('Title').fill('Title from B')
  await b.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(card(b, 'Title from B')).toBeVisible()

  // A hears about it, keeps its draft, and can't save over B without choosing.
  const edit = a.locator('.collection-edit')
  await expect(edit.getByRole('alert')).toContainText('Changed in another tab')
  await expect(edit.getByRole('alert')).toContainText('Title from B')
  await expect(edit.getByLabel('Title')).toHaveValue('Title from A')
  await expect(edit.getByLabel('Description (optional)')).toHaveValue('Description from A')
  await expect(edit.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
  expect((await stored(a))!.collections[0].title).toBe('Title from B')

  await edit.getByRole('button', { name: 'Replace it with my draft' }).click()
  await expect(card(a, 'Title from A')).toContainText('Description from A')
  await expect(card(b, 'Title from A')).toBeVisible()

  // The other choice: B edits again, A loads the saved version instead.
  await card(a, 'Title from A').getByRole('button', { name: /Rename or describe/ }).click()
  await a.locator('.collection-edit').getByLabel('Title').fill('Second draft from A')
  await card(b, 'Title from A').getByRole('button', { name: /Rename or describe/ }).click()
  await b.locator('.collection-edit').getByLabel('Title').fill('Second title from B')
  await b.getByRole('button', { name: 'Save', exact: true }).click()
  await a.locator('.collection-edit').getByRole('button', { name: 'Load saved version' }).click()
  await expect(a.locator('.collection-edit').getByLabel('Title')).toHaveValue('Second title from B')
  await expect(a.locator('.collection-edit').getByRole('alert')).toHaveCount(0)
  await a.getByRole('button', { name: 'Save', exact: true }).click()
  expect((await stored(a))!.collections[0].title).toBe('Second title from B')
})

test('an item-note draft survives a newer note from another tab, and unrelated changes do not count as a conflict', async ({ context }) => {
  const a = await context.newPage()
  await a.goto('/#/collections')
  await starter(a).getByRole('button', { name: /Copy to my collections.*From DNA to inheritance/ }).click()
  const b = await context.newPage()
  await b.goto('/#/collections')
  const title = 'From DNA to inheritance'
  const noteA = card(a, title).locator('.collection-item').first().getByLabel('Observation or question (optional)')
  await noteA.fill('My note in A')
  // B moves another item (not a conflict for A's note).
  await card(b, title).getByRole('button', { name: 'Move down “Mitosis”' }).click()
  await expect(card(a, title).locator('.collection-item-title').nth(2)).toHaveText('Mitosis')
  await expect(noteA).toHaveValue('My note in A')
  await expect(card(a, title).getByRole('alert')).toHaveCount(0)
  // B saves the same note.
  const noteB = card(b, title).locator('.collection-item').first().getByLabel('Observation or question (optional)')
  await noteB.fill('Note from B')
  await card(b, title).getByRole('button', { name: 'Save note' }).click()
  const alert = card(a, title).locator('.collection-item').first().getByRole('alert')
  await expect(alert).toContainText('Note from B')
  await expect(noteA).toHaveValue('My note in A')
  await expect(card(a, title).getByRole('button', { name: 'Save note' })).toHaveCount(0)
  await alert.getByRole('button', { name: 'Replace it with my draft' }).click()
  await expect.poll(async () => (await stored(a))!.collections[0].items[0].note).toBe('My note in A')
  await expect(noteB).toHaveValue('My note in A')
  // The reordering B made is kept.
  expect((await stored(a))!.collections[0].items.map((i) => i.title).slice(1, 3)).toEqual(['Meiosis', 'Mitosis'])
})

test('a collection deleted in another tab keeps the draft being edited, which can become a new collection', async ({ context }) => {
  const { a, b } = await twoTabs(context, 'Doomed path')
  await card(a, 'Doomed path').getByRole('button', { name: /Rename or describe/ }).click()
  await a.locator('.collection-edit').getByLabel('Description (optional)').fill('Words I do not want to lose')
  await card(b, 'Doomed path').getByRole('button', { name: /^Delete/ }).click()
  await card(b, 'Doomed path').getByRole('button', { name: 'Delete', exact: true }).click()
  const orphan = mine(a).locator('.collection-orphan')
  await expect(orphan).toContainText('“Doomed path” was deleted')
  await expect(orphan.getByLabel('Unsaved text')).toHaveValue('Doomed path\n\nWords I do not want to lose')
  await orphan.getByRole('button', { name: 'Create a new collection from this draft' }).click()
  await expect(card(a, 'Doomed path')).toContainText('Words I do not want to lose')
  await expect(orphan).toHaveCount(0)
})

test('a failed write keeps the note draft and reports why', async ({ context }) => {
  await instrument(context)
  const page = await context.newPage()
  await page.goto('/#/collections')
  await starter(page).getByRole('button', { name: /Copy to my collections.*From DNA to inheritance/ }).click()
  const note = card(page, 'From DNA to inheritance').locator('.collection-item').first().getByLabel('Observation or question (optional)')
  await note.fill('Typed while storage is full')
  await page.evaluate(() => (window.__lib.failWrites = true))
  await card(page, 'From DNA to inheritance').getByRole('button', { name: 'Save note' }).click()
  await expect(toast(page)).toContainText('Browser storage is full, so nothing was changed.')
  await expect(note).toHaveValue('Typed while storage is full')
  await page.evaluate(() => (window.__lib.failWrites = false))
  await card(page, 'From DNA to inheritance').getByRole('button', { name: 'Save note' }).click()
  await expect.poll(async () => (await stored(page))!.collections[0].items[0].note).toBe('Typed while storage is full')
})

/* ---------- File size limits ---------- */

test('the largest collections the app allows, in multi-byte Unicode, export and import back without loss', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/#/collections')
  // 20 collections × 30 items, every title, description and note at its limit, in 3-byte characters.
  await page.evaluate((k) => {
    const t = '2026-10-26T10:00:00.000Z'
    const fill = (n: number) => '語'.repeat(n)
    const collections = Array.from({ length: 20 }, (_, c) => ({
      id: `c${c}`,
      title: fill(80),
      description: fill(500),
      createdAt: t,
      updatedAt: t,
      revision: 1,
      items: Array.from({ length: 30 }, (_, i) => ({ id: `i${c}-${i}`, subject: 'chemistry', params: { molecule: 'water', view: 'ball-and-stick' }, title: fill(79) + String(i % 10), note: '😀'.repeat(100) + fill(300) })),
    }))
    localStorage.setItem(k, JSON.stringify({ version: 1, collections }))
  }, KEY)
  await page.reload()
  const before = (await stored(page))!.collections
  const [download] = await Promise.all([page.waitForEvent('download'), files(page).getByRole('button', { name: 'Export all collections' }).click()])
  const buffer = await readFile((await download.path())!)
  expect(buffer.byteLength).toBeGreaterThan(1_000_000)
  expect(buffer.byteLength).toBeLessThanOrEqual(5_000_000)

  await page.evaluate((k) => localStorage.removeItem(k), KEY)
  await page.reload()
  await files(page).locator('input[type="file"]').setInputFiles({ name: 'big.json', mimeType: 'application/json', buffer })
  await expect(page.locator('.import-preview li')).toHaveCount(20)
  await expect(page.locator('.import-preview')).not.toContainText('Can’t be imported')
  await page.locator('.import-preview').getByRole('button', { name: 'Import' }).click()
  await expect(toast(page)).toContainText('Imported 20 collections.')
  const after = (await stored(page))!.collections
  expect(after.map((c) => [c.title, c.items.map((i) => [i.title, i.note, i.params])])).toEqual(before.map((c) => [c.title, c.items.map((i) => [i.title, i.note, i.params])]))
})

test('oversized, malformed and over-limit files are refused safely; existing collections are untouched', async ({ page }) => {
  await page.goto('/#/collections')
  await create(page, 'Keep me')
  const before = await page.evaluate((k) => localStorage.getItem(k), KEY)
  const input = files(page).locator('input[type="file"]')

  await input.setInputFiles({ name: 'huge.json', mimeType: 'application/json', buffer: Buffer.alloc(5_000_001, 0x20) })
  await expect(toast(page)).toContainText('larger than the 5 MB limit, so it was not read. Nothing was imported.')
  await input.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"stem-explorer.collections","version":1,"collections":[') })
  await expect(toast(page)).toContainText('That file is not valid JSON. Nothing was imported.')

  const longNote = JSON.stringify({ format: 'stem-explorer.collections', version: 1, collections: [{ title: 'Too long', items: [{ subject: 'chemistry', params: { molecule: 'water' }, title: 'W', note: 'n'.repeat(501) }] }] })
  await input.setInputFiles({ name: 'long.json', mimeType: 'application/json', buffer: Buffer.from(longNote) })
  await expect(page.locator('.import-preview')).toContainText('Can’t be imported: 1 note is longer than 500 characters')
  await expect(page.locator('.import-preview').getByRole('button', { name: 'Import' })).toBeDisabled()
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe(before)
})
