import type { Page } from '@playwright/test'
import { expect, test, waitForViewport, goHome, openSubject } from './fixtures.ts'

const SUBJECT_HEADINGS = {
  anatomy: 'Anatomy Explorer: body atlas and heart',
  chemistry: 'What would you like to understand?',
  biology: 'Biology Explorer: cells, DNA, division and energy',
  physics: 'Physics Explorer: projectile motion lab',
  mathematics: 'Mathematics Explorer: interactive 3D surfaces',
} as const

const homeTitle = (page: Page) => page.getByRole('heading', { level: 1, name: 'Science, made clearer.' })
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search everything you can explore' })
const savedPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) })
const results = (page: Page) => page.getByRole('list', { name: 'Search results' })
const recentPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Continue exploring' }) })

test.describe('Home page', () => {
  test('is the default route and the fallback for unknown routes', async ({ page }) => {
    await page.goto('/')
    await expect(homeTitle(page)).toBeVisible()
    await expect(page).toHaveTitle('STEM Explorer')
    // There is no global header on any page.
    await expect(page.locator('header')).toHaveCount(0)
    // No WebGL scene (and no three.js chunk) is needed on Home.
    await expect(page.locator('canvas')).toHaveCount(0)

    for (const hash of ['#/nowhere', '#/', '#/home', '#/chemistry-extra']) {
      await page.goto(`/${hash}`)
      await expect(homeTitle(page)).toBeVisible()
    }
  })

  test('opens every subject and returns Home with the in-page Home link', async ({ page }) => {
    await page.goto('/')
    for (const [id, heading] of Object.entries(SUBJECT_HEADINGS)) {
      await page.locator(`.subject-card.is-${id} .subject-card-action`).click()
      // Chemistry opens its Overview; the other cards open their subject's Overview page.
      await expect(page).toHaveURL(new RegExp(id === 'chemistry' ? `#/${id}$` : `#/${id}/overview$`))
      await expect(page.getByRole('heading', { level: 1, name: id === 'chemistry' ? new RegExp(`^${heading.split(':')[0]}`) : `Explore ${id}` })).toBeAttached()
      await goHome(page)
      await expect(homeTitle(page)).toBeVisible()
    }
  })

  test('Home keeps one start (search and subjects); starting points are on Discover; returning visitors get Continue exploring', async ({ page }) => {
    await page.goto('/')
    // Home: no welcome panel or long lists; Discover has them.
    await expect(page.getByRole('heading', { name: /New here\?/ })).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Start an investigation' })).toHaveCount(0)
    await page.getByRole('navigation', { name: 'Library and saved work' }).getByRole('link', { name: /Discover/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Discover' })).toBeVisible()
    const welcome = page.locator('section', { has: page.getByRole('heading', { name: /New here\?/ }) })
    await expect(welcome).toContainText('How exploring works')
    await welcome.getByRole('link', { name: /Measure the H–O–H angle/ }).click()
    await expect(page.locator('.activity')).toContainText('Start activity')
    await expect.poll(() => page.evaluate(() => localStorage.getItem('stem-explorer:recent'))).not.toBeNull()
    await goHome(page)
    await expect(page.getByRole('heading', { name: 'Continue exploring' })).toBeVisible()
  })


  test('subject cards: one sentence each, a clear destination, and keyboard access', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.subject-card.is-chemistry')).toContainText('Atoms, reactions, and everyday questions.')
    await expect(page.locator('.subject-card.is-chemistry')).toContainText('Explore chemistry')
    for (const id of ['anatomy', 'biology', 'physics', 'mathematics']) await expect(page.locator(`.subject-card.is-${id} .subject-card-summary`)).not.toBeEmpty()
    const link = page.locator('.subject-card.is-mathematics .subject-card-action')
    await link.focus()
    await expect(link).toBeFocused()
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/mathematics\/overview$/)
  })

  test('featured explorations (on Discover) use supported deep links', async ({ page }) => {
    await page.goto('/#/discover')
    await page.getByRole('link', { name: /Explore the Golgi apparatus/ }).click()
    await expect(page).toHaveURL(/\?structure=golgi&cell=cutaway#\/biology$/)
    await expect(page.locator('#structure-heading')).toHaveText('Golgi apparatus')

    await page.goBack()
    await page.getByRole('link', { name: /Inspect water’s molecular shape/ }).click()
    await expect(page.locator('#molecule-heading')).toHaveText('Water')
  })

  test('only working links in the footer', async ({ page, baseURL }) => {
    await page.goto('/')
    const hrefs = await page.locator('.home-footer a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(hrefs).toEqual(['#/chemistry', '#/anatomy', '#/biology', '#/physics', '#/mathematics', '#/discover', 'https://github.com/satkynovilgiz/stem-explorer'])
    expect(baseURL).toBeTruthy()
  })
})

test.describe('Home search', () => {
  test('finds a molecule by formula and opens it', async ({ page }) => {
    await page.goto('/')
    await search(page).fill('H₂O')
    const first = page.getByRole('list', { name: 'Search results' }).getByRole('link').first()
    await expect(first).toContainText('Water')
    await expect(first).toContainText('Chemistry')
    await expect(first.locator('sub')).toHaveText('2')
    await first.click()
    await expect(page).toHaveURL(/\?molecule=water&view=ball-and-stick#\/chemistry$/)
    await expect(page.locator('#molecule-heading')).toHaveText('Water')
  })

  test('opens a heart structure with the keyboard', async ({ page }) => {
    await page.goto('/')
    await search(page).fill('mitral')
    await expect(page.getByRole('status').filter({ hasText: /result/ })).toHaveText('1 explorer result')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Search all subjects' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /Mitral valve/ })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/anatomy$/)
    expect(new URL(page.url()).searchParams.get('part')).toBe('mitral-valve')
    await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
  })

  test('finds cell structures and surfaces, clears, and explains empty results', async ({ page }) => {
    await page.goto('/')
    await search(page).fill('golgi')
    await expect(results(page).getByRole('link', { name: /Golgi apparatus/ })).toHaveAttribute('href', '?structure=golgi&cell=cutaway#/biology')
    await search(page).fill('saddle')
    await expect(results(page).getByRole('link', { name: /^Saddle \(hyperbolic/ })).toHaveAttribute('href', '?surface=saddle#/mathematics')
    await search(page).fill('projectile')
    await expect(results(page).getByRole('link', { name: /Projectile/ }).first()).toHaveAttribute('href', /#\/physics$/)

    await search(page).fill('zzzz')
    await expect(page.getByText('Nothing matches “zzzz”.')).toBeVisible()
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(search(page)).toHaveValue('')
    await expect(page.getByText('Nothing matches')).toHaveCount(0)
  })
})

test.describe('Saved and recent explorations', () => {
  test('save, refresh, restore, rename and remove', async ({ page }) => {
    await page.goto('/?molecule=ammonia&view=space-filling#/chemistry')
    await expect(page.locator('#molecule-heading')).toHaveText('Ammonia')
    await page.getByRole('button', { name: 'Save exploration' }).click()
    const name = page.getByRole('textbox', { name: 'Name' })
    await expect(name).toHaveValue('Ammonia · space-filling')
    await expect(page.locator('.save-form')).toContainText('Saved on this browser.')
    await name.fill('My ammonia')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.save-status')).toContainText('Saved on this browser as “My ammonia”')

    // Saving the same state again does not create a duplicate.
    await page.getByRole('button', { name: 'Save exploration' }).click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('.save-status')).toContainText('Already saved as “My ammonia”')

    // Stored entries hold a relative route, never an absolute origin.
    const stored = await page.evaluate(() => localStorage.getItem('stem-explorer:saved'))
    expect(stored).toContain('"subject":"chemistry"')
    expect(stored).not.toContain('http')

    await goHome(page)
    await page.reload()
    const item = savedPanel(page).getByRole('link', { name: /My ammonia/ })
    await expect(item).toHaveAttribute('href', '?molecule=ammonia&view=space-filling#/chemistry')
    await item.click()
    await expect(page.locator('#molecule-heading')).toHaveText('Ammonia')
    await expect(page.getByRole('button', { name: 'Space-filling' })).toHaveAttribute('aria-pressed', 'true')

    await page.goBack()
    await savedPanel(page).getByRole('button', { name: 'Rename My ammonia' }).click()
    await page.getByRole('textbox', { name: 'New name for My ammonia' }).fill('Trigonal pyramid')
    await page.keyboard.press('Enter')
    await expect(savedPanel(page).getByRole('link', { name: /Trigonal pyramid/ })).toBeVisible()
    await page.reload()
    await savedPanel(page).getByRole('button', { name: 'Remove Trigonal pyramid' }).click()
    await expect(savedPanel(page)).toContainText('Nothing saved yet.')
  })

  test('Anatomy saved during the tour stores the pre-tour state', async ({ page }) => {
    await page.goto('/?part=aorta&heart=whole#/anatomy')
    await waitForViewport(page)
    await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
    await page.getByRole('button', { name: 'Save exploration' }).click()
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Aorta · whole heart')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await goHome(page)
    await expect(savedPanel(page).getByRole('link', { name: /Aorta/ })).toHaveAttribute('href', '?part=aorta&heart=whole#/anatomy')
  })

  test('ignores malformed or unsafe stored entries', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('stem-explorer:saved', '{not json')
      const entry = { version: 1, id: 'abcdef12', subject: 'chemistry', title: 'Bad', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }
      localStorage.setItem(
        'stem-explorer:recent',
        JSON.stringify([
          { ...entry, params: { molecule: 'javascript:alert(1)' } },
          { ...entry, subject: 'https://example.com', params: {} },
          { ...entry, version: 99, params: { molecule: 'water', view: 'ball-and-stick' } },
        ]),
      )
    })
    await page.reload()
    await expect(homeTitle(page)).toBeVisible()
    // A damaged saved list is reported and left untouched, never shown as empty and overwritten.
    await expect(savedPanel(page)).toContainText('The saved list on this browser is damaged')
    expect(await page.evaluate(() => localStorage.getItem('stem-explorer:saved'))).toBe('{not json')
    await expect(recentPanel(page)).toHaveCount(0)
  })

  test('recent history appears only after visits, dedupes, and can be cleared', async ({ page }) => {
    await page.goto('/')
    await expect(recentPanel(page)).toHaveCount(0)

    // A visit is recorded after the state has been shown for about 1.5 s; wait for the write itself.
    const recentTitles = () =>
      page.evaluate(() => (JSON.parse(localStorage.getItem('stem-explorer:recent') ?? '[]') as { title: string }[]).map((e) => e.title))
    await page.goto('/?structure=nucleus#/biology')
    await expect(page.locator('#structure-heading')).toHaveText('Nucleus')
    await expect.poll(recentTitles).toEqual(['Nucleus in the animal cell'])
    await page.goto('/?molecule=benzene#/chemistry')
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
    await expect.poll(recentTitles).toHaveLength(2)
    await page.goto('/?structure=nucleus#/biology')
    await expect.poll(recentTitles).toEqual(['Nucleus in the animal cell', expect.stringContaining('Benzene')])

    await goHome(page)
    const links = recentPanel(page).getByRole('link')
    await expect(links).toHaveCount(2)
    await expect(links.first()).toContainText('Nucleus')
    await expect(links.nth(1)).toContainText('Benzene')

    await recentPanel(page).getByRole('button', { name: 'Clear history' }).click()
    await expect(recentPanel(page)).toHaveCount(0)
    // Clearing history leaves saved explorations alone.
    await expect(savedPanel(page)).toBeVisible()
  })
})

test('Back and Forward move between Home and explorers', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('benzene')
  await results(page).getByRole('link', { name: /Benzene/ }).first().click()
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await page.goBack()
  await expect(homeTitle(page)).toBeVisible()
  await page.goForward()
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await openSubject(page, 'physics')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore physics' })).toBeAttached()
  await page.goBack()
  await expect(homeTitle(page)).toBeVisible()
  await page.goBack()
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await page.goBack()
  await expect(homeTitle(page)).toBeVisible()
})

