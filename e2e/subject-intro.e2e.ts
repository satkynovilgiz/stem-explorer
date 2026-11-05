import type { Page } from '@playwright/test'
import { expect, goHome, test } from './fixtures.ts'

const intro = (page: Page) => page.getByTestId('subject-intro')
const open = (page: Page, id: string) => page.locator(`.subject-card.is-${id} .subject-card-action`).click()

test.describe('Subject intro', () => {
  for (const id of ['anatomy', 'chemistry', 'biology', 'physics', 'mathematics']) {
    test(`${id}: plays inside the header mark, hidden from assistive technology, then ends`, async ({ page }) => {
      await page.goto('/')
      await open(page, id)
      await expect(intro(page)).toBeVisible()
      await expect(page.locator('.chem-brand-mark')).toHaveAttribute('aria-hidden', 'true')
      const mark = (await page.locator('.chem-brand-mark').boundingBox())!
      const scene = (await intro(page).boundingBox())!
      expect(scene.width).toBeLessThanOrEqual(mark.width)
      expect(scene.height).toBeLessThanOrEqual(mark.height)
      await expect(intro(page)).toHaveCount(0)
      await expect(page.locator('.chem-brand-mark > svg')).toHaveCSS('opacity', '1')
    })
  }

  test('the page is usable at once: search works during the intro, with no layer on top and focus untouched', async ({ page }) => {
    await page.goto('/')
    await open(page, 'physics')
    await expect(intro(page)).toBeVisible()
    await page.getByRole('link', { name: 'Projectile motion' }).click()
    await page.getByRole('searchbox', { name: 'Search physics' }).fill('wave')
    await expect(page.getByRole('searchbox', { name: 'Search physics' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/sq=wave/)
    // Only the mark's own scene could cover anything, and nothing fixed fills the window.
    const covering = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.position === 'fixed' && r.width >= innerWidth && r.height >= innerHeight }).length)
    expect(covering).toBe(0)
  })

  test('the header does not move when the intro starts or ends', async ({ page }) => {
    await page.goto('/')
    await open(page, 'chemistry')
    await expect(intro(page)).toBeVisible()
    const during = (await page.locator('.chem-brand').boundingBox())!
    const barDuring = (await page.locator('.subject-bar').boundingBox())!
    await expect(intro(page)).toHaveCount(0)
    expect(await page.locator('.chem-brand').boundingBox()).toEqual(during)
    expect(await page.locator('.subject-bar').boundingBox()).toEqual(barDuring)
  })

  test('Home → Chemistry → Home → Chemistry plays once', async ({ page }) => {
    await page.goto('/')
    await open(page, 'chemistry')
    await expect(intro(page)).toBeVisible()
    await goHome(page)
    await open(page, 'chemistry')
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(page.locator('.chem-brand-mark.has-intro')).toHaveCount(0)
  })

  test('switching subjects plays each once; Back and Forward play nothing', async ({ page }) => {
    await page.goto('/')
    await open(page, 'biology')
    await expect(intro(page)).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await goHome(page)
    await open(page, 'physics')
    await expect(intro(page)).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await page.goBack()
    await page.goBack()
    await expect(page.locator('.subject-bar.is-biology')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await page.goForward()
    await page.goForward()
    await expect(page.locator('.subject-bar.is-physics')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
  })

  test('a direct link and a reload never play, and Back to a subject first opened by link plays nothing', async ({ page }) => {
    await page.goto('/?csec=topics#/chemistry')
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await goHome(page)
    await expect(page.locator('.subject-card.is-chemistry')).toBeVisible()
    await page.goBack()
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
  })

  test('a tab change does not play or restart it', async ({ page }) => {
    await page.goto('/')
    await open(page, 'chemistry')
    await expect(intro(page)).toBeVisible()
    await page.locator('.chem-nav-link', { hasText: 'Elements' }).click()
    await expect(page.locator('.chem-nav-link[aria-current="page"]')).toHaveText('Elements')
    await expect(intro(page)).toHaveCount(0)
  })

  test('reduced motion: never plays, and turning it on stops a running intro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await open(page, 'chemistry')
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(intro(page)).toHaveCount(0)
    await goHome(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await open(page, 'physics')
    await expect(intro(page)).toBeVisible()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(intro(page)).toHaveCount(0)
  })

  test('without session storage it still works and does not repeat within the page', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('blocked') } })
    })
    await page.goto('/')
    await open(page, 'chemistry')
    await expect(intro(page)).toBeVisible()
    await goHome(page)
    await open(page, 'chemistry')
    await expect(page.locator('.subject-bar.is-chemistry')).toBeVisible()
    await expect(page.locator('.chem-brand-mark.has-intro')).toHaveCount(0)
  })
})
