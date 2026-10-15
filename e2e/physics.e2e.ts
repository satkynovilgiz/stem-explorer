import type { Page } from '@playwright/test'
import { expect, search, test, waitForViewport } from './fixtures.ts'

const live = (page: Page, name: string) => page.locator('.readout > div').filter({ hasText: name }).locator('dd')
const summary = (page: Page, name: string) => page.locator('.stats > div').filter({ hasText: name }).locator('dd')
const status = (page: Page) => page.locator('.status-tag')
const field = (page: Page, label: string) => page.getByRole('textbox', { name: new RegExp(`^${label}`) })
const timeSlider = (page: Page) => page.getByRole('slider', { name: /^Time/ })
const graphReadout = (page: Page, title: string) => page.locator('.graph').filter({ hasText: title }).locator('.graph-readout')

async function typeParam(page: Page, label: string, value: string) {
  const input = field(page, label)
  await input.fill(value)
  await input.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/physics')
  await waitForViewport(page)
})

test('opens ready at t = 0 with predicted results and does not launch on its own', async ({ page }) => {
  await expect(status(page)).toHaveText('Ready at launch')
  // Default: 20 m/s at 45° from the ground, g = 9.81 m/s².
  await expect(summary(page, 'Flight time')).toHaveText('2.88 s')
  await expect(summary(page, 'Maximum height')).toHaveText('10.2 m')
  await expect(summary(page, 'Landing distance')).toHaveText('40.8 m')
  await page.waitForTimeout(800)
  await expect(live(page, 'Time t')).toHaveText('0 s')
  await page.getByRole('tab', { name: 'Assumptions & equations' }).click()
  await expect(page.getByText('No air resistance.')).toBeVisible()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org\/books\/university-physics-volume-1/)
})

test('typed inputs commit only complete numbers, are clamped, and update the prediction and URL', async ({ page }) => {
  const angle = field(page, 'Launch angle')
  await angle.fill('3')
  await angle.fill('3.')
  await expect(page.locator('.param-hint.is-error')).toHaveText('Not a complete number yet.')
  await angle.blur()
  // Partial input is discarded: nothing changed.
  await expect(angle).toHaveValue('45')
  await expect(summary(page, 'Flight time')).toHaveText('2.88 s')

  await typeParam(page, 'Launch angle', '30')
  // 20 m/s at 30°: T = 2·10/9.81 = 2.04 s, R = 20²·sin 60°/9.81 = 35.3 m.
  await expect(summary(page, 'Flight time')).toHaveText('2.04 s')
  await expect(summary(page, 'Landing distance')).toHaveText('35.3 m')
  expect((await search(page)).get('angle')).toBe('30')

  await typeParam(page, 'Gravity', '0')
  await expect(field(page, 'Gravity')).toHaveValue('1.00')
})

test('launch, pause, resume, land and reset', async ({ page }) => {
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(status(page)).toHaveText('In flight')
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(status(page)).toHaveText('Paused')
  const pausedAt = await live(page, 'Time t').textContent()
  expect(pausedAt).not.toBe('0 s')
  await page.waitForTimeout(500)
  await expect(live(page, 'Time t')).toHaveText(pausedAt!)

  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(status(page)).toHaveText('Landed — values at impact', { timeout: 10_000 })
  await expect(live(page, 'Time t')).toHaveText('2.88 s')
  await expect(live(page, 'Height y')).toHaveText('0 m')
  await expect(live(page, 'Position x')).toHaveText('40.8 m')
  await expect(page.getByRole('status').filter({ hasText: 'Landed after 2.88 s, 40.8 m' })).toHaveCount(1)

  await typeParam(page, 'Launch speed', '25')
  await page.getByRole('button', { name: 'Reset experiment' }).click()
  await expect(live(page, 'Time t')).toHaveText('0 s')
  await expect(field(page, 'Launch speed')).toHaveValue('25.0')
  await page.getByRole('button', { name: 'Restore defaults' }).click()
  await expect(field(page, 'Launch speed')).toHaveValue('20.0')
})

