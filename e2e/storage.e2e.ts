import type { BrowserContext, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

/*
 * Storage reliability and multi-tab sync. Pages share one browser context, so they share
 * localStorage and receive each other's `storage` events, exactly like two tabs.
 *
 * An init script wraps Storage.prototype to count writes, removals, reads of the saved list and
 * storage events, and to make writes or removals fail on demand.
 */
declare global {
  interface Window {
    __lib: { sets: number; removes: number; savedReads: number; events: number; failWrites: boolean; failRemoves: boolean }
  }
}

async function instrument(context: BrowserContext) {
  await context.addInitScript(() => {
    const lib = { sets: 0, removes: 0, savedReads: 0, events: 0, failWrites: false, failRemoves: false }
    window.__lib = lib
    const P = Storage.prototype
    const { setItem, removeItem, getItem } = P
    P.setItem = function (k: string, v: string) {
      lib.sets++
      if (lib.failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      return setItem.call(this, k, v)
    }
    P.removeItem = function (k: string) {
      lib.removes++
      if (lib.failRemoves) throw new DOMException('Denied', 'SecurityError')
      return removeItem.call(this, k)
    }
    P.getItem = function (k: string) {
      if (k === 'stem-explorer:saved') lib.savedReads++
      return getItem.call(this, k)
    }
    window.addEventListener('storage', () => lib.events++)
  })
}

const counters = (page: Page) => page.evaluate(() => ({ ...window.__lib }))
const resetCounters = (page: Page) =>
  page.evaluate(() => Object.assign(window.__lib, { sets: 0, removes: 0, savedReads: 0, events: 0 }))
const savedPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) })
const recentPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Continue exploring' }) })
const status = (page: Page) => page.locator('.library-status')

function entry(id: string, molecule: string, title: string) {
  const t = '2026-10-15T10:00:00.000Z'
  return { id, version: 1, subject: 'chemistry', params: { molecule, view: 'ball-and-stick' }, title, createdAt: t, updatedAt: t }
}

async function seed(page: Page, key: 'saved' | 'recent', entries: object[]) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`stem-explorer:${key}`, JSON.stringify(entries)] as const)
}

test.describe('two tabs in one browser', () => {
  test('save, rename and remove propagate between tabs', async ({ context }) => {
    await instrument(context)
    const a = await context.newPage()
    const b = await context.newPage()
    await b.goto('/')
    await expect(savedPanel(b)).toContainText('Nothing saved yet.')

    await a.goto('/?molecule=methane#/chemistry')
    await expect(a.locator('#molecule-heading')).toHaveText('Methane')
    await a.getByRole('button', { name: 'Save exploration' }).click()
    await a.getByRole('textbox', { name: 'Name' }).fill('Tetrahedral methane')
    await a.getByRole('button', { name: 'Save', exact: true }).click()
    // Tab B shows the new entry without reloading.
    await expect(savedPanel(b).getByRole('link', { name: /Tetrahedral methane/ })).toBeVisible()

    await a.goto('/')
    await savedPanel(b).getByRole('button', { name: 'Rename Tetrahedral methane' }).click()
    await b.getByRole('textbox', { name: 'New name for Tetrahedral methane' }).fill('CH4 shape')
    await b.keyboard.press('Enter')
    await expect(savedPanel(a).getByRole('link', { name: /CH4 shape/ })).toBeVisible()

    await savedPanel(a).getByRole('button', { name: 'Remove CH4 shape' }).click()
    await expect(savedPanel(b)).toContainText('Nothing saved yet.')
  })

  test('idle tabs stop writing and stop generating storage events', async ({ context }) => {
    await instrument(context)
    const a = await context.newPage()
    const b = await context.newPage()
    await a.goto('/')
    await seed(a, 'saved', [entry('seed01-1', 'water', 'Seeded water')])
    await b.goto('/')
    await expect(savedPanel(b).getByRole('link', { name: /Seeded water/ })).toBeVisible()
    await a.reload()
    await expect(savedPanel(a).getByRole('link', { name: /Seeded water/ })).toBeVisible()

    // Trigger one real change, then let both tabs sit idle.
    await savedPanel(a).getByRole('button', { name: 'Rename Seeded water' }).click()
    await a.getByRole('textbox', { name: 'New name for Seeded water' }).fill('Renamed')
    await a.keyboard.press('Enter')
    await expect(savedPanel(b).getByRole('link', { name: /Renamed/ })).toBeVisible()
    await a.waitForTimeout(500)
    await Promise.all([resetCounters(a), resetCounters(b)])
    await a.waitForTimeout(3000)
    for (const page of [a, b]) {
      const c = await counters(page)
      expect({ sets: c.sets, removes: c.removes, events: c.events }).toEqual({ sets: 0, removes: 0, events: 0 })
    }
  })

  test('unrelated storage keys do not refresh the library', async ({ context }) => {
    await instrument(context)
    const a = await context.newPage()
    const b = await context.newPage()
    await a.goto('/')
    await b.goto('/')
    await a.waitForTimeout(300)
    await resetCounters(a)
    await b.evaluate(() => localStorage.setItem('some-other-app', String(Date.now())))
    await expect.poll(async () => (await counters(a)).events).toBe(1)
    await a.waitForTimeout(300)
    expect((await counters(a)).savedReads).toBe(0)

    // A library key does refresh it.
    await b.evaluate(() => localStorage.removeItem('stem-explorer:recent'))
    await b.evaluate(() => localStorage.setItem('stem-explorer:recent', '[]'))
    await expect.poll(async () => (await counters(a)).savedReads).toBeGreaterThan(0)
  })
})

