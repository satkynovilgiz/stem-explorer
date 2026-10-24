import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const readout = (page: Page, name: string, exact = false) =>
  page.locator('.readout div', { has: page.locator('dt', { hasText: exact ? new RegExp(`^${name}$`) : name }) }).locator('dd')
const verdict = (page: Page) => page.locator('.rx-verdict[role="status"]')
const params = (page: Page) => new URL(page.url()).searchParams
const field = (page: Page, label: string) => page.getByRole('textbox', { name: new RegExp(`^${label}`) })

async function setField(page: Page, label: string, value: string) {
  const f = field(page, label)
  await f.fill(value)
  await f.press('Enter')
}

test('refraction: Snell’s law, bending direction, normal incidence and equal indices', async ({ page }) => {
  await page.goto('/?experiment=optics#/physics')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('Reflection and refraction')
  await page.getByRole('button', { name: 'Air → water' }).click()
  await setField(page, 'Angle of incidence', '30')
  await expect(readout(page, 'Angle of reflection')).toHaveText('30.00°')
  await expect(readout(page, 'Angle of refraction')).toHaveText('22.04°')
  await expect(readout(page, 'Critical angle')).toHaveText('none (n₁ ≤ n₂)')
  await expect(verdict(page)).toContainText('bends toward the normal')
  await expect(page.locator('.equation-list')).toContainText('n₁ sin θ₁ = n₂ sin θ₂')
  await page.getByRole('button', { name: 'Normal incidence' }).click()
  await expect(readout(page, 'Angle of refraction')).toHaveText('0.00°')
  await expect(verdict(page)).toContainText('Normal incidence')
  await page.getByRole('button', { name: 'Equal indices' }).click()
  await setField(page, 'Angle of incidence', '50')
  await expect(readout(page, 'Angle of refraction')).toHaveText('50.00°')
  await expect(readout(page, 'Angle of reflection')).toHaveText('none (no boundary)')
  await expect(page.locator('.optics-svg')).toContainText('Equal indices: no boundary to reflect from')
  await expect.poll(() => params(page).get('n1')).toBe('1.333')
})

test('total internal reflection only beyond the critical angle, with the boundary handled explicitly', async ({ page }) => {
  await page.goto('/?experiment=optics&opt=refraction&n1=1.0003&n2=1.52&inc=89.99#/physics')
  // From lower to higher index there is no critical angle, even at grazing incidence.
  await expect(readout(page, 'Angle of refraction')).not.toContainText('none')
  await expect(page.getByRole('button', { name: 'Set θ₁ to the critical angle' })).toBeDisabled()
  await page.getByRole('button', { name: 'Water → air' }).click()
  await expect(readout(page, 'Critical angle')).toHaveText('48.6261°')
  await setField(page, 'Angle of incidence', '60')
  await expect(readout(page, 'Angle of refraction')).toHaveText('none: total internal reflection')
  await expect(verdict(page)).toContainText('all of the light is reflected back into medium 1')
  await expect(page.locator('.opt-ray.is-transmitted')).toHaveCount(0)
  await page.getByRole('button', { name: 'Set θ₁ to the critical angle' }).click()
  await expect(readout(page, 'Angle of refraction')).toHaveText('90.00°')
  await expect(readout(page, 'Angle of incidence')).toHaveText('θc = 48.6261° (exact)')
  await expect(verdict(page)).toContainText('the critical angle, kept at full precision')
  await expect(page.locator('.opt-ray.is-transmitted')).toHaveCount(1)
  // The exact mode survives a reload through the link.
  await expect.poll(() => params(page).get('inc')).toBe('critical')
  await page.reload()
  await expect(readout(page, 'Angle of refraction')).toHaveText('90.00°')
  await expect(page.locator('.optics-svg')).toContainText('At the critical angle')
  await setField(page, 'Angle of incidence', '45')
  await expect(verdict(page)).toContainText('bends away from the normal')
})

