import type { Page } from '@playwright/test'
import { expect, search, test, waitForViewport } from './fixtures.ts'

const item = (page: Page, name: string) =>
  page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: new RegExp(`^${name}`) }) })
const typeButton = (page: Page, name: string) => page.getByRole('group', { name: 'Cell type' }).getByRole('button', { name })

test('switching to the plant cell changes the model, list, badge and link', async ({ page }) => {
  await page.goto('/?structure=golgi&cell=cutaway#/biology')
  await waitForViewport(page)
  await typeButton(page, 'Plant').click()
  await expect(typeButton(page, 'Plant')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.viewport-badge-name')).toHaveText('Generalized plant cell')
  await expect(page.locator('.search-status')).toHaveText('13 structures in the plant cell')
  await expect(item(page, 'Lysosomes')).toHaveCount(0)
  // The Golgi is in both models, so it stays selected.
  await expect(page.locator('#structure-heading')).toHaveText('Golgi apparatus')
  const q = await search(page)
  expect([q.get('structure'), q.get('type')]).toEqual(['golgi', 'plant'])
})

test('plant structures: chloroplast copies, wall vs membrane, and relationships to absent structures', async ({ page }) => {
  await page.goto('/?type=plant#/biology')
  await waitForViewport(page)
  await item(page, 'Chloroplasts').click()
  await expect(page.locator('#structure-heading')).toHaveText('Chloroplasts')
  await expect(page.locator('.info')).toContainText('photosynthesis')
  await page.getByRole('button', { name: 'Chloroplast 3' }).click()
  await expect(page.locator('.info')).toContainText('Chloroplast 3 of 5 is selected')

  await item(page, 'Cell wall').click()
  await expect(page.locator('.info-summary').first()).toContainText('outside the plasma membrane')

  // The Golgi's relationship to lysosomes is shown, but lysosomes aren't in the plant model.
  await item(page, 'Golgi apparatus').click()
  await page.getByRole('tab', { name: 'Structure & relationships' }).click()
  await expect(page.locator('.relation-link.is-absent')).toContainText('Lysosomes (not in the plant model)')
})

test('switching back to the animal cell clears a plant-only selection; old animal links are unchanged', async ({ page }) => {
  await page.goto('/?type=plant&structure=chloroplast#/biology')
  await waitForViewport(page)
  await expect(page.locator('#structure-heading')).toHaveText('Chloroplasts')
  await typeButton(page, 'Animal').click()
  await expect(page.locator('#structure-heading')).toHaveCount(0)
  await expect(page.locator('#cell-heading')).toHaveText('Animal cell')
  const q = await search(page)
  expect([q.has('type'), q.has('structure')]).toEqual([false, false])

  // A link made before the plant model existed opens exactly as before.
  await page.goto('/?structure=lysosome&cell=whole#/biology')
  await expect(page.locator('#structure-heading')).toHaveText('Lysosomes')
  await expect(typeButton(page, 'Animal')).toHaveAttribute('aria-pressed', 'true')
  // A plant-only structure in an animal link falls back and is removed from the address.
  await page.goto('/?structure=chloroplast#/biology')
  await expect(page.locator('#cell-heading')).toHaveText('Animal cell')
  await expect.poll(async () => (await search(page)).has('structure')).toBe(false)
})

test('whole view shows only the cell wall; isolating a plant structure works', async ({ page }) => {
  await page.goto('/?type=plant&cell=whole#/biology')
  await waitForViewport(page)
  await expect(page.locator('.viewport-badge-mode')).toContainText('Whole cell')
  await item(page, 'Central vacuole').click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Cutaway')
  await page.getByRole('button', { name: 'Isolate' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Isolated: Central vacuole')
})

test('the comparison panel lists shared and model-specific structures with sources', async ({ page }) => {
  await page.goto('/?type=plant#/biology')
  const compare = page.locator('.cell-compare')
  await expect(compare.getByRole('row', { name: /Chloroplasts/ })).toContainText('NoYesNo')
  await expect(compare).toContainText('also have mitochondria')
  await expect(compare.locator('.cite a').first()).toHaveAttribute('href', /openstax\.org/)
  await compare.getByRole('row', { name: /Chloroplasts/ }).getByRole('button', { name: 'Yes' }).click()
  await expect(page.locator('#structure-heading')).toHaveText('Chloroplasts')
})

test('saving a plant-cell view stores the type and reopens it', async ({ page }) => {
  await page.goto('/?type=plant&structure=chloroplast#/biology')
  await page.getByRole('button', { name: 'Save exploration' }).click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Chloroplasts in the plant cell')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.getByRole('link', { name: 'STEM Explorer home' }).click()
  const link = page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) }).getByRole('link', { name: /Chloroplasts/ })
  await expect(link).toHaveAttribute('href', /type=plant/)
  await link.click()
  await expect(page.locator('#structure-heading')).toHaveText('Chloroplasts')
})
