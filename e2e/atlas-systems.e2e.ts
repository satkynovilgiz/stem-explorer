import type { Page } from '@playwright/test'
import { expect, test, waitForViewport } from './fixtures.ts'

const params = (page: Page) => new URL(page.url()).searchParams
const levels = (page: Page) => page.getByRole('navigation', { name: 'Atlas level' })
const systemHeading = (page: Page) => page.locator('#atlas-system-heading')
const structureHeading = (page: Page) => page.locator('#atlas-structure-heading')
const bar = (page: Page) => page.locator('.atlas-tour')

test('Body → System → Organ → Structure, with Back one level at a time and the level kept in the link', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await page.getByRole('region', { name: 'Organ systems' }).getByRole('button', { name: 'Cardiovascular' }).click()
  await expect(systemHeading(page)).toHaveText('Cardiovascular system')
  await expect(levels(page)).toHaveText(/Body›?\s*Cardiovascular system/)
  await expect.poll(() => params(page).get('asys')).toBe('cardiovascular')

  // System → organ group → structure.
  const organs = page.getByRole('region', { name: 'Organs and structures' })
  await organs.getByRole('button', { name: 'Pulmonary circuit vessels', exact: true }).click()
  await expect(structureHeading(page)).toHaveText('Pulmonary circuit vessels')
  await page.locator('.relation-list').getByRole('button', { name: 'Pulmonary trunk' }).click()
  await expect(structureHeading(page)).toHaveText('Pulmonary trunk')
  await expect(levels(page)).toContainText('Pulmonary circuit vessels')
  await expect(levels(page).locator('[aria-current]')).toHaveText('Pulmonary trunk')
  expect(params(page).get('atlas')).toBe('pulmonary-trunk')
  // The structure's own system is implied by the structure.
  expect(params(page).get('asys')).toBeNull()

  // The new content: introduction, location, functions, connections, key terms, limitations, sources.
  const panel = page.locator('.panel.info')
  await expect(panel).toContainText('The single vessel leaving the right ventricle')
  await expect(panel.locator('.info-section', { hasText: 'Where is it?' })).toContainText('leaving the right ventricle')
  await expect(panel.locator('.info-section', { hasText: 'Key terms' })).toContainText('Pulmonary circuit')
  await expect(panel.locator('.info-section', { hasText: 'Connections' })).toContainText('Left pulmonary artery')
  await expect(panel.locator('.info-section', { hasText: 'Model limitations' })).toContainText('Drawn as a smooth tube')
  await expect(panel.locator('a[href*="20-5-circulatory-pathways"]').first()).toBeVisible()

  // Back, one level at a time.
  await page.getByRole('button', { name: 'Back to Pulmonary circuit vessels' }).click()
  await expect(structureHeading(page)).toHaveText('Pulmonary circuit vessels')
  await page.getByRole('button', { name: 'Back to the Cardiovascular system' }).click()
  await expect(systemHeading(page)).toHaveText('Cardiovascular system')
  await page.getByRole('button', { name: 'Back to the whole body' }).click()
  await expect(page.locator('#atlas-heading')).toHaveText('Body atlas')
  await expect.poll(() => params(page).get('asys')).toBeNull()

  // A shared system link opens the same level after a reload.
  await page.goto('/?asys=lymphatic#/anatomy')
  await expect(systemHeading(page)).toHaveText('Lymphatic and immune system')
})

test('system layer controls: Focus, Isolate and Show all; selection is marked by more than colour', async ({ page }) => {
  await page.goto('/?asys=lymphatic#/anatomy')
  await waitForViewport(page)
  const look = page.getByRole('region', { name: 'System layers' })
  await look.getByRole('button', { name: 'Isolate this system' }).click()
  await expect(look.getByRole('button', { name: 'Isolate this system' })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => params(page).get('layers')).toBe('lymphatic')
  await expect(look).toContainText('Visible layers: Lymphatic and immune.')
  await look.getByRole('button', { name: 'Focus: skin outline and this system' }).click()
  await expect.poll(() => params(page).get('layers')).toBe('integumentary,lymphatic')
  await look.getByRole('button', { name: 'Show all layers' }).click()
  await expect(look).toContainText('Cardiovascular')
  // In the list the selected structure has a check mark and aria-pressed, and the model labels it in words.
  await page.getByRole('region', { name: 'Organs and structures' }).getByRole('button', { name: 'Cisterna chyli' }).click()
  await expect(structureHeading(page)).toHaveText('Cisterna chyli')
  const item = page.locator('.atlas-nav').getByRole('button', { name: /^Cisterna chyli/ })
  await expect(item).toHaveAttribute('aria-pressed', 'true')
  await expect(item.locator('svg')).toHaveCount(1)
})

test('guided investigation: the pulmonary circuit, step by step, and Exit returns to the system level', async ({ page }) => {
  await page.goto('/?asys=cardiovascular#/anatomy')
  await waitForViewport(page)
  await page.getByRole('region', { name: 'Guided investigations' }).getByRole('button', { name: 'The pulmonary circuit and the great vessels' }).click()
  await expect(bar(page)).toContainText('step 1 of 6')
  await expect(bar(page)).toContainText('pulmonary trunk')
  for (const text of ['Each pulmonary artery', 'pulmonary capillaries surround the alveoli', 'Four pulmonary veins', 'brachiocephalic artery (on the right only)', 'superior vena cava']) {
    await bar(page).getByRole('button', { name: 'Next' }).click()
    await expect(bar(page)).toContainText(text)
  }
  // The link during a tour is the view it will restore.
  expect(params(page).get('asys')).toBe('cardiovascular')
  await bar(page).getByRole('button', { name: 'Exit tour' }).click()
  await expect(systemHeading(page)).toHaveText('Cardiovascular system')
})

test('guided investigation: lymph back to the blood, from the Organ systems panel', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Tour: From tissue fluid back to the blood' }).click()
  await expect(bar(page)).toContainText('step 1 of 7')
  for (let i = 0; i < 4; i++) await bar(page).getByRole('button', { name: 'Next' }).click()
  await expect(bar(page)).toContainText('drains it into the left subclavian vein')
  await bar(page).getByRole('button', { name: 'Next' }).click()
  await expect(bar(page)).toContainText('right lymphatic duct')
  await bar(page).getByRole('button', { name: 'Exit tour' }).click()
  await expect(page.locator('#atlas-heading')).toHaveText('Body atlas')
})

test('existing anatomy links still open exactly as before', async ({ page }) => {
  for (const [url, name] of [
    ['/?atlas=thoracic-duct#/anatomy', 'Thoracic duct'],
    ['/?atlas=aorta&bview=back#/anatomy', 'Aorta'],
    ['/?atlas=lymph-nodes#/anatomy', 'Lymph node clusters'],
  ] as const) {
    await page.goto(url)
    await expect(structureHeading(page)).toHaveText(name)
  }
  expect(params(page).get('asys')).toBeNull()
  await page.goto('/?part=mitral-valve&heart=cutaway#/anatomy')
  await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
})
