import type { Page } from '@playwright/test'
import { canvasShot, expect, parkMouse, pressed, search, stableCanvasShot, test, visibleLabels, waitForViewport } from './fixtures.ts'

const item = (page: Page, name: string) =>
  page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: new RegExp(`^${name}$`) }) })
const heading = (page: Page) => page.locator('#part-heading')
const tourTitle = (page: Page) => page.locator('#tour-heading')

/** Clicks the model just below a structure's scene label (labels are centred on a point of the structure). */
async function clickPart(page: Page, labelText: string) {
  const label = page.locator('.heart-label', { hasText: labelText }).first()
  await expect(label).toBeVisible()
  const box = (await label.boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height + 8)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?heart=whole#/anatomy')
  await waitForViewport(page)
})

test('opens with orientation, disclaimer, legend and non-overlapping labels', async ({ page }) => {
  await expect(page.locator('#heart-heading')).toHaveText('Human heart')
  await expect(page.getByText('This is a simplified educational diagram in 3D.')).toBeVisible()
  await expect(page.locator('.heart-legend')).toContainText('blood is never blue')
  await expect(page.locator('.structure-item')).toHaveCount(14)
  const { texts, overlapping } = await visibleLabels(page, '.heart-label')
  expect(overlapping).toBe(false)
  expect(texts).toEqual(expect.arrayContaining(['Body’s right', 'Body’s left']))
  // Anterior view: the body's right is drawn on the viewer's left.
  const right = (await page.locator('.heart-label', { hasText: 'Body’s right' }).boundingBox())!
  const left = (await page.locator('.heart-label', { hasText: 'Body’s left' }).boundingBox())!
  expect(right.x).toBeLessThan(left.x)
  const ra = (await page.locator('.heart-label', { hasText: /^Right atrium$/ }).boundingBox())!
  const la = (await page.locator('.heart-label', { hasText: /^Left atrium$/ }).boundingBox())!
  expect(ra.x).toBeLessThan(la.x)
})

test('selects from the list and from the 3D model; connections link to other structures', async ({ page }) => {
  await item(page, 'Left ventricle').click()
  await expect(heading(page)).toHaveText('Left ventricle')
  await pressed(item(page, 'Left ventricle'))
  expect((await search(page)).get('part')).toBe('left-ventricle')
  await page.getByRole('tab', { name: 'Connections' }).click()
  await page.locator('.relation-link', { hasText: 'Aortic valve' }).click()
  await expect(heading(page)).toHaveText('Aortic valve')
  await pressed(page.getByRole('button', { name: 'Cutaway' })) // an internal structure opens the cutaway
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org\/books\/anatomy-and-physiology-2e\/pages\/19-1/)

  await page.locator('.header-actions').getByRole('button', { name: 'Clear selection' }).click()
  await page.getByRole('button', { name: 'Whole' }).click()
  await clickPart(page, 'Right ventricle')
  await expect(heading(page)).toHaveText('Right ventricle')
})

test('whole and cutaway views show or hide the internal structures', async ({ page }) => {
  await item(page, 'Mitral valve').click()
  await pressed(page.getByRole('button', { name: 'Cutaway' }))
  await expect(page.locator('.heart-label.is-selected')).toContainText('Mitral valve')
  await page.getByRole('button', { name: 'Whole' }).click()
  await expect(page.locator('.inline-note')).toContainText('switch to Cutaway')
  await expect(page.getByRole('button', { name: 'Focus' })).toBeDisabled()
  await expect.poll(async () => (await visibleLabels(page, '.heart-label.is-selected')).texts).toEqual([])
})

test('Isolate, Show all, Focus and Reset camera', async ({ page }) => {
  await parkMouse(page)
  const initial = await stableCanvasShot(page, true)
  await item(page, 'Aorta').click()
  await page.getByRole('button', { name: 'Isolate' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Isolated: Aorta')
  await expect.poll(async () => (await visibleLabels(page, '.heart-label:not(.is-orientation)')).texts).toEqual(['● Aorta'])
  await page.getByRole('button', { name: 'Show all' }).click()
  await expect(page.locator('.viewport-badge-mode')).toContainText('Whole heart')

  await page.getByRole('button', { name: 'Focus' }).click()
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial)).toBe(false)
  await page.locator('.header-actions').getByRole('button', { name: 'Clear selection' }).click()
  await page.getByRole('button', { name: 'Reset camera' }).click()
  await parkMouse(page)
  await expect.poll(async () => (await canvasShot(page, true)).equals(initial), { timeout: 8000 }).toBe(true)
})

test('Labels toggle keeps the selection and orientation labels', async ({ page }) => {
  await item(page, 'Right atrium').click()
  await page.getByRole('button', { name: 'Labels' }).click()
  await expect(page.getByRole('button', { name: 'Labels' })).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(async () => (await visibleLabels(page, '.heart-label:not(.is-orientation)')).texts)
    .toEqual(['● Right atrium'])
  await expect(page.locator('.heart-label.is-orientation').first()).toBeVisible()
})

