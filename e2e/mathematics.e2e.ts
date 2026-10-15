import type { Page } from '@playwright/test'
import { canvasShot, expect, parkMouse, search, stableCanvasShot, test, waitForViewport } from './fixtures.ts'

const preset = (page: Page, name: string) => page.locator('.surface-item').filter({ hasText: name })
const heading = (page: Page) => page.locator('#math-heading')
const substituted = (page: Page) => page.locator('.math-left .formula-display')
const field = (page: Page, label: RegExp) => page.getByRole('textbox', { name: label })
const readout = (page: Page, name: string) =>
  page.locator('.point-readout .readout > div').filter({ has: page.getByText(name, { exact: true }) }).locator('dd')
const graph = (page: Page) => page.locator('.slice-graph')

async function type(page: Page, label: RegExp, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/mathematics')
  await waitForViewport(page)
})

test('switches between all four presets, each with its own defaults', async ({ page }) => {
  const expected: [string, string, string][] = [
    ['Plane', 'z = a·x + b·y + c', 'z = 0.50·x − 0.25·y + 1.00'],
    ['Elliptic paraboloid', 'z = a·x² + b·y²', 'z = 0.50·x² + 0.50·y²'],
    ['Saddle', 'z = a·x² − b·y²', 'z = 0.50·x² − 0.50·y²'],
    ['Sinusoidal surface', 'z = A·sin(k·x)·cos(k·y)', 'z = 1.00·sin(1.00·x)·cos(1.00·y)'],
  ]
  for (const [name, formula, withValues] of expected) {
    await preset(page, name).click()
    await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'true')
    await expect(heading(page)).toContainText(name)
    await expect(page.locator('.info-header .formula-display')).toHaveText(formula)
    await expect(substituted(page)).toHaveText(withValues)
  }
})

test('edits and resets parameters; partial typing never changes the model', async ({ page }) => {
  await page.getByRole('slider', { name: 'Curvature in x slider' }).fill('1')
  await expect(substituted(page)).toHaveText('z = 1.00·x² + 0.50·y²')
  expect((await search(page)).get('a')).toBe('1')

  const b = field(page, /^Curvature in y/)
  await b.fill('1.')
  await expect(page.locator('.param-hint.is-error')).toHaveText('Not a complete number yet.')
  await b.blur()
  await expect(substituted(page)).toHaveText('z = 1.00·x² + 0.50·y²')

  await type(page, /^Curvature in y/, '9')
  await expect(substituted(page)).toHaveText('z = 1.00·x² + 1.50·y²') // clamped to the range maximum

  await page.getByRole('button', { name: 'Reset parameters' }).click()
  await expect(substituted(page)).toHaveText('z = 0.50·x² + 0.50·y²')
})

test('inspects a point typed by coordinates, evaluating z from the formula', async ({ page }) => {
  await type(page, /^x/, '1')
  await type(page, /^y/, '-1')
  await expect(readout(page, 'z = f(x, y)')).toHaveText('≈ 1.000') // 0.5·1² + 0.5·(−1)²
  await expect(page.locator('.substitution')).toContainText('z = 0.50·(1.00)² + 0.50·(−1.00)² ≈ 1.000')

  // The point stays on the surface when the parameters change.
  await page.getByRole('slider', { name: 'Curvature in x slider' }).fill('1.5')
  await expect(readout(page, 'z = f(x, y)')).toHaveText('≈ 2.000') // 1.5·1 + 0.5·1

  await type(page, /^x/, '5')
  await expect(page.locator('.inline-note')).toContainText('Limited to the drawn domain')
  await expect(readout(page, 'x')).toHaveText('2.00')
  await page.getByRole('button', { name: 'Clear point' }).click()
  await expect(page.locator('.point-readout')).toHaveCount(0)
})

