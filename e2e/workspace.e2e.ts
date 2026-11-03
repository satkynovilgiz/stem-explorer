import type { Page } from '@playwright/test'
import { expect, test, waitForViewport, goHome } from './fixtures.ts'

const left = (page: Page) => page.locator('.chem-side--left')
const right = (page: Page) => page.locator('.chem-side--right')
const layout = (page: Page) => page.getByRole('group', { name: 'Workspace layout' })

test('panels hide and show, the choice survives reload, and it never enters the link', async ({ page }) => {
  await page.goto('/?experiment=optics#/physics')
  await expect(left(page)).toBeVisible()
  const before = page.url()
  await layout(page).getByRole('button', { name: 'Left panel' }).click()
  await expect(left(page)).toBeHidden()
  await expect(layout(page).getByRole('button', { name: 'Left panel' })).toHaveAttribute('aria-pressed', 'false')
  await expect(right(page)).toBeVisible()
  expect(page.url()).toBe(before)
  await page.reload()
  await expect(left(page)).toBeHidden()
  // The same preference applies in another explorer, separate from its scientific settings.
  await page.goto('/?molecule=water#/chemistry')
  await expect(left(page)).toBeHidden()
  await layout(page).getByRole('button', { name: 'Show all panels' }).click()
  await expect(left(page)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('stem-explorer:workspace'))).toContain('"hideLeft":false')
})

test('dragging a divider resizes a panel, is remembered, and can be reset', async ({ page }) => {
  await page.goto('/?experiment=optics#/physics')
  const width = async (side: 'left' | 'right') => (await page.locator(`.chem-side--${side}`).boundingBox())!.width
  const drag = async (side: 'left' | 'right', by: number) => {
    const box = (await page.locator(`.panel-resizer--${side}`).boundingBox())!
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2]
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + by / 2, y)
    await page.mouse.move(x + by, y)
    await page.mouse.up()
  }
  const [left0, right0] = [await width('left'), await width('right')]
  const stage0 = (await page.locator('.chem-stage').boundingBox())!.width

  await drag('left', 100)
  expect(Math.abs((await width('left')) - (left0 + 100))).toBeLessThanOrEqual(1)
  await drag('right', 60) // Rightwards makes the right panel smaller.
  expect(Math.abs((await width('right')) - (right0 - 60))).toBeLessThanOrEqual(1)
  expect(Math.abs((await page.locator('.chem-stage').boundingBox())!.width - (stage0 - 40))).toBeLessThanOrEqual(2)
  expect(page.url()).not.toMatch(/width/i)

  await page.reload()
  expect(Math.abs((await width('left')) - (left0 + 100))).toBeLessThanOrEqual(1)

  // Limits: a panel stops at its minimum, and the stage always keeps its room.
  await drag('left', -900)
  expect(await width('left')).toBe(200)
  await drag('right', -900)
  expect((await page.locator('.chem-stage').boundingBox())!.width).toBeGreaterThanOrEqual(279)

  // The keyboard works too, and a divider leaves with its hidden panel.
  const divider = page.getByRole('separator', { name: 'Resize left panel' })
  await divider.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => width('left')).toBe(224)
  await expect(divider).toHaveAttribute('aria-valuenow', '224')
  await layout(page).getByRole('button', { name: 'Left panel' }).click()
  await expect(divider).toBeHidden()
  await layout(page).getByRole('button', { name: 'Show all panels' }).click()

  // Double-clicking returns to the default width.
  await divider.dblclick()
  await expect.poll(() => width('left')).toBe(left0)
})

test('Focus mode enlarges the visual, keeps controls reachable as an overlay, and Esc closes it', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  const width = async () => (await page.locator('.chem-stage').boundingBox())!.width
  const normal = await width()
  await page.getByRole('button', { name: 'Angle', exact: true }).click()
  await page.locator('body').click({ position: { x: 5, y: 890 } })
  await page.keyboard.press('f')
  await expect(left(page)).toBeHidden()
  await expect(right(page)).toBeHidden()
  await expect.poll(width).toBeGreaterThan(normal + 400)
  // The measurement tools, the badge and the scene controls stay inside the stage.
  await expect(page.locator('.viewport-badge')).toBeVisible()
  await expect(page.locator('.measure-panel')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Angle', exact: true })).toBeVisible()
  await layout(page).getByRole('button', { name: 'Controls' }).click()
  await expect(left(page)).toBeVisible()
  await expect(left(page)).toHaveCSS('position', 'fixed')
  await page.keyboard.press('Escape')
  await expect(left(page)).toBeHidden()
  await page.keyboard.press('f')
  await expect(left(page)).toBeVisible()
})

test('keyboard: shortcuts help, no shortcuts while typing, and focus is kept when a panel closes', async ({ page }) => {
  await page.goto('/?experiment=circuit#/physics')
  await expect(page.locator('.circuit-stage')).toBeVisible()
  await page.keyboard.press('?')
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(help).toBeVisible()
  await expect(help).toContainText('Turn Focus mode on or off')
  await page.keyboard.press('Escape')
  await expect(help).toBeHidden()
  // Typing "f" in a number field must not toggle Focus mode.
  const emf = page.getByRole('textbox').first()
  await emf.click()
  await emf.press('f')
  await emf.press('[')
  await expect(left(page)).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/ws-focus/)
  // Focus inside the left panel moves to its toggle when the panel is hidden from the keyboard.
  await page.getByRole('button', { name: 'Restore defaults' }).focus()
  await page.keyboard.press('[')
  await expect(left(page)).toBeHidden()
  await expect(layout(page).getByRole('button', { name: /Left panel/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(left(page)).toBeVisible()
  // "t" opens the Topics drawer; "/" opens Search.
  await page.locator('body').click({ position: { x: 700, y: 860 } })
  await page.keyboard.press('t')
  await expect(page.getByRole('dialog', { name: /topics$/ })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('/')
  await expect(page.getByRole('heading', { name: 'Search', level: 1 })).toBeVisible()
})

test('at 200% browser zoom (720 px wide) the workspace switches to the stacked layout and nothing overflows', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 })
  await page.goto('/?bsec=inheritance#/biology')
  await expect(layout(page)).toBeHidden()
  await expect(page.locator('table.punnett')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Choose a subject' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})

test('Home: five subject cards, interest starting points, and recent items with their module', async ({ page }) => {
  await page.goto('/')
  const glance = page.getByRole('region', { name: 'Choose a subject' })
  await expect(glance.locator('.subject-card')).toHaveCount(5)
  await glance.locator('.subject-card.is-physics .subject-card-action').click()
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Physics')
  await page.goto('/#/discover')
  const interests = page.getByRole('region', { name: 'Starting points by interest' })
  await expect(interests).toContainText('Grouped by topic, not by level')
  await interests.getByRole('link', { name: /Cross two pea plants/ }).click()
  await expect(page.locator('table.punnett')).toBeVisible()
  await page.waitForTimeout(1800) // a visit is recorded after about 1.5 s
  await goHome(page)
  await expect(page.locator('.recent-item').first()).toContainText('Biology · Inheritance')
  await expect(page.locator('.recent-item').first()).toContainText('just now')
})
