import type { Page } from '@playwright/test'
import { expect, parkMouse, test, waitForViewport } from './fixtures.ts'
import { exportView } from './png.ts'

const params = (page: Page) => new URL(page.url()).searchParams
const where = (page: Page) => page.getByRole('region', { name: 'Where is it?' })
const presets = (page: Page) => page.getByRole('group', { name: 'Region presets' })

test('Where is it?: find a structure, focus its region, and read sourced relationships in words', async ({ page }) => {
  await page.goto('/?bview=front#/anatomy')
  await waitForViewport(page)
  await where(page).getByRole('searchbox', { name: 'Find a structure' }).fill('ureter')
  await where(page).getByRole('button', { name: /^Left ureter/ }).click()
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Left ureter')
  await expect(presets(page).getByRole('button', { name: 'Abdomen' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => params(page).get('region')).toBe('abdomen')
  const section = page.locator('.where-section')
  await expect(section).toContainText('In words: Left ureter is in the abdomen, on the body’s left (on your right in this front view)')
  await expect(section).toContainText('The ureters are retroperitoneal')
  await expect(section.getByRole('link', { name: /25\.2 Gross Anatomy of Urine Transport/ }).first()).toHaveAttribute('href', /openstax\.org/)
  await expect(section).toContainText('From the atlas’s region tags, not from measured distances.')
  // A relationship links to the other structure.
  await section.getByRole('button', { name: 'Select Urinary bladder' }).click()
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Urinary bladder')
  await expect(page.locator('.where-section')).toContainText('posterior to the pubic bone')
  // The region presets are ordinary buttons.
  await presets(page).getByRole('button', { name: 'Whole body' }).click()
  await expect.poll(() => params(page).has('region')).toBe(false)
})

test('a hidden-layer selection is shown with an explicit explanation; structures without a stated relationship say so', async ({ page }) => {
  await page.goto('/?bview=front#/anatomy')
  await waitForViewport(page)
  await where(page).getByRole('searchbox').fill('biceps')
  await where(page).getByRole('button', { name: /^Left biceps brachii/ }).click()
  await expect(page.locator('.reveal-note')).toHaveText('To show Left biceps brachii: the muscular layer was hidden, so it has been turned on.')
  await expect(page.locator('.where-section')).toContainText('anterior (flexor) compartment of the arm')
  await where(page).getByRole('searchbox').fill('femur')
  await where(page).getByRole('button', { name: /^Left femur/ }).click()
  await expect(page.locator('.where-section')).toContainText('No directional relationship for this structure is recorded in this release')
})

test('relationship explorations number their structures, quote sources, and restore the earlier view', async ({ page }) => {
  await page.goto('/?atlas=liver&bview=back#/anatomy')
  await waitForViewport(page)
  const before = page.url()
  await page.getByRole('button', { name: /Kidney, ureter and bladder/ }).click()
  const panel = page.locator('.relation-panel.is-active')
  await expect(panel).toContainText('How are the kidneys, ureters and bladder arranged in the body?')
  await expect(panel.getByRole('list', { name: /Highlighted structures/ }).getByRole('listitem')).toHaveCount(7)
  await expect(panel).toContainText('The right kidney is slightly inferior to (lower than) the left')
  await expect(panel).toContainText('What the model can’t show')
  await expect(page.locator('.heart-label', { hasText: '1 · Left kidney' })).toBeVisible()
  await expect(page.locator('.viewport-badge')).toContainText('Kidney, ureter and bladder · numbered structures')
  // Links keep the earlier view while the exploration is open.
  expect(page.url()).toBe(before)
  await panel.getByRole('button', { name: 'Close and restore my view' }).click()
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Liver')
  await expect(page.locator('.relation-panel.is-active')).toHaveCount(0)
  expect(page.url()).toBe(before)

  await page.getByRole('button', { name: /Biceps, triceps, elbow and forearm bones/ }).click()
  await expect(page.locator('.relation-panel.is-active')).toContainText('The cited section does not state its position in words')
  await page.getByRole('button', { name: 'Close and restore my view' }).click()
  await page.getByRole('button', { name: /Diaphragm, lungs and the thoracic cavity/ }).click()
  await expect(page.locator('.relation-panel.is-active')).toContainText('The diaphragm is inferior to the lungs')
})

test('the overview and the orientation indicator follow the view, and export with it', async ({ page }) => {
  await page.goto('/?atlas=diaphragm&bview=front&region=thorax#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('.body-overview-region')).toHaveCount(1)
  await expect(page.locator('.body-overview')).toContainText('Overview · front')
  const letterX = (l: string) => page.locator(`.orientation-letter.is-${l}`).evaluate((el) => Number(el.getAttribute('x')))
  // Front view: the body's left to the right of the body's right.
  await expect.poll(async () => (await letterX('L')) > (await letterX('R'))).toBe(true)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect.poll(async () => (await letterX('L')) < (await letterX('R'))).toBe(true)
  await page.getByRole('button', { name: 'Present' }).click()
  await parkMouse(page)
  const exp = await exportView(page)
  expect(exp.layout.annotations.some((a) => /\bS\b.*\bI\b/.test(a.text) || a.text.includes('S/I'))).toBe(true)
  expect(exp.text.Description).toContain('Selected: Diaphragm')
})
