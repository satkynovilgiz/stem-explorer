import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from './fixtures.ts'
import { DESIGN_PAGES, DESIGN_SIZES } from './design-pages.ts'

/**
 * Screenshots of every design page at phone, tablet and laptop size, for the design review on
 * each pull request. Runs only when DESIGN_SHOTS names a folder to save into:
 *
 *   DESIGN_SHOTS=design-shots/pr npx playwright test --project=desktop e2e/design-shots.e2e.ts
 *
 * Motion is switched off (reduced motion, CSS animations frozen) so two runs of the same build
 * give the same pictures, and a change in a picture means the design changed.
 */
const OUT = process.env.DESIGN_SHOTS

test.describe('Design screenshots', () => {
  test.skip(!OUT, 'Set DESIGN_SHOTS to a folder to take the design screenshots')

  for (const size of DESIGN_SIZES) {
    for (const p of DESIGN_PAGES) {
      test(`${p.name} @ ${size.name}`, async ({ page }) => {
        await mkdir(OUT!, { recursive: true })
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(p.url)
        await expect(page.locator('.subject-bar, .home-hero, .subject-card').first()).toBeVisible()
        // 3D views draw a few frames before they settle; fonts load once.
        if (await page.locator('.chem-stage canvas').count()) await expect(page.locator('.viewport-badge, .viewport-message').first()).toBeVisible({ timeout: 30_000 })
        await page.evaluate(() => document.fonts.ready)
        await page.mouse.move(0, 0)
        await page.waitForTimeout(800)
        // 3D models are drawn by software WebGL and differ by a few pixels between runs, so they
        // are covered by a flat box; the 3D views have their own picture tests.
        await page.screenshot({
          path: join(OUT!, `${p.name}--${size.name}.png`),
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          mask: [page.locator('.chem-stage canvas')],
          maskColor: '#c9d3d1',
        })
      })
    }
  }
})
