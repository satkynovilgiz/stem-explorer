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

/**
 * Back to Home with the in-page link: a subject's breadcrumb starts with "← Home"; other pages
 * have a Home link at the top. (There is no global header.)
 */
export async function goHome(page: Page) {
  await page.locator('.crumb-home, .home-link').first().click()
}

/** Names a module had in its page's Module buttons, and the word on the left menu now. */
const RAIL_NAMES: Record<string, string> = {
  'Body atlas': 'Whole body',
  'Heart (detailed)': 'Heart',
  'Breathing mechanics': 'Breathing',
  'DNA and RNA': 'DNA',
  'Energy processes': 'Energy',
  'DC circuit': 'Circuits',
  Projectile: 'Throwing',
  'Spring–mass': 'Springs',
  Wave: 'Waves',
  Optics: 'Lenses',
  'Gas (Boyle)': 'Gases',
  '2D functions': 'Graphs',
  'Vectors and transformations': 'Vectors',
  'Statistics and probability': 'Statistics',
  'Derivatives and motion': 'Motion',
}

/** A link in a subject's left menu (Anatomy, Biology, Physics or Mathematics), by either name. */
export function railLink(page: Page, subject: string, name: string) {
  return page.getByRole('navigation', { name: subject }).getByRole('link', { name: RAIL_NAMES[name] ?? name, exact: true })
}

/** Chemistry's section strip. */
export async function chemMenu(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Chemistry' })
  await expect(nav).toBeVisible()
  return nav
}

/** The Chemistry section marked as the current page, or '' if none. */
export async function chemCurrent(page: Page) {
  const current = (await chemMenu(page)).locator('[aria-current="page"]')
  return (await current.count()) ? ((await current.textContent()) ?? '').trim() : ''
}

/** Opens a subject the way a reader does without a header: Home, then the subject's card. */
export async function openSubject(page: Page, subject: 'anatomy' | 'chemistry' | 'biology' | 'physics' | 'mathematics') {
  if (!/#\/(home)?$/.test(new URL(page.url()).hash || '#/')) await goHome(page)
  await page.locator(`.subject-card.is-${subject} .subject-card-action`).click()
}

/**
 * Switches subject keeping each subject's state, without a header: ← Home, then the subject's
 * hash-only link in the Home footer (the query, which holds every subject's state, is kept).
 * Adds two history entries: Home, then the subject.
 */
export async function switchSubject(page: Page, subject: 'anatomy' | 'chemistry' | 'biology' | 'physics' | 'mathematics') {
  await goHome(page)
  await page.locator(`.home-footer a[href="#/${subject}"]`).click()
}
