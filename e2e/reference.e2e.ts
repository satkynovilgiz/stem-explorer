import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const results = (page: Page) => page.locator('.ref-result')

test('the library lists entries from every subject, filters by subject and type, and keeps filters in the link', async ({ page }) => {
  await page.goto('/#/reference')
  await expect(page.getByRole('heading', { level: 1, name: 'Reference library' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /\d+ entries/ })).toBeVisible()
  const total = await results(page).count()
  expect(total).toBeGreaterThan(5)
  await page.getByRole('group', { name: 'Subject' }).getByRole('button', { name: 'Biology' }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('rs')).toBe('biology')
  await expect(results(page).first()).toHaveClass(/subject-biology/)
  await page.getByLabel('Type').selectOption('formula')
  await expect(results(page)).toHaveCount(1)
  await expect(results(page)).toContainText('Michaelis–Menten equation')
  await page.reload()
  await expect(results(page)).toHaveCount(1)
  await expect(page.getByLabel('Type')).toHaveValue('formula')
})

test('search matches formulas typed differently, aliases and symbols, with a helpful empty state', async ({ page }) => {
  await page.goto('/#/reference')
  const box = page.getByRole('searchbox', { name: 'Search the reference library' })
  await box.fill('y = y0+v0 t − 1/2 g t^2')
  await expect(results(page).first()).toContainText('Position in free fall')
  await box.fill('spine')
  await expect(results(page).first()).toContainText('Vertebral column')
  await box.fill('Km')
  await expect(results(page).first()).toContainText('Michaelis–Menten')
  await box.fill('zzzz')
  await expect(page.getByText('No entries match “zzzz” with these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await expect(box).toHaveValue('')
})

test('an entry page: breadcrumbs, rendered math with MathML, worked example, sources, related link and lab link', async ({ page }) => {
  await page.goto('/#/reference/physics/free-fall-position')
  await expect(page).toHaveTitle('Position in free fall · Reference · STEM Explorer')
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(crumbs).toContainText('Reference library›Physics›Kinematics›Position in free fall'.replace(/›/g, ''), { useInnerText: false })
  await expect(page.locator('.ref-equation math')).toHaveCount(1)
  await expect(page.getByRole('table', { name: 'Symbols' }).getByRole('row')).toHaveCount(6)
  await expect(page.locator('.ref-answer')).toContainText('t ≈ 1.19 s')
  const sources = page.locator('#sources')
  await expect(sources.getByRole('link', { name: /University Physics Volume 1 — 3\.5 Free Fall/ })).toHaveAttribute('href', 'https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall')
  // Sections collapse and expand.
  await page.getByRole('heading', { name: 'Explanation' }).click()
  await expect(page.locator('details', { has: page.getByRole('heading', { name: 'Explanation' }) })).not.toHaveAttribute('open', '')
  // Related entry in another subject.
  await page.getByRole('link', { name: 'Power rule for derivatives' }).click()
  await expect(page).toHaveURL(/#\/reference\/mathematics\/power-rule$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Power rule for derivatives')
  await page.goBack()
  await page.getByRole('link', { name: /Vertical throw in Derivatives and motion/ }).click()
  await expect(page.locator('#mo-heading')).toHaveText('Vertical throw · t = 0 s')
})

test('structures offer Locate in 3D; unknown entries and paths explain what to do next', async ({ page }) => {
  await page.goto('/#/reference/anatomy/vertebral-column')
  await expect(page.getByText('Selectable in the body atlas (schematic shape)')).toBeVisible()
  await expect(page.getByRole('link', { name: /Locate in 3D/ })).toHaveAttribute('href', /atlas=vertebral-column/)
  await page.goto('/#/reference/physics/not-an-entry')
  await expect(page.getByRole('alert')).toContainText('No entry “not-an-entry” in Physics')
  await page.getByRole('link', { name: 'Browse Physics' }).click()
  await expect(page.getByRole('group', { name: 'Subject' }).getByRole('button', { name: 'Physics' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/#/reference/not-a-subject/x')
  await expect(page.getByText('There is no reference page at “not-a-subject/x”')).toBeVisible()
})

test('Copy link copies the canonical entry route', async ({ page, baseURL }) => {
  await page.goto('/?molecule=water#/reference/chemistry/water')
  await page.getByRole('button', { name: 'Copy link' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/#/reference/chemistry/water`)
})

test('student layout: molarity reads simple words first, a step-by-step example, a common mistake, then the calculator', async ({ page }) => {
  await page.goto('/#/reference/chemistry/molarity')
  await expect(page.locator('#ref-simple')).toBeVisible()
  const headings = await page.locator('.ref-plain-title, .ref-section-title').allTextContents()
  expect(headings.slice(0, 5)).toEqual(['In simple words', 'Why it matters', 'Key terms', 'Formula', 'Worked examples'])
  await expect(page.locator('.ref-worked-q').first()).toHaveText('What is given?')
  await expect(page.locator('.ref-worked').first()).toContainText('Are unit conversions needed?')
  await expect(page.locator('.ref-answer').first()).toContainText('0.500 M')
  await expect(page.getByRole('heading', { name: 'Common mistakes' })).toBeVisible()
  // More detail starts collapsed; sources stay available.
  await expect(page.locator('details', { has: page.getByRole('heading', { name: 'More detail' }) })).not.toHaveAttribute('open', '')
  await page.getByRole('link', { name: /Calculate a molarity/ }).click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Solutions and dilution')
})

test('Chemistry home: the questions now open explanations, and every group has content', async ({ page }) => {
  await page.goto('/?csec=contents#/chemistry')
  await expect(page.locator('.chem-chapter')).toHaveCount(6)
  await page.goto('/?csec=topics#/chemistry')
  await page.getByRole('link', { name: 'What is a mole?', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('What is a mole?')
  await page.goBack()
  await page.getByRole('link', { name: 'Why is water bent?', exact: true }).click()
  await expect(page.locator('#ref-simple')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Why is water bent?' })).toBeVisible()
})
