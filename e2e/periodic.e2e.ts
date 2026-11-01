import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const cell = (page: Page, name: string) => page.locator('.ptable-cell', { has: page.locator('.ptable-sym', { hasText: new RegExp(`^${name}$`) }) })
const open = async (page: Page) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('navigation', { name: 'Chemistry' }).getByRole('link', { name: 'Elements' }).click()
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
  await expect(page.locator('.info')).toContainText('None of this app’s 27 molecules contain iron.')
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
  await expect(page.getByRole('navigation', { name: 'Chemistry' }).getByRole('link', { name: 'Molecules' })).toHaveAttribute('aria-current', 'page')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance', exact: true }).click()
  await page.locator('.measure-panel .chip').filter({ hasText: /^\d?N1$/ }).click()
  await page.locator('.measure-panel .chip').filter({ hasText: /^\d?H1$/ }).click()
  await expect(page.locator('.measure-result')).toContainText('Bond length')
})

test('colours the table by a PubChem property, with units, definition, range and missing values', async ({ page }) => {
  await open(page)
  await page.getByLabel('Colour by').selectOption({ label: 'Electronegativity (Pauling scale)' })
  const scale = page.getByLabel('Electronegativity colour scale')
  await expect(scale).toContainText('pulls shared electrons')
  await expect(scale).toContainText('3.98')
  await expect(scale).toContainText('No PubChem value')
  // Each cell's name carries its value; helium has none and is drawn as "no value".
  await expect(page.getByRole('button', { name: 'Fluorine, F, atomic number 9, electronegativity 3.98' })).toHaveClass(/is-heat/)
  await expect(cell(page, 'He')).toHaveClass(/is-nodata/)
  // The list ranks by the property: fluorine first.
  await page.getByRole('group', { name: 'Layout' }).getByRole('button', { name: 'List' }).click()
  await expect(page.locator('.ptable-list-item').first()).toContainText('Fluorine')
  // The element panel lists every property with its unit.
  await page.locator('.ptable-list-item', { hasText: 'Iron' }).click()
  const props = page.locator('.element-props')
  await expect(props).toContainText('Atomic radius194 pm')
  await expect(props).toContainText('Melting point1811 K (1537.85 °C)')
  await expect(props).toContainText('Density7.874 g/cm³')
})

test('compares up to four elements property by property', async ({ page }) => {
  await open(page)
  const compare = page.getByRole('region', { name: /Element comparison/ })
  await page.getByRole('button', { name: 'Iron, Fe, atomic number 26' }).click()
  await page.getByRole('button', { name: 'Add Iron' }).click()
  await page.getByLabel('or choose').selectOption({ label: '29 Cu Copper' })
  await expect(compare.getByRole('columnheader')).toHaveText(['Property', /Iron \(Fe\)/, /Copper \(Cu\)/])
  // Iron melts higher than copper (1811 K vs 1357.77 K), and the row says so in words.
  await expect(compare.getByRole('row', { name: /Melting point/ })).toContainText('1811 K (1537.85 °C) · highest')
  await page.getByRole('button', { name: 'Remove Copper' }).click()
  await expect(compare.getByRole('columnheader')).toHaveCount(2)
})
