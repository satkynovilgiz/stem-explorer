import { expect, test } from './fixtures.ts'

const SUBJECTS = [
  ['anatomy', 'Anatomy'],
  ['biology', 'Biology'],
  ['physics', 'Physics'],
  ['mathematics', 'Mathematics'],
] as const

for (const [id, name] of SUBJECTS) {
  test(`${id} header: one row, the name once beside Home, and a white mark`, async ({ page }) => {
    await page.goto(`/#/${id}`)
    const bar = page.locator('.subject-bar')
    await expect(bar.locator('.chem-brand-mark')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(bar.getByText(name, { exact: true })).toHaveCount(1)
    const home = (await bar.getByRole('link', { name: 'Home' }).boundingBox())!
    const subject = (await bar.getByRole('link', { name, exact: true }).boundingBox())!
    expect(home.height).toBeGreaterThanOrEqual(44)
    expect(Math.abs(home.y + home.height / 2 - (subject.y + subject.height / 2))).toBeLessThanOrEqual(2)
    // The sections are in the left menu now, not a second row of tabs.
    await expect(bar.locator('.chem-nav-link')).toHaveCount(0)
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
