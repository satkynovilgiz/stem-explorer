import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const params = (page: Page) => new URL(page.url()).searchParams
const readout = (page: Page, name: RegExp) => page.locator('.mo-readouts tr', { has: page.getByRole('rowheader', { name }) }).locator('td')
const heading = (page: Page) => page.locator('#mo-heading')

test('a shared link opens paused at its time; graphs, motion and readouts use the same t', async ({ page }) => {
  await page.goto('/?msec=motion&mo=vertical-throw&my0=1&mv0=9.81&mt=1&mdt=0.5&mex=phys#/mathematics')
  await expect(heading(page)).toHaveText('Vertical throw · t = 1 s')
  await page.waitForTimeout(800)
  await expect(heading(page)).toHaveText('Vertical throw · t = 1 s')
  await expect(readout(page, /^Instantaneous velocity/)).toHaveText('0 m/s')
  await expect(readout(page, /^Acceleration a/)).toHaveText('-9.81 m/s²')
  // Each graph and the motion describe the same instant.
  for (const desc of await page.locator('.mo-graph desc').allTextContents()) expect(desc).toContain('At t = 1 s')
  await expect(page.locator('.mo-track')).toHaveAttribute('aria-label', /at t = 1 s\..*velocity 0 m\/s \(zero\); acceleration -9.81 m\/s² \(down\)/)
  await expect(page.locator('.mo-explain, .info').first()).toContainText('Up is positive')
})

test('Play runs to landing and stops; Pause, Reset and scrubbing; time stays inside the motion', async ({ page }) => {
  await page.goto('/?msec=motion&mo=vertical-throw&my0=1&mv0=2&mt=0&mdt=0.5&mex=phys#/mathematics')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect(page.getByRole('button', { name: 'Landed' })).toBeVisible({ timeout: 6000 })
  await expect(readout(page, /^Height y/)).toHaveText('0 m')
  expect(Number(params(page).get('mt'))).toBeGreaterThan(0.6)
  await page.getByRole('button', { name: 'Reset to t = 0' }).click()
  await expect(heading(page)).toHaveText('Vertical throw · t = 0 s')
  await page.getByRole('button', { name: 'Play' }).click()
  await page.waitForTimeout(250)
  await page.getByRole('button', { name: 'Pause' }).click()
  const held = await heading(page).textContent()
  await page.waitForTimeout(400)
  await expect(heading(page)).toHaveText(held!)
  const slider = page.getByRole('slider', { name: 'Current time t (s)' })
  await slider.focus()
  await page.keyboard.press('End')
  await expect(page.getByRole('button', { name: 'Landed' })).toBeDisabled()
  await page.keyboard.press('Home')
  await expect(heading(page)).toHaveText('Vertical throw · t = 0 s')
})

test('secant to tangent: average velocity approaches s′(t) as Δt shrinks; boundaries are refused without NaN', async ({ page }) => {
  await page.goto('/?msec=motion&mo=constant-acceleration&mx0=0&mv0=-2&ma=1&mt=3&mdt=1&mex=phys#/mathematics')
  const avg = readout(page, /^Average velocity/)
  await expect(avg).toHaveText('1.5 m/s')
  await expect(readout(page, /^Instantaneous velocity/)).toHaveText('1 m/s')
  for (const [dt, value] of [['0.1', '1.05 m/s'], ['0.01', '1.005 m/s'], ['0.001', '1.0005 m/s']]) {
    await page.getByRole('button', { name: `Δt = ${dt} s` }).click()
    await expect(avg).toHaveText(value)
  }
  // t + Δt past the end of the motion.
  await page.getByRole('textbox', { name: 'Δt for the secant (s)' }).fill('5')
  await page.getByRole('slider', { name: 'Current time t (s)' }).fill('9')
  await expect(page.getByRole('status').filter({ hasText: 'outside the motion' })).toContainText('or a negative one')
  await expect(avg).toHaveText('—')
  await expect(page.locator('main')).not.toContainText('NaN')
  await expect(page.locator('main')).not.toContainText('Infinity')
  await page.getByRole('textbox', { name: 'Δt for the secant (s)' }).fill('-1')
  await expect(avg).not.toHaveText('—')
  // Zero is refused at the input.
  await page.getByRole('textbox', { name: 'Δt for the secant (s)' }).fill('0')
  await expect(page.locator('.status-error', { hasText: 'Δt must not be zero' })).toBeVisible()
  expect(params(page).get('mdt')).toBe('-1')
})

test('the four investigations, and switching between mathematics and physics keeps every setting', async ({ page }) => {
  await page.goto('/?msec=motion#/mathematics')
  const inv = page.getByRole('group', { name: 'Investigations' })
  await inv.getByRole('button', { name: 'Constant velocity' }).click()
  await expect(page.locator('.enz-investigation')).toContainText('average velocity 1.5 m/s equals instantaneous velocity 1.5 m/s')
  await expect(readout(page, /^Acceleration a/)).toHaveText('0 m/s²')
  await inv.getByRole('button', { name: 'Constant acceleration' }).click()
  await expect(page.locator('.enz-investigation')).toContainText('½·a·Δt')
  await inv.getByRole('button', { name: 'Top of a vertical throw' }).click()
  await expect(page.locator('.enz-investigation')).toContainText('v = 0 m/s')
  await inv.getByRole('button', { name: 'Oscillation' }).click()
  await expect(page.locator('.enz-investigation')).toContainText('a = −ω²·x')
  const before = page.url().replace(/&mex=\w+/, '')
  await page.getByRole('group', { name: 'Explain as' }).getByRole('button', { name: 'Mathematics' }).click()
  await expect(page.locator('#mo-explain')).toHaveText('Derivative as a slope')
  await expect(page.locator('.mo-graph-title').first()).toHaveText('x(t), the function')
  await expect.poll(() => params(page).get('mex')).toBe('math')
  expect(page.url().replace(/&mex=\w+/, '')).toBe(before)
  await expect(page.locator('.enz-investigation')).toContainText('a = −ω²·x')
})

test('reduced motion: no Play; step buttons and the slider still move time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?msec=motion#/mathematics')
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
  await page.getByRole('button', { name: '+0.1 s' }).click()
  await expect(heading(page)).toHaveText('Constant acceleration · t = 1.1 s')
})

test('older Mathematics links still open their sections', async ({ page }) => {
  await page.goto('/?msec=functions&fn=quadratic#/mathematics')
  await expect(page.getByRole('group', { name: 'Mathematics section' }).getByRole('button', { name: '2D functions' })).toHaveAttribute('aria-pressed', 'true')
  await page.goto('/?msec=motion&mo=nope#/mathematics')
  await expect(heading(page)).toContainText('Constant acceleration')
})
