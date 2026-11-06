import { expect, test } from './fixtures.ts'

const MENUS = {
  Anatomy: ['Bones', 'Muscles', 'Heart', 'Breathing', 'Whole body', 'Calculators'],
  Biology: ['Cells', 'DNA', 'Cell division', 'Meiosis', 'Inheritance', 'Energy', 'Diffusion', 'Enzymes', 'Calculators'],
  Physics: ['Throwing', 'Springs', 'Circuits', 'Waves', 'Lenses', 'Gases', 'Calculators'],
  Mathematics: ['Graphs', 'Vectors', 'Motion', '3D surfaces', 'Statistics', 'Calculators'],
} as const

test.describe('Subject menus and home panels', () => {
  for (const [name, items] of Object.entries(MENUS)) {
    test(`${name}: the left menu has its sections, and each one opens and is marked current`, async ({ page }) => {
      await page.goto(`/#/${name.toLowerCase()}/overview`)
      const menu = page.getByRole('navigation', { name })
      await expect(menu.getByRole('link')).toHaveText([...items])
      for (const item of items) {
        await menu.getByRole('link', { name: item, exact: true }).click()
        await expect(menu.getByRole('link', { name: item, exact: true }), item).toHaveAttribute('aria-current', 'page')
      }
    })
  }

  test('Anatomy: Bones and Muscles open the body atlas on that system', async ({ page }) => {
    await page.goto('/#/anatomy/overview')
    const menu = page.getByRole('navigation', { name: 'Anatomy' })
    await menu.getByRole('link', { name: 'Bones' }).click()
    await expect(page.getByRole('heading', { name: 'Skeletal system' })).toBeVisible()
    await menu.getByRole('link', { name: 'Muscles' }).click()
    await expect(page.getByRole('heading', { name: 'Muscular system' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Whole body' })).not.toHaveAttribute('aria-current', 'page')
    // Regression: Whole body once reopened the last system viewed instead of the whole body.
    await menu.getByRole('link', { name: 'Whole body' }).click()
    await expect(menu.getByRole('link', { name: 'Whole body' })).toHaveAttribute('aria-current', 'page')
    await expect(page).not.toHaveURL(/asys=/)
  })

  test('Physics and Mathematics group their menus under headings', async ({ page }) => {
    await page.goto('/#/physics')
    await expect(page.locator('.rail-group-name')).toHaveText(['Motion', 'Electricity', 'Waves and light', 'Matter'])
    await page.goto('/#/mathematics')
    await expect(page.locator('.rail-group-name')).toHaveText(['Algebra', 'Calculus', 'Data'])
    await page.goto('/#/biology')
    await expect(page.locator('.rail-group-name')).toHaveCount(0)
  })

  test('older links still open the same pages, with the right item marked', async ({ page }) => {
    const links: [string, string, string][] = [
      ['/?experiment=spring#/physics', 'Physics', 'Springs'],
      ['/?experiment=optics#/physics', 'Physics', 'Lenses'],
      ['/?bsec=meiosis#/biology', 'Biology', 'Meiosis'],
      ['/?msec=statistics#/mathematics', 'Mathematics', 'Statistics'],
      ['/?heart=whole#/anatomy', 'Anatomy', 'Heart'],
      ['/#/biology/calculators', 'Biology', 'Calculators'],
    ]
    for (const [url, subject, item] of links) {
      await page.goto(url)
      await expect(page.getByRole('navigation', { name: subject }).locator('[aria-current="page"]'), url).toHaveText(item)
    }
  })

  test('the in-page Module buttons are not repeated beside the menu', async ({ page }) => {
    await page.goto('/?bsec=dna#/biology')
    await expect(page.locator('.module-switch')).toBeHidden()
  })

  for (const subject of ['anatomy', 'biology', 'physics', 'mathematics']) {
    test(`${subject} home: the panel keeps its words; its picture is decorative and still with reduced motion`, async ({ page }) => {
      await page.goto(`/#/${subject}/overview`)
      await expect(page.getByRole('heading', { level: 1, name: `Explore ${subject}` })).toBeVisible()
      await expect(page.locator('.subj-hero-art')).toHaveAttribute('aria-hidden', 'true')
      await page.getByRole('searchbox').first().click()
      await expect(page.getByRole('searchbox').first()).toBeFocused()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.reload()
      await expect(page.locator('.subj-hero-art svg')).toBeVisible()
      expect(await page.evaluate(() => document.querySelector('.subj-hero-art')!.getAnimations({ subtree: true }).length)).toBe(0)
    })
  }

  test('no subject page scrolls sideways on a small phone, even in a wider font', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 700 })
      for (const url of ['/#/anatomy/overview', '/?asys=skeletal#/anatomy', '/#/biology/overview', '/?bsec=dna#/biology', '/#/physics/overview', '/#/physics', '/#/mathematics/overview', '/#/mathematics', '/#/physics/calculators']) {
        await page.goto(url)
        await page.waitForLoadState('networkidle')
        await page.addStyleTag({ content: '* { font-family: Verdana, "DejaVu Sans", sans-serif !important }' })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${url} at ${width}`).toBeLessThanOrEqual(0)
      }
    }
  })
})
