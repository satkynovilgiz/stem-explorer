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
