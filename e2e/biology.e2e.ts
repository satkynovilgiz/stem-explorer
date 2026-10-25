import type { Page } from '@playwright/test'
import {
  canvasShot,
  expect,
  labelTransforms,
  parkMouse,
  pressed,
  search,
  stableCanvasShot,
  test,
  visibleLabels,
  waitForViewport,
} from './fixtures.ts'

const list = (page: Page) => page.getByRole('list').filter({ has: page.locator('.structure-item') })
const structureButton = (page: Page, name: string) =>
  page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: new RegExp(`^${name}`) }) })
const heading = (page: Page) => page.locator('#structure-heading')

/** Clicks the model just below a scene label: labels sit 6 px above their anchor on the structure's surface. */
async function clickStructureUnderLabel(page: Page, labelText: string) {
  const label = page.locator('.cell-label', { hasText: labelText })
  await expect(label).toBeVisible()
  const box = (await label.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 12)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/biology')
  await waitForViewport(page)
})

test('opens with an orientation, the model disclaimer and non-overlapping major labels', async ({ page }) => {
  await expect(page.locator('#cell-heading')).toHaveText('Animal cell')
  await expect(page.getByText('This is a simplified educational model of a generalized animal cell.')).toBeVisible()
  await expect(list(page).locator('.structure-item')).toHaveCount(10)
  await pressed(page.getByRole('button', { name: 'Cutaway' }))
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts.length).toBeGreaterThanOrEqual(4)
  const { texts, overlapping } = await visibleLabels(page, '.cell-label')
  expect(overlapping).toBe(false)
  // Minor structures (ribosomes, nucleolus, cytoplasm) are not labelled until selected.
  expect(texts.join('|')).not.toMatch(/Ribosomes|Nucleolus|Cytoplasm/)
})

test('selects structures from the HTML list and updates details, URL and scene label', async ({ page }) => {
  await structureButton(page, 'Golgi apparatus').click()
  await expect(heading(page)).toHaveText('Golgi apparatus')
  await pressed(structureButton(page, 'Golgi apparatus'))
  await expect(page.locator('.cell-label.is-selected')).toContainText('Golgi apparatus')
  expect((await search(page)).get('structure')).toBe('golgi')

  await page.getByRole('tab', { name: 'Structure & relationships' }).click()
  await expect(page.getByRole('tabpanel')).toContainText('cis')
  // Relationship links select the related structure.
  await page.locator('.relation-link', { hasText: 'Rough endoplasmic reticulum' }).click()
  await expect(heading(page)).toHaveText('Rough endoplasmic reticulum')

  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /^https:\/\/openstax\.org\//)
})

test('selects structures by clicking the 3D model, including one copy of a repeated organelle', async ({ page }) => {
  await clickStructureUnderLabel(page, 'Nucleus')
  await expect(heading(page)).toHaveText('Nucleus')

  await clickStructureUnderLabel(page, 'Mitochondria')
  await expect(heading(page)).toHaveText('Mitochondria')
  await expect(page.locator('.instance-note')).toContainText('Mitochondrion 1 of 4 is selected')
  await expect(page.getByRole('button', { name: 'Mitochondrion 1', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // Clicking empty space clears the selection.
  await parkMouse(page)
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.click(box.x + 12, box.y + box.height - 12)
  await expect(page.locator('#cell-heading')).toBeVisible()
})

test('chooses individual copies of a repeated structure from HTML controls', async ({ page }) => {
  await structureButton(page, 'Mitochondria').click()
  await pressed(page.getByRole('button', { name: 'All', exact: true }))
  await expect(page.locator('.instance-note')).toContainText('All 4 mitochondria')
  await page.getByRole('button', { name: 'Mitochondrion 3', exact: true }).click()
  await expect(page.locator('.instance-note')).toContainText('Mitochondrion 3 of 4 is selected')
  await expect(page.locator('.cell-label.is-selected')).toContainText('Mitochondrion 3')
  await expect(page.getByRole('status').filter({ hasText: 'Mitochondrion 3 of 4 selected.' })).toHaveCount(1)
})

test('switches between whole-cell and cutaway views', async ({ page }) => {
  await page.getByRole('button', { name: 'Whole cell' }).click()
  await pressed(page.getByRole('button', { name: 'Whole cell' }))
  expect((await search(page)).get('cell')).toBe('whole')
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts).toEqual(['Plasma membrane'])

  // In the whole-cell view only the membrane exists in the scene, so clicking the cell selects it.
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(heading(page)).toHaveText('Plasma membrane')

  // Choosing an internal structure from the list opens the cutaway so it is visible.
  await structureButton(page, 'Nucleolus').click()
  await pressed(page.getByRole('button', { name: 'Cutaway' }))
  await expect(page.locator('.cell-label.is-selected')).toContainText('Nucleolus')
})

test('isolates the selection and Show all restores the full cell', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Isolate' })).toBeDisabled()
  await structureButton(page, 'Lysosomes').click()
  await page.getByRole('button', { name: 'Isolate' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Isolated: Lysosomes')
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts).toEqual(['SelectedLysosomes'])

  await page.getByRole('button', { name: 'Show all' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Cutaway')
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts.length).toBeGreaterThan(2)
  await expect(heading(page)).toHaveText('Lysosomes')
})

test('Focus moves the camera only when pressed, and Reset view restores it', async ({ page }) => {
  const LABELS = '.cell-label'
  await parkMouse(page)
  await page.evaluate(() => document.fonts.ready)
  const initial = await stableCanvasShot(page, true)
  const initialLabels = await labelTransforms(page, LABELS)

  await structureButton(page, 'Golgi apparatus').click()
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)

  // Clear the highlight so the comparison only reflects the camera.
  await page.locator('.header-actions').getByRole('button', { name: 'Clear selection' }).click()
  await page.getByRole('button', { name: 'Reset view' }).click()
  await parkMouse(page)
  // The camera eases back over ~0.6 s, then lands exactly on the starting view.
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial), { timeout: 8000 }).toBe(true)
  expect(await labelTransforms(page, LABELS)).toEqual(initialLabels)
})

