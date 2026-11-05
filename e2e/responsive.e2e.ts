import type { Page } from '@playwright/test'
import { expect, test, chemMenu } from './fixtures.ts'

const overlapHeight = (page: Page, a: string, b: string) =>
  page.evaluate(
    ([first, second]) => {
      const x = document.querySelector(first)!.getBoundingClientRect()
      const y = document.querySelector(second)!.getBoundingClientRect()
      return Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top)
    },
    [a, b],
  )

test('explorers fit the window under the header, so the page itself does not scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  for (const url of ['/?molecule=water#/chemistry', '/#/physics', '/?msec=motion#/mathematics', '/?bsec=diffusion#/biology', '/#/anatomy']) {
    await page.goto(url)
    await expect(page.locator('.chem-stage')).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight))
      .toBeLessThanOrEqual(0)
  }
})

test('every row of the periodic table shows on a short laptop screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto('/?csec=periodic&el=26#/chemistry')
  await expect(page.getByRole('button', { name: /^Francium/ })).toBeVisible()
  const lawrencium = page.getByRole('button', { name: /^Lawrencium/ })
  await lawrencium.scrollIntoViewIfNeeded()
  await lawrencium.click()
  await expect(page).toHaveURL(/el=103/)
  expect(await overlapHeight(page, '.ptable-scroll', '.ptable-legend')).toBeLessThanOrEqual(0)
})

test('the statistics charts keep their height, with no text over them', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/?msec=statistics#/mathematics')
  await expect(page.locator('.stat-svg').first()).toBeVisible()
  expect(await overlapHeight(page, '.stat-svg', '.stat-svg + p')).toBeLessThanOrEqual(0)
})

test('Chemistry’s section strip stays on the left of a landscape iPad, every item in view', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.goto('/?molecule=water#/chemistry')
  const links = (await chemMenu(page)).getByRole('link')
  await expect(links).toHaveCount(6)
  for (const link of await links.all()) {
    const box = (await link.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(112)
    expect(box.y + box.height).toBeLessThanOrEqual(768)
  }
})

test('the smallest phones do not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  for (const url of ['/?molecule=water#/chemistry', '/#/physics', '/?experiment=spring#/physics', '/#/mathematics', '/?heart=whole#/anatomy']) {
    await page.goto(url)
    await expect(page.locator('.chem-stage')).toBeVisible()
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), url).toBeLessThanOrEqual(1)
  }
})