test('blood-flow tour: verified order, Previous/Next, step dots, external destinations and exit restore', async ({ page }) => {
  await item(page, 'Aorta').click()
  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await expect(tourTitle(page)).toHaveText('From the body: the venae cavae' + 'outside the heart')
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await expect(item(page, 'Right atrium')).toBeDisabled()

  const expected = [
    'Right atrium',
    'Tricuspid valve',
    'Right ventricle',
    'Pulmonary valve',
    'Pulmonary trunk and arteries',
    'Lungs (outside the heart)',
    'Pulmonary veins',
    'Left atrium',
    'Mitral valve',
    'Left ventricle',
    'Aortic valve',
    'Aorta',
    'Body (outside the heart)',
  ]
  for (const title of expected) {
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(tourTitle(page)).toContainText(title)
  }
  await expect(page.locator('.heart-label.is-external.is-active').first()).toBeVisible()
  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(tourTitle(page)).toContainText('Aorta')
  await expect(page.locator('.heart-label.is-selected')).toContainText('Step 13: Aorta')
  await page.getByRole('button', { name: 'Step 3: Tricuspid valve' }).click()
  await expect(tourTitle(page)).toContainText('Tricuspid valve')
  await expect(page.locator('.tour-bar')).toContainText('Conceptual pathway')
  // Tour progress is never stored in the URL.
  expect((await search(page)).get('part')).toBe('aorta')

  await page.getByRole('button', { name: 'Exit tour' }).click()
  await expect(page.locator('.tour-bar')).toHaveCount(0)
  await expect(heading(page)).toHaveText('Aorta')
  await pressed(page.getByRole('button', { name: 'Whole' }))
})

test('the tour does not start on page load', async ({ page }) => {
  await expect(page.locator('.tour-bar')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start blood-flow tour' })).toBeEnabled()
})

test.describe('URL state', () => {
  test('restores a valid structure and opens the cutaway for internal structures', async ({ page }) => {
    await page.goto('/?part=tricuspid-valve&heart=whole#/anatomy')
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Tricuspid valve')
    await pressed(page.getByRole('button', { name: 'Cutaway' }))
  })

  test('falls back for invalid values and corrects the address', async ({ page }) => {
    await page.goto('/?part=spleen&heart=xray#/anatomy')
    await waitForViewport(page)
    await expect(page.locator('#heart-heading')).toBeVisible()
    const q = await search(page)
    expect([q.has('part'), q.get('heart')]).toEqual([false, 'whole'])
  })

  test('keeps subjects separate across switching, Back/Forward and refresh', async ({ page }) => {
    await page.goto('/?structure=golgi&surface=sine#/biology')
    await waitForViewport(page)
    await page.getByRole('link', { name: /^Anatomy/ }).click()
    await waitForViewport(page)
    // The top-bar link opens the body atlas; the heart is one module switch away.
    await page.getByRole('group', { name: 'Anatomy module' }).getByRole('button', { name: 'Heart (detailed)' }).click()
    await waitForViewport(page)
    await item(page, 'Pulmonary veins').click()
    await page.getByRole('link', { name: /^Mathematics/ }).click()
    await waitForViewport(page)
    await expect(page.locator('#math-heading')).toContainText('Sinusoidal')
    await page.goBack()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Pulmonary veins')
    // Opening the heart module was its own history entry.
    await page.goBack()
    await expect(page.locator('#atlas-heading')).toHaveText('Body atlas')
    await page.goBack()
    await waitForViewport(page)
    await expect(page.locator('#structure-heading')).toHaveText('Golgi apparatus')
    await page.goForward()
    await page.goForward()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Pulmonary veins')
    await page.reload()
    await waitForViewport(page)
    await expect(heading(page)).toHaveText('Pulmonary veins')
  })

  test('Copy link copies an Anatomy-only link from the current origin', async ({ page, baseURL }) => {
    await page.goto('/?molecule=water&surface=plane&heart=whole#/anatomy')
    await waitForViewport(page)
    await item(page, 'Mitral valve').click()
    await page.getByRole('button', { name: 'Copy link' }).click()
    await expect(page.locator('.copy-link-status')).toContainText('Copied')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/?part=mitral-valve&heart=cutaway#/anatomy`)
  })
})

test.describe('regression: Copy link during the tour (review finding B)', () => {
  test('shares the pre-tour structure and view, restores it in a new page and on exit', async ({ page, context, baseURL }) => {
    await item(page, 'Aorta').click()
    await pressed(page.getByRole('button', { name: 'Whole' }))
    await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await pressed(page.getByRole('button', { name: 'Cutaway' }))
    await page.getByRole('button', { name: 'Copy link' }).click()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(`${baseURL}/?part=aorta&heart=whole#/anatomy`)

    const other = await context.newPage()
    await other.goto(copied)
    await waitForViewport(other)
    await expect(other.locator('#part-heading')).toHaveText('Aorta')
    await expect(other.getByRole('button', { name: 'Whole' })).toHaveAttribute('aria-pressed', 'true')
    await expect(other.locator('.tour-bar')).toHaveCount(0)
    await other.close()

    await page.getByRole('button', { name: 'Exit tour' }).click()
    await expect(heading(page)).toHaveText('Aorta')
    await pressed(page.getByRole('button', { name: 'Whole' }))
  })

  test('a tour started without a selection shares no structure', async ({ page, baseURL }) => {
    await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
    await page.getByRole('button', { name: 'Copy link' }).click()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/?heart=whole#/anatomy`)
  })
})
