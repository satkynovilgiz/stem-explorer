import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { DESIGN_PAGES, DESIGN_SIZES, SMALLEST_PHONE } from './design-pages.ts'

/**
 * Design rules every page keeps, at phone, tablet and laptop size. They run with the other browser
 * tests on every pull request, so a design change that breaks one fails the check.
 *
 * - Nothing scrolls sideways (also on the smallest 320 px phone).
 * - Left-menu links are at least 44 × 44 px (easy to tap); every header and menu control is at
 *   least 24 × 24 px (WCAG 2.2 target size).
 * - Text is at least 11 px, except the small atomic numbers inside periodic table cells.
 * - Header and menu text has a contrast of at least 4.5 : 1 with what is behind it (WCAG AA).
 */

async function measure(page: Page) {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const b = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0
    }
    const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    const size = (el: Element) => {
      const b = el.getBoundingClientRect()
      return `${label(el)} (${Math.round(b.width)}×${Math.round(b.height)})`
    }

    const menuLinks = [...document.querySelectorAll('.chem-rail a')].filter(visible)
    const smallMenuLinks = menuLinks.filter((el) => { const b = el.getBoundingClientRect(); return b.width < 44 - 0.5 || b.height < 44 - 0.5 }).map(size)
    const controls = [...document.querySelectorAll('.subject-bar a, .subject-bar button, .chem-rail a, .chem-rail button')].filter(visible)
    const tinyControls = controls.filter((el) => { const b = el.getBoundingClientRect(); return b.width < 24 - 0.5 || b.height < 24 - 0.5 }).map(size)

    const smallText = new Set<string>()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const el = node.parentElement
      if (!el || !node.textContent!.trim() || !visible(el) || el.closest('svg, canvas, [aria-hidden="true"], .ptable-z')) continue
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (px < 11 - 0.01) smallText.add(`"${node.textContent!.trim().slice(0, 30)}" ${px}px`)
    }

    // Contrast: the text colour against the first solid background behind it.
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number)
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const background = (el: Element | null): number[] | null => {
      for (; el; el = el.parentElement) {
        const s = getComputedStyle(el)
        if (s.backgroundImage !== 'none') return null // gradients and pictures: cannot be judged here
        const c = rgb(s.backgroundColor)
        if (c.length === 3 || (c.length === 4 && c[3] >= 0.99)) return c.slice(0, 3)
        if (c.length === 4 && c[3] > 0.05) return null // see-through colour over something else
      }
      return [255, 255, 255]
    }
    const lowContrast: string[] = []
    for (const el of [...document.querySelectorAll('.subject-bar *, .chem-rail *')]) {
      if (!visible(el) || el.closest('svg')) continue
      const ownText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())
      if (!ownText) continue
      const s = getComputedStyle(el)
      const fg = rgb(s.color)
      if (fg.length === 4 && fg[3] < 0.99) continue
      const bg = background(el)
      if (!bg) continue
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
      const ratio = (a + 0.05) / (b + 0.05)
      if (ratio < 4.5) lowContrast.push(`"${label(el)}" ${ratio.toFixed(2)}:1`)
    }

    return {
      sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      menuLinks: menuLinks.length,
      smallMenuLinks,
      tinyControls,
      smallText: [...smallText],
      lowContrast,
    }
  })
}

test.describe('Design rules', () => {
  for (const size of DESIGN_SIZES) {
    test(`every design page keeps the rules @ ${size.name} (${size.width}×${size.height})`, async ({ page }) => {
      test.setTimeout(180_000)
      await page.setViewportSize({ width: size.width, height: size.height })
      for (const p of DESIGN_PAGES) {
        await page.goto(p.url)
        await expect(page.locator('.subject-bar, .subject-card').first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        await page.waitForTimeout(300)
        const m = await measure(page)
        const where = `${p.name} @ ${size.name}`
        expect(m.sideways, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(1)
        if (p.name !== 'home') expect(m.menuLinks, `${where}: the left menu is missing`).toBeGreaterThan(0)
        expect(m.smallMenuLinks, `${where}: menu links smaller than 44×44`).toEqual([])
        expect(m.tinyControls, `${where}: controls smaller than 24×24`).toEqual([])
        expect(m.smallText, `${where}: text smaller than 11 px`).toEqual([])
        expect(m.lowContrast, `${where}: header or menu text with contrast below 4.5:1`).toEqual([])
      }
    })
  }

  test('nothing scrolls sideways on the smallest phone (320×568)', async ({ page }) => {
    test.setTimeout(180_000)
    await page.setViewportSize({ width: SMALLEST_PHONE.width, height: SMALLEST_PHONE.height })
    for (const p of DESIGN_PAGES) {
      await page.goto(p.url)
      await expect(page.locator('.subject-bar, .subject-card').first()).toBeVisible()
      await page.waitForTimeout(400)
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), p.name).toBeLessThanOrEqual(1)
    }
  })
})
