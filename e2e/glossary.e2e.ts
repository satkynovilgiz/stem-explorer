import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const guide = (page: Page) => page.locator('.guide')

test('every explorer has the same About this explorer panel, with terms that expand by keyboard', async ({ page }) => {
  for (const [subject, term] of [
    ['chemistry', 'Lone pair'],
    ['biology', 'Organelle'],
    ['physics', 'Range'],
    ['mathematics', 'Saddle point'],
    ['anatomy', 'Organ system'],
  ] as const) {
    await page.goto(`/#/${subject}`)
    await waitForViewport(page)
    const toggle = guide(page).locator('.guide-toggle')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    for (const heading of ['Key terms', 'Common misconceptions', 'What this model simplifies', 'Measured, computed or illustrative?']) {
      await expect(guide(page).getByRole('heading', { name: heading })).toBeVisible()
    }
    // Deeper explanation is a further disclosure, with sources next to the claims.
    await guide(page).getByText('Go deeper').click()
    await expect(guide(page).locator('.guide-more .cite a').first()).toHaveAttribute('href', /^https:\/\//)
    const button = guide(page).getByRole('button', { name: term, exact: true })
    await button.focus()
    await page.keyboard.press('Enter')
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(guide(page).locator('.term-definition')).toBeVisible()
  }
})

test('a term links to its shared glossary entry, which links back to an explorer', async ({ page }) => {
  await page.goto('/?heart=whole#/anatomy')
  await waitForViewport(page)
  await guide(page).locator('.guide-toggle').click()
  await guide(page).getByRole('button', { name: 'Artery', exact: true }).click()
  await expect(guide(page).locator('.term-definition')).toContainText('away from the heart, whatever its oxygen content')
  await guide(page).getByRole('link', { name: 'In the glossary' }).click()
  await expect(page).toHaveURL(/\?term=artery#\/glossary$/)
  const entry = page.locator('#term-artery')
  await expect(entry).toHaveClass(/is-focused/)
  // Same definition text in both places (one shared copy).
  await expect(entry).toContainText('away from the heart, whatever its oxygen content')
  await entry.getByRole('link', { name: 'Aorta' }).click()
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
})

test('the glossary searches, filters by subject, and labels conventions', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Glossary' }).click()
  await expect(page).toHaveTitle('Glossary · STEM Explorer')
  const search = page.getByRole('searchbox', { name: 'Search the glossary' })
  await search.fill('oxygen content')
  await expect(page.locator('.glossary-entry')).toHaveCount(2) // artery and vein
  await search.fill('')
  await page.getByRole('group', { name: 'Filter by subject' }).getByRole('button', { name: 'Mathematics' }).click()
  await expect(page.getByRole('group', { name: 'Filter by subject' }).getByRole('button', { name: 'Mathematics' })).toHaveAttribute('aria-pressed', 'true')
  const subjects = await page.locator('.glossary-entry .subject-chip').allTextContents()
  expect(new Set(subjects)).toEqual(new Set(['Mathematics']))
  await expect(page.locator('#term-parameter')).toContainText('Convention used in this app')
  await search.fill('zzzz')
  await expect(page.getByText('No terms match')).toBeVisible()
  // Biology structure terms come from the organelle content.
  await search.fill('')
  await page.getByRole('group', { name: 'Filter by subject' }).getByRole('button', { name: 'Biology' }).click()
  await expect(page.locator('#term-cis-and-trans-faces')).toContainText('Golgi apparatus')
})

test('Home search lists glossary definitions after explorations', async ({ page }) => {
  await page.goto('/')
  // "valve": a few explorations and a glossary entry within Home's first 12 results. ("vein" now
  // matches more than 12 explorations since the atlas gained the great veins.)
  await page.getByRole('searchbox', { name: 'Search everything you can explore' }).fill('valve')
  const results = page.getByRole('list', { name: 'Search results' }).getByRole('link')
  await expect(results.first()).not.toContainText('Glossary:')
  await expect(results.filter({ hasText: 'Glossary:' }).first()).toHaveAttribute('href', /#\/glossary$/)
})
