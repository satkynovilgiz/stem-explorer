import { expect, test } from './fixtures.ts'

const SUBJECTS = [
  ['anatomy', 'rgb(168, 71, 58)'],
  ['chemistry', 'rgb(11, 107, 95)'],
  ['biology', 'rgb(99, 74, 168)'],
  ['physics', 'rgb(45, 92, 168)'],
  ['mathematics', 'rgb(138, 90, 0)'],
] as const

for (const [id, colour] of SUBJECTS) {
  test(`${id} header: white mark icon, current tab in the subject's colour, two rows`, async ({ page }) => {
    await page.goto(`/#/${id}`)
    const bar = page.locator('.subject-bar')
    await expect(bar.locator('.chem-brand-mark')).toHaveCSS('color', 'rgb(255, 255, 255)')
    const current = bar.locator('.chem-nav-link[aria-current="page"]')
    await expect(current).toHaveCSS('color', 'rgb(255, 255, 255)')
    const pill = await current.evaluate((el) => getComputedStyle(el, '::after').backgroundColor)
    expect(pill).toBe(colour)
    // The tabs sit below the first row and the link stays a 44 px target.
    const main = (await bar.locator('.chem-bar-main').boundingBox())!
    const tab = (await current.boundingBox())!
    expect(tab.y).toBeGreaterThanOrEqual(main.y + main.height - 1)
    expect(tab.height).toBeGreaterThanOrEqual(44)
    await expect(bar.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' })).toBeVisible()
  })
}

test('the header stays on one screen width on a small phone, with the search filling its row', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto('/#/mathematics')
  const search = (await page.getByRole('searchbox', { name: 'Search mathematics' }).boundingBox())!
  expect(search.x + search.width).toBeLessThanOrEqual(320)
  expect(search.width).toBeGreaterThan(120)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})
