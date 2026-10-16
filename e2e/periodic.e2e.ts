import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const cell = (page: Page, name: string) => page.locator('.ptable-cell', { has: page.locator('.ptable-sym', { hasText: new RegExp(`^${name}$`) }) })
const open = async (page: Page) => {
  await page.goto('/#/chemistry')
  await waitForViewport(page)
  await page.getByRole('group', { name: 'Chemistry view' }).getByRole('button', { name: 'Periodic table' }).click()
  await expect(page.locator('.ptable-cell')).toHaveCount(118)
}

test('shows all 118 elements and selects one into the element panel', async ({ page }) => {
  await open(page)
  await expect(page.locator('#element-heading')).toHaveText('Oxygen')
  await page.getByRole('button', { name: 'Iron, Fe, atomic number 26' }).click()
  await expect(page.locator('#element-heading')).toHaveText('Iron')
  await expect(page.locator('.element-facts')).toContainText('Period4')
  await expect(page.locator('.element-facts')).toContainText('Group8')
  await expect(page.locator('.element-facts')).toContainText('d block')
  await expect(page.locator('.info')).toContainText('None of the six molecules here contain iron.')
  // The lanthanoids have no group number in this layout, and say so.
  await page.getByRole('button', { name: 'Cerium, Ce, atomic number 58' }).click()
  await expect(page.locator('.element-facts')).toContainText('Lanthanoid row (no group number in this layout)')
})

test('search matches name, symbol and atomic number; filters by block and by category', async ({ page }) => {
  await open(page)
  const search = page.getByRole('searchbox', { name: /Search elements/ })
  await search.fill('26')
  await expect(page.getByRole('status').filter({ hasText: 'elements match' })).toHaveText('1 of 118 elements match')
  await expect(cell(page, 'Fe')).not.toHaveClass(/is-dimmed/)
  await expect(cell(page, 'Co')).toHaveClass(/is-dimmed/)
  await search.fill('carb')
  await expect(cell(page, 'C')).not.toHaveClass(/is-dimmed/)
  await search.fill('')

  await page.getByRole('combobox', { name: 'Block' }).selectOption('f')
  await expect(page.getByRole('status').filter({ hasText: 'elements match' })).toContainText('30 of 118 elements match')
  await expect(page.getByRole('status').filter({ hasText: 'elements match' })).toContainText('f block: the lanthanoid and actinoid rows')
  await page.getByRole('combobox', { name: 'Filter by' }).selectOption('category')
  await page.getByRole('combobox', { name: 'Category' }).selectOption('Noble gas')
  await expect(page.locator('.ptable-cell:not(.is-dimmed)')).toHaveCount(7)

  // The list alternative shows only matches, as buttons.
  await page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: 'List' }).click()
  await expect(page.getByRole('list', { name: 'Elements' }).getByRole('button')).toHaveCount(7)
  await page.getByRole('list', { name: 'Elements' }).getByRole('button', { name: /Neon/ }).click()
  await expect(page.locator('#element-heading')).toHaveText('Neon')
})

test('arrow keys move through the table', async ({ page }) => {
  await open(page)
  const oxygen = page.getByRole('button', { name: 'Oxygen, O, atomic number 8' })
  await oxygen.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Fluorine, F, atomic number 9' })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('button', { name: 'Chlorine, Cl, atomic number 17' })).toBeFocused()
  await expect(page.locator('#element-heading')).toHaveText('Chlorine')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect(page.getByRole('button', { name: 'Helium, He, atomic number 2' })).toBeFocused()
})

test('opens a molecule containing the element, and the molecule tools still work', async ({ page }) => {
  await open(page)
  await page.getByRole('button', { name: 'Nitrogen, N, atomic number 7' }).click()
  await page.getByRole('button', { name: 'Open Ammonia' }).click()
  await expect(page.locator('#molecule-heading')).toHaveText('Ammonia')
  await expect(page.getByRole('group', { name: 'Chemistry view' }).getByRole('button', { name: 'Molecules' })).toHaveAttribute('aria-pressed', 'true')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance', exact: true }).click()
  await page.locator('.measure-panel .chip').filter({ hasText: /^\d?N1$/ }).click()
  await page.locator('.measure-panel .chip').filter({ hasText: /^\d?H1$/ }).click()
  await expect(page.locator('.measure-result')).toContainText('Bond length')
})
