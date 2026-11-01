import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const box = (page: Page) => page.getByRole('searchbox', { name: 'Search chemistry topics, formulas, molecules' })
const results = (page: Page) => page.locator('.chem-result')

test('Home → Chemistry opens a table of contents, then elements, then molecules; every topic opens a real page', async ({ page }) => {
  await page.goto('/')
  await page.locator('.subject-card.is-chemistry .subject-card-action').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Chemistry' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Chemistry')
  // The Overview: explore, periodic table, featured molecules, topics, tools, questions.
  await expect(page.locator('.chem-home .chem-h2')).toHaveText(['Explore chemistry', 'Periodic table', 'Featured molecules', 'Browse topics', 'Tools', 'Common questions'])
  // Every element outside the lanthanoid and actinoid rows, each a link.
  expect(await page.locator('.ptable-mini-cell').count()).toBe(118 - 30)
  // Topics: the table of contents, chapters in learning order.
  await page.getByRole('navigation', { name: 'Chemistry' }).getByRole('link', { name: 'Topics' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Topics' })).toBeVisible()
  await expect(page.locator('.chem-chapter-title')).toHaveText([/Atoms & elements/, /Bonds & shapes/, /Moles & reactions/, /Solutions/, /Acids & bases/, /Gases & energy/])
  // Every topic in the contents opens a page with a heading (no empty destinations).
  const hrefs = await page.locator('.chem-topic-link').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))
  expect(hrefs.length).toBeGreaterThanOrEqual(20)
  for (const href of hrefs) {
    await page.goto(`/${href}`)
    await expect(page.locator('h1'), href).toHaveCount(1)
    await expect(page.locator('.ref-state[role="alert"]'), href).toHaveCount(0)
  }
  // Elements and molecules open the periodic table and the 3D viewer.
  await page.goto('/#/chemistry')
  await page.getByRole('link', { name: 'Iron, Fe, atomic number 26' }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Iron')
  await page.goBack()
  await page.locator('.chem-molecule-card', { hasText: 'Benzene' }).click()
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  // Older group links still open a group page.
  await page.goto('/?csec=topics&cg=solutions#/chemistry')
  await expect(page.locator('.chem-group-page .chem-result').first()).toBeVisible()
  // A bare #/chemistry also opens this page; molecule links still open molecules.
  await page.goto('/#/chemistry')
  await expect(page.getByRole('heading', { level: 1, name: 'Chemistry' })).toBeVisible()
  await page.goto('/?molecule=benzene#/chemistry')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
})

test('search finds formulas however they are typed, labels each result, and filters by label', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  for (const [q, title] of [
    // Water is a topic: its explanation and its 3D model in one result.
    ['H2O', 'Why is water bent?'],
    ['H₂O', 'Why is water bent?'],
    ['co2', 'Carbon dioxide (CO₂)'],
    ['C2H6O', 'Ethanol (C₂H₆O)'],
    ['molarity', 'Molarity'],
  ]) {
    await box(page).fill(q)
    await expect(results(page).first().locator('.chem-result-title'), q).toHaveText(title)
  }
  await box(page).fill('concentration')
  // Molarity is a topic: its explanation and calculator in one result.
  await expect(results(page).filter({ hasText: 'Molarity' }).first()).toBeVisible()
  await expect(results(page).first().locator('.chem-badge')).toHaveText(/Topic|Formula|Molecule|Calculator/)
  await page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculators/ }).click()
  // Every remaining result leads to a calculator.
  for (const text of await results(page).allTextContents()) expect(text).toMatch(/Use calculator|Calculator/)
})

test('the query and filter survive opening a result and coming back', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  await box(page).fill('dilution')
  await page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculators/ }).click()
  // The Dilution topic offers distinct actions; open its calculator.
  await results(page).filter({ hasText: 'Dilution' }).getByRole('link', { name: 'Use calculator' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dilution calculator')
  await page.goBack()
  await expect(box(page)).toHaveValue('dilution')
  await expect(page.getByRole('group', { name: 'Show only' }).getByRole('button', { name: /^Calculators/ })).toHaveAttribute('aria-pressed', 'true')
})

test('empty results explain what to try and clear; “All subjects” searches everything', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  await box(page).fill('zzqx')
  await expect(page.locator('.chem-empty')).toContainText('Nothing matches “zzqx”')
  await page.getByRole('button', { name: 'Clear the search' }).click()
  await expect(box(page)).toHaveValue('')
  await expect(page.getByRole('heading', { name: 'Explore chemistry' })).toBeVisible()
  await box(page).fill('mitral')
  await page.getByLabel('All subjects').check()
  await expect(results(page).first()).toContainText('Mitral valve')
  await expect(results(page).first().locator('.chem-badge')).toContainText('Anatomy')
})

test('common questions lead to the content that answers them', async ({ page }) => {
  await page.goto('/?csec=topics#/chemistry')
  const q = (name: string) => page.getByRole('link', { name, exact: true })
  await q('How do I calculate molarity?').click()
  // Questions open the explanation (a Chemistry reading page).
  await expect(page).toHaveURL(/csec=learn/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molarity')
  await page.goBack()
  await q('How do I balance an equation?').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Balancing a chemical equation')
  await page.goBack()
  await q('Why is water bent?').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Water/)
  await page.goBack()
  await q('How do I calculate a dilution?').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dilution')
})

test('Chemistry’s header: brand, tabs with the current one marked, and a search that opens results', async ({ page }) => {
  await page.goto('/?csec=periodic&el=26#/chemistry')
  const tabs = page.getByRole('navigation', { name: 'Chemistry' })
  await expect(tabs.getByRole('link')).toHaveText(['Overview', 'Elements', 'Molecules', 'Topics', 'Visualizations', 'Tools'])
  await expect(tabs.getByRole('link', { name: 'Elements' })).toHaveAttribute('aria-current', 'page')
  // The header search opens the Overview's results; Back returns to the page.
  const search = page.getByRole('search', { name: 'Search chemistry' }).getByRole('searchbox', { name: 'Search chemistry' })
  await search.fill('molarity')
  await search.press('Enter')
  await expect(page).toHaveURL(/cq=molarity/)
  await expect(results(page).first().locator('.chem-result-title')).toHaveText('Molarity')
  await expect(box(page)).toHaveValue('molarity')
  // The Overview has its own large search, so the header does not repeat it.
  await expect(page.getByRole('search', { name: 'Search chemistry' })).toHaveCount(0)
  await page.goBack()
  await expect(page.locator('#element-heading')).toHaveText('Iron')
  // The brand leads to the Overview.
  await page.getByRole('link', { name: 'Chemistry Explorer: Overview' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore the world of chemistry.')
})
