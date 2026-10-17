import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const params = (page: Page) => new URL(page.url()).searchParams
const experiment = (page: Page, name: string) => page.getByRole('group', { name: 'Experiment' }).getByRole('button', { name })

test('DC circuit: series values, then parallel and mixed, with equations, assumptions and a link that opens paused', async ({ page }) => {
  await page.goto('/#/physics')
  await experiment(page, 'DC circuit').click()
  await expect.poll(() => params(page).get('experiment')).toBe('circuit')
  const table = page.locator('.circuit-table')
  // Defaults: 12 V across 100 Ω + 200 Ω in series → 40 mA everywhere.
  await expect(table.getByRole('row', { name: /^R₁/ })).toContainText('40.0 mA')
  await expect(table.getByRole('row', { name: /^R₂/ })).toContainText('8.00 V')
  await expect(table.locator('tfoot')).toContainText('480 mW')
  await page.getByRole('radio', { name: 'Two resistors in parallel' }).check()
  await expect(table.getByRole('row', { name: /^R₁/ })).toContainText('12.0 V')
  await expect(table.getByRole('row', { name: /^R₂/ })).toContainText('60.0 mA')
  await expect(page.locator('.equation-list')).toContainText('1/R_eq = 1/R₁ + 1/R₂')
  await expect(page.locator('.circuit-stage')).toContainText('conventional-current direction')
  await expect(page.locator('.chem-side--right')).toContainText('no internal resistance')
  await expect(page.locator('.chem-side--right')).toContainText('electrons, going the other way')
  // Bounds: a typed 0 Ω is not accepted below the minimum.
  const r1 = page.getByRole('textbox', { name: /Resistance R₁/ })
  await r1.fill('0')
  await r1.press('Enter')
  await expect(r1).toHaveValue('1')
  await page.getByRole('radio', { name: /R₁ in series with/ }).check()
  await expect.poll(() => params(page).get('arr')).toBe('mixed')
  const link = new URL(page.url())
  expect(link.searchParams.get('arr')).toBe('mixed')
  await page.goto(link.toString())
  await expect(page.getByRole('button', { name: 'Show flow (conceptual)' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.circuit-arrow').first()).toBeVisible()
  await page.getByRole('button', { name: 'Show flow (conceptual)' }).click()
  await expect(page.locator('.circuit-marker').first()).toBeVisible()
  await expect(page.locator('.circuit-stage')).toContainText('more markers per length = more current')
})

test('wave: v is derived from f and λ, opens paused, scrubs and inspects a point; two graph kinds', async ({ page }) => {
  await page.goto('/?experiment=wave&wamp=0.3&wfreq=2&wlen=2&wx=0.5#/physics')
  await expect(page.locator('#wave-stage-heading')).toContainText('t = 0.00 s')
  await expect(page.locator('.wave-speed-note')).toContainText('v = f λ = 2 Hz × 2 m = 4.000 m/s')
  // No independent speed control exists.
  await expect(page.getByRole('textbox', { name: /speed/i })).toHaveCount(0)
  // x₀ = λ/4 at t = 0: y = A.
  await expect(page.locator('.wave-probe-value')).toHaveText('0.300 m')
  const time = page.getByRole('slider', { name: 'Time (scrub, 0 to 2 periods)' })
  await time.fill('0.25')
  await expect(page.locator('#wave-stage-heading')).toContainText('t = 0.25 s')
  await expect(page.locator('.wave-probe-value')).toHaveText('−0.300 m')
  await expect(page.locator('.wave-graph figcaption').first()).toContainText('Displacement vs position')
  await expect(page.locator('.wave-graph figcaption').nth(1)).toContainText('Displacement vs time at x₀ = 0.5 m')
  await expect(page.locator('.chem-side--right')).toContainText('the medium itself does not travel with the wave')
  await page.getByRole('button', { name: 'Play' }).click()
  await expect.poll(async () => (await page.locator('#wave-stage-heading').textContent())!.includes('t = 0.25 s')).toBe(false)
  await page.getByRole('button', { name: 'Pause' }).click()
  expect([...params(page).keys()].some((k) => /^t$|time/.test(k))).toBe(false)
})

test('reduced motion: no Play in the wave lab and still arrows in the circuit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?experiment=wave#/physics')
  await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
  await page.goto('/?experiment=circuit#/physics')
  await expect(page.getByRole('button', { name: 'Show flow (conceptual)' })).toHaveCount(0)
  await expect(page.locator('.circuit-arrow').first()).toBeVisible()
})

test('older physics links still open their labs; switching back to projectile drops lab keys', async ({ page }) => {
  await page.goto('/?experiment=circuit&arr=parallel-3&emf=6&r1=2&r2=3&r3=6#/physics')
  await expect(page.locator('.circuit-table tfoot')).toContainText('R_eq ≈ 1.000 Ω')
  await experiment(page, 'Projectile').click()
  await expect.poll(() => params(page).get('arr')).toBeNull()
  expect(params(page).get('experiment')).toBeNull()
  await page.goto('/?speed=20&angle=30#/physics')
  await expect(experiment(page, 'Projectile')).toHaveAttribute('aria-pressed', 'true')
})
