import type { Page } from '@playwright/test'
import { expect, pressed, search, test, waitForViewport } from './fixtures.ts'

const card = (page: Page, name: string) =>
  page.locator('.molecule-card').filter({ has: page.locator('.molecule-card-name', { hasText: new RegExp(`^${name}$`) }) })
const chip = (page: Page, atomId: string) =>
  page.locator('.measure-panel .chip').filter({ hasText: new RegExp(`^\\d?${atomId}$`) })
const result = (page: Page) => page.locator('.measure-result')

test('Chemistry share links still restore molecule and display mode', async ({ page }) => {
  await page.goto('/?molecule=benzene&view=space-filling#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await pressed(page.getByRole('button', { name: 'Space-filling' }))
})

test('Chemistry ignores Biology parameters and falls back on invalid values', async ({ page }) => {
  await page.goto('/?structure=golgi&cell=whole&molecule=gold#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('#molecule-heading')).toHaveText('Water')
  await pressed(page.getByRole('button', { name: 'Ball & stick' }))
  const params = await search(page)
  expect(params.get('molecule')).toBe('water')
  // Biology's keys are left for Biology; Chemistry does not read or remove them.
  expect(params.get('structure')).toBe('golgi')
})

test('selects all six molecules', async ({ page }) => {
  await page.goto('/#/chemistry')
  await waitForViewport(page)
  const atoms: Record<string, number> = { Water: 3, 'Carbon dioxide': 3, Methane: 5, Ammonia: 4, Ethanol: 9, Benzene: 12 }
  for (const [name, count] of Object.entries(atoms)) {
    await card(page, name).click()
    await expect(page.locator('#molecule-heading')).toHaveText(name)
    await expect(page.locator('.data-table tfoot td')).toHaveText(String(count))
  }
})

test('distance and angle measurements still work', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance' }).click()
  await chip(page, 'O1').click()
  await chip(page, 'H1').click()
  await expect(result(page)).toContainText('Bond length')
  await expect(result(page)).toContainText('0.958 Å')

  await page.getByRole('button', { name: 'Angle' }).click()
  await chip(page, 'H1').click()
  await chip(page, 'O1').click()
  await chip(page, 'H2').click()
  await expect(result(page)).toContainText('Bond angle')
  await expect(result(page)).toContainText('104.5°')

  // Switching molecules clears the measurement.
  await card(page, 'Benzene').click()
  await expect(page.locator('.measure-slot-value').first()).toHaveText('—')
})

test('Copy link copies a Chemistry-only link from the current origin', async ({ page, baseURL }) => {
  await page.goto('/?structure=golgi&molecule=ammonia#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.locator('.copy-link-status')).toContainText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseURL}/?molecule=ammonia&view=ball-and-stick#/chemistry`,
  )
})

test('remaining subjects are still honest Coming soon pages', async ({ page }) => {
  for (const subject of ['anatomy', 'physics', 'mathematics']) {
    await page.goto(`/#/${subject}`)
    await expect(page.locator('#coming-soon-title')).toContainText('Explorer')
    await expect(page.locator('main input, main canvas')).toHaveCount(0)
  }
})
