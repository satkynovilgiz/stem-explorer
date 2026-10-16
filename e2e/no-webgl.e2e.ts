import { expect, test, waitForViewport } from './fixtures.ts'

// This project launches Chrome with --disable-3d-apis, so WebGL is unavailable.

test('Biology stays usable without WebGL and hides 3D-only controls', async ({ page }) => {
  await page.goto('/?structure=nucleus#/biology')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('.viewport-message')).toContainText('Every structure, its description and its sources remain available')
  await expect(page.getByRole('toolbar', { name: 'Cell view controls' })).toHaveCount(0)

  await expect(page.locator('#structure-heading')).toHaveText('Nucleus')
  await page.locator('.structure-item', { hasText: 'Lysosomes' }).click()
  await expect(page.locator('#structure-heading')).toHaveText('Lysosomes')
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org/)
})

test('Chemistry stays usable without WebGL', async ({ page }) => {
  await page.goto('/?molecule=benzene#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
})

test('Physics keeps inputs, playback, readouts and graphs without WebGL', async ({ page }) => {
  await page.goto('/#/physics')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('.viewport-message')).toContainText('inputs, playback controls, readouts and graphs below still work')
  await expect(page.getByRole('toolbar', { name: '3D view controls' })).toHaveCount(0)

  await page.getByRole('slider', { name: /^Time/ }).fill('1.2')
  await expect(page.locator('.graph-readout').first()).toContainText('At t = 1.20 s: y = 9.91 m')
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.status-tag')).toHaveText('Landed — values at impact', { timeout: 30_000 })
})

test('Mathematics keeps parameters, point evaluation and the slice graph without WebGL', async ({ page }) => {
  await page.goto('/?surface=sine&slice=x&at=1.5#/mathematics')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('Only the 3D view is unavailable')
  await expect(page.getByRole('toolbar', { name: '3D view controls' })).toHaveCount(0)
  await page.getByRole('slider', { name: 'Amplitude slider' }).fill('2')
  await expect(page.locator('.math-left .formula-display')).toHaveText('z = 2.00·sin(1.00·x)·cos(1.00·y)')
  const x = page.getByRole('textbox', { name: /^x/ })
  await x.fill('1.5708')
  await x.press('Enter')
  await expect(page.locator('.point-readout')).toContainText('≈ 2.000') // 2·sin(π/2)·cos(0)
  await expect(page.locator('.slice-graph desc')).toContainText('a sinusoidal wave')
})

test('Anatomy keeps the list, explanations, sources and tour without WebGL', async ({ page }) => {
  await page.goto('/?part=aorta#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('step-by-step blood-flow tour still work')
  await expect(page.getByRole('toolbar', { name: 'Heart view controls' })).toHaveCount(0)
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('#tour-heading')).toContainText('Right atrium')
  await page.getByRole('button', { name: 'Exit tour' }).click()
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org/)
})

test('Home works without WebGL and still opens explorers', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore science. See how it works.' })).toBeVisible()
  await expect(page.locator('.subject-art')).toHaveCount(5)
  await page.getByRole('searchbox', { name: 'Search everything you can explore' }).fill('aorta')
  await page.getByRole('list', { name: 'Search results' }).getByRole('link', { name: /Aorta/ }).first().click()
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
})

test('activities adapt honestly without WebGL instead of requiring the 3D view', async ({ page }) => {
  await page.goto('/#/chemistry')
  await waitForViewport(page)
  await page.locator('.activity-launch').click()
  await page.locator('.activity').getByRole('button', { name: 'Start activity' }).click()
  const panel = page.locator('.activity')
  // The Angle tool lives in the 3D toolbar, so these steps point to the Reported geometry table instead.
  await expect(panel).toContainText('The Angle tool works in the 3D view, which isn’t available in this browser')
  await expect(panel.getByRole('button', { name: 'I’ve explored this' })).toBeVisible()
  await panel.getByRole('button', { name: 'Next' }).click()
  await expect(panel).toContainText('Read the H–O–H angle in the Reported geometry table')
  await page.locator('.info').getByRole('tab', { name: 'Structure' }).click()
  await expect(page.locator('.info')).toContainText('104.5')

  // Biology: Isolate is 3D-only, so that step falls back to reading; list selection still detects.
  await page.goto('/#/biology')
  await waitForViewport(page)
  await page.locator('.activity-launch').click()
  await page.locator('.activity').getByRole('button', { name: 'Start activity' }).click()
  await page.locator('.structure-item', { hasText: 'Golgi apparatus' }).click()
  await expect(page.locator('.activity-status')).toHaveText('Done')
  await page.locator('.activity').getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.activity')).toContainText('Isolating needs the 3D view')
})

test('guides and the glossary work without WebGL', async ({ page }) => {
  await page.goto('/#/mathematics')
  await waitForViewport(page)
  await page.locator('.guide-toggle').click()
  await expect(page.locator('.guide')).toContainText('Measured, computed or illustrative?')
  await page.goto('/?term=vertical-trace#/glossary')
  await expect(page.locator('#term-vertical-trace')).toHaveClass(/is-focused/)
})
