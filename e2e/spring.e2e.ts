import type { Page } from '@playwright/test'
import { expect, search, test, waitForViewport } from './fixtures.ts'

const live = (page: Page, name: string) => page.locator('.readout > div').filter({ hasText: name }).locator('dd')
const stat = (page: Page, name: string) => page.locator('.stats > div').filter({ hasText: name }).locator('dd')
const energy = (page: Page, label: string) => page.locator('.energy-bars li').filter({ hasText: label }).locator('.energy-value')
const timeSlider = (page: Page) => page.getByRole('slider', { name: /^Time/ })
const field = (page: Page, label: string) => page.getByRole('textbox', { name: new RegExp(`^${label}`) })

test('switches experiments without losing either lab’s settings, and links stay backward compatible', async ({ page }) => {
  await page.goto('/?speed=15&angle=60#/physics')
  await waitForViewport(page)
  await page.getByRole('group', { name: 'Experiment' }).getByRole('button', { name: 'Spring–mass' }).click()
  await expect(page.locator('#spring-heading')).toHaveText('Spring–mass oscillation lab')
  let q = await search(page)
  expect([q.get('experiment'), q.get('mass'), q.get('k'), q.get('x0'), q.get('angle')]).toEqual(['spring', '1', '20', '0.2', '60'])
  await page.getByRole('group', { name: 'Experiment' }).getByRole('button', { name: 'Projectile' }).click()
  await expect(field(page, 'Launch angle')).toHaveValue('60')
  q = await search(page)
  expect([q.has('experiment'), q.has('mass')]).toEqual([false, false])
})

test('known analytic values: period, readouts at a quarter period, and the restoring force', async ({ page }) => {
  // m = 1 kg, k = 4 N/m: ω = 2 rad/s, T = π s; x₀ = 0.3 m.
  await page.goto('/?experiment=spring&mass=1&k=4&x0=0.3#/physics')
  await waitForViewport(page)
  await expect(stat(page, 'Period T')).toHaveText('3.14 s')
  await expect(stat(page, 'Frequency f')).toHaveText('0.318 Hz')
  await expect(stat(page, 'Total energy E')).toHaveText('0.180 J') // ½·4·0.3²
  await expect(live(page, 'Position x')).toHaveText('0.300 m')
  await expect(live(page, 'Restoring force F')).toHaveText('-1.20 N')
  await expect(live(page, 'Velocity v')).toHaveText('0 m/s') // released from rest
  // A quarter period: equilibrium, all energy kinetic, fastest speed (Aω = 0.6 m/s), moving left.
  // The scrubber moves in 0.01 s steps; T/4 = π/4 ≈ 0.785 s, so 0.79 s is just past equilibrium:
  // x = 0.3·cos(1.58) ≈ −0.0028 m.
  await timeSlider(page).fill('0.79')
  await expect(live(page, 'Position x')).toHaveText('-0.003 m')
  await expect(live(page, 'Velocity v')).toHaveText('-0.600 m/s')
  await expect(energy(page, 'Kinetic')).toHaveText('0.180 J')
  await expect(energy(page, 'Spring potential')).toHaveText('0 J')
  // The period does not depend on amplitude.
  await field(page, 'Initial displacement').fill('0.05')
  await field(page, 'Initial displacement').press('Enter')
  await expect(stat(page, 'Period T')).toHaveText('3.14 s')
})

test('energy is conserved while scrubbing, and scrubbing pauses', async ({ page }) => {
  await page.goto('/?experiment=spring&mass=2.5&k=37&x0=-0.42#/physics')
  await waitForViewport(page)
  const total = await energy(page, 'Total E').textContent()
  for (const t of ['0.3', '0.9', '1.7', '2.4']) {
    await timeSlider(page).fill(t)
    const k = Number((await energy(page, 'Kinetic').textContent())!.replace(' J', ''))
    const u = Number((await energy(page, 'Spring potential').textContent())!.replace(' J', ''))
    expect(Math.abs(k + u - Number(total!.replace(' J', '')))).toBeLessThan(0.006)
  }
  await expect(page.locator('.status-tag')).toHaveText('Paused')
})

test('launch, pause holds time, resume, end of window, reset; links open paused at t = 0', async ({ page }) => {
  await page.goto('/?experiment=spring&mass=0.1&k=200&x0=0.2#/physics') // T ≈ 0.14 s, window ≈ 0.42 s
  await waitForViewport(page)
  await expect(page.locator('.status-tag')).toHaveText('Ready at t = 0')
  await expect(live(page, 'Time t')).toHaveText('0 s')
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  const paused = await live(page, 'Time t').textContent()
  await page.waitForTimeout(400)
  await expect(live(page, 'Time t')).toHaveText(paused!)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.status-tag')).toHaveText('End of the window', { timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Launch again' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset experiment' }).click()
  await expect(live(page, 'Time t')).toHaveText('0 s')
})

test('zero displacement and input bounds', async ({ page }) => {
  await page.goto('/?experiment=spring&x0=0#/physics')
  await waitForViewport(page)
  await expect(page.locator('.inline-note').filter({ hasText: 'zero displacement' })).toBeVisible()
  await expect(stat(page, 'Total energy E')).toHaveText('0 J')
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await expect(live(page, 'Position x')).toHaveText('0 m')
  // Out-of-range or malformed link values fall back on their own; typed values are clamped.
  await page.goto('/?experiment=spring&mass=0&k=abc&x0=0.31#/physics')
  await expect(field(page, 'Mass')).toHaveValue('1.0')
  await expect(field(page, 'Spring constant')).toHaveValue('20')
  await expect(field(page, 'Initial displacement')).toHaveValue('0.31')
  await field(page, 'Spring constant').fill('999')
  await field(page, 'Spring constant').press('Enter')
  await expect(field(page, 'Spring constant')).toHaveValue('200')
})

test('a background tab does not jump ahead when it becomes visible again', async ({ page }) => {
  await page.clock.install()
  await page.goto('/?experiment=spring&mass=10&k=1&x0=0.5#/physics') // T ≈ 19.9 s
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Launch', exact: true }).click()
  await page.clock.runFor(1000)
  // Simulate the tab being hidden for 10 s: no frames arrive, then visibility returns.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.setSystemTime(Date.now() + 10_000)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.runFor(200)
  await page.getByRole('button', { name: 'Pause' }).click()
  const t = Number((await live(page, 'Time t').textContent())!.replace(' s', ''))
  expect(t).toBeLessThan(3)
})

test('copy link and save keep the spring experiment', async ({ page }) => {
  await page.goto('/?experiment=spring&mass=2&k=50&x0=-0.1#/physics')
  await page.getByRole('button', { name: 'Save exploration' }).click()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Spring: m = 2 kg, k = 50 N/m, x₀ = -0.1 m')
})
