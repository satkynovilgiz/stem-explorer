import type { Page } from '@playwright/test'
import { expect, search, test, waitForViewport } from './fixtures.ts'

const mainText = (page: Page) => page.locator('main').innerText()

test.describe('numeric fields never change values on their own', () => {
  test('shared-link values are snapped to the input step, and focus + blur commits nothing', async ({ page }) => {
    await page.goto('/?gravity=9.806#/physics')
    await waitForViewport(page)
    const g = page.getByRole('textbox', { name: /^Gravity/ })
    await expect(g).toHaveValue('9.81')
    expect((await search(page)).get('gravity')).toBe('9.81')

    // Scrub to a time, then focus and leave the field without editing: nothing may reset or change.
    await page.getByRole('slider', { name: /^Time/ }).fill('1.2')
    await g.focus()
    await g.blur()
    await expect(page.locator('.readout > div', { hasText: 'Time t' }).locator('dd')).toHaveText('1.20 s')
    expect((await search(page)).get('gravity')).toBe('9.81')
  })

  test('Mathematics: a=0.77 loads as 0.75 and survives focus + blur', async ({ page }) => {
    await page.goto('/?surface=paraboloid&a=0.77#/mathematics')
    await waitForViewport(page)
    const a = page.getByRole('textbox', { name: /^Curvature in x/ })
    await expect(a).toHaveValue('0.75')
    await a.focus()
    await a.blur()
    await expect(page.locator('.math-left .formula-display')).toHaveText('z = 0.75·x² + 0.50·y²')
  })

  test('a clicked point is not rounded by tabbing through the coordinate fields', async ({ page }) => {
    await page.goto('/#/mathematics')
    await waitForViewport(page)
    const box = (await page.locator('canvas').boundingBox())!
    await page.mouse.click(box.x + box.width * 0.47, box.y + box.height * 0.62)
    const z = page.locator('.point-readout .readout > div').filter({ has: page.getByText('z = f(x, y)', { exact: true }) }).locator('dd')
    await expect(z).toBeVisible()
    const before = await z.textContent()
    const x = page.getByRole('textbox', { name: /^x/ })
    await x.focus()
    await x.blur()
    await expect(z).toHaveText(before!)
  })

  test('Enter then blur commits a typed value once, with the same result', async ({ page }) => {
    await page.goto('/#/physics')
    await waitForViewport(page)
    const angle = page.getByRole('textbox', { name: /^Launch angle/ })
    await angle.fill('33')
    await angle.press('Enter')
    await angle.blur()
    await expect(angle).toHaveValue('33')
    expect((await search(page)).get('angle')).toBe('33')
  })
})

test.describe('no NaN, Infinity or undefined at supported boundaries', () => {
  const pages = [
    '/?speed=50&angle=90&height=50&gravity=1#/physics',
    '/?speed=50&angle=0&height=0&gravity=25#/physics',
    '/?speed=0&angle=45&height=0&gravity=9.81#/physics',
    '/?surface=plane&a=2&b=-2&c=-3&slice=y&at=3#/mathematics',
    '/?surface=paraboloid&a=1.5&b=0.1&slice=x&at=-2#/mathematics',
    '/?surface=saddle&a=0.1&b=1.5&slice=y&at=2#/mathematics',
    '/?surface=sine&amp=-2&k=3&slice=x&at=3.1#/mathematics',
    '/?surface=sine&amp=2&k=0&slice=y&at=-3.1#/mathematics',
    '/?molecule=benzene&view=space-filling#/chemistry',
    '/?structure=ribosome&cell=whole#/biology',
    '/?part=interventricular-septum&heart=whole#/anatomy',
  ]
  for (const url of pages) {
    test(url, async ({ page }) => {
      await page.goto(url)
      await waitForViewport(page)
      const text = await mainText(page)
      expect(text).not.toMatch(/\bNaN\b|Infinity|undefined/)
    })
  }

  test('physics at the extreme setting reaches impact without invalid values', async ({ page }) => {
    await page.goto('/?speed=50&angle=90&height=50&gravity=1#/physics')
    await waitForViewport(page)
    // A ~101 s flight: scrub to impact instead of animating it.
    const time = page.getByRole('slider', { name: /^Time/ })
    await time.fill((await time.getAttribute('max'))!)
    await expect(page.locator('.status-tag')).toHaveText('Paused')
    await expect(page.locator('.readout > div', { hasText: 'Height y' }).locator('dd')).toHaveText('0 m')
    expect(await mainText(page)).not.toMatch(/\bNaN\b|Infinity|undefined/)
  })
})