test.describe('failing writes', () => {
  test('a full storage keeps saved entries readable and openable, with accurate messages', async ({ context }) => {
    await instrument(context)
    const page = await context.newPage()
    await page.goto('/')
    await seed(page, 'saved', [entry('seed01-1', 'water', 'Water view'), entry('seed02-1', 'benzene', 'Benzene ring')])
    await page.reload()
    await page.evaluate(() => (window.__lib.failWrites = true))

    // Rename and remove fail; nothing disappears, and the message says why.
    await savedPanel(page).getByRole('button', { name: 'Rename Water view' }).click()
    await page.getByRole('textbox', { name: 'New name for Water view' }).fill('Changed')
    await page.keyboard.press('Enter')
    await expect(status(page)).toContainText('The name was not changed: this browser reports its storage is full')
    await page.getByRole('button', { name: 'Cancel renaming' }).click()
    await savedPanel(page).getByRole('button', { name: 'Remove Benzene ring' }).click()
    await expect(status(page)).toContainText('The entry was not removed: this browser reports its storage is full')
    await expect(savedPanel(page).getByRole('link')).toHaveCount(2)

    // Entries still open.
    await savedPanel(page).getByRole('link', { name: /Benzene ring/ }).click()
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')

    // Saving reports the failure (window.__lib survives in-app navigation).
    await page.getByRole('button', { name: 'Save exploration' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.save-status')).toContainText('Already saved as “Benzene ring”')
    await page.goto('/?molecule=methane#/chemistry')
    await page.evaluate(() => (window.__lib.failWrites = true))
    await page.getByRole('button', { name: 'Save exploration' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.save-status')).toContainText('The exploration was not saved: this browser reports its storage is full')

    await page.goto('/')
    await expect(savedPanel(page).getByRole('link')).toHaveCount(2)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('stem-explorer:saved')!).map((e: { title: string }) => e.title))
    expect(stored).toEqual(['Water view', 'Benzene ring'])
  })

  test('a failed history clear keeps the entries and says so', async ({ context }) => {
    await instrument(context)
    const page = await context.newPage()
    await page.goto('/')
    await seed(page, 'recent', [entry('rec001-1', 'ammonia', 'Ammonia · ball and stick')])
    await page.reload()
    await expect(recentPanel(page).getByRole('link')).toHaveCount(1)

    await page.evaluate(() => (window.__lib.failRemoves = true))
    await recentPanel(page).getByRole('button', { name: 'Clear history' }).click()
    await expect(status(page)).toContainText('History was not cleared')
    await expect(status(page)).not.toContainText('History cleared.')
    await expect(recentPanel(page).getByRole('link')).toHaveCount(1)

    await page.evaluate(() => (window.__lib.failRemoves = false))
    await recentPanel(page).getByRole('button', { name: 'Clear history' }).click()
    await expect(status(page)).toHaveText('History cleared.')
    await expect(recentPanel(page)).toHaveCount(0)
  })
})
