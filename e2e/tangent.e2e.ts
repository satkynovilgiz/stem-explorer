import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const slope = (page: Page) => page.locator('section.info-section', { has: page.getByRole('heading', { name: 'Local slope at P' }) })
const value = (page: Page, label: string) => slope(page).locator('.readout > div').filter({ hasText: label }).locator('dd')
async function setPoint(page: Page, x: string, y: string) {
  for (const [label, v] of [[/^x/, x], [/^y/, y]] as const) {
    const f = page.getByRole('textbox', { name: label })
    await f.fill(v)
    await f.press('Enter')
  }
}

test('shows partial derivatives, gradient and the substituted tangent plane at the point', async ({ page }) => {
  await page.goto('/?surface=paraboloid#/mathematics')
  await waitForViewport(page)
  await expect(slope(page)).toHaveCount(0)
  await setPoint(page, '1', '-0.5')
  await expect(value(page, '∂f/∂x = 2a·x')).toHaveText('1.000')
  await expect(value(page, '∂f/∂y = 2b·y')).toHaveText('−0.500')
  await expect(value(page, 'Steepest slope')).toHaveText('1.118')
  await expect(slope(page).locator('.tangent-equation')).toHaveText('z = 0.625 + 1·(x − 1) − 0.5·(y + 0.5)')
  await expect(slope(page)).toContainText('It is not the surface normal')
  // Changing a parameter updates the derivatives.
  await page.getByRole('slider', { name: 'Curvature in x slider' }).fill('1')
  await expect(value(page, '∂f/∂x = 2a·x')).toHaveText('2.000')
})

test('the saddle origin has zero gradient and a horizontal tangent plane, with an explanation', async ({ page }) => {
  await page.goto('/?surface=saddle#/mathematics')
  await waitForViewport(page)
  await setPoint(page, '0', '0')
  await expect(value(page, 'Direction of ∇f')).toHaveText('none (∇f = 0)')
  await expect(slope(page).locator('.tangent-equation')).toHaveText('z = 0 + 0·x + 0·y')
  await expect(slope(page).locator('.inline-note')).toContainText('rate of change is zero in every direction')
})

test('overlays are optional and keep point inspection and cross-sections working', async ({ page }) => {
  await page.goto('/?surface=saddle&slice=x&at=1#/mathematics')
  await waitForViewport(page)
  await setPoint(page, '1', '1')
  const plane = slope(page).getByRole('button', { name: 'Tangent plane' })
  const arrow = slope(page).getByRole('button', { name: 'Gradient arrow' })
  await expect(plane).toHaveAttribute('aria-pressed', 'false')
  await expect(arrow).toHaveAttribute('aria-pressed', 'false')
  await plane.click()
  await arrow.click()
  await expect(plane).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.slice-graph .graph-title')).toContainText('Cross-section at x = 1.00')
  await expect(page.locator('.point-readout')).toContainText('z = f(x, y)')
  // Overlays are not part of the shared state.
  expect(new URL(page.url()).search).not.toMatch(/tangent|gradient/)
  await page.getByRole('button', { name: 'Clear point' }).click()
  await expect(slope(page)).toHaveCount(0)
})

test('small sine coefficients are shown, not rounded to zero, and the equation is marked approximate', async ({ page }) => {
  await page.goto('/?surface=sine&amp=0.05&k=0.05#/mathematics')
  await waitForViewport(page)
  await setPoint(page, '0', '0')
  await expect(value(page, '∂f/∂x = A·k·cos(k·x)·cos(k·y)')).toHaveText('0.00250')
  await expect(slope(page).locator('.tangent-equation')).toHaveText('z ≈ 0 + 0.00250·x + 0·y')
  await expect(slope(page)).toContainText('rounded for display')
})