test('the reproduction 1.52 → 1 at 41.14° is total internal reflection, with the rounding explained', async ({ page }) => {
  await page.goto('/?experiment=optics&opt=refraction&n1=1.52&n2=1&inc=41.14#/physics')
  await expect(readout(page, 'Critical angle')).toHaveText('41.1395°')
  await expect(readout(page, 'Angle of refraction')).toHaveText('none: total internal reflection')
  await expect(verdict(page)).toContainText('Both θ₁ and θc show as 41.14° at two decimals; to four, θ₁ = 41.1400° and θc = 41.1395°, so θ₁ is just above the critical angle.')
  // Diagram and explanation agree with the calculation.
  await expect(page.locator('.opt-ray.is-transmitted')).toHaveCount(0)
  await expect(page.locator('.opt-ray.is-reflected.is-total')).toHaveCount(1)
  await expect(page.locator('.optics-svg')).toContainText('Total internal reflection: no transmitted ray')
  // Just below: transmitted, also explained.
  await setField(page, 'Angle of incidence', '41.13')
  await expect(readout(page, 'Angle of refraction')).not.toContainText('none')
  await expect(page.locator('.opt-ray.is-transmitted')).toHaveCount(1)
  // A typed angle leaves critical mode; an invalid "critical" link (no critical angle) is corrected.
  await page.goto('/?experiment=optics&opt=refraction&n1=1&n2=1.52&inc=critical#/physics')
  await expect.poll(() => params(page).get('inc')).toBe('40')
})

test('thin lens: real and virtual images, sign convention, image at infinity, diverging lens', async ({ page }) => {
  await page.goto('/?experiment=optics&opt=lens&lens=converging&f=10&do=30#/physics')
  await expect(readout(page, 'Image distance')).toHaveText('15.0 cm')
  await expect(readout(page, 'Magnification')).toHaveText('-0.500')
  await expect(readout(page, 'Image', true)).toContainText('real, inverted')
  await expect(page.locator('.opt-image')).toHaveCount(1)
  await page.getByRole('button', { name: 'Inside F (magnifier)' }).click()
  await expect(readout(page, 'Image distance')).toHaveText('-10.0 cm')
  await expect(page.locator('.opt-image.is-virtual')).toHaveCount(1)
  await expect(page.locator('.opt-pray .is-extension')).toHaveCount(3)
  await expect(verdict(page)).toContainText('Virtual image on the object’s side')
  // Object at the focal plane: no finite image is drawn.
  await page.getByRole('button', { name: 'At F (image at infinity)' }).click()
  await expect(readout(page, 'Image distance')).toHaveText('∞ (no finite image)')
  await expect(readout(page, 'Magnification')).toHaveText('undefined')
  await expect(page.locator('.opt-image')).toHaveCount(0)
  await expect(page.locator('.optics-svg')).toContainText('Image at infinity: the rays leave parallel')
  await expect(page.locator('.opt-pray')).toHaveCount(2)
  // Approaching the focal plane: a real image too far to draw is described, not drawn.
  await setField(page, 'Object distance', '10.1')
  await expect(readout(page, 'Image distance')).toHaveText('1010 cm')
  await expect(page.locator('.opt-image')).toHaveCount(0)
  await expect(page.locator('.optics-svg')).toContainText('Image beyond the diagram: dᵢ = 1010 cm')
  await page.getByRole('button', { name: 'Diverging lens' }).click()
  await expect(readout(page, 'Focal length')).toHaveText('−10 cm')
  await expect(readout(page, 'Image', true)).toContainText('virtual, upright')
  await expect(page.locator('.info').first()).toContainText('Sign convention: f > 0 converging, f < 0 diverging')
  await expect.poll(() => params(page).get('lens')).toBe('diverging')
  // The configuration is shareable and static.
  await page.reload()
  await expect(page.getByRole('group', { name: 'Lens type' }).getByRole('button', { name: /Diverging/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.optics-stage')).toContainText('Static ray diagram')
})

test('the Home lens question opens the thin-lens lab; invalid links are corrected', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /How does a lens form an image\?/ }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('Thin lens')
  await expect(readout(page, 'Image', true)).toContainText('real, inverted')
  await page.goto('/?experiment=optics&opt=lens&f=0&do=-3#/physics')
  await expect.poll(() => [params(page).get('f'), params(page).get('do')]).toEqual(['10', '25'])
})