test('clicking the surface picks a point whose z comes from the function', async ({ page }) => {
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.6)
  await expect(page.locator('.point-readout')).toBeVisible()
  const x = parseFloat((await readout(page, 'x').textContent())!.replace('−', '-'))
  const y = parseFloat((await readout(page, 'y').textContent())!.replace('−', '-'))
  const z = parseFloat((await readout(page, 'z = f(x, y)').textContent())!.replace('≈', '').replace('−', '-'))
  expect(Math.abs(x)).toBeLessThanOrEqual(2)
  expect(Math.abs(y)).toBeLessThanOrEqual(2)
  // Displayed x and y are rounded to 0.01, so allow for that rounding.
  expect(Math.abs(z - (0.5 * x * x + 0.5 * y * y))).toBeLessThan(0.02)
  await expect(page.locator('.math-label.is-point')).toHaveText('P')
})

test('cross-section controls, formula, graph and table stay in sync', async ({ page }) => {
  await page.getByRole('button', { name: 'Show cross-section' }).click()
  await expect(graph(page).locator('.graph-title')).toHaveText('Cross-section at x = 0.00: z as a function of y')
  await expect(graph(page).locator('.slice-formula')).toContainText('z = 0.50·y²')
  await expect(graph(page).locator('.graph-axis').first()).toHaveText('y (horizontal axis)')

  await page.getByRole('button', { name: 'y = constant' }).click()
  await page.getByRole('slider', { name: 'Slice position y slider' }).fill('1')
  await expect(graph(page).locator('.graph-title')).toHaveText('Cross-section at y = 1.00: z as a function of x')
  await expect(graph(page).locator('.graph-axis').first()).toHaveText('x (horizontal axis)')
  await expect(page.locator('.info-section .slice-formula')).toContainText('z = 0.50·x² + 0.50')
  await expect(graph(page).locator('.slice-formula')).toContainText('z = 0.50·x² + 0.50')
  // At x = 0 the slice value is 0.5·0² + 0.5·1² = 0.5.
  await expect(graph(page).locator('.slice-table tbody td').nth(2)).toHaveText('0.500')
  await expect(graph(page).locator('desc')).toContainText('a parabola opening upward')
  const q = await search(page)
  expect([q.get('slice'), q.get('at')]).toEqual(['y', '1'])

  await page.getByRole('button', { name: 'Hide cross-section' }).click()
  await expect(graph(page)).toHaveCount(0)
})

test('describes straight-line, constant, downward and sinusoidal slices', async ({ page }) => {
  await page.goto('/?surface=plane&b=0&slice=x&at=1#/mathematics')
  await waitForViewport(page)
  await expect(graph(page).locator('desc')).toContainText('a constant (horizontal line): z = 1.50') // 0.5·1 + 1
  await page.goto('/?surface=plane&slice=y&at=0#/mathematics')
  await waitForViewport(page)
  await expect(graph(page).locator('desc')).toContainText('a straight line')
  await page.goto('/?surface=saddle&slice=x&at=0#/mathematics')
  await waitForViewport(page)
  await expect(graph(page).locator('desc')).toContainText('a parabola opening downward')
  await page.goto('/?surface=sine&slice=x&at=0#/mathematics')
  await waitForViewport(page)
  await expect(graph(page).locator('desc')).toContainText('a constant (horizontal line): z = 0')
  await page.getByRole('slider', { name: 'Slice position x slider' }).fill('1.5')
  await expect(graph(page).locator('desc')).toContainText('a sinusoidal wave')
})

test('camera presets change the view; Fit surface and Reset camera restore framing', async ({ page }) => {
  await parkMouse(page)
  const initial = await stableCanvasShot(page, true)
  await page.getByRole('button', { name: 'Top', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Top', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)
  await expect(page.locator('.viewport-badge-mode')).toContainText('Orthographic top view')

  await page.getByRole('button', { name: 'Perspective' }).click()
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(true)

  // Zoom in with the wheel, then Fit surface frames the whole surface again (same direction).
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, -400)
  await parkMouse(page)
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)
  // A parameter edit does not move the camera back.
  await page.getByRole('slider', { name: 'Curvature in x slider' }).fill('0.6')
  await page.getByRole('slider', { name: 'Curvature in x slider' }).fill('0.5')
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)
  await page.getByRole('button', { name: 'Fit surface' }).click()
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(true)

  // Rotate, then Reset camera returns to the default direction.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 30, { steps: 8 })
  await page.mouse.up()
  await parkMouse(page)
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)
  await page.getByRole('button', { name: 'Reset camera' }).click()
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(true)
})

