import type { BrowserContext, Page } from '@playwright/test'

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

export async function instrument(context: BrowserContext) {
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

export const counters = (page: Page) => page.evaluate(() => ({ ...window.__lib }))
export const resetCounters = (page: Page) =>
  page.evaluate(() => Object.assign(window.__lib, { sets: 0, removes: 0, savedReads: 0, events: 0 }))
export const savedPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) })
export const recentPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Continue exploring' }) })
export const status = (page: Page) => page.locator('.library-status')

export function entry(id: string, molecule: string, title: string) {
  const t = '2026-10-15T10:00:00.000Z'
  return { id, version: 1, subject: 'chemistry', params: { molecule, view: 'ball-and-stick' }, title, createdAt: t, updatedAt: t }
}

export async function seed(page: Page, key: 'saved' | 'recent', entries: object[]) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`stem-explorer:${key}`, JSON.stringify(entries)] as const)
}