test('deep links to every subject still open directly', async ({ page }) => {
  await page.goto('/?part=left-ventricle&heart=cutaway#/anatomy')
  await expect(page.locator('#part-heading')).toHaveText('Left ventricle')
  await page.goto('/?speed=25&angle=60&height=0&gravity=9.81#/physics')
  await expect(page.getByRole('textbox', { name: /^Launch angle/ })).toHaveValue('60')
  await page.goto('/?surface=paraboloid&slice=y&at=-1#/mathematics')
  await expect(page.locator('#math-heading')).toContainText('Elliptic paraboloid')
})

test('reduced motion: transitions are effectively off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/discover')
  const duration = await page.locator('.investigation').first().evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(parseFloat(duration)).toBeLessThan(0.001)
  await page.goto('/')
  expect(await page.locator('.subject-card').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
})

test.describe('Home motion and featured content', () => {

  test('the search button opens full results; the featured exploration opens real content; the search stays responsive', async ({ page }) => {
    await page.goto('/')
    const input = page.getByRole('searchbox', { name: 'Search everything you can explore' })
    await expect(input).toHaveAttribute('placeholder', 'What would you like to understand?')
    await input.fill('saddle')
    await expect(page.locator('.search-results')).toContainText('Saddle')
    await input.fill('benz')
    await expect(page.locator('.search-results')).toContainText('Benzene')
    await page.getByRole('button', { name: 'Search all subjects' }).click()
    await expect(page).toHaveURL(/q=benz.*#\/search$/)
    await page.goto('/#/discover')
    await page.locator('.spotlight').click()
    await expect(page.locator('#math-heading')).toContainText('saddle', { ignoreCase: true })
    expect(new URL(page.url()).searchParams.get('surface')).toBe('saddle')
  })

})

test.describe('Home design and exploration flow', () => {
  test('investigations list real activities and starter paths from the catalog (on Discover)', async ({ page }) => {
    await page.goto('/#/discover')
    const section = page.getByRole('region', { name: 'Start an investigation' })
    await expect(section.locator('.investigation-grid').first().getByRole('link')).toHaveCount(5)
    await expect(section.getByRole('link', { name: /Path · 6 steps.*How breathing works/ })).toHaveAttribute('href', '#/collections')
    await section.getByRole('link', { name: /Compare 30° and 60° launches/ }).click()
    await expect(page).toHaveURL(/#\/physics$/)
    await expect(page.locator('.activity')).toContainText('Start activity')
  })

  test('each subject card opens a real destination', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.subject-card.is-mathematics .subject-card-action')).toHaveAttribute('href', /#\/mathematics\/overview$/)
    await page.locator('.subject-card.is-anatomy .subject-card-action').click()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Anatomy')
  })

  test('the home page loads no 3D module code', async ({ page }) => {
    const scripts: string[] = []
    page.on('request', (r) => {
      if (r.resourceType() === 'script') scripts.push(r.url())
    })
    await page.goto('/')
    await expect(page.locator('.subject-card')).toHaveCount(5)
    await page.waitForLoadState('networkidle')
    expect(scripts.filter((u) => /Scene|Viewport|OrbitControls|PerspectiveCamera|Explorer-/.test(u))).toEqual([])
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('keyboard order: the search comes first, then the examples, then the Chemistry card, with a visible focus ring', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('searchbox', { name: 'Search everything you can explore' }).focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Search all subjects' })).toBeFocused()
    // Then the five example searches, in reading order.
    for (const t of ['heart', 'molarity', 'photosynthesis', 'DNA', 'projectile']) {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('button', { name: t, exact: true })).toBeFocused()
    }
    await page.keyboard.press('Tab')
    const chem = page.locator('.subject-card.is-chemistry .subject-card-action')
    await expect(chem).toBeFocused()
    expect(await chem.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  })
})


test('Home motion: the hero animates, cards reveal on scroll, examples fill the search; reduced motion keeps everything still', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Science, made clearer.' })).toBeVisible()
  // The atom is decorative and its electrons travel their orbits.
  await expect(page.locator('.hero-atom')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.hero-atom animateMotion')).toHaveCount(3)
  // Cards below the fold rise in as they are scrolled to.
  const maths = page.locator('.subject-card.is-mathematics')
  await maths.scrollIntoViewIfNeeded()
  await expect(maths).toHaveClass(/is-in/)
  await expect.poll(() => maths.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  // An example search fills the box and shows results.
  await page.getByRole('button', { name: 'photosynthesis', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: 'Search everything you can explore' })).toHaveValue('photosynthesis')
  await expect(page.locator('.search-results')).toContainText('Photosynthesis')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.home.has-motion')).toHaveCount(0)
  await expect(page.locator('.hero-atom animateMotion')).toHaveCount(0)
  expect(await page.locator('.ht-word > span').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  expect(await maths.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
})
