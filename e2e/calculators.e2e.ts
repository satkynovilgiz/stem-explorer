import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const answer = (page: Page) => page.locator('.calc-answers .is-main dd')
const field = (page: Page, label: string | RegExp) => page.locator('.calc-form').getByLabel(label, { exact: typeof label === 'string' })

const SUBJECTS = [
  { id: 'anatomy', name: 'Anatomy', first: 'Body mass index (BMI)', main: '22.9 kg/m²' },
  { id: 'biology', name: 'Biology', first: 'Microscope magnification and real size', main: '75 µm' },
  { id: 'physics', name: 'Physics', first: 'Constant acceleration', main: '11 m/s' },
  { id: 'mathematics', name: 'Mathematics', first: 'Quadratic equation', main: 'x = −2 or x = 5' },
] as const

for (const s of SUBJECTS) {
  test(`${s.name}: the Calculators tab opens worked, sourced calculators`, async ({ page }) => {
    await page.goto(`/#/${s.id}/overview`)
    await page.getByRole('navigation', { name: s.name }).getByRole('link', { name: 'Calculators' }).click()
    await expect(page).toHaveURL(new RegExp(`#/${s.id}/calculators$`))
    await expect(page.locator('h1')).toHaveText(`${s.name} calculators`)
    await expect(page.getByRole('navigation', { name: s.name }).getByRole('link', { name: 'Calculators' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Calculators')
    // The first calculator is open with its worked example, steps and a source.
    await expect(page.getByRole('button', { name: new RegExp(`^${s.first.replace(/[()]/g, '\\$&')}`) })).toHaveAttribute('aria-pressed', 'true')
    await expect(answer(page)).toHaveText(s.main)
    await expect(page.locator('.calc-panel .sol-steps li').first()).toBeVisible()
    await expect(page.locator('.calc-sources a').first()).toHaveAttribute('href', /^https:\/\//)
  })
}

test('typing recalculates, a bad value explains itself, and the example comes back', async ({ page }) => {
  await page.goto('/?calc=ohms-law#/physics/calculators')
  await expect(page.locator('.calc-title')).toHaveText('Ohm’s law and power')
  await page.getByRole('group', { name: 'Solve for' }).getByRole('button', { name: 'Resistance R' }).click()
  await field(page, 'Voltage V').fill('9')
  await field(page, 'Current I').fill('0.03')
  await expect(answer(page)).toHaveText('300 Ω')
  await expect(page.getByRole('status').filter({ hasText: 'Resistance' })).toHaveText('Resistance: 300 Ω')
  await field(page, 'Current I').fill('0')
  await expect(page.locator('.calc-result')).toContainText('Can’t calculate: The current must be greater than zero.')
  await page.getByRole('button', { name: 'Back to the example' }).click()
  await expect(answer(page)).toHaveText('0.12 A')
})

test('the open calculator is in the address, so a reload keeps it', async ({ page }) => {
  await page.goto('/#/biology/calculators')
  await page.getByRole('button', { name: /^Hardy–Weinberg/ }).click()
  await expect(page).toHaveURL(/calc=hardy-weinberg/)
  await page.reload()
  await expect(page.locator('.calc-title')).toHaveText('Hardy–Weinberg equilibrium')
  await expect(page.locator('.calc-answers')).toContainText('48%')
})

test('an overview links straight to one calculator', async ({ page }) => {
  await page.goto('/#/anatomy/overview')
  await page.locator('.chem-tool-list').getByRole('link', { name: 'Mean arterial pressure' }).click()
  await expect(page.locator('.calc-title')).toHaveText('Mean arterial pressure')
  await expect(answer(page)).toHaveText('40 mm Hg')
})

test('Chemistry: calculators on the Tools page, molar mass of any formula', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  await page.locator('.chem-tool-list').getByRole('link', { name: 'Molar mass' }).click()
  await expect(page.locator('h1')).toHaveText('Tools')
  await expect(page.getByRole('navigation', { name: 'Chemistry' }).getByRole('link', { name: 'Tools' })).toHaveAttribute('aria-current', 'page')
  await field(page, 'Formula').fill('Ca(OH)2')
  await field(page, /Sample mass/).fill('')
  await expect(answer(page)).toHaveText('74.09 g/mol')
  await expect(page.locator('.calc-panel .sol-steps')).toContainText('Ca: 1 × 40.078 g/mol')
  await field(page, 'Formula').fill('Xy')
  await expect(page.locator('.calc-result')).toContainText('“Xy” is not an element symbol')
  // The existing tools are still listed below.
  await expect(page.getByRole('link', { name: /Molarity calculator/ })).toBeVisible()
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('calculator pages fit the screen and every calculator is in view', async ({ page }) => {
    for (const url of ['/#/anatomy/calculators', '/#/mathematics/calculators', '/?csec=tools#/chemistry', '/?csec=topics#/chemistry']) {
      await page.goto(url)
      await expect(page.locator('h1')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), url).toBeLessThanOrEqual(0)
    }
    await page.goto('/#/anatomy/calculators')
    for (const pick of await page.locator('.calc-pick').all()) await expect(pick).toBeInViewport()
  })
})
