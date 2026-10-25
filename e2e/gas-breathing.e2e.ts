import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const p2 = (page: Page) => page.locator('.gas-p2')
const point = (page: Page) => page.locator('.gas-point')
const search = (page: Page) => page.evaluate(() => Object.fromEntries(new URLSearchParams(window.location.search)))
const param = async (page: Page, k: string) => (await page.evaluate((key) => new URLSearchParams(window.location.search).get(key), k))
const field = (page: Page, label: RegExp) => page.getByRole('textbox', { name: label })

async function typeValue(page: Page, label: RegExp, value: string) {
  await field(page, label).fill(value)
  await field(page, label).press('Enter')
}

test.describe("Boyle's law lab", () => {
  test('a shared link opens paused; readout, equation, graph point and table agree; inverse cases', async ({ page }) => {
    await page.goto('/?experiment=gas&gp=101.3&gv1=2&gv2=1#/physics')
    await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'false')
    await expect(p2(page)).toHaveText('202.6 kPa')
    await expect(page.locator('.gas-substituted')).toHaveText('P₂ = (101.3 kPa × 2 L) / 1 L = 202.6 kPa')
    await expect(point(page)).toHaveAttribute('data-v', '1')
    expect(Number(await point(page).getAttribute('data-p'))).toBeCloseTo(202.6, 9)
    await expect(page.locator('.gas-table tr.is-current')).toContainText('202.6')
    await expect(page.locator('.readout')).toContainText('2.000 atm · 1520 torr')
    // Still paused a moment later: nothing changes on its own.
    await page.waitForTimeout(800)
    expect(await param(page, 'gv2')).toBe('1')

    // Doubling the volume from the start halves the pressure.
    await typeValue(page, /^New volume/, '4')
    await expect(p2(page)).toHaveText('50.65 kPa')
    await expect(page.locator('.readout')).toContainText('pressure × 0.500 (expanded)')
    await expect(point(page)).toHaveAttribute('data-v', '4')
    await expect.poll(() => param(page, 'gv2')).toBe('4')
    // Equal volumes: unchanged.
    await typeValue(page, /^New volume/, '2')
    await expect(p2(page)).toHaveText('101.3 kPa')
    await expect(page.locator('.readout')).toContainText('Volume unchanged, so pressure unchanged')
  })

  test('zero, negative and out-of-range input are refused with an explanation and change nothing', async ({ page }) => {
    await page.goto('/?experiment=gas&gp=101.3&gv1=2&gv2=1#/physics')
    await typeValue(page, /^New volume/, '0')
    await expect(page.locator('.gas-problem')).toContainText('A volume must be greater than zero')
    await expect(p2(page)).toHaveText('202.6 kPa')
    expect(await param(page, 'gv2')).toBe('1')
    await typeValue(page, /^Starting pressure/, '-20')
    await expect(page.locator('.gas-problem')).toContainText('Absolute pressure must be greater than zero')
    await typeValue(page, /^Starting volume/, '50')
    await expect(page.locator('.gas-problem')).toContainText('Use 0.5–10 L; nothing was changed.')
    await expect(p2(page)).toHaveText('202.6 kPa')
    // An invalid link falls back to a valid state.
    await page.goto('/?experiment=gas&gp=0&gv1=2&gv2=1#/physics')
    await expect(p2(page)).toHaveText('202.6 kPa')
  })

  test('Play moves the piston, Pause stops it, Reset restores defaults; reduced motion hides Play', async ({ page }) => {
    await page.goto('/?experiment=gas&gp=150&gv1=3&gv2=3#/physics')
    await page.getByRole('button', { name: 'Play' }).click()
    await expect.poll(() => param(page, 'gv2'), { timeout: 10_000 }).not.toBe('3')
    await page.getByRole('button', { name: 'Pause' }).click()
    const paused = await param(page, 'gv2')
    await page.waitForTimeout(700)
    expect(await param(page, 'gv2')).toBe(paused)
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(p2(page)).toHaveText('202.6 kPa')
    expect(await search(page)).toMatchObject({ experiment: 'gas', gp: '101.3', gv1: '2', gv2: '1' })

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.locator('.circuit-stage')).toContainText('Play is not offered because reduced motion is on')
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
  })

  test('links to breathing mechanics and explains why the gas law is not a lung model', async ({ page }) => {
    await page.goto('/?experiment=gas#/physics')
    await expect(page.locator('.info')).toContainText('lungs are not a sealed rigid cylinder')
    await page.getByRole('link', { name: 'See breathing mechanics in Anatomy' }).click()
    await expect(page.locator('#breath-stage-heading')).toContainText('Breathing mechanics')
    await page.getByRole('link', { name: 'Boyle’s law lab (Physics)' }).click()
    await expect(page.locator('#gas-stage-heading')).toContainText('Boyle’s law')
  })
})