test('Labels toggle hides everything except the selected structure', async ({ page }) => {
  await structureButton(page, 'Ribosomes').click()
  await page.getByRole('button', { name: 'Labels' }).click()
  await expect(page.getByRole('button', { name: 'Labels' })).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts.every((t) => t.includes('Ribosomes'))).toBe(true)
  await page.getByRole('button', { name: 'Labels' }).click()
  await expect.poll(async () => (await visibleLabels(page, '.cell-label')).texts.length).toBeGreaterThan(2)
})

test('search filters structures by name, role or term, with an empty state', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: 'Search cell structures' })
  await input.fill('ATP')
  await expect(list(page).locator('.structure-item')).toHaveCount(1)
  await expect(list(page)).toContainText('Mitochondria')
  await input.fill('cytosol')
  await expect(list(page)).toContainText('Cytoplasm')
  await input.fill('chloroplast')
  await expect(page.locator('.empty-state')).toContainText('No structures match')
  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(list(page).locator('.structure-item')).toHaveCount(10)
})

test('keyboard users can select structures and see focus', async ({ page }) => {
  const nucleus = structureButton(page, 'Nucleus')
  await page.getByRole('searchbox', { name: 'Search cell structures' }).focus()
  // Tab from the search box through the list until the Nucleus button has focus.
  for (let i = 0; i < 6 && !(await nucleus.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(nucleus).toBeFocused()
  await expect(nucleus).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(heading(page)).toHaveText('Nucleus')
  await pressed(nucleus)
})

test('Copy link copies a Biology-only link from the current origin', async ({ page, baseURL }) => {
  await page.goto('/?molecule=benzene&view=space-filling#/biology')
  await waitForViewport(page)
  await structureButton(page, 'Smooth endoplasmic reticulum').click()
  await page.getByRole('button', { name: 'Copy link' }).click()
  await expect(page.locator('.copy-link-status')).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe(`${baseURL}/?structure=smooth-er&cell=cutaway#/biology`)
})

test.describe('URL state', () => {
  test('restores a valid structure and opens the cutaway for internal structures', async ({ page }) => {
    await page.goto('/?structure=mitochondrion&cell=whole#/biology')
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Mitochondria')
    await pressed(page.getByRole('button', { name: 'Cutaway' }))
  })

  test('falls back safely for invalid parameters and corrects the address', async ({ page }) => {
    await page.goto('/?structure=chloroplast&cell=xray#/biology')
    await waitForViewport(page)
    await expect(page.locator('#cell-heading')).toBeVisible()
    await pressed(page.getByRole('button', { name: 'Cutaway' }))
    const params = await search(page)
    expect(params.has('structure')).toBe(false)
    expect(params.get('cell')).toBe('cutaway')
  })

  test('keeps Chemistry and Biology state separate across subject switches and Back/Forward', async ({ page }) => {
    await page.goto('/?molecule=benzene&view=space-filling#/chemistry')
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')

    await page.getByRole('link', { name: /^Biology/ }).click()
    await waitForViewport(page)
    // Chemistry's view=space-filling must not leak into Biology.
    await pressed(page.getByRole('button', { name: 'Cutaway' }))
    await structureButton(page, 'Golgi apparatus').click()
    await expect(heading(page)).toHaveText('Golgi apparatus')

    await page.getByRole('link', { name: /^Chemistry/ }).click()
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
    await pressed(page.getByRole('button', { name: 'Space-filling' }))

    await page.goBack()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Golgi apparatus')

    await page.goBack()
    await waitForViewport(page)
    await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
    await pressed(page.getByRole('button', { name: 'Space-filling' }))

    await page.goForward()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Golgi apparatus')

    await page.reload()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Golgi apparatus')
  })
})
