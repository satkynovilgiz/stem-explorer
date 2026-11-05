import { chemCurrent, chemMenu, expect, test } from './fixtures.ts'

const OVERVIEW = '/?csec=topics#/chemistry'

test.describe('Chemistry navigation', () => {
  test('the strip is on every page, with nothing to open, and names what students look for', async ({ page }) => {
    for (const url of [OVERVIEW, '/?csec=solutions&st=molarity#/chemistry', '/?molecule=water#/chemistry', '/?csec=learn&lt=the-mole#/chemistry']) {
      await page.goto(url)
      const nav = await chemMenu(page)
      for (const name of ['Learn', 'Calculators', 'Molecules', 'Atoms', 'Bonds', 'Periodic table']) await expect(nav.getByRole('link', { name, exact: true })).toBeVisible()
    }
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('the header says Chemistry once, beside the way Home', async ({ page }) => {
    for (const url of [OVERVIEW, '/?csec=solutions&st=molarity#/chemistry']) {
      await page.goto(url)
      const bar = page.locator('.subject-bar')
      await expect(bar.getByText('Chemistry', { exact: true })).toHaveCount(1)
      const home = (await bar.getByRole('link', { name: 'Home' }).boundingBox())!
      const subject = (await bar.getByRole('link', { name: 'Chemistry', exact: true }).boundingBox())!
      expect(home.height).toBeGreaterThanOrEqual(44)
      // Side by side, on one row.
      expect(Math.abs(home.y + home.height / 2 - (subject.y + subject.height / 2))).toBeLessThanOrEqual(2)
    }
  })

  test('the strip is large enough to read and tap', async ({ page }) => {
    await page.goto('/?csec=tools#/chemistry')
    const link = (await chemMenu(page)).getByRole('link', { name: 'Molecules', exact: true })
    const box = (await link.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(64)
    expect(parseFloat(await link.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14)
  })

  test('the strip works from the keyboard', async ({ page }) => {
    await page.goto('/?csec=tools#/chemistry')
    const link = (await chemMenu(page)).getByRole('link', { name: 'Molecules', exact: true })
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/csec=library/)
  })

  test('each menu item opens its page and is marked as current', async ({ page }) => {
    await page.goto(OVERVIEW)
    const expected: [string, RegExp][] = [
      ['Learn', /csec=contents/],
      ['Calculators', /csec=tools/],
      ['Molecules', /csec=library/],
      ['Atoms', /csec=atomic/],
      ['Bonds', /csec=bonding/],
      ['Periodic table', /csec=periodic/],
    ]
    for (const [name, url] of expected) {
      await (await chemMenu(page)).getByRole('link', { name, exact: true }).click()
      await expect(page).toHaveURL(url)
      expect(await chemCurrent(page)).toBe(name)
    }
  })

  test('older links open the right page and mark the right section', async ({ page }) => {
    const links: [string, string][] = [
      ['/?molecule=water&view=ball-and-stick#/chemistry', 'Molecules'],
      ['/?csec=solutions&st=dilution#/chemistry', 'Calculators'],
      ['/?csec=reactions&rx=methane-combustion#/chemistry', 'Calculators'],
      ['/?csec=learn&lt=molarity#/chemistry', 'Learn'],
      ['/?csec=periodic&el=26#/chemistry', 'Periodic table'],
      ['/?csec=atomic&el=6#/chemistry', 'Atoms'],
      ['/?csec=bonding#/chemistry', 'Bonds'],
    ]
    for (const [url, section] of links) {
      await page.goto(url)
      expect(await chemCurrent(page), url).toBe(section)
    }
    await page.goto('/?csec=visual#/chemistry')
    await expect(page.getByRole('heading', { level: 1, name: 'Molecules and atoms' })).toBeVisible()
  })

  test('from a shared link, the subject name returns to the Overview', async ({ page }) => {
    await page.goto('/?csec=learn&lt=the-mole#/chemistry')
    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Chemistry', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'What would you like to understand?' })).toBeVisible()
  })

  test('Overview: order, search on the page, examples, four destinations and no radio buttons', async ({ page }) => {
    await page.goto(OVERVIEW)
    await expect(page.locator('.chem-eyebrow')).toHaveText('Chemistry')
    await expect(page.getByText('Clear explanations, useful calculations, and interactive models.')).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)
    const cards = page.getByRole('navigation', { name: 'Where to go' }).getByRole('link')
    await expect(cards).toHaveCount(4)
    await expect(cards.first()).toContainText('Read simple explanations with worked examples.')
    await expect(page.locator('.ptable-mini')).toHaveCount(0)

    await page.getByRole('button', { name: 'Balance an equation' }).click()
    const box = page.getByRole('searchbox').first()
    await expect(box).toHaveValue('Balance an equation')
    await expect(page.locator('.chem-result.is-topic').first()).toContainText('Balancing chemical equations')
    const all = page.getByRole('link', { name: /Search all subjects for/ })
    await expect(all).toHaveAttribute('href', /q=Balance%20an%20equation#\/search/)
  })

  test('the home page panel keeps its words and search; its picture is decorative and stands still with reduced motion', async ({ page }) => {
    await page.goto(OVERVIEW)
    await expect(page.getByRole('heading', { level: 1, name: 'What would you like to understand?' })).toBeVisible()
    await expect(page.getByText('Clear explanations, useful calculations, and interactive models.')).toBeVisible()
    await expect(page.locator('.chem-hero-art')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('.chem-hero-art animateMotion')).toHaveCount(3)
    // The search stays usable on top of the panel's edge.
    await page.getByRole('searchbox').first().click()
    await expect(page.getByRole('searchbox').first()).toBeFocused()

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.locator('.chem-hero-art svg')).toBeVisible()
    await expect(page.locator('.chem-hero-art animateMotion')).toHaveCount(0)
    expect(await page.evaluate(() => document.querySelector('.chem-home')!.getAnimations({ subtree: true }).length)).toBe(0)
  })

  test('search, open a result, Back: the query and results return', async ({ page }) => {
    await page.goto(OVERVIEW)
    await page.getByRole('searchbox').first().fill('water molecule')
    await page.locator('.chem-result.is-topic').first().getByRole('link', { name: 'Explore model' }).click()
    expect(await chemCurrent(page)).toBe('Molecules')
    await page.goBack()
    await expect(page.getByRole('searchbox').first()).toHaveValue('water molecule')
    await expect(page.locator('.chem-result.is-topic').first()).toContainText('water')
  })

  test('student journeys through the menu', async ({ page }) => {
    await page.goto(OVERVIEW)
    await (await chemMenu(page)).getByRole('link', { name: 'Learn', exact: true }).click()
    await page.getByRole('link', { name: /What is a mole/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'What is a mole?' })).toBeVisible()

    await (await chemMenu(page)).getByRole('link', { name: 'Calculators', exact: true }).click()
    await page.getByRole('link', { name: /^Molarity calculator/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Molarity calculator' })).toBeVisible()
    await expect(page.getByText('Molecule library')).toHaveCount(0)

    await (await chemMenu(page)).getByRole('link', { name: 'Molecules', exact: true }).click()
    await page.locator('.chem-molecule-card', { hasText: 'Water' }).first().click()
    await expect(page.locator('#molecule-heading')).toHaveText('Water')

    await (await chemMenu(page)).getByRole('link', { name: 'Periodic table', exact: true }).click()
    await expect(page.getByRole('searchbox').first()).toBeVisible()
  })

  test('workspace controls sit beside the model, not in the header', async ({ page }) => {
    await page.goto('/?molecule=water#/chemistry')
    await expect(page.locator('.chem-workspace-bar').getByRole('button', { name: 'Present' })).toBeVisible()
    await expect(page.locator('.subject-bar').getByRole('button', { name: 'Present' })).toHaveCount(0)
  })

  test('every item is a good tap target and in view, with no sideways page scroll, at phone, tablet and laptop widths', async ({ page }) => {
    for (const [width, height] of [[390, 700], [768, 800], [1440, 800]]) {
      await page.setViewportSize({ width, height })
      await page.goto('/?csec=solutions&st=molarity#/chemistry')
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
      for (const link of await (await chemMenu(page)).getByRole('link').all()) {
        const box = (await link.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
        expect(box.y + box.height).toBeLessThanOrEqual(height)
      }
    }
  })

  test('regression: with the strip, Chemistry pages do not scroll sideways on small phones', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 700 })
      for (const url of ['/?molecule=water#/chemistry', '/?csec=periodic#/chemistry', '/?csec=atomic&el=6#/chemistry', '/?csec=bonding#/chemistry', '/?csec=reactions&rx=methane-combustion#/chemistry', '/?csec=tools#/chemistry', '/?csec=solutions&st=molarity#/chemistry', '/?csec=solutions&st=dilution#/chemistry', '/?csec=contents#/chemistry', '/?csec=library#/chemistry', '/?csec=learn&lt=the-mole#/chemistry', OVERVIEW]) {
        await page.goto(url)
        await expect(page.locator('.chem-rail')).toBeVisible()
        // After lazy pages have appeared: the search box once overflowed only then.
        await page.waitForLoadState('networkidle')
        // A wider font, as on Linux: a title once overflowed in CI but not on a Mac.
        await page.addStyleTag({ content: '* { font-family: Verdana, "DejaVu Sans", sans-serif !important }' })
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${url} at ${width}`).toBeLessThanOrEqual(0)
      }
    }
  })

  test('Focus mode gives the model the strip’s width too', async ({ page }) => {
    await page.goto('/?molecule=water#/chemistry')
    await page.getByRole('button', { name: /Focus mode/ }).click()
    await expect(page.getByRole('navigation', { name: 'Chemistry' })).toBeHidden()
    await page.getByRole('button', { name: /Focus mode/ }).click()
    await expect(page.getByRole('navigation', { name: 'Chemistry' })).toBeVisible()
  })

  test('the other subjects keep their tabs and have no Chemistry strip', async ({ page }) => {
    for (const s of ['anatomy', 'biology', 'physics', 'mathematics']) {
      await page.goto(`/#/${s}`)
      await expect(page.locator('.subject-bar .chem-nav-link').first()).toBeVisible()
      await expect(page.locator('.chem-rail')).toHaveCount(0)
    }
  })
})
