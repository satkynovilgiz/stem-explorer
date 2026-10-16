import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }))
  expect(scroll).toBeLessThanOrEqual(width)
}

async function smallTargets(page: Page, selector: string) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ name: el.getAttribute('aria-label') || el.textContent?.trim(), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.height < 40 || r.width < 40)
      .map(({ name, r }) => `${name} ${Math.round(r.width)}×${Math.round(r.height)}`)
  }, selector)
}

test('Biology on a phone: prominent viewport, tabs, touch-sized controls, no overflow', async ({ page }) => {
  await page.goto('/#/biology')
  await waitForViewport(page)
  const viewport = (await page.locator('.viewport').boundingBox())!
  expect(viewport.height).toBeGreaterThanOrEqual(300)
  await expectNoHorizontalOverflow(page)
  expect(await smallTargets(page, '.scene-controls button, .tab, .subject-link')).toEqual([])

  await page.getByRole('tab', { name: 'Structures' }).click()
  await page.locator('.structure-item', { hasText: 'Golgi apparatus' }).click()
  // Choosing a structure returns to the details tab.
  await expect(page.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#structure-heading')).toHaveText('Golgi apparatus')
  await expectNoHorizontalOverflow(page)

  // The page itself still scrolls below the viewport.
  const before = await page.evaluate(() => window.scrollY)
  await page.evaluate(() => window.scrollBy(0, 600))
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before)
})

test('Chemistry on a phone still measures without overflow', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Angle' }).click()
  for (const id of ['H1', 'O1', 'H2']) {
    await page.locator('.measure-panel .chip').filter({ hasText: new RegExp(`^\\d?${id}$`) }).click()
  }
  await expect(page.locator('.measure-result')).toContainText('104.5°')
  await expectNoHorizontalOverflow(page)
})

test('Physics on a phone: inputs, playback and graphs are reachable without overflow', async ({ page }) => {
  await page.goto('/#/physics')
  await waitForViewport(page)
  await expectNoHorizontalOverflow(page)
  expect(await smallTargets(page, '.playback button, .scene-controls button, .tab, .param-input')).toEqual([])

  await page.getByRole('slider', { name: 'Launch angle slider' }).fill('30')
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(page.getByRole('button', { name: /Launch again/ })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('tab', { name: 'Graphs' }).click()
  await expect(page.locator('.graph')).toHaveCount(2)
  await expect(page.locator('.graph-readout').first()).toContainText('At t = 2.04 s')
  await page.getByRole('tab', { name: 'Results' }).click()
  await expect(page.locator('.stats > div', { hasText: 'Flight time' }).locator('dd')).toHaveText('2.04 s')
  await expectNoHorizontalOverflow(page)
})

test('Mathematics on a phone: tabs, parameters, point entry and slice graph without overflow', async ({ page }) => {
  await page.goto('/#/mathematics')
  await waitForViewport(page)
  await expectNoHorizontalOverflow(page)
  expect(await smallTargets(page, '.scene-controls button, .tab, .param-input')).toEqual([])
  await page.locator('.surface-item', { hasText: 'Saddle' }).click()
  await page.getByRole('slider', { name: 'Upward curvature in x slider' }).fill('1')
  await expect(page.locator('.formula-display')).toContainText('z = 1.00·x² − 0.50·y²')

  await page.getByRole('tab', { name: 'Explore' }).click()
  const x = page.getByRole('textbox', { name: /^x/ })
  await x.fill('1')
  await x.press('Enter')
  await expect(page.locator('.point-readout')).toContainText('≈ 1.000')
  await page.getByRole('button', { name: 'Show cross-section' }).click()
  await expect(page.locator('.slice-graph')).toBeVisible()
  await expectNoHorizontalOverflow(page)
})

test('Anatomy on a phone: tabs, list selection and the tour without overflow', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await expectNoHorizontalOverflow(page)
  expect(await smallTargets(page, '.scene-controls button, .tab, .subject-link')).toEqual([])
  await page.getByRole('tab', { name: 'Structures' }).click()
  await page.locator('.structure-item', { hasText: 'Left atrium' }).click()
  await expect(page.locator('#part-heading')).toHaveText('Left atrium')
  await page.getByRole('tab', { name: 'Structures' }).click()
  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('#tour-heading')).toContainText('Right atrium')
  await expectNoHorizontalOverflow(page)
})

test('Home fits a phone, searches and opens a subject', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore science. See how it works.' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  await page.getByRole('searchbox', { name: 'Search everything you can explore' }).fill('ribosome')
  await page.getByRole('list', { name: 'Search results' }).getByRole('link', { name: /Ribosome/ }).first().tap()
  await expect(page).toHaveURL(/#\/biology$/)
  await page.getByRole('link', { name: 'STEM Explorer home' }).tap()
  await page.locator('.subject-card.is-physics').getByRole('link').tap()
  await expect(page.getByRole('heading', { level: 1, name: 'Physics Explorer: projectile motion lab' })).toBeAttached()
})
