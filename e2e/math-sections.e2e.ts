import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const params = (page: Page) => new URL(page.url()).searchParams
const section = (page: Page, name: string) => page.getByRole('group', { name: 'Mathematics section' }).getByRole('button', { name })

async function type(page: Page, label: RegExp, value: string) {
  const input = page.getByRole('textbox', { name: label })
  await input.fill(value)
  await input.press('Enter')
}

test('2D functions: exact point and derivative, tangent equation, secant approaching the tangent', async ({ page }) => {
  await page.goto('/#/mathematics')
  await section(page, '2D functions').click()
  await expect.poll(() => params(page).get('msec')).toBe('functions')
  // Defaults: f(x) = 2·sin(x) at x = 1.
  await expect(page.locator('#fn-stage-heading')).toHaveText('f(x) = A·sin(k·x)')
  await expect(page.locator('.fn-point-value')).toHaveText('(1.000, 1.683)')
  await expect(page.locator('.fn-slope-value')).toHaveText('f′(1.000) = 1.081 (exact)')
  await expect(page.locator('.fn-tangent')).toBeVisible()
  await page.getByRole('button', { name: 'Secant line' }).click()
  await type(page, /Secant step h/, '0.5')
  await expect(page.locator('.fn-secant')).toBeVisible()
  const far = Number((await page.locator('.fn-secant-value').textContent())!.match(/difference from f′\(x\): (−?[\d.]+)/)![1].replace('−', '-'))
  await type(page, /Secant step h/, '0.05')
  const near = Number((await page.locator('.fn-secant-value').textContent())!.match(/difference from f′\(x\): (−?[\d.]+)/)![1].replace('−', '-'))
  expect(Math.abs(near)).toBeLessThan(Math.abs(far))
  await type(page, /Secant step h/, '0')
  await expect(page.locator('.fn-secant-value')).toContainText('h = 0 gives no secant')
})

test('definite integral: signed value from the antiderivative, positive and negative parts shown differently', async ({ page }) => {
  await page.goto('/?msec=functions&fn=sine&fA=2&fk=1&ia=0&ib=6.28#/mathematics')
  await page.getByRole('button', { name: 'Definite integral' }).click()
  // ∫₀^2π 2 sin x dx ≈ 0 (cancellation) while the total area ≈ 8.
  await expect(page.locator('.fn-signed-value')).toContainText('(exact, from the antiderivative)')
  // 6.28 is just short of 2π, so the signed value is tiny but not zero.
  await expect(page.locator('.fn-signed-value')).toHaveText(/^−?\d(\.\d+)? × 10⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]/)
  await expect(page.locator('.fn-area-value')).toHaveText('≈ 8.000')
  await expect(page.locator('.fn-area.is-positive')).toHaveCount(1)
  await expect(page.locator('.fn-area.is-negative')).toHaveCount(1)
  await expect(page.locator('.info')).toContainText('below as negative (hatched)')
})

test('logarithm: the domain gap is respected in links, the plot and the integral', async ({ page }) => {
  await page.goto('/?msec=functions&fn=logarithmic&fx=-2#/mathematics')
  // An x outside the domain is rejected (the address is corrected, as for other invalid link values), not plotted.
  await expect(page.locator('.fn-point-value')).toHaveText('(1.000, 0)')
  await expect.poll(() => params(page).get('fx')).toBe('1')
  await expect(page.locator('.chem-side--left')).toContainText('ln(x) is undefined for x ≤ 0')
  await page.getByRole('button', { name: 'Definite integral' }).click()
  await type(page, /Lower limit a/, '-1')
  await expect(page.locator('.status-error')).toBeVisible()
  await expect(page.locator('.fn-signed-value')).toHaveCount(0)
})

test('vectors: dot product, determinant meaning, reflection and the singular case', async ({ page }) => {
  await page.goto('/?msec=vectors#/mathematics')
  await expect(page.locator('.vec-dot-value')).toHaveText('2·−1 + 1·2 = 0')
  await expect(page.locator('.results, .info')).toContainText('orthogonal')
  await page.getByRole('group', { name: 'Matrix presets' }).getByRole('button', { name: 'Reflect' }).click()
  await expect(page.locator('.vec-det-value')).toContainText('= −1')
  await expect(page.locator('.vec-det-meaning')).toContainText('orientation is reversed')
  await page.getByRole('group', { name: 'Matrix presets' }).getByRole('button', { name: 'Singular' }).click()
  await expect(page.locator('.vec-det-value')).toContainText('= 0')
  await expect(page.locator('.vec-det-meaning')).toContainText('flattened onto a line')
  await expect(page.locator('.info')).toContainText('None: ad − bc = 0')
  await expect.poll(() => params(page).get('vm')).toBe('1,2,0.5,1')
})

test('sections: old surface links still open surfaces; Back returns to the previous section; save and reopen', async ({ page }) => {
  await page.goto('/?surface=saddle#/mathematics')
  await waitForViewport(page)
  await expect(page.locator('#math-heading')).toContainText('Saddle')
  await expect(section(page, '3D surfaces')).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/?msec=vectors#/mathematics')
  await section(page, '2D functions').click()
  await expect.poll(() => params(page).get('msec')).toBe('functions')
  await page.reload()
  await expect(page.locator('.fn-svg')).toBeVisible()
  await page.getByRole('button', { name: 'Save exploration' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.save-status')).toContainText('Sine function · calculus tools')
  await page.goto('/')
  await page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) }).getByRole('link', { name: /Sine function/ }).click()
  await expect(page.locator('.fn-point-value')).toHaveText('(1.000, 1.683)')
})
