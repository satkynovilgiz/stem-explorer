import { expect, goHome, test } from './fixtures.ts'

const intro = (page: import('@playwright/test').Page) => page.getByTestId('subject-intro')

test.describe('Subject opening animation', () => {
  for (const id of ['anatomy', 'chemistry', 'biology', 'physics', 'mathematics']) {
    test(`${id}: plays when opened from Home, stays out of the way, then goes`, async ({ page }) => {
      await page.goto('/')
      await page.locator(`.subject-card.is-${id} .subject-card-action`).click()
      const overlay = page.locator(`.subject-intro.is-${id}`)
      await expect(overlay).toBeVisible()
      await expect(overlay).toHaveAttribute('aria-hidden', 'true')
      await expect(overlay).toHaveCSS('pointer-events', 'none')
      await expect(overlay.locator('svg > *').first()).toBeAttached()
      await expect(intro(page)).toHaveCount(0)
      await expect(page.locator('main')).toBeVisible()
    })
  }

  test('plays again on each visit, but not on a tab change inside the subject', async ({ page }) => {
    await page.goto('/')
    await page.locator('.subject-card.is-physics .subject-card-action').click()
    await expect(intro(page)).toBeVisible()
    await expect(intro(page)).toHaveCount(0)

    await page.evaluate(() => (window.location.hash = '#/physics'))
    await expect(page).toHaveURL(/#\/physics$/)
    await expect(intro(page)).toHaveCount(0)

    await goHome(page)
    await page.locator('.subject-card.is-physics .subject-card-action').click()
    await expect(intro(page)).toBeVisible()
  })

  test('does not play on a direct link or reload', async ({ page }) => {
    await page.goto('/?csec=topics#/chemistry')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
  })

  test('does not play with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.locator('.subject-card.is-chemistry .subject-card-action').click()
    await expect(page).toHaveURL(/#\/chemistry/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
  })
})
