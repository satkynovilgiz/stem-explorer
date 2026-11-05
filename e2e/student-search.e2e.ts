import { expect, test } from './fixtures.ts'

test.describe('Search understands student questions', () => {
  test('all subjects: "how do I add vectors" leads to a vector tool, labelled, and Back restores the query and filter', async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent('how do I add vectors')}&sf=mathematics#/search`)
    const best = page.locator('.search-page-item .search-result', { has: page.locator('.result-kind:not(.is-reference)') }).first()
    await expect(best).toContainText(/vector/i)
    await expect(best.locator('.result-kind')).toHaveText(/Interactive model|Calculator/)
    await best.click()
    await expect(page).toHaveURL(/vector/)
    await page.goBack()
    await expect(page.getByRole('searchbox', { name: 'Search everything you can explore' })).toHaveValue('how do I add vectors')
    await expect(page.getByRole('group', { name: 'Filter by subject' }).getByRole('button', { name: 'Mathematics' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('all subjects: "what is a mole" offers the explanation of the mole first, not molecules', async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent('what is a mole')}#/search`)
    const first = page.getByRole('list', { name: 'Explanations' }).getByRole('link').first()
    await expect(first).toContainText('What is a mole?')
    await expect(first.locator('.result-kind')).toHaveText('Explanation')
  })

  test('Home: a question finds its explanation, and Back from a result restores the query', async ({ page }) => {
    await page.goto('/')
    const box = page.getByRole('searchbox', { name: 'Search everything you can explore' })
    await box.fill('where is the kidney')
    const result = page.getByRole('list', { name: 'Search results' }).getByRole('link').first()
    await expect(result).toContainText(/kidney/i)
    await result.click()
    await expect(page).toHaveURL(/#\/anatomy/)
    await page.goBack()
    await expect(page.getByRole('searchbox', { name: 'Search everything you can explore' })).toHaveValue('where is the kidney')
    await expect(page.getByRole('list', { name: 'Search results' }).getByRole('link').first()).toContainText(/kidney/i)
  })

  test('Chemistry: "dilute a solution" leads to dilution, with destinations that say what they open', async ({ page }) => {
    await page.goto('/?csec=topics#/chemistry')
    await page.getByRole('searchbox', { name: /search/i }).first().fill('dilute a solution')
    const first = page.locator('.chem-result.is-topic').first()
    await expect(first).toContainText('Dilution')
    await expect(first.locator('.chem-badge')).toHaveText('Explanation')
    await first.getByRole('link', { name: 'Use calculator' }).click()
    await expect(page).toHaveURL(/csec=solutions&st=dilution/)
    await page.goBack()
    await expect(page.getByRole('searchbox', { name: /search/i }).first()).toHaveValue('dilute a solution')
  })

  test('a subject overview: a question finds its topic and Back restores it', async ({ page }) => {
    await page.goto('/#/biology/overview')
    await page.getByRole('searchbox').first().fill('what is photosynthesis')
    const first = page.locator('.chem-result').first()
    await expect(first).toContainText(/photosynthesis/i)
    await first.click()
    await page.goBack()
    await expect(page.getByRole('searchbox').first()).toHaveValue('what is photosynthesis')
  })

  test('no results: the query stays as typed, and a close spelling is offered, not applied', async ({ page }) => {
    await page.goto(`/?q=photosynthsis#/search`)
    const box = page.getByRole('searchbox', { name: 'Search everything you can explore' })
    await expect(page.getByTestId('search-suggestions')).toContainText('photosynthesis')
    await expect(box).toHaveValue('photosynthsis')
    await expect(page).toHaveURL(/q=photosynthsis/)
    await page.getByRole('button', { name: 'photosynthesis' }).click()
    await expect(box).toHaveValue('photosynthesis')
    await expect(page.locator('.search-page .search-result-name').first()).toContainText(/photosynthesis/i)

    await page.goto(`/?q=zzzqqq#/search`)
    await expect(page.getByRole('status')).toHaveText('No results')
    await expect(page.getByTestId('search-suggestions')).toHaveCount(0)
  })

  test('on a small phone, result labels stay on screen and the clear button stays inside the box', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await page.goto(`/?q=${encodeURIComponent('how do I add vectors')}#/search`)
    const chip = page.locator('.search-result .subject-chip').first()
    await expect(chip).toBeVisible()
    const box = (await chip.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(320)
    const input = (await page.getByRole('searchbox', { name: 'Search everything you can explore' }).boundingBox())!
    const clear = (await page.getByRole('button', { name: 'Clear search' }).boundingBox())!
    expect(clear.x + clear.width).toBeLessThanOrEqual(input.x + input.width)
  })
})
