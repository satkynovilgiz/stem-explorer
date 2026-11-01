import { expect, test } from './fixtures.ts'

test('calculators show only their task: no molecule library, activity, layout or Present controls', async ({ page }) => {
  for (const path of ['/?csec=solutions&st=molarity#/chemistry', '/?csec=solutions&st=dilution#/chemistry', '/?csec=reactions#/chemistry']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.locator('.molecule-card')).toHaveCount(0)
    await expect(page.locator('.activity-launch, .activity')).toHaveCount(0)
    await expect(page.locator('.workspace-controls')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Present' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Read the explanation/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
  }
  await page.goto('/?csec=solutions&st=molarity#/chemistry')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molarity calculator')
})

test('the molecule workspace keeps its library, activity and model controls', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await expect(page.locator('.molecule-card')).toHaveCount(12)
  await expect(page.locator('.activity-launch')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Present' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('Save… groups the saving actions; Escape closes it and returns focus', async ({ page }) => {
  await page.goto('/?csec=solutions&st=molarity#/chemistry')
  const save = page.getByRole('button', { name: 'Save…' })
  await expect(save).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: 'Save exploration' })).toHaveCount(0)
  await save.focus()
  await page.keyboard.press('Enter')
  const menu = page.getByRole('group', { name: 'Save options' })
  await expect(menu.getByRole('button')).toHaveText([/Add note/, /Save exploration/, /Add to collection/])
  await menu.getByRole('button', { name: 'Save exploration' }).focus()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(save).toBeFocused()
  // Saving still works through the menu.
  await save.click()
  await menu.getByRole('button', { name: 'Save exploration' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.save-status')).toContainText('Saved on this browser')
})

test('a worked-example link opens the explanation at its worked example, visibly', async ({ page }) => {
  await page.goto('/?csec=learn&lt=molarity&lf=example#/chemistry')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molarity')
  const example = page.locator('#worked-example')
  await expect(example).toHaveAttribute('open', '')
  await expect(example).toBeInViewport()
  await expect(example.locator('.ref-worked-q').first()).toHaveText('What is given?')
  // The reading page links to the calculator, and back.
  await page.getByRole('link', { name: /Molarity calculator/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molarity calculator')
  await page.getByRole('link', { name: /Read the explanation/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Molarity')
})
