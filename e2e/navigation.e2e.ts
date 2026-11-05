import type { Page } from '@playwright/test'
import { expect, test, waitForViewport, chemMenu, chemCurrent } from './fixtures.ts'

const crumbs = (page: Page) => page.getByRole('navigation', { name: 'Breadcrumb' })
const current = (page: Page) => crumbs(page).locator('[aria-current="page"]')
const params = (page: Page) => new URL(page.url()).searchParams

test('modules are listed inside each subject; Home lists only questions whose destination exists', async ({ page }) => {
  await page.goto('/?experiment=projectile#/physics')
  // A subject's modules are in its own topic drawer (Home's cards keep to one sentence each).
  await page.getByRole('button', { name: 'All physics topics' }).click()
  const drawer = page.getByRole('dialog', { name: 'Physics topics' })
  await expect(drawer.locator('.topic-module-name')).toHaveText([/Projectile motion/, /Spring–mass oscillator/, /DC circuits/, /Travelling waves/, /Geometric optics/, /Gas pressure and volume/])
  await drawer.getByRole('link', { name: /^DC circuits/ }).click()
  await expect(current(page)).toHaveText('DC circuits')
  expect(params(page).get('experiment')).toBe('circuit')
  await page.goto('/#/discover')
  const questions = page.getByRole('region', { name: 'Explore by question' }).getByRole('link')
  // All three curated questions now have implemented destinations (the optics lab shipped in Task 6).
  await expect(questions).toHaveCount(3)
  await expect(questions.filter({ hasText: 'How does a lens form an image?' })).toHaveAttribute('href', /experiment=optics&opt=lens/)
  await page.getByRole('link', { name: /How does breathing work\?/ }).click()
  await waitForViewport(page)
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Diaphragm')
  await expect(crumbs(page)).toContainText('Anatomy')
  await expect(crumbs(page)).toContainText('Body atlas')
  await expect(current(page)).toHaveText('Diaphragm')
})

test('the breadcrumb follows in-page changes, and module switches work with Back and Forward', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await expect(current(page)).toHaveText('Water')
  await page.locator('.molecule-card', { hasText: 'Benzene' }).click()
  await expect(current(page)).toHaveText('Benzene')
  await (await chemMenu(page)).getByRole('link', { name: 'Periodic table', exact: true }).click()
  await expect(crumbs(page)).toContainText('Periodic table')
  await page.goBack()
  await expect(current(page)).toHaveText('Benzene')
  expect(await chemCurrent(page)).toBe('Molecules')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await page.goForward()
  expect(await chemCurrent(page)).toBe('Periodic table')
  expect(params(page).get('csec')).toBe('periodic')
  // Topic navigation is its own labelled landmark, apart from display controls.
  await expect(page.getByRole('navigation', { name: 'Chemistry' })).toBeVisible()
})

test('the topic drawer is searchable, keyboard operable and returns to where you left a module', async ({ page }) => {
  // Subjects other than Chemistry keep the drawer (Chemistry's topics are a page).
  await page.goto('/?speed=30#/physics')
  await expect(current(page)).toHaveText('Projectile motion')
  const toggle = page.getByRole('button', { name: 'All physics topics' })
  await toggle.click()
  const drawer = page.getByRole('dialog', { name: 'Physics topics' })
  await expect(drawer).toBeVisible()
  const filter = drawer.getByRole('searchbox', { name: 'Filter modules and topics' })
  await expect(filter).toBeFocused()
  await expect(drawer.locator('.topic-module.is-current')).toContainText('Projectile motion')
  await expect(drawer.locator('.topic-module.is-current')).toContainText('You are here')
  // Esc closes and focus returns to the toggle.
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(toggle).toBeFocused()
  // A click on the backdrop (left of the drawer) also closes it.
  await page.keyboard.press('Enter')
  await expect(drawer).toBeVisible()
  await page.mouse.click(20, 450)
  await expect(drawer).toBeHidden()
  await toggle.click()
  await filter.fill('zzzz')
  await expect(drawer).toContainText('No physics topic matches “zzzz”')
  await expect(drawer.getByRole('link', { name: 'Search all subjects for “zzzz”' })).toBeVisible()
  await filter.fill('circuit')
  await expect(drawer.locator('.topic-module')).toHaveCount(1)
  await drawer.getByRole('link', { name: /^DC circuits/ }).focus()
  await page.keyboard.press('Enter')
  await expect(drawer).toBeHidden()
  await expect(current(page)).toHaveText('DC circuits')
  // Back to Projectile motion through the drawer, the launch you left is restored.
  await toggle.click()
  const projectile = drawer.locator('.topic-module', { has: page.getByRole('link', { name: /^Projectile motion/ }) })
  await expect(projectile).toContainText('Where you left it')
  await projectile.getByRole('link', { name: /^Projectile motion/ }).click()
  await expect(page.getByRole('textbox', { name: /^Launch speed/ })).toHaveValue('30.0')
  await page.goBack()
  await expect(current(page)).toHaveText('DC circuits')
})

test('a topic found with Chemistry search opens that exact state', async ({ page }) => {
  await page.goto('/#/chemistry')
  await page.getByRole('searchbox', { name: 'Search chemistry topics, formulas, molecules' }).fill('iron')
  await page.locator('.chem-result', { hasText: 'Iron (Fe)' }).click()
  await expect(current(page)).toHaveText('Iron')
  expect(params(page).get('el')).toBe('26')
  expect(params(page).get('csec')).toBe('periodic')
})

test('presentation mode hides the subject bar', async ({ page }) => {
  await page.goto('/?experiment=wave#/physics')
  await expect(crumbs(page)).toBeVisible()
  await page.getByRole('button', { name: 'Present' }).click()
  await expect(crumbs(page)).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(crumbs(page)).toBeVisible()
})
