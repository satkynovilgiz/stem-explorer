import { expect, goHome, test } from './fixtures.ts'

const homeTitle = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 1, name: 'Science, made clearer.' })

test('no page has a global header; every former header destination is reachable from Home', async ({ page }) => {
  for (const path of ['/', '/#/chemistry', '/#/search', '/#/reference', '/#/glossary', '/#/notebook', '/#/collections', '/?bview=front#/anatomy']) {
    await page.goto(path)
    await expect(page.locator('#main')).toBeVisible()
    await expect(page.locator('header.topnav, nav[aria-label="Main"]')).toHaveCount(0)
  }
  const shortcuts = [
    ['Search all subjects', 'Search · STEM Explorer'],
    ['Reference library', 'Reference library · STEM Explorer'],
    ['Glossary', 'Glossary · STEM Explorer'],
    ['Collections', 'Collections · STEM Explorer'],
    ['Notebook', 'Notebook · STEM Explorer'],
  ] as const
  for (const [label, title] of shortcuts) {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Library and saved work' }).getByRole('link', { name: label }).click()
    await expect(page).toHaveTitle(title)
    // Each of these pages has its own way back Home.
    await page.getByRole('navigation', { name: 'Back to Home' }).getByRole('link', { name: 'Home' }).click()
    await expect(homeTitle(page)).toBeVisible()
  }
  await page.getByRole('navigation', { name: 'Library and saved work' }).getByRole('link', { name: 'Saved explorations' }).click()
  await expect(page.locator('#saved-section')).toBeFocused()
})

test('Chemistry is the first subject card; each card opens its subject and ← Home returns', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.subject-card').first()).toHaveClass(/is-chemistry/)
  for (const id of ['chemistry', 'anatomy', 'biology', 'physics', 'mathematics']) {
    await page.locator(`.subject-card.is-${id} .subject-card-action`).click()
    await expect(page).toHaveURL(new RegExp(`#/${id}$`))
    await goHome(page)
    await expect(homeTitle(page)).toBeVisible()
  }
})

test('Chemistry: breadcrumb, the six-destination tab row, deep links and Back/Forward', async ({ page }) => {
  await page.goto('/?csec=solutions&smode=molarity#/chemistry')
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(crumbs.getByRole('link', { name: 'Home' })).toBeVisible()
  await expect(crumbs).toContainText('Solutions and dilution')
  const tabs = page.getByRole('navigation', { name: 'Chemistry' })
  await expect(tabs.getByRole('link')).toHaveText(['Overview', 'Elements', 'Molecules', 'Topics', 'Visualizations', 'Tools'])
  // The current destination is marked: a calculator is under Tools.
  await expect(tabs.getByRole('link', { name: 'Tools' })).toHaveAttribute('aria-current', 'page')
  await page.goto('/?molecule=water#/chemistry')
  await expect(tabs.getByRole('link', { name: 'Molecules' })).toHaveAttribute('aria-current', 'page')
  await tabs.getByRole('link', { name: 'Elements' }).click()
  await expect(crumbs).toContainText('Periodic table')
  await page.goBack()
  await expect(page.locator('#molecule-heading')).toHaveText('Water')
  await page.goForward()
  await expect(crumbs).toContainText('Periodic table')
  // The subject name leads back to the Overview; Chemistry has no topic drawer.
  await crumbs.getByRole('link', { name: 'Chemistry', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Explore the world of chemistry.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^All \w+ topics$/ })).toHaveCount(0)
})

test('older deep links in every subject still open their exact state', async ({ page }) => {
  await page.goto('/?molecule=benzene&view=space-filling#/chemistry')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await page.goto('/?part=mitral-valve&heart=cutaway#/anatomy')
  await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
  await page.goto('/?bsec=enzymes&ezs=2&ezv=10&ezk=2#/biology')
  await expect(page.locator('.enz-kinetics')).toContainText('5 µM/s')
  await page.goto('/?msec=motion&mo=vertical-throw&my0=1&mv0=5&mt=0&mdt=0.5&mex=phys#/mathematics')
  await expect(page.locator('#mo-heading')).toHaveText('Vertical throw · t = 0 s')
})