test('scrubbing pauses and keeps readouts and both graphs on the same time', async ({ page }) => {
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await timeSlider(page).fill('1.2')
  await expect(status(page)).toHaveText('Paused')
  await expect(live(page, 'Time t')).toHaveText('1.20 s')
  // y(1.2) = 14.14·1.2 − 4.905·1.44 = 9.91 m; vᵧ(1.2) = 14.14 − 9.81·1.2 = 2.37 m/s.
  await expect(live(page, 'Height y')).toHaveText('9.91 m')
  await expect(graphReadout(page, 'Height vs time')).toContainText('At t = 1.20 s: y = 9.91 m')
  await expect(graphReadout(page, 'Vertical velocity vs time')).toContainText('At t = 1.20 s: vᵧ = 2.37 m/s')
  const marker = page.locator('.graph').first().locator('.graph-marker')
  const x1 = Number(await marker.getAttribute('x1'))
  await timeSlider(page).fill('2.4')
  await expect(graphReadout(page, 'Height vs time')).toContainText('At t = 2.40 s')
  expect(Number(await marker.getAttribute('x1'))).toBeGreaterThan(x1)
})

test('editing an input returns to t = 0', async ({ page }) => {
  await timeSlider(page).fill('1.5')
  await expect(live(page, 'Time t')).toHaveText('1.50 s')
  await page.getByRole('slider', { name: 'Launch angle slider' }).fill('50')
  await expect(live(page, 'Time t')).toHaveText('0 s')
  await expect(status(page)).toHaveText('Ready at launch')
})

test('playback speed changes how fast time passes, not the results', async ({ page }) => {
  // A fake clock drives requestAnimationFrame and performance.now, so frame timing is deterministic.
  await page.clock.install()
  await page.goto('/#/physics')
  await waitForViewport(page)
  // Freeze time: from here it only moves when the test calls runFor.
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000)
  const simulatedAfterOneSecond = async (rate: string) => {
    await page.getByRole('button', { name: `Playback speed ${rate} times` }).click()
    await page.getByRole('button', { name: /^Launch/ }).click()
    await page.clock.runFor(1000)
    await page.getByRole('button', { name: 'Pause' }).click()
    const t = parseFloat((await live(page, 'Time t').textContent())!)
    await page.getByRole('button', { name: 'Reset experiment' }).click()
    return t
  }
  // One second of real time = 0.5 s or 2 s of flight (within one frame).
  const slow = await simulatedAfterOneSecond('0.5')
  const fast = await simulatedAfterOneSecond('2')
  expect(Math.abs(slow - 0.5)).toBeLessThan(0.03)
  expect(Math.abs(fast - 2)).toBeLessThan(0.05)

  // …but the predicted and final results are identical at any speed.
  await expect(summary(page, 'Landing distance')).toHaveText('40.8 m')
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await page.clock.runFor(3000)
  await expect(status(page)).toHaveText('Landed — values at impact')
  await expect(live(page, 'Position x')).toHaveText('40.8 m')
  await expect(live(page, 'Time t')).toHaveText('2.88 s')
})

test('an immediate impact lands without animating', async ({ page }) => {
  await typeParam(page, 'Launch speed', '0')
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(status(page)).toHaveText('Landed — values at impact')
  await expect(page.getByRole('status').filter({ hasText: 'lands immediately' })).toHaveCount(1)
  await expect(timeSlider(page)).toBeDisabled()
})

