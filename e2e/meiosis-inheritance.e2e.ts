import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const counts = (page: Page) => page.locator('.meiosis-counts tbody tr')
const params = (page: Page) => new URL(page.url()).searchParams

test('meiosis: stage-by-stage counts, homologs vs sister chromatids, crossing over and assortment', async ({ page }) => {
  await page.goto('/?bsec=meiosis#/biology')
  await expect(page.getByRole('heading', { name: 'Prophase I' })).toBeVisible()
  await expect(counts(page)).toHaveCount(1)
  await expect(counts(page).first()).toContainText('4')
  await expect(counts(page).first()).toContainText('diploid (2n)')
  await expect(counts(page).first()).toContainText('carrying a crossed-over segment')
  const next = page.getByRole('button', { name: 'Next' })
  await next.click() // metaphase I
  await expect(page.locator('.step-nav')).toContainText('2² = 4')
  await next.click() // anaphase I
  await expect(page.locator('.step-nav')).toContainText('The sister chromatids stay together')
  await next.click() // telophase I
  await expect(counts(page)).toHaveCount(2)
  for (const row of await counts(page).all()) {
    await expect(row).toContainText('haploid (n)')
    await expect(row.locator('td').nth(0)).toHaveText('2')
    await expect(row.locator('td').nth(1)).toHaveText('4')
  }
  // Independent assortment changes which chromosomes travel together.
  await expect(counts(page).first()).toContainText('AM')
  await expect(counts(page).first()).toContainText('BM')
  await page.getByRole('button', { name: 'Pair B flipped' }).click()
  await expect(counts(page).first()).toContainText('BP')
  await page.getByRole('button', { name: 'Step 9: Telophase II and cytokinesis' }).click()
  await expect(counts(page)).toHaveCount(4)
  for (const row of await counts(page).all()) {
    await expect(row.locator('td').nth(0)).toHaveText('2')
    await expect(row.locator('td').nth(1)).toHaveText('2')
  }
  await expect(page.locator('.step-nav')).toContainText('all four are genetically different')
  await page.getByLabel('Crossing over in prophase I').uncheck()
  await expect(page.locator('.step-nav')).toContainText('each pair of cells from the same meiosis I cell is identical')
  // The comparison panel keeps the same context and states its limits.
  await expect(page.locator('.info')).toContainText('2n = 4')
  await expect(page.locator('.info').getByRole('row', { name: /Nuclear divisions/ })).toContainText('Two (meiosis I and meiosis II)')
  await expect(page.locator('.info')).toContainText('many fungi and algae make haploid spores by meiosis')
  await expect(page.locator('.process-view')).toContainText('no timing is shown')
})

test('inheritance: Punnett square, exact probabilities, parents in the link', async ({ page }) => {
  await page.goto('/?bsec=inheritance&p1=Yy&p2=Yy#/biology')
  const square = page.locator('table.punnett')
  await expect(square.locator('tbody td')).toHaveText([/YY/, /Yy/, /Yy/, /yy/])
  const probs = page.locator('.process-view table').nth(1)
  await expect(probs.getByRole('row', { name: /Genotype Yy/ })).toContainText('1/2')
  await expect(probs.getByRole('row', { name: /Yellow seeds \(YY or Yy\)/ })).toContainText('3/4')
  await expect(probs.getByRole('row', { name: /Green seeds/ })).toContainText('25.0 %')
  await page.getByRole('group', { name: 'Parent 2 genotype' }).getByRole('button', { name: 'yy', exact: true }).click()
  await expect(probs.getByRole('row', { name: /Green seeds/ })).toContainText('1/2')
  await expect.poll(() => params(page).get('p2')).toBe('yy')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('Yy × yy (test cross)')
  await page.reload()
  await expect(page.getByRole('group', { name: 'Parent 2 genotype' }).getByRole('button', { name: 'yy', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.info')).toContainText('One gene controls the trait, with two alleles')
  await expect(page.locator('.info')).toContainText('incomplete dominance, codominance, multiple alleles')
  // Invalid genotypes in a link are corrected.
  await page.goto('/?bsec=inheritance&p1=YYY&p2=Yy#/biology')
  await expect.poll(() => params(page).get('p1')).toBe('Yy')
})

test('the sampling simulation repeats for a seed, varies with a new seed, and validates input', async ({ page }) => {
  await page.goto('/?bsec=inheritance&p1=Yy&p2=Yy#/biology')
  await page.getByRole('textbox', { name: 'Seed' }).fill('12345')
  await page.getByRole('group', { name: 'Number of offspring' }).getByRole('button', { name: '100', exact: true }).click()
  await page.getByRole('button', { name: 'Run with this seed' }).click()
  const results = page.locator('.inh-results')
  await expect(results).toContainText('100 offspring, seed 12345')
  const first = await results.locator('table').textContent()
  await page.getByRole('button', { name: 'Run with this seed' }).click()
  expect(await results.locator('table').textContent()).toBe(first)
  // Observed counts add up to the sample size.
  const observed = await results.locator('tbody tr').evaluateAll((rows) => rows.slice(2).map((r) => Number(r.querySelectorAll('td')[0].textContent)))
  expect(observed.reduce((a, b) => a + b, 0)).toBe(100)
  // The theoretical column never changes with the simulation.
  await expect(results.getByRole('row', { name: /Green seeds/ })).toContainText('25.0 %')
  await page.getByRole('button', { name: 'Run again (new seed)' }).click()
  await expect(results).not.toContainText('seed 12345')
  await expect(page.getByRole('textbox', { name: 'Seed' })).not.toHaveValue('12345')
  await page.getByRole('textbox', { name: /Offspring/ }).fill('0')
  await expect(page.getByRole('alert')).toContainText('Enter a whole number of offspring from 1 to 10,000')
  await expect(page.getByRole('button', { name: 'Run with this seed' })).toBeDisabled()
  await page.getByRole('textbox', { name: /Offspring/ }).fill('20')
  await page.getByRole('textbox', { name: 'Seed' }).fill('-3')
  await expect(page.getByRole('alert')).toContainText('The seed is a whole number')
})
