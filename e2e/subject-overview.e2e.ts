import { expect, test } from './fixtures.ts'

const SUBJECTS = [
  { id: 'anatomy', name: 'Anatomy', question: 'Where is the mitral valve, and what does it do?', answer: /Mitral valve/ },
  { id: 'biology', name: 'Biology', question: 'What do mitochondria do?', answer: /Mitochondri/ },
  { id: 'physics', name: 'Physics', question: 'What sets the period of a spring?', answer: /Spring/ },
  { id: 'mathematics', name: 'Mathematics', question: 'What does a saddle surface look like?', answer: /[Ss]addle/ },
] as const

for (const s of SUBJECTS) {
  test(`${s.name} overview: contents, common questions and the subject header`, async ({ page }) => {
    await page.goto('/')
    await page.locator(`.subject-card.is-${s.id} .subject-card-action`).click()
    await expect(page).toHaveURL(new RegExp(`#/${s.id}/overview$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Explore ${s.name.toLowerCase()}`)
    await expect(page.locator('h1')).toHaveCount(1)
    // The header: brand, tabs with Overview current, and the breadcrumb ends at the subject.
    const tabs = page.getByRole('navigation', { name: s.name })
    await expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: s.name })).toHaveAttribute('aria-current', 'page')
    // Contents: one entry per section, each opening that section.
    const chapters = page.locator('.subj-chapter')
    expect(await chapters.count()).toBe(await tabs.getByRole('link').count() - 1)
    // A common question opens real content.
    await page.getByRole('link', { name: s.question }).click()
    await expect(page.locator('main')).toContainText(s.answer)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Explore ${s.name.toLowerCase()}`)
  })
}

test('subject search finds content, keeps the query on Back, and the header search opens it', async ({ page }) => {
  await page.goto('/#/anatomy/overview')
  const box = page.getByRole('searchbox', { name: 'Search anatomy' })
  await box.fill('valve')
  await expect(page.locator('.chem-result').first()).toBeVisible()
  await page.locator('.chem-result', { hasText: 'Mitral valve' }).first().click()
  await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
  // On a section page the header search opens the overview's results.
  const header = page.getByRole('search', { name: 'Search anatomy' }).getByRole('searchbox', { name: 'Search anatomy' })
  await header.fill('kidney')
  await header.press('Enter')
  await expect(page).toHaveURL(/sq=kidney.*#\/anatomy\/overview$/)
  await expect(page.locator('.chem-result').first()).toContainText('kidney', { ignoreCase: true })
  await page.goBack()
  await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
  // Nothing found: says so and offers all subjects.
  await page.goto('/?sq=zzqx#/physics/overview')
  await expect(page.locator('.chem-empty')).toContainText('Nothing in Physics matches “zzqx”')
})

test('section tabs open each section and mark it current; old links still open sections', async ({ page }) => {
  await page.goto('/#/physics/overview')
  const tabs = page.getByRole('navigation', { name: 'Physics' })
  await tabs.getByRole('link', { name: 'DC circuits' }).click()
  await expect(tabs.getByRole('link', { name: 'DC circuits' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('DC circuits')
  await page.goto('/?bsec=dna#/biology')
  await expect(page.getByRole('navigation', { name: 'Biology' }).getByRole('link', { name: 'DNA and RNA' })).toHaveAttribute('aria-current', 'page')
  await page.goto('/#/mathematics')
  await expect(page.getByRole('navigation', { name: 'Mathematics' }).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current', 'page')
})
