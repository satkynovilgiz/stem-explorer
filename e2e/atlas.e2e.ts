import type { Page } from '@playwright/test'
import { expect, stableCanvasShot, test, waitForViewport } from './fixtures.ts'

const heading = (page: Page) => page.locator('#atlas-structure-heading')
const nav = (page: Page) => page.locator('.atlas-nav')
const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Search body structures' })
const params = (page: Page) => new URL(page.url()).searchParams
const moduleButton = (page: Page, name: string) => page.getByRole('group', { name: 'Anatomy module' }).getByRole('button', { name })

async function pick(page: Page, query: string, name: string) {
  await searchBox(page).fill(query)
  await nav(page).getByRole('button', { name: new RegExp(`^${name}`) }).first().click()
  await searchBox(page).fill('')
}

test('Anatomy opens to the body atlas; the heart is a module with Back/Forward between them; old heart links still open the heart', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('#atlas-heading')).toHaveText('Body atlas')
  await expect(moduleButton(page, 'Body atlas')).toHaveAttribute('aria-pressed', 'true')
  expect(params(page).get('bview')).toBe('front')

  await page.getByRole('button', { name: 'Open the detailed heart explorer' }).click()
  await expect(page.locator('#part-heading, .info-title').first()).toBeVisible()
  await expect(moduleButton(page, 'Heart (detailed)')).toHaveAttribute('aria-pressed', 'true')
  expect(params(page).get('heart')).toBe('whole')
  expect(params(page).get('bview')).toBeNull()

  await page.goBack()
  await expect(page.locator('#atlas-heading')).toHaveText('Body atlas')
  await page.goForward()
  await expect(moduleButton(page, 'Heart (detailed)')).toHaveAttribute('aria-pressed', 'true')

  // Links made before the atlas existed.
  await page.goto('/?part=mitral-valve&heart=cutaway#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('#part-heading')).toHaveText('Mitral valve')
})

test('select from the list or search, read sourced details, and keep the state through reload and links', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await pick(page, 'kidney', 'Left kidney')
  await expect(heading(page)).toHaveText('Left kidney')
  await expect(page.locator('.info')).toContainText('T12–L3')
  await expect(page.locator('.info').getByRole('link', { name: /25\.3 Gross Anatomy of the Kidney/ }).first()).toHaveAttribute('href', /openstax\.org/)
  await expect(page.locator('.info')).toContainText('Model limitations')
  expect(params(page).get('atlas')).toBe('kidney-left')

  // Paired structure and related links.
  await page.getByRole('button', { name: 'Select the right side' }).click()
  await expect(heading(page)).toHaveText('Right kidney')
  await page.locator('.relation-list').getByRole('button', { name: 'Right adrenal gland' }).click()
  await expect(heading(page)).toHaveText('Right adrenal gland')
  // The endocrine layer was off: selecting turned it on and said so.
  await expect(page.locator('[role="status"]').first()).toContainText('Endocrine layer shown')
  expect(params(page).get('layers')).toContain('endocrine')

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  expect(params(page).get('bview')).toBe('back')
  await page.reload()
  await waitForViewport(page)
  await expect(heading(page)).toHaveText('Right adrenal gland')
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await searchBox(page).fill('zzzz')
  await expect(nav(page)).toContainText('Nothing in the atlas matches “zzzz”')
})

test('layers: show, hide and change opacity; regions filter the list and dim the rest', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  const before = await stableCanvasShot(page, true)
  const skeletal = page.getByRole('checkbox', { name: 'Skeletal' })
  await expect(skeletal).toBeChecked()
  await skeletal.uncheck()
  expect(params(page).get('layers')).not.toContain('skeletal')
  const without = await stableCanvasShot(page, true)
  expect(without.equals(before)).toBe(false)
  await skeletal.check()
  const opaque = await stableCanvasShot(page, true)
  const opacity = page.getByRole('slider', { name: 'Skeletal opacity' })
  await opacity.fill('30')
  // Regression: lowering opacity from 100% must really make the layer translucent (three.js needs a
  // new material when transparency switches on).
  expect((await stableCanvasShot(page, true)).equals(opaque)).toBe(false)
  await expect(page.locator('.layer-row.is-on').filter({ hasText: 'Skeletal' })).toContainText('30%')
  // Opacity is a view preference, not part of the link.
  expect(params(page).get('opacity')).toBeNull()

  await nav(page).getByLabel('Region', { exact: true }).selectOption('thorax')
  expect(params(page).get('region')).toBe('thorax')
  // No urinary structure is in the thorax, so that system drops out of the list.
  await expect(nav(page).locator('summary', { hasText: 'Urinary' })).toHaveCount(0)
  await expect(nav(page)).toContainText('Structures elsewhere are drawn faintly')
  await nav(page).getByText('Cardiovascular').click()
  await expect(nav(page).getByRole('button', { name: /^Heart/ })).toBeVisible()
})

