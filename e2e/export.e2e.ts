import type { Page } from '@playwright/test'
import { expect, parkMouse, test, waitForViewport } from './fixtures.ts'
import { canvasPixels, exportView, meanDiff, pixel, type Box, type ExportedPng, type Png } from './png.ts'

const chip = (page: Page, atomId: string) => page.locator('.measure-panel .chip').filter({ hasText: new RegExp(`^\\d?${atomId}$`) })
const present = (page: Page) => page.getByRole('button', { name: 'Present' }).click()

/** The DOM box of an overlay element relative to the stage canvas, in CSS pixels. */
async function overlayBox(page: Page, selector: string): Promise<Box> {
  return page.evaluate((sel) => {
    const c = document.querySelector('.chem-stage canvas')!.getBoundingClientRect()
    const r = document.querySelector(sel)!.getBoundingClientRect()
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height }
  }, selector)
}

/** Maps an image-space box back to the raw canvas (the export's scale and the canvas resolution may differ). */
function toCanvas(exp: ExportedPng, raw: Png, box: Box): [number, number] {
  const k = raw.width / exp.layout.picture.w
  return [Math.round((box.x - exp.layout.picture.x) * k), Math.round((box.y - exp.layout.picture.y) * k)]
}

/**
 * The export is the canvas plus overlays: inside an overlay's box the pixels differ from the
 * raw canvas; in a region with no overlay they are the same (so the scene is aligned, not shifted).
 */
function expectComposited(exp: ExportedPng, raw: Png, overlay: Box) {
  const inside = { ...overlay, w: Math.max(4, overlay.w - 4), h: Math.max(4, overlay.h - 4), x: overlay.x + 2, y: overlay.y + 2 }
  expect(meanDiff(exp.png, inside, raw, ...toCanvas(exp, raw, inside))).toBeGreaterThan(8)
  const p = exp.layout.picture
  const clear = { x: p.x + p.w - 40, y: p.y + Math.round(p.h / 2), w: 24, h: 24 }
  expect(exp.layout.annotations.some((a) => a.box.x < clear.x + clear.w && clear.x < a.box.x + a.box.w && a.box.y < clear.y + clear.h && clear.y < a.box.y + a.box.h)).toBe(false)
  expect(meanDiff(exp.png, clear, raw, ...toCanvas(exp, raw, clear))).toBeLessThan(2)
}

test('Chemistry angle export includes the atom labels, the angle value and its arc labels, aligned with the scene', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Angle', exact: true }).click()
  for (const id of ['H1', 'O1', 'H2']) await chip(page, id).click()
  await expect(page.locator('.measure-result')).toContainText('104.5°')
  await present(page)
  await parkMouse(page)
  await page.waitForTimeout(400)
  const raw = await canvasPixels(page)
  const valueBox = await overlayBox(page, '.measure-label')
  const exp = await exportView(page)

  expect(exp.filename).toMatch(/^stem-explorer-chemistry-\d{4}-\d{2}-\d{2}\.png$/)
  expect(exp.text.Title).toBe('Water · ball and stick · Chemistry')
  expect(exp.text.Description).toContain('Restored by the link: molecule = water, view = ball-and-stick')
  expect(exp.text.Description).toContain("In this image: Bond angle H1–O1–H2 = 104.5°, from the model's source coordinates")
  expect(exp.text.Description).toContain('Not restored by the link: the camera angle and zoom')
  expect(exp.text.Description).toContain('the angle measurement H1–O1–H2')
  expect(exp.text.Description).toContain('Molecular model: atom positions from the cited geometry')
  expect(exp.layout.linkLines.join('')).toBe(exp.text.Source)
  expect(new URL(exp.text.Source).search).toBe('?molecule=water&view=ball-and-stick')

  // Every overlay is in the image: the value, the three numbered atom labels and the badge.
  const texts = exp.layout.annotations.map((a) => a.text)
  expect(texts).toContain('104.5°')
  for (const id of ['H1', 'O1', 'H2']) expect(texts.some((t) => t.replace(/\s/g, '').endsWith(id))).toBe(true)
  expect(texts.some((t) => t.includes('Water') && t.includes('Ball & stick'))).toBe(true)
  expect(texts.join(' ')).not.toContain('Drag to rotate')

  // The value label sits exactly where the page drew it (same frame as the scene).
  const value = exp.layout.annotations.find((a) => a.text === '104.5°')!
  const s = exp.layout.scale
  expect(Math.abs(value.box.x - (exp.layout.picture.x + valueBox.x * s))).toBeLessThanOrEqual(1)
  expect(Math.abs(value.box.y - (exp.layout.picture.y + valueBox.y * s))).toBeLessThanOrEqual(1)
  expectComposited(exp, raw, value.box)

  // Exporting changed nothing: the measurement and the link are as before.
  await expect(page.locator('.measure-result')).toContainText('104.5°')
  expect(new URL(page.url()).search).toBe('?molecule=water&view=ball-and-stick')
  await expect(page.getByRole('toolbar', { name: 'Presentation' })).toContainText('PNG exported, including')
})