test('grid lines toggle and height legend', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Grid lines' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Grid lines' }).click()
  await expect(page.getByRole('button', { name: 'Grid lines' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.height-legend-ticks')).toContainText('4.00') // paraboloid max on [−2, 2]²
  await page.goto('/?surface=sine&amp=0#/mathematics')
  await waitForViewport(page)
  await expect(page.locator('.height-legend-constant')).toHaveText('constant z = 0.00')
})

test.describe('URL state', () => {
  test('restores preset, parameters and slice', async ({ page }) => {
    await page.goto('/?surface=saddle&a=1.2&b=0.3&slice=y&at=0.5#/mathematics')
    await waitForViewport(page)
    await expect(heading(page)).toContainText('Saddle')
    await expect(substituted(page)).toHaveText('z = 1.20·x² − 0.30·y²')
    await expect(graph(page).locator('.graph-title')).toContainText('y = 0.50')
  })

  test('falls back for invalid values and corrects the address', async ({ page }) => {
    await page.goto('/?surface=torus&a=-4&slice=q#/mathematics')
    await waitForViewport(page)
    await expect(heading(page)).toContainText('Elliptic paraboloid')
    await expect(substituted(page)).toHaveText('z = 0.50·x² + 0.50·y²')
    await expect(graph(page)).toHaveCount(0)
    const q = await search(page)
    expect([q.get('surface'), q.get('a'), q.has('slice')]).toEqual(['paraboloid', '0.5', false])
  })

  test('keeps subjects separate across switching, Back/Forward and refresh', async ({ page }) => {
    await page.goto('/?speed=15&angle=30&molecule=benzene#/physics')
    await waitForViewport(page)
    await page.getByRole('link', { name: /^Mathematics/ }).click()
    await waitForViewport(page)
    await preset(page, 'Sinusoidal surface').click()
    await page.getByRole('slider', { name: 'Amplitude slider' }).fill('1.5')

    await page.getByRole('link', { name: /^Physics/ }).click()
    await waitForViewport(page)
    await expect(page.getByRole('textbox', { name: /^Launch speed/ })).toHaveValue('15.0')

    await page.goBack()
    await waitForViewport(page)
    await expect(substituted(page)).toHaveText('z = 1.50·sin(1.00·x)·cos(1.00·y)')
    await page.goBack()
    await waitForViewport(page)
    await expect(page.getByRole('textbox', { name: /^Launch angle/ })).toHaveValue('30')
    await page.goForward()
    await waitForViewport(page)
    await expect(substituted(page)).toHaveText('z = 1.50·sin(1.00·x)·cos(1.00·y)')
    await page.reload()
    await waitForViewport(page)
    await expect(substituted(page)).toHaveText('z = 1.50·sin(1.00·x)·cos(1.00·y)')

    await page.getByRole('link', { name: /^Chemistry/ }).click()
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  })

  test('slider movement does not add history entries', async ({ page }) => {
    const before = await page.evaluate(() => history.length)
    for (const v of ['0.6', '0.8', '1', '1.2']) await page.getByRole('slider', { name: 'Curvature in x slider' }).fill(v)
    expect(await page.evaluate(() => history.length)).toBe(before)
  })

  test('Copy link copies a Mathematics-only link from the current origin', async ({ page, baseURL }) => {
    await page.goto('/?molecule=water&speed=10#/mathematics')
    await waitForViewport(page)
    await preset(page, 'Plane').click()
    await page.getByRole('button', { name: 'Show cross-section' }).click()
    await page.getByRole('button', { name: 'Copy link' }).click()
    await expect(page.locator('.copy-link-status')).toContainText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${baseURL}/?surface=plane&a=0.5&b=-0.25&c=1&slice=x&at=0#/mathematics`,
    )
  })
})
