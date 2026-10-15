import { test as base, expect, type Locator, type Page } from '@playwright/test'

/**
 * Known, harmless warnings; everything else counts as a failure.
 * - React Three Fiber 9.8.2 creates `new THREE.Clock()` internally and three.js ≥ r183 warns about it.
 * - Chrome's GPU driver logs a performance note when a test screenshot reads pixels back from WebGL.
 */
const KNOWN_WARNINGS = [
  /THREE\.Clock: This module has been deprecated/,
  /GL Driver Message \(OpenGL, Performance, .*\): GPU stall due to ReadPixels/,
]

export const test = base.extend<{ consoleProblems: string[] }>({
  consoleProblems: [
    async ({ page }, use) => {
      const problems: string[] = []
      page.on('console', (msg) => {
        if (msg.type() !== 'error' && msg.type() !== 'warning') return
        if (KNOWN_WARNINGS.some((re) => re.test(msg.text()))) return
        problems.push(`${msg.type()}: ${msg.text()}`)
      })
      page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
      await use(problems)
      expect(problems, 'unexpected console errors or warnings').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Waits until the 3D view has rendered (or reported that it cannot). */
export async function waitForViewport(page: Page) {
  // Software WebGL in parallel workers can take a while to start.
  await expect(page.locator('.viewport-badge, .viewport-message').first()).toBeVisible({ timeout: 30_000 })
}

/**
 * A clip of the canvas inset by a few pixels, so rounded-corner anti-aliasing is ignored.
 * With `withoutLabels`, the DOM label layer is hidden for the shot: Chrome may rasterize identical
 * transformed text slightly differently after an animation, so label positions are compared as data.
 */
export async function canvasShot(page: Page, withoutLabels = false): Promise<Buffer> {
  const box = (await page.locator('canvas').boundingBox())!
  return page.screenshot({
    clip: { x: box.x + 4, y: box.y + 4, width: box.width - 8, height: box.height - 8 },
    style: withoutLabels ? '.label-layer { display: none !important; }' : undefined,
  })
}

/** A canvas screenshot taken once two consecutive frames are identical (fonts, labels and camera settled). */
export async function stableCanvasShot(page: Page, withoutLabels = false): Promise<Buffer> {
  let previous = await canvasShot(page, withoutLabels)
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(250)
    const next = await canvasShot(page, withoutLabels)
    if (next.equals(previous)) return next
    previous = next
  }
  throw new Error('Canvas did not settle')
}

/** Inline transforms of scene labels — their exact placement, independent of text rasterization. */
export async function labelTransforms(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((el) => `${el.textContent} ${(el as HTMLElement).style.transform}`))
}

/** Moves the mouse onto empty canvas space so hover highlights do not affect screenshots. */
export async function parkMouse(page: Page) {
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + 12, box.y + box.height - 12)
}

/** Visible scene labels and whether any two of them overlap. */
export async function visibleLabels(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const rects = [...document.querySelectorAll<HTMLElement>(sel)]
      .filter((el) => getComputedStyle(el).visibility === 'visible')
      .map((el) => ({ text: el.textContent ?? '', r: el.getBoundingClientRect() }))
    const overlapping = rects.some((a, i) =>
      rects.some(
        (b, j) => j > i && a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom,
      ),
    )
    return { texts: rects.map((r) => r.text), overlapping }
  }, selector)
}

export function pressed(locator: Locator) {
  return expect(locator).toHaveAttribute('aria-pressed', 'true')
}

export async function search(page: Page): Promise<URLSearchParams> {
  return new URLSearchParams(await page.evaluate(() => window.location.search))
}
