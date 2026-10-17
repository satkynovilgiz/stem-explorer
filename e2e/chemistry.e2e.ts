import type { Page } from '@playwright/test'
import { expect, pressed, search, test, waitForViewport } from './fixtures.ts'

const card = (page: Page, name: string) =>
  page.locator('.molecule-card').filter({ has: page.locator('.molecule-card-name', { hasText: new RegExp(`^${name.replace(/[()]/g, '\\$&')}$`) }) })
const chip = (page: Page, atomId: string) =>
  page.locator('.measure-panel .chip').filter({ hasText: new RegExp(`^\\d?${atomId}$`) })
const result = (page: Page) => page.locator('.measure-result')

test('Chemistry share links still restore molecule and display mode', async ({ page }) => {
  await page.goto('/?molecule=benzene&view=space-filling#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
  await pressed(page.getByRole('button', { name: 'Space-filling' }))
})

test('Chemistry ignores Biology parameters and falls back on invalid values', async ({ page }) => {
  await page.goto('/?structure=golgi&cell=whole&molecule=gold#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('#molecule-heading')).toHaveText('Water')
  await pressed(page.getByRole('button', { name: 'Ball & stick' }))
  const params = await search(page)
  expect(params.get('molecule')).toBe('water')
  // Biology's keys are left for Biology; Chemistry does not read or remove them.
  expect(params.get('structure')).toBe('golgi')
})

test('selects all twelve molecules', async ({ page }) => {
  await page.goto('/#/chemistry')
  await waitForViewport(page)
  const atoms: Record<string, number> = {
    Water: 3, 'Carbon dioxide': 3, Methane: 5, Ammonia: 4, Ethanol: 9, Benzene: 12,
    'Oxygen (O₂)': 2, 'Nitrogen (N₂)': 2, 'Hydrogen peroxide': 4, Formaldehyde: 4, Acetylene: 4, Ethene: 6,
  }
  for (const [name, count] of Object.entries(atoms)) {
    await card(page, name).click()
    await expect(page.locator('#molecule-heading')).toHaveText(name)
    await expect(page.locator('.data-table tfoot td')).toHaveText(String(count))
  }
})

test('distance and angle measurements still work', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance', exact: true }).click()
  await chip(page, 'O1').click()
  await chip(page, 'H1').click()
  await expect(result(page)).toContainText('Bond length')
  await expect(result(page)).toContainText('0.958 Å')

  await page.getByRole('button', { name: 'Angle', exact: true }).click()
  await chip(page, 'H1').click()
  await chip(page, 'O1').click()
  await chip(page, 'H2').click()
  await expect(result(page)).toContainText('Bond angle')
  await expect(result(page)).toContainText('104.5°')

  // Switching molecules clears the measurement.
  await card(page, 'Benzene').click()
  await expect(page.locator('.measure-slot-value').first()).toHaveText('—')
})

test('Copy link copies a Chemistry-only link from the current origin', async ({ page, baseURL }) => {
  await page.goto('/?structure=golgi&molecule=ammonia#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.locator('.copy-link-status')).toContainText('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${baseURL}/?molecule=ammonia&view=ball-and-stick#/chemistry`,
  )
})

test('all five subjects are live; none is a Coming soon page', async ({ page }) => {
  for (const subject of ['anatomy', 'chemistry', 'physics', 'mathematics', 'biology']) {
    await page.goto(`/#/${subject}`)
    await waitForViewport(page)
    await expect(page.locator('#coming-soon-title')).toHaveCount(0)
  }
})

test('new molecules: N₂’s triple bond can be measured; H₂O₂ shows its dihedral and source note', async ({ page }) => {
  await page.goto('/?molecule=nitrogen#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance', exact: true }).click()
  await chip(page, 'N1').click()
  await chip(page, 'N2').click()
  await expect(result(page)).toContainText('1.098')
  await page.goto('/?molecule=hydrogen-peroxide#/chemistry')
  await waitForViewport(page)
  await page.getByRole('tab', { name: 'Structure' }).click()
  await expect(page.locator('.info')).toContainText('H–O–O–H dihedral angle')
  await expect(page.locator('.info')).toContainText('119.8')
})

test('chemistry sections: atomic structure, bonding, and backward-compatible links', async ({ page }) => {
  await page.goto('/?csec=atomic&el=6#/chemistry')
  const atom = page.locator('#atom-heading')
  await expect(atom).toHaveText('Carbon (C)')
  await expect(page.locator('.info')).toContainText('Electrons in the neutral atom6')
  await expect(page.locator('.info table')).toContainText('14 − 6 = 8')
  await expect(page.locator('.atomic-view')).toContainText('Electrons do not travel on these circles like planets')
  await page.getByRole('button', { name: 'Orbitals (quantum picture)' }).click()
  await expect(page.locator('.atomic-view')).toContainText('not paths')
  await page.getByRole('button', { name: 'Next element' }).click()
  await expect(atom).toHaveText('Nitrogen (N)')
  expect(new URL(page.url()).searchParams.get('el')).toBe('7')
  await page.locator('.atomic-view select').selectOption('10')
  await expect(page.locator('.info')).toContainText('No isotope of neon is in this app’s verified library')
  await page.reload()
  await expect(atom).toHaveText('Neon (Ne)')

  await page.getByRole('group', { name: 'Chemistry section' }).getByRole('button', { name: 'Bonding and geometry' }).click()
  const bonding = page.locator('.bonding-view')
  await expect(bonding).toContainText('Metallic bonding')
  await expect(bonding).toContainText('No — bonding extends through the crystal')
  await expect(bonding.getByRole('row', { name: /Water/ })).toContainText('Polar.')
  await expect(bonding.getByRole('row', { name: /Ethene/ })).toContainText('Not stated in this app’s sources')
  await expect(bonding).toContainText('MnI₂')
  expect(new URL(page.url()).searchParams.get('csec')).toBe('bonding')
  await bonding.getByRole('row', { name: /Formaldehyde/ }).getByRole('button', { name: 'Formaldehyde' }).click()
  await expect(page.locator('#molecule-heading')).toHaveText('Formaldehyde')
  expect(new URL(page.url()).searchParams.get('csec')).toBeNull()

  // A link made before sections existed still opens the molecule.
  await page.goto('/?molecule=ammonia&view=space-filling#/chemistry')
  await expect(page.locator('#molecule-heading')).toHaveText('Ammonia')
})
