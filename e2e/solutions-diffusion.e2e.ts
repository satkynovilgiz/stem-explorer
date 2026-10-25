import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const result = (page: Page) => page.locator('.sol-result')
const param = (page: Page, k: string) => page.evaluate((key) => new URLSearchParams(window.location.search).get(key), k)
const heading = (page: Page) => page.locator('.dif-lab .panel-title')
const row = (page: Page, name: RegExp) => page.locator('.dif-table tbody tr', { has: page.getByRole('rowheader', { name }) })

async function counts(page: Page) {
  await expect(row(page, /A \(round\)/)).toBeVisible()
  const cells = await row(page, /A \(round\)/).locator('td').allTextContents()
  return cells.map(Number)
}

test.describe('Solutions calculator', () => {
  test('molarity with unit conversion and substituted steps (Example 3.14)', async ({ page }) => {
    await page.goto('/?csec=solutions#/chemistry')
    await expect(result(page).locator('.sol-answer')).toHaveText('Molarity = 0.375 M')
    await expect(result(page)).toContainText('V = 355 mL × (1 L / 1000 mL) = 0.355 L')
    await expect(result(page)).toContainText('M = n / V = 0.133 mol / 0.355 L = 0.375 mol/L')
    await expect(page.getByText('Volume of solution (the final total volume, not the solvent added)')).toBeVisible()
    // Same volume in litres gives the same answer.
    await page.getByRole('combobox', { name: 'Volume unit' }).selectOption('L')
    await page.getByRole('textbox', { name: /^Volume of solution/ }).fill('0.355')
    await expect(result(page).locator('.sol-answer')).toHaveText('Molarity = 0.375 M')
    await expect.poll(() => param(page, 'smvu')).toBe('L')
    // Solving for the volume.
    await page.getByRole('button', { name: 'Volume of solution', exact: true }).click()
    await page.getByRole('textbox', { name: 'Molarity' }).fill('0.5')
    await expect(result(page).locator('.sol-answer')).toHaveText('Volume of solution = 0.266 L')
  })

  test('zero and negative input are refused with a reason', async ({ page }) => {
    await page.goto('/?csec=solutions#/chemistry')
    await page.getByRole('textbox', { name: /^Volume of solution/ }).fill('0')
    await expect(result(page)).toContainText('Can’t calculate: The volume of solution must be greater than zero')
    await page.getByRole('textbox', { name: /^Volume of solution/ }).fill('-5')
    await expect(result(page)).toContainText("can't be negative")
  })

  test('dilution worked examples match the textbook, and impossible dilutions are refused', async ({ page }) => {
    await page.goto('/?csec=solutions&st=dilution#/chemistry')
    await expect(result(page).locator('.sol-answer')).toHaveText('C₂ = 2.36 M')
    await expect(result(page)).toContainText('n = C₁V₁ = C₂V₂ = 4.25 mol (unchanged)')
    await page.getByText('Worked examples from the textbook').click()
    await page.getByRole('button', { name: /Load Example 3.20/ }).click()
    await expect(result(page).locator('.sol-answer')).toHaveText(/^V₂ = 0\.041\d L$/)
    await page.getByRole('button', { name: /Load Example 3.21/ }).click()
    await expect(result(page).locator('.sol-answer')).toHaveText('V₁ = 0.314 L')
    // A final concentration above the stock is impossible by dilution.
    await page.getByRole('textbox', { name: 'Final concentration C₂' }).fill('3')
    await expect(result(page)).toContainText('more concentrated than the stock')
  })

  test('a shared dilution link restores its inputs', async ({ page }) => {
    await page.goto('/?csec=solutions&st=dilution&sds=c2&sc1=2.04&sv1=25&sv1u=mL&sv2=500&sv2u=mL#/chemistry')
    await expect(result(page).locator('.sol-answer')).toHaveText('C₂ = 0.102 M')
    await expect(page.getByRole('textbox', { name: 'Volume of stock taken V₁' })).toHaveValue('25')
  })
})

test.describe('Diffusion', () => {
  test('a shared link opens paused at step 0; Play advances, Pause holds, Reset returns to step 0', async ({ page }) => {
    await page.goto('/?bsec=diffusion&dfn=200&dfl=200&dfb=0&dfm=gap&dfs=2026#/biology')
    await expect(heading(page)).toHaveText('Diffusion between two compartments · step 0')
    await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'false')
    expect(await counts(page)).toEqual([200, 0, 200])
    await page.waitForTimeout(700)
    await expect(heading(page)).toHaveText(/step 0$/)
    await page.getByRole('button', { name: 'Play' }).click()
    await expect(heading(page)).not.toHaveText(/step 0$/)
    await page.getByRole('button', { name: 'Pause' }).click()
    const held = await heading(page).textContent()
    await page.waitForTimeout(600)
    await expect(heading(page)).toHaveText(held!)
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(heading(page)).toHaveText(/step 0$/)
    expect(await counts(page)).toEqual([200, 0, 200])
    // The step is never stored in the link.
    expect(await param(page, 'dfs')).toBe('2026')
    expect(new URL(page.url()).search).not.toContain('step')
  })

  test('the same seed reproduces the run; totals are conserved; a different seed differs', async ({ page }) => {
    await page.goto('/?bsec=diffusion&dfn=200&dfl=200&dfb=0&dfm=gap&dfs=2026#/biology')
    await page.getByRole('button', { name: '+100 steps' }).click()
    await page.getByRole('button', { name: '+100 steps' }).click()
    const first = await counts(page)
    expect(first[0] + first[1]).toBe(200)
    expect(first[1]).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.getByRole('button', { name: '+100 steps' }).click()
    await page.getByRole('button', { name: '+100 steps' }).click()
    expect(await counts(page)).toEqual(first)
    await page.getByRole('textbox', { name: /^Seed/ }).fill('7')
    await expect(heading(page)).toHaveText(/step 0$/)
    await page.getByRole('button', { name: '+100 steps' }).click()
    await page.getByRole('button', { name: '+100 steps' }).click()
    expect(await counts(page)).not.toEqual(first)
    await expect.poll(() => param(page, 'dfs')).toBe('7')
  })

  test('the membrane lets round particles cross but never square ones', async ({ page }) => {
    await page.goto('/?bsec=diffusion&dfn=200&dfl=200&dfb=60&dfm=membrane&dfs=2026#/biology')
    await expect(page.locator('.dif-settings')).toContainText('square particles (B) never cross it')
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '+100 steps' }).click()
    const b = (await row(page, /B \(square\)/).locator('td').allTextContents()).map(Number)
    expect(b).toEqual([60, 0, 60])
    expect((await counts(page))[1]).toBeGreaterThan(0)
    await expect(page.locator('.info')).toContainText('Not osmosis')
  })

  test('reduced motion offers step buttons instead of Play; an invalid link falls back', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/?bsec=diffusion#/biology')
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '1 step' })).toBeVisible()
    await page.goto('/?bsec=diffusion&dfn=50&dfl=80#/biology')
    expect(await counts(page)).toEqual([200, 0, 200])
  })
})
