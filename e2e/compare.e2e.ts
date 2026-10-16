import type { Page } from '@playwright/test'
import { expect, search, test, waitForViewport } from './fixtures.ts'

const item = (page: Page, name: string) =>
  page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: new RegExp(`^${name}`) }) })
const panel = (page: Page) => page.locator('.compare')
const slotName = (page: Page, letter: 'a' | 'b') => panel(page).locator(`.compare-slot.is-${letter} .compare-slot-name`)
const toggle = (page: Page) => page.locator('.compare-toggle')

test('select two vessels, replace B, clear one or both, and see the comparison table', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await toggle(page).click()
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(item(page, 'Left ventricle')).toBeDisabled()
  await item(page, 'Aorta').click()
  await item(page, 'Pulmonary trunk').click()
  await expect(slotName(page, 'a')).toContainText('Aorta')
  await expect(slotName(page, 'b')).toContainText('Pulmonary trunk and arteries')
  const table = panel(page).locator('.compare-table')
  await expect(table.locator('tr', { hasText: 'Circulation' })).toContainText('Systemic (heart ↔ body)')
  await expect(table.locator('tr', { hasText: 'Circulation' })).toContainText('Pulmonary (heart ↔ lungs)')
  await expect(table.locator('tr', { hasText: 'Oxygenation' })).toContainText('Oxygen-poor')
  // A third pick replaces B; the list marks A and B with letters, not only colour.
  await item(page, 'Pulmonary veins').click()
  await expect(slotName(page, 'b')).toContainText('Pulmonary veins')
  await expect(item(page, 'Aorta').locator('.compare-badge')).toHaveText('A')
  await expect(item(page, 'Pulmonary veins').locator('.compare-badge')).toHaveText('B')
  await panel(page).getByRole('button', { name: 'Clear vessel A' }).click()
  await expect(slotName(page, 'a')).toContainText('Pulmonary veins')
  await panel(page).getByRole('button', { name: 'Clear both' }).click()
  await expect(slotName(page, 'a')).toContainText('Choose a vessel')
})

test('presets and the direction-not-oxygen explanation', async ({ page }) => {
  await page.goto('/#/anatomy')
  await toggle(page).click()
  await panel(page).getByRole('button', { name: 'Pulmonary arteries vs pulmonary veins' }).click()
  const named = panel(page).locator('.compare-table tr', { hasText: 'Named' })
  await expect(named).toContainText('Artery (carries blood away)')
  await expect(named).toContainText('Vein (carries blood toward)')
  await expect(panel(page)).toContainText('the pulmonary arteries carry oxygen-poor blood')
  await expect(panel(page)).toContainText('normal adult heart after birth')
  await panel(page).getByRole('button', { name: 'Venae cavae vs aorta' }).click()
  await expect(slotName(page, 'a')).toContainText('Superior vena cava')
})

test('entering keeps a selected vessel as A and ends isolation; leaving keeps A selected', async ({ page }) => {
  await page.goto('/?part=aorta&heart=whole#/anatomy')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Isolate' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Isolated: Aorta')
  await toggle(page).click()
  await expect(slotName(page, 'a')).toContainText('Aorta')
  await expect(page.locator('.viewport-badge-mode')).not.toContainText('Isolated')
  await expect(page.getByRole('button', { name: 'Isolate' })).toBeDisabled()
  await item(page, 'Inferior vena cava').click()
  await panel(page).getByRole('button', { name: 'Exit comparison' }).click()
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
  // Existing links keep working, and the link still shares a single structure.
  expect((await search(page)).get('part')).toBe('aorta')
})

test('Whole/Cutaway keep the comparison; the tour ends it and blocks it', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await toggle(page).click()
  await panel(page).getByRole('button', { name: 'Aorta vs pulmonary trunk' }).click()
  await page.getByRole('button', { name: 'Cutaway' }).click()
  await expect(slotName(page, 'b')).toContainText('Pulmonary trunk')
  await page.getByRole('button', { name: 'Whole' }).click()
  await expect(slotName(page, 'a')).toContainText('Aorta')

  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await expect(panel(page)).toHaveCount(0)
  await expect(page.locator('.tour-bar')).toBeVisible()
  await expect(toggle(page)).toBeDisabled()
  await page.locator('.tour-bar').getByRole('button', { name: 'Exit tour' }).click()
  // The tour restores normal exploring with vessel A selected, not the comparison.
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
  await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false')
})
