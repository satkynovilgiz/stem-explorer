import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const box = (page: Page) => page.getByRole('searchbox', { name: 'Search chemistry topics, formulas, molecules' })
const results = (page: Page) => page.locator('.chem-result')

test('Home → Chemistry opens “What are you working on?” with only groups that have content', async ({ page }) => {
  await page.goto('/')
  await page.locator('.subject-card.is-chemistry .subject-card-action').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Chemistry' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('All topics')
  await expect(page.getByRole('heading', { name: 'What are you working on?' })).toBeVisible()
  const groups = page.locator('.chem-group')
  expect(await groups.count()).toBeGreaterThanOrEqual(4)
  for (const name of await groups.locator('.chem-group-title').allTextContents()) {
    await page.locator('.chem-group', { hasText: name }).click()
    // Each group page lists real destinations under Learn, Explore or Calculate.
    await expect(page.locator('.chem-group-page .chem-result').first()).toBeVisible()
    await page.locator('.chem-back').click()
  }
  // A bare #/chemistry also opens this page; molecule links still open molecules.
  await page.goto('/#/chemistry')
  await expect(page.getByRole('heading', { level: 1, name: 'Chemistry' })).toBeVisible()
  await page.goto('/?molecule=benzene#/chemistry')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
})

test('search finds formulas however they are typed, labels each result, and filters by label', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  for (const [q, title] of [
    ['H2O', 'Water (H₂O)'],
    ['H₂O', 'Water (H₂O)'],
    ['co2', 'Carbon dioxide (CO₂)'],
    ['C2H6O', 'Ethanol (C₂H₆O)'],
    ['molarity', 'Molarity calculator'],
  ]) {
    await box(page).fill(q)
    await expect(results(page).first().locator('.chem-result-title'), q).toHaveText(title)
  }
  await box(page).fill('concentration')
  await expect(results(page).filter({ hasText: 'Molarity calculator' })).toHaveCount(1)
  await expect(results(page).first().locator('.chem-badge')).toHaveText(/Topic|Formula|Molecule|Calculator/)
  await page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculator/ }).click()
  for (const badge of await results(page).locator('.chem-badge').allTextContents()) expect(badge).toBe('Calculator')
})

test('the query and filter survive opening a result and coming back', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  await box(page).fill('dilution')
  await page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculator/ }).click()
  await results(page).filter({ hasText: 'Dilution calculator' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Solutions and dilution')
  await page.goBack()
  await expect(box(page)).toHaveValue('dilution')
  await expect(page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculator/ })).toHaveAttribute('aria-pressed', 'true')
})

test('empty results explain what to try and clear; “All subjects” searches everything', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  await box(page).fill('zzqx')
  await expect(page.locator('.chem-empty')).toContainText('Nothing matches “zzqx”')
  await page.getByRole('button', { name: 'Clear the search' }).click()
  await expect(box(page)).toHaveValue('')
  await expect(page.getByRole('heading', { name: 'What are you working on?' })).toBeVisible()
  await box(page).fill('mitral')
  await page.getByLabel('All subjects').check()
  await expect(results(page).first()).toContainText('Mitral valve')
  await expect(results(page).first().locator('.chem-badge')).toContainText('Anatomy')
})

test('common questions lead to the content that answers them', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  const q = (name: string) => page.getByRole('link', { name, exact: true })
  await q('How do I calculate molarity?').click()
  await expect(page).toHaveURL(/csec=solutions|#\/reference\/chemistry\/molarity/)
  await page.goBack()
  await q('How do I balance an equation?').click()
  await expect(page).toHaveURL(/csec=reactions|balancing/)
  await page.goBack()
  await q('Why is water bent?').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Water/)
  await page.goBack()
  await q('How do I calculate a dilution?').click()
  await expect(page).toHaveURL(/st=dilution|#\/reference\/chemistry\/dilution/)
})