test('Chemistry distance export names the bond length, and says when atoms are not bonded', async ({ page }) => {
  await page.goto('/?molecule=water#/chemistry')
  await waitForViewport(page)
  await page.getByRole('button', { name: 'Distance', exact: true }).click()
  await chip(page, 'H1').click()
  await chip(page, 'H2').click()
  await expect(page.locator('.measure-result')).toContainText('Interatomic distance')
  await present(page)
  await parkMouse(page)
  await page.waitForTimeout(400)
  const raw = await canvasPixels(page)
  const exp = await exportView(page)
  expect(exp.text.Description).toMatch(/In this image: Interatomic distance H1–H2 = 1\.\d{3} Å \(not bonded\)/)
  expect(exp.text.Description).toContain('the distance measurement H1–H2')
  const value = exp.layout.annotations.find((a) => / Å$/.test(a.text))!
  expect(value).toBeTruthy()
  expectComposited(exp, raw, value.box)
})

test('Anatomy export keeps the selected-structure label, orientation labels, badge and the schematic label', async ({ page }) => {
  await page.goto('/?atlas=femur-left&bview=front#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Left femur')
  await present(page)
  await parkMouse(page)
  await page.waitForTimeout(800)
  const raw = await canvasPixels(page)
  const exp = await exportView(page)
  const texts = exp.layout.annotations.map((a) => a.text)
  expect(texts).toContain('● Left femur')
  expect(texts.some((t) => /body’s left/i.test(t))).toBe(true)
  expect(texts.some((t) => /superior/i.test(t))).toBe(true)
  expect(texts.some((t) => t.includes('Schematic shapes, not to scale'))).toBe(true)
  expect(exp.text.Description).toContain('In this image: Selected: Left femur (id femur-left, skeletal system)')
  expect(exp.text.Description).toContain('Front (anterior) view: the body’s right is on your left')
  expect(exp.text.Description).toContain('Schematic model: simplified shapes placed to show position and relationships, not to scale')
  expect(new URL(exp.text.Source).searchParams.get('atlas')).toBe('femur-left')
  expectComposited(exp, raw, exp.layout.annotations.find((a) => a.text === '● Left femur')!.box)
})

test('SVG lab export keeps its own text, the caption and a complete link', async ({ page }) => {
  await page.goto('/?experiment=circuit#/physics')
  await expect(page.locator('.chem-stage svg').first()).toBeVisible()
  await present(page)
  const exp = await exportView(page)
  expect(exp.text.Title).toMatch(/^Circuit: .* · Physics$/)
  expect(exp.text.Description).toContain('Idealised model')
  // A schematic SVG: the camera note does not apply.
  expect(exp.text.Description).not.toContain('camera angle')
  expect(exp.layout.linkLines.join('')).toBe(exp.text.Source)
  expect(new URL(exp.text.Source).searchParams.get('experiment')).toBe('circuit')
  // The picture is not blank: it has many distinct colours.
  const p = exp.layout.picture
  const colours = new Set<string>()
  for (let y = p.y; y < p.y + p.h; y += 7) for (let x = p.x; x < p.x + p.w; x += 7) colours.add(pixel(exp.png, x, y).join(','))
  expect(colours.size).toBeGreaterThan(5)
})

test('a view with no picture explains why it cannot be exported, and stays as it was', async ({ page }) => {
  await page.goto('/?csec=bonding#/chemistry')
  await expect(page.getByRole('group', { name: 'Chemistry section' })).toBeVisible()
  await present(page)
  await page.getByRole('button', { name: 'Export PNG' }).click()
  await expect(page.getByRole('alert')).toContainText('This view is made of text and tables rather than one picture')
  expect(new URL(page.url()).searchParams.get('csec')).toBe('bonding')
})