test('reproductive anatomy is never shown by default and needs an explicit, labelled choice', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  const fieldset = page.getByRole('group', { name: 'Show reproductive organs as' })
  await expect(fieldset.getByRole('radio', { name: 'Not shown' })).toBeChecked()
  await expect(fieldset).toContainText('neither is universal')
  await expect(fieldset).toContainText('intersex')
  await fieldset.getByRole('radio', { name: 'Typical testicular configuration' }).check()
  expect(params(page).get('repro')).toBe('testicular')
  await pick(page, 'prostate', 'Prostate gland')
  await expect(page.locator('.info')).toContainText('Typical testicular configuration — one of two shown')
  // Switching configuration clears a selection from the other one; the system level stays.
  await fieldset.getByRole('radio', { name: 'Typical ovarian configuration' }).check()
  await expect(page.locator('#atlas-system-heading')).toHaveText('Reproductive system')
  await pick(page, 'fallopian', 'Left uterine tube')
  await expect(heading(page)).toHaveText('Left uterine tube')
  await fieldset.getByRole('radio', { name: 'Not shown' }).check()
  expect(params(page).get('repro')).toBeNull()
})

test('clicking the model selects a structure; Isolate, Focus and Reset work', async ({ page }) => {
  await page.goto('/?layers=digestive#/anatomy')
  await waitForViewport(page)
  const box = (await page.locator('canvas').boundingBox())!
  // The liver and stomach fill the middle of the abdomen at the default framing.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42)
  await expect(heading(page)).toBeVisible()
  const name = await heading(page).textContent()
  await page.getByRole('button', { name: 'Isolate' }).click()
  await expect(page.locator('.viewport-badge')).toContainText(`Isolated: ${name}`)
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await page.getByRole('button', { name: 'Show all' }).click()
  await page.getByRole('button', { name: 'Reset camera' }).click()
  await expect(page.locator('.viewport-badge')).not.toContainText('Isolated')
})

test('orientation is stated in text and labelled in the view', async ({ page }) => {
  await page.goto('/#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('.info')).toContainText('Front (anterior) view: the body’s right is on your left.')
  const right = page.locator('.heart-label', { hasText: 'Body’s right' })
  const left = page.locator('.heart-label', { hasText: 'Body’s left' })
  await expect(right).toBeVisible()
  expect((await right.boundingBox())!.x).toBeLessThan((await left.boundingBox())!.x)
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect.poll(async () => (await right.boundingBox())!.x > (await left.boundingBox())!.x).toBe(true)
  await page.getByRole('button', { name: 'Side', exact: true }).click()
  await expect(page.locator('.heart-label', { hasText: 'Anterior' })).toBeVisible()
  await expect.poll(async () => (await page.locator('.heart-label', { hasText: 'Anterior' }).boundingBox())!.x < (await page.locator('.heart-label', { hasText: 'Posterior' }).boundingBox())!.x).toBe(true)
})

test('the inventory lists what is modelled and what is left out; atlas states save and reopen', async ({ page }) => {
  await page.goto('/?atlas=thymus&layers=lymphatic#/anatomy')
  await waitForViewport(page)
  await page.getByText('What is included').click()
  const inv = page.locator('.atlas-inventory')
  await expect(inv).toContainText('Not included: Parathyroid glands')
  await expect(inv).toContainText('Assets: none')
  await page.getByRole('button', { name: 'Save exploration' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.save-status')).toContainText('Body atlas · Thymus · front view')
  await page.goto('/')
  await page.locator('section', { has: page.getByRole('heading', { name: 'Saved explorations' }) }).getByRole('link', { name: /Thymus/ }).click()
  await expect(heading(page)).toHaveText('Thymus')
})