test.describe('Breathing mechanics', () => {
  test('a shared link opens paused at that phase, with direction and pressure written as text', async ({ page }) => {
    await page.goto('/?breath=expiration&bpos=40&bshow=airflow#/anatomy')
    await expect(page.locator('#breath-stage-heading')).toHaveText('Breathing mechanics · Expiration (quiet) (40%)')
    await expect(page.locator('.breath-flow-label')).toHaveText('Air out ↑')
    await expect(page.locator('.breath-svg')).toContainText('Alveolar pressure > atmospheric')
    await expect(page.locator('.breath-now')).toContainText('passive')
    await expect(page.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-pressed', 'false')
    await page.waitForTimeout(800)
    expect(await search(page)).toEqual({ breath: 'expiration', bpos: '40', bshow: 'airflow' })
    await expect(page.locator('.breadcrumb, nav[aria-label="Breadcrumb"]').first()).toContainText('Expiration')
  })

  test('steps through a whole cycle: no airflow at the ends, in during inspiration, out during expiration', async ({ page }) => {
    await page.goto('/?breath=inspiration&bpos=0&bshow=airflow#/anatomy')
    const label = page.locator('.breath-flow-label')
    await expect(label).toHaveText('No airflow')
    await expect(page.locator('.breath-svg')).toContainText('Alveolar pressure = atmospheric')
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(label).toHaveText('Air in ↓')
    await expect(page.locator('.breath-svg')).toContainText('Alveolar pressure < atmospheric')
    await page.getByRole('button', { name: 'Next step' }).click()
    await page.getByRole('button', { name: 'Next step' }).click()
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.locator('#breath-stage-heading')).toContainText('End of inspiration (100%)')
    await expect(label).toHaveText('No airflow')
    await page.getByRole('button', { name: 'Next step' }).click()
    await expect(page.getByRole('button', { name: 'Expiration' })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('slider', { name: /Progress through expiration/ }).fill('60')
    await expect(label).toHaveText('Air out ↑')
    await expect.poll(() => param(page, 'bpos')).toBe('60')
    await page.getByRole('button', { name: 'Previous step' }).click()
    await expect(page.locator('#breath-stage-heading')).toContainText('(35%)')
  })

  test('gas exchange is shown separately from airflow, and the choice is in the link', async ({ page }) => {
    await page.goto('/?breath=inspiration&bpos=50&bshow=airflow#/anatomy')
    await expect(page.locator('.breath-inset')).toHaveCount(0)
    await page.getByRole('button', { name: 'Airflow + gas exchange' }).click()
    await expect(page.locator('.breath-inset')).toContainText('Diffusion (not airflow)')
    await expect.poll(() => param(page, 'bshow')).toBe('exchange')
    await expect(page.locator('.info')).toContainText('do not exchange gases')
  })

  test('Play advances, Pause holds; reduced motion offers steps instead', async ({ page }) => {
    await page.goto('/?breath=inspiration&bpos=0&bshow=airflow#/anatomy')
    await page.getByRole('button', { name: 'Play' }).click()
    await expect.poll(() => param(page, 'bpos'), { timeout: 10_000 }).not.toBe('0')
    await page.getByRole('button', { name: 'Pause' }).click()
    const held = await param(page, 'bpos')
    await page.waitForTimeout(700)
    expect(await param(page, 'bpos')).toBe(held)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.reload()
    await expect(page.getByRole('button', { name: 'Play' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible()
  })

  test('the module switch adds a history entry, and older anatomy links still open their modules', async ({ page }) => {
    await page.goto('/?atlas=diaphragm&bview=front#/anatomy')
    await page.getByRole('button', { name: 'Breathing', exact: true }).click()
    await expect(page.locator('#breath-stage-heading')).toBeVisible()
    expect(await search(page)).toEqual({ breath: 'inspiration', bpos: '0', bshow: 'airflow' })
    await page.goBack()
    await expect.poll(() => param(page, 'atlas')).toBe('diaphragm')
    await expect(page.locator('#breath-stage-heading')).toHaveCount(0)
  })
})