test('compares a saved Run A with the active Run B', async ({ page }) => {
  await page.getByRole('button', { name: 'Save as Run A' }).click()
  await typeParam(page, 'Launch angle', '60')
  const table = page.locator('.compare-table')
  await expect(table).toBeVisible()
  await expect(table.locator('tr', { hasText: 'Launch angle' })).toContainText('45 °')
  await expect(table.locator('tr', { hasText: 'Launch angle' })).toContainText('60 °')
  // Run A: 40.8 m; Run B at 60°: 20²·sin 120°/9.81 = 35.3 m.
  await expect(table.locator('tr', { hasText: 'Landing distance' })).toContainText('40.8 m')
  await expect(table.locator('tr', { hasText: 'Landing distance' })).toContainText('35.3 m')
  await expect(page.locator('.run-tag')).toHaveText('Run B (active)')
  await expect(page.locator('.graph-legend').first()).toContainText('Run A (saved)')

  await page.getByRole('button', { name: 'Clear comparison' }).click()
  await expect(table).toHaveCount(0)
})

test.describe('URL state', () => {
  test('restores shared inputs paused at t = 0', async ({ page }) => {
    await page.goto('/?speed=15&angle=60&height=10&gravity=1.62#/physics')
    await waitForViewport(page)
    await expect(field(page, 'Launch speed')).toHaveValue('15.0')
    await expect(field(page, 'Gravity')).toHaveValue('1.62')
    await expect(status(page)).toHaveText('Ready at launch')
    await expect(live(page, 'Time t')).toHaveText('0 s')
  })

  test('falls back per parameter for invalid values and corrects the address', async ({ page }) => {
    await page.goto('/?speed=abc&angle=200&height=4&gravity=0#/physics')
    await waitForViewport(page)
    await expect(field(page, 'Launch speed')).toHaveValue('20.0')
    await expect(field(page, 'Launch angle')).toHaveValue('45')
    await expect(field(page, 'Initial height')).toHaveValue('4.0')
    await expect(field(page, 'Gravity')).toHaveValue('9.81')
    const q = await search(page)
    expect([q.get('speed'), q.get('angle'), q.get('height'), q.get('gravity')]).toEqual(['20', '45', '4', '9.81'])
  })

  test('keeps subjects separate across switching, Back/Forward and refresh', async ({ page }) => {
    await page.goto('/?molecule=benzene&view=space-filling&structure=golgi#/chemistry')
    await waitForViewport(page)
    await page.getByRole('link', { name: /^Physics/ }).click()
    await waitForViewport(page)
    await expect(field(page, 'Launch angle')).toHaveValue('45')
    await typeParam(page, 'Launch angle', '30')

    await page.getByRole('link', { name: /^Chemistry/ }).click()
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')

    await page.goBack()
    await waitForViewport(page)
    await expect(field(page, 'Launch angle')).toHaveValue('30')
    await page.goBack()
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
    await page.goForward()
    await waitForViewport(page)
    await expect(field(page, 'Launch angle')).toHaveValue('30')
    await page.reload()
    await waitForViewport(page)
    await expect(field(page, 'Launch angle')).toHaveValue('30')
    await expect(live(page, 'Time t')).toHaveText('0 s')

    // Biology still reads only its own keys from the shared address.
    await page.getByRole('link', { name: /^Biology/ }).click()
    await waitForViewport(page)
    await expect(page.locator('#structure-heading')).toHaveText('Golgi apparatus')
  })

  test('slider movement does not add history entries', async ({ page }) => {
    const before = await page.evaluate(() => history.length)
    for (const v of ['30', '40', '50', '60']) await page.getByRole('slider', { name: 'Launch angle slider' }).fill(v)
    expect(await page.evaluate(() => history.length)).toBe(before)
  })

  test('Copy link copies a Physics-only link from the current origin', async ({ page, baseURL }) => {
    await page.goto('/?molecule=water#/physics')
    await waitForViewport(page)
    await typeParam(page, 'Initial height', '12.5')
    await page.getByRole('button', { name: 'Copy link' }).click()
    await expect(page.locator('.copy-link-status')).toContainText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${baseURL}/?speed=20&angle=45&height=12.5&gravity=9.81#/physics`,
    )
  })
})
