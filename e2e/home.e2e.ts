import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const SUBJECT_HEADINGS = {
  anatomy: 'Anatomy Explorer: body atlas and heart',
  chemistry: 'Chemistry Explorer',
  biology: 'Biology Explorer: cells, DNA, division and energy',
  physics: 'Physics Explorer: projectile motion lab',
  mathematics: 'Mathematics Explorer: interactive 3D surfaces',
} as const

const homeTitle = (page: Page) => page.getByRole('heading', { level: 1, name: 'Explore science. See how it works.' })
const search = (page: Page) => page.getByRole('searchbox', { name: 'Search everything you can explore' })
const savedPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) })
const results = (page: Page) => page.getByRole('list', { name: 'Search results' })
const recentPanel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Continue exploring' }) })

test.describe('Home page', () => {
  test('is the default route and the fallback for unknown routes', async ({ page }) => {
    await page.goto('/')
    await expect(homeTitle(page)).toBeVisible()
    await expect(page).toHaveTitle('STEM Explorer')
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    // No WebGL scene (and no three.js chunk) is needed on Home.
    await expect(page.locator('canvas')).toHaveCount(0)

    for (const hash of ['#/nowhere', '#/', '#/home', '#/chemistry-extra']) {
      await page.goto(`/${hash}`)
      await expect(homeTitle(page)).toBeVisible()
    }
  })

  test('opens every subject and returns Home with the logo and the Home tab', async ({ page }) => {
    await page.goto('/')
    for (const [id, heading] of Object.entries(SUBJECT_HEADINGS)) {
      await page.locator(`.subject-card.is-${id} .subject-card-action`).click()
      await expect(page).toHaveURL(new RegExp(`#/${id}$`))
      // Each card opens its subject's first lab (some are 2D, so no 3D viewport is awaited).
      await expect(page.getByRole('heading', { level: 1, name: new RegExp(`^${heading.split(':')[0]}`) })).toBeAttached()
      if (id === 'physics') await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click()
      else await page.getByRole('link', { name: 'STEM Explorer home' }).click()
      await expect(homeTitle(page)).toBeVisible()
    }
  })

  test('first visit shows a welcome panel with starting points; returning visitors get How it works', async ({ page }) => {
    await page.goto('/')
    const welcome = page.locator('section', { has: page.getByRole('heading', { name: /New here\?/ }) })
    await expect(welcome).toContainText('How exploring works')
    await expect(page.getByRole('button', { name: 'How it works' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Browse subjects' }).click()
    await expect(page.getByRole('heading', { name: 'Explore subjects', exact: true })).toBeInViewport()

    // A starting point opens the chemistry activity introduction.
    await welcome.getByRole('link', { name: /Measure the H–O–H angle/ }).click()
    await expect(page.locator('.activity')).toContainText('Start activity')

    // After a visit, the welcome panel gives way to Continue exploring, and the guide is a disclosure.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('stem-explorer:recent'))).not.toBeNull()
    await page.getByRole('link', { name: 'STEM Explorer home' }).click()
    await expect(page.getByRole('heading', { name: /New here\?/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Continue exploring' })).toBeVisible()
    const toggle = page.getByRole('button', { name: 'How it works' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#home-guide')).toContainText('Share or save.')
  })

  test('subject cards list real modules and keyboard users can reach every card link', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.subject-card.is-chemistry')).toContainText('12 3D molecules from experimental geometry, with distance and angle tools')
    await expect(page.locator('.subject-card.is-physics')).toContainText('Period, forces and energy of an ideal spring')
    await expect(page.locator('.subject-card.is-mathematics .subject-module')).toHaveCount(5)
    const link = page.locator('.subject-card.is-mathematics .subject-card-action')
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#\/mathematics$/)
  })

  test('featured explorations use supported deep links', async ({ page }) => {
    await page.goto('/')
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
    expect(hrefs).toEqual(['#/anatomy', '#/chemistry', '#/physics', '#/mathematics', '#/biology', 'https://github.com/satkynovilgiz/stem-explorer'])
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
    await expect(page.getByRole('status').filter({ hasText: /result/ })).toHaveText('1 result')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Clear search' })).toBeFocused()
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

    await page.getByRole('link', { name: 'STEM Explorer home' }).click()
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
    await page.getByRole('link', { name: 'STEM Explorer home' }).click()
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

    await page.getByRole('link', { name: 'STEM Explorer home' }).click()
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
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Physics' }).click()
  await expect(page.getByRole('heading', { level: 1, name: SUBJECT_HEADINGS.physics })).toBeAttached()
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

test('reduced motion: transitions are effectively off and Browse subjects jumps instead of gliding', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const duration = await page.locator('.investigation').first().evaluate((el) => getComputedStyle(el).transitionDuration)
  expect(parseFloat(duration)).toBeLessThan(0.001)
  await page.getByRole('button', { name: 'Browse subjects' }).click()
  // No smooth scrolling: the subjects heading is in view straight away.
  await expect(page.getByRole('heading', { name: 'Explore subjects', exact: true })).toBeInViewport({ timeout: 500 })
})

test.describe('Home motion and featured content', () => {
  const art = (page: Page) => page.locator('.hero-art')

  test('the decorative animation is short, runs only while visible, and can be replayed', async ({ page }) => {
    await page.goto('/')
    await expect(art(page)).toHaveAttribute('data-running', 'true')
    await expect(art(page).locator('> svg')).toHaveAttribute('aria-hidden', 'true')
    // Only transform and opacity are animated, and nothing loops forever.
    const props = await page.evaluate(() =>
      [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r): r is CSSKeyframesRule => r instanceof CSSKeyframesRule && r.name.startsWith('hero-'))
        .flatMap((r) => [...r.cssRules].flatMap((k) => [...(k as CSSKeyframeRule).style])),
    )
    expect([...new Set(props)].sort()).toEqual(['opacity', 'transform'])
    const iterations = await art(page).evaluate((el) => el.getAnimations({ subtree: true }).map((a) => a.effect?.getTiming().iterations))
    expect(iterations.length).toBeGreaterThan(0)
    expect(iterations.every((n) => typeof n === 'number' && Number.isFinite(n))).toBe(true)

    // Scrolled out of view: held.
    await page.getByRole('heading', { name: 'Saved explorations' }).scrollIntoViewIfNeeded()
    await expect(art(page)).toHaveAttribute('data-running', 'false')
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(art(page)).toHaveAttribute('data-running', 'true')

    // Hidden tab: held.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(art(page)).toHaveAttribute('data-running', 'false')
    expect(await page.locator('.hero-wave').evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused')
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await expect(art(page)).toHaveAttribute('data-running', 'true')

    // It finishes by itself; the keyboard-operable Replay starts it again.
    // A finished CSS animation (no fill) is no longer listed by getAnimations().
    await expect.poll(() => page.locator('.hero-wave').evaluate((el) => el.getAnimations().length), { timeout: 15_000 }).toBe(0)
    const replay = page.getByRole('button', { name: 'Replay decorative animation' })
    await replay.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => page.locator('.hero-wave').evaluate((el) => el.getAnimations()[0]?.playState ?? 'none')).toBe('running')
  })

  test('reduced motion: nothing animates and no replay control is shown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(art(page)).toHaveAttribute('data-running', 'false')
    await expect(page.getByRole('button', { name: 'Replay decorative animation' })).toHaveCount(0)
    expect(await page.locator('.hero-wave').evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
    expect(await page.locator('.subject-card').first().evaluate((el) => getComputedStyle(el).animationName)).toBe('none')
  })

  test('search examples fill the search; the featured exploration opens real content; the search stays responsive', async ({ page }) => {
    await page.goto('/')
    const examples = page.locator('.search-examples')
    await examples.getByRole('button', { name: 'saddle' }).click()
    const input = page.getByRole('searchbox', { name: 'Search everything you can explore' })
    await expect(input).toHaveValue('saddle')
    await expect(input).toBeFocused()
    await expect(page.locator('.search-results')).toContainText('Saddle')
    await input.fill('benz')
    await expect(page.locator('.search-results')).toContainText('Benzene')
    await input.fill('')
    await page.locator('.spotlight').click()
    await expect(page.locator('#math-heading')).toContainText('saddle', { ignoreCase: true })
    expect(new URL(page.url()).searchParams.get('surface')).toBe('saddle')
  })

  test('subject cards respond to hover and keyboard focus without moving layout', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.subject-card').first()
    // Let the cards' entrance animations finish.
    await page.waitForFunction(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest('.subject-card')).every((a) => a.playState === 'finished'))
    const next = page.locator('.subject-card').nth(1)
    // Document coordinates: focusing may scroll the page.
    const docBox = () => next.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
    })
    const before = await docBox()
    const border = await card.evaluate((el) => getComputedStyle(el).borderLeftColor)
    await card.locator('.subject-card-action').focus()
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).borderLeftColor)).not.toBe(border)
    // The focused card lifts by a transform only, so nothing else on the page moves.
    await expect.poll(() => card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f)).toBeCloseTo(-2, 1)
    expect(await docBox()).toEqual(before)
    // A module link inside the card is its own target, above the card's stretched link.
    await card.locator('.subject-module').first().click()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Body atlas')
  })
})

test.describe('Home design and exploration flow', () => {
  test('Start exploring jumps to real investigations; counts come from the data', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Start exploring' }).click()
    const section = page.getByRole('region', { name: 'Start an investigation' })
    await expect(section.getByRole('heading', { name: 'Start an investigation' })).toBeInViewport()
    await expect(section).toBeFocused()
    // Five guided activities and four starter paths, named from the catalog.
    await expect(section.locator('.investigation-grid').first().getByRole('link')).toHaveCount(5)
    await expect(section.getByRole('link', { name: /Path · 6 steps.*How breathing works/ })).toHaveAttribute('href', '#/collections')
    // "N modules" equals the module links on the subject cards.
    const modules = await page.locator('.subject-module').count()
    await expect(page.getByRole('list', { name: 'What is here' })).toContainText(`${modules} modules`)
    await section.getByRole('link', { name: /Compare 30° and 60° launches/ }).click()
    await expect(page).toHaveURL(/#\/physics$/)
    await expect(page.locator('.activity')).toContainText('Start activity')
  })

  test('each subject card opens its first real lab', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.subject-card.is-chemistry .subject-card-action')).toHaveText(/Open periodic table/)
    await expect(page.locator('.subject-card.is-mathematics .subject-card-action')).toHaveText(/Open 2D functions/)
    await page.locator('.subject-card.is-anatomy').getByRole('link', { name: /^Breathing mechanics/ }).click()
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Breathing mechanics')
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

  test('keyboard order reaches the primary action first and shows a focus ring', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('button', { name: 'Start exploring' })
    await cta.focus()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Browse subjects' })).toBeFocused()
    const action = page.locator('.subject-card.is-biology .subject-card-action')
    await action.focus()
    expect(await action.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  })
})

