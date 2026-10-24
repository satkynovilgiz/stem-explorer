/*
 * PNG export for presentation mode. The picture is the explorer's main visual (its WebGL canvas,
 * or its largest SVG), framed with a title, what the link restores and what it does not, the
 * kind of model and the link. Nothing leaves the browser: the PNG is offered as a download.
 *
 * A 3D view's labels, measurement values, badges and legends are HTML drawn over the canvas.
 * `snapshotStage` copies the canvas pixels and reads those overlays in one synchronous step, so
 * both come from the same rendered frame (scene labels are moved in the same animation frame
 * that renders the scene). The overlays are then painted onto the copy at the same positions.
 */

import { addPngText } from './pngText'
import { wrapText } from './textWrap'

export interface ExportCaption {
  title: string
  /** What the link restores, e.g. "molecule = water, view = ball-and-stick". */
  restored: string
  /** Scientific content visible in the picture, repeated as text (measurements, selection). */
  annotations: readonly string[]
  /** What the picture shows that the link does not restore (camera, measurements…). */
  notRestored: readonly string[]
  /** What kind of picture this is, e.g. "Schematic model: simplified shapes, not to scale". */
  modelLabel: string
  /** Link that reopens the restored settings. */
  link: string
}

/** Thrown with a message that can be shown to the user as is. */
export class ExportError extends Error {}

const MIN_SIZE = 80

const visible = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width >= MIN_SIZE && r.height >= MIN_SIZE
}

/** The visual to export: a visible canvas first (3D views), else the largest visible SVG. */
export function findStageVisual(root: ParentNode): HTMLCanvasElement | SVGSVGElement | null {
  const canvas = [...root.querySelectorAll('canvas')].find(visible)
  if (canvas) return canvas
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg')].filter((s) => visible(s) && !s.closest('button'))
  if (svgs.length === 0) return null
  const area = (s: SVGSVGElement) => {
    const r = s.getBoundingClientRect()
    return r.width * r.height
  }
  return svgs.reduce((a, b) => (area(b) > area(a) ? b : a))
}

/** Why a view has nothing to export, worded for the user. */
export function noVisualMessage(root: ParentNode | null): string {
  if (root?.querySelector('.viewport-message')) return 'The 3D view is not available in this browser, so there is no picture to export. The text panels still describe this view, and Copy link shares it.'
  return 'This view is made of text and tables rather than one picture, so it cannot be exported as a PNG. Copy link or Save keep it instead.'
}

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'visibility',
  'display',
] as const

/** Copies computed styles inline, because a serialized SVG loses the page's stylesheet. */
function inlineStyles(source: Element, target: Element) {
  const computed = getComputedStyle(source)
  const style = STYLE_PROPS.map((p) => `${p}:${computed.getPropertyValue(p)}`).join(';')
  target.setAttribute('style', style)
  const s = source.children
  const t = target.children
  for (let i = 0; i < s.length && i < t.length; i++) inlineStyles(s[i], t[i])
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ExportError('The picture could not be prepared for export.'))
    img.src = src
  })
}

/* ---------- Overlay capture ---------- */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

type BorderSide = { width: number; color: string; style: string }

type Paint =
  | { kind: 'box'; box: Box; opacity: number; fill: string | null; radius: number; borders: [BorderSide, BorderSide, BorderSide, BorderSide] }
  | { kind: 'text'; box: Box; opacity: number; text: string; font: string; color: string; letterSpacing: string }

/** One overlay item (a label, a badge, a legend) as text with its box in picture coordinates. */
export interface Annotation {
  text: string
  box: Box
}

const transparent = (c: string) => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c) || /\/\s*0\)$/.test(c)
const px = (v: string) => Number.parseFloat(v) || 0
const intersects = (b: Box, w: number, h: number) => b.x < w && b.y < h && b.x + b.w > 0 && b.y + b.h > 0

/** Overlays that are interaction hints or loading states, not part of the picture's content. */
const SKIP = '.viewport-hint, .viewport-loading, button, input, select, textarea, [data-export="skip"]'

function relative(r: DOMRect, origin: DOMRect): Box {
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height }
}

/** Collects box and text paints for an element and its descendants (HTML only; icons are skipped). */
function collect(el: Element, origin: DOMRect, opacity: number, out: Paint[]) {
  if (el instanceof SVGElement || el.matches(SKIP)) return
  const cs = getComputedStyle(el)
  if (cs.display === 'none') return
  const alpha = opacity * (Number.parseFloat(cs.opacity) || 0)
  if (alpha <= 0) return
  const shown = cs.visibility === 'visible'
  if (shown) {
    const box = relative(el.getBoundingClientRect(), origin)
    const side = (s: 'top' | 'right' | 'bottom' | 'left'): BorderSide => ({
      width: cs.getPropertyValue(`border-${s}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s}-width`)),
      color: cs.getPropertyValue(`border-${s}-color`),
      style: cs.getPropertyValue(`border-${s}-style`),
    })
    const borders = [side('top'), side('right'), side('bottom'), side('left')] as [BorderSide, BorderSide, BorderSide, BorderSide]
    const fill = transparent(cs.backgroundColor) ? null : cs.backgroundColor
    if (fill || borders.some((b) => b.width > 0 && !transparent(b.color))) {
      const r = cs.borderTopLeftRadius.endsWith('%') ? (px(cs.borderTopLeftRadius) / 100) * box.w : px(cs.borderTopLeftRadius)
      out.push({ kind: 'box', box, opacity: alpha, fill, radius: Math.min(r, box.w / 2, box.h / 2), borders })
    }
  }
  for (const node of el.childNodes) {
    if (node instanceof Element) collect(node, origin, alpha, out)
    else if (node.nodeType === Node.TEXT_NODE && shown && node.textContent?.trim()) {
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const upper = cs.textTransform === 'uppercase'
      // Word by word, so wrapped text and collapsed spaces land exactly where the browser put them.
      const text = node.textContent
      const range = document.createRange()
      for (const m of text.matchAll(/\S+/g)) {
        range.setStart(node, m.index)
        range.setEnd(node, m.index + m[0].length)
        const rect = range.getClientRects()[0]
        if (!rect) continue
        out.push({ kind: 'text', box: relative(rect, origin), opacity: alpha, text: upper ? m[0].toUpperCase() : m[0], font, color: cs.color, letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing })
      }
    }
  }
}

/** The overlay items of a 3D viewport: each scene label, plus each badge or legend. */
function overlayItems(viewport: Element, canvas: HTMLCanvasElement): Element[] {
  const items: Element[] = []
  for (const child of viewport.children) {
    if (child.contains(canvas) || child.matches(SKIP)) continue
    if (child.classList.contains('label-layer')) items.push(...child.children)
    else items.push(child)
  }
  return items
}

interface StageSnapshot {
  picture: CanvasImageSource
  width: number
  height: number
  paints: Paint[]
  annotations: Annotation[]
}

/**
 * Captures the visual and its overlays in one synchronous step (no frame can render in between),
 * so labels stay aligned with the captured camera.
 */
export function snapshotStage(visual: HTMLCanvasElement | SVGSVGElement): StageSnapshot | Promise<StageSnapshot> {
  const rect = visual.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (visual instanceof SVGSVGElement) {
    // SVG labs draw their labels as SVG text, which the serialized copy keeps.
    const clone = visual.cloneNode(true) as SVGSVGElement
    inlineStyles(visual, clone)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(width))
    clone.setAttribute('height', String(height))
    const text = new XMLSerializer().serializeToString(clone)
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
    const svgText = [...visual.querySelectorAll('text')].map((t) => t.textContent?.trim()).filter(Boolean).join(' · ')
    return loadImage(url)
      .then((img) => ({ picture: img, width, height, paints: [], annotations: svgText ? [{ text: svgText, box: { x: 0, y: 0, w: width, h: height } }] : [] }))
      .finally(() => URL.revokeObjectURL(url))
  }
  // Copy the pixels now: the WebGL canvas keeps its drawing buffer (all 3D views set it), but
  // the next frame would replace it.
  const copy = document.createElement('canvas')
  copy.width = visual.width
  copy.height = visual.height
  const cctx = copy.getContext('2d')
  if (!cctx) throw new ExportError('This browser cannot create images.')
  try {
    cctx.drawImage(visual, 0, 0)
  } catch {
    throw new ExportError('The picture could not be copied into the image.')
  }
  const paints: Paint[] = []
  const annotations: Annotation[] = []
  const viewport = visual.closest('.viewport')
  if (viewport) {
    for (const item of overlayItems(viewport, visual)) {
      if (getComputedStyle(item).visibility !== 'visible') continue
      const box = relative(item.getBoundingClientRect(), rect)
      if (!intersects(box, width, height)) continue
      const before = paints.length
      collect(item, rect, 1, paints)
      if (paints.length === before) continue
      const text = (item instanceof HTMLElement ? item.innerText : item.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text) annotations.push({ text, box })
    }
  }
  return { picture: copy, width, height, paints, annotations }
}

function dash(style: string, width: number): number[] {
  if (style === 'dashed') return [width * 3, width * 2]
  if (style === 'dotted') return [width, width]
  return []
}

function drawPaints(ctx: CanvasRenderingContext2D, paints: readonly Paint[]) {
  for (const p of paints) {
    ctx.save()
    ctx.globalAlpha = p.opacity
    const { x, y, w, h } = p.box
    if (p.kind === 'box') {
      if (p.fill) {
        ctx.fillStyle = p.fill
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, p.radius)
        ctx.fill()
      }
      const [top, right, bottom, left] = p.borders
      const uniform = p.borders.every((b) => b.width === top.width && b.color === top.color && b.style === top.style)
      if (uniform && top.width > 0) {
        ctx.strokeStyle = top.color
        ctx.lineWidth = top.width
        ctx.setLineDash(dash(top.style, top.width))
        ctx.beginPath()
        ctx.roundRect(x + top.width / 2, y + top.width / 2, w - top.width, h - top.width, Math.max(0, p.radius - top.width / 2))
        ctx.stroke()
      } else {
        const sides: [BorderSide, number, number, number, number][] = [
          [top, x, y + top.width / 2, x + w, y + top.width / 2],
          [right, x + w - right.width / 2, y, x + w - right.width / 2, y + h],
          [bottom, x, y + h - bottom.width / 2, x + w, y + h - bottom.width / 2],
          [left, x + left.width / 2, y, x + left.width / 2, y + h],
        ]
        for (const [b, x1, y1, x2, y2] of sides) {
          if (b.width <= 0 || transparent(b.color)) continue
          ctx.strokeStyle = b.color
          ctx.lineWidth = b.width
          ctx.setLineDash(dash(b.style, b.width))
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()
        }
      }
    } else {
      ctx.font = p.font
      ctx.fillStyle = p.color
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = p.letterSpacing
      ctx.textBaseline = 'middle'
      ctx.fillText(p.text, x, y + h / 2)
    }
    ctx.restore()
  }
}

/* ---------- Composition ---------- */

const FONT_TITLE = '600 20px system-ui, sans-serif'
const FONT_BODY = '14px system-ui, sans-serif'
const FONT_BOLD = '600 14px system-ui, sans-serif'
const FONT_LINK = '13px ui-monospace, SFMono-Regular, Menlo, monospace'

interface Block {
  font: string
  color: 'text' | 'muted' | 'link'
  lines: string[]
  lineHeight: number
}

/** What the export drew, in image pixels: written into the PNG as text so the file describes itself. */
export interface ExportLayout {
  version: 1
  scale: number
  picture: Box
  header: string[]
  footer: string[]
  linkLines: string[]
  annotations: Annotation[]
}

const COLORS = { bg: '#0f1214', text: '#e8ecef', muted: '#a3adb5', link: '#6fe0dc' }

/** Draws the visual, its overlays and its caption, and returns a PNG blob with text metadata. */
export async function exportPng(visual: HTMLCanvasElement | SVGSVGElement, caption: ExportCaption): Promise<{ blob: Blob; layout: ExportLayout }> {
  const snap = await snapshotStage(visual)
  const { width, height } = snap
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))

  const out = document.createElement('canvas')
  const measure = out.getContext('2d')
  if (!measure) throw new ExportError('This browser cannot create images.')
  const pad = 24
  const textWidth = Math.max(40, width - 2 * pad)
  const block = (font: string, color: Block['color'], text: string, lineHeight = 20): Block => {
    measure.font = font
    return { font, color, lineHeight, lines: wrapText(text, textWidth, (s) => measure.measureText(s).width) }
  }
  const header = [block(FONT_TITLE, 'text', caption.title, 26), block(FONT_BODY, 'muted', `Restored by the link: ${caption.restored}`)]
  const footer: Block[] = []
  if (caption.annotations.length) footer.push(block(FONT_BOLD, 'text', `In this image: ${caption.annotations.join('; ')}`))
  if (caption.notRestored.length) footer.push(block(FONT_BODY, 'muted', `Not restored by the link: ${caption.notRestored.join('; ')}`))
  footer.push(block(FONT_BODY, 'muted', caption.modelLabel))
  footer.push(block(FONT_BODY, 'muted', 'Link to the restored settings:'))
  const link = block(FONT_LINK, 'link', caption.link, 18)
  footer.push(link)

  const extent = (blocks: Block[]) => blocks.reduce((n, b) => n + b.lines.length * b.lineHeight, 0)
  const top = pad + extent(header) + 8
  const total = top + height + 8 + extent(footer) + pad
  out.width = Math.round(width * scale)
  out.height = Math.round(total * scale)
  const ctx = out.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, width, total)
  ctx.textBaseline = 'top'
  const drawBlocks = (blocks: Block[], y: number) => {
    for (const b of blocks) {
      ctx.font = b.font
      ctx.fillStyle = COLORS[b.color]
      for (const l of b.lines) {
        ctx.fillText(l, pad, y)
        y += b.lineHeight
      }
    }
  }
  drawBlocks(header, pad)
  try {
    ctx.drawImage(snap.picture, 0, top, width, height)
  } catch {
    throw new ExportError('The picture could not be copied into the image.')
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, top, width, height)
  ctx.clip()
  ctx.translate(0, top)
  drawPaints(ctx, snap.paints)
  ctx.restore()
  ctx.textBaseline = 'top'
  drawBlocks(footer, top + height + 8)

  const toImage = (b: Box): Box => ({ x: Math.round(b.x * scale), y: Math.round((b.y + top) * scale), w: Math.round(b.w * scale), h: Math.round(b.h * scale) })
  const layout: ExportLayout = {
    version: 1,
    scale,
    picture: toImage({ x: 0, y: 0, w: width, h: height }),
    header: header.flatMap((b) => b.lines),
    footer: footer.flatMap((b) => b.lines),
    linkLines: link.lines,
    annotations: snap.annotations.map((a) => ({ text: a.text, box: toImage(a.box) })),
  }

  const png = await new Promise<Blob>((resolve, reject) => {
    try {
      out.toBlob((blob) => (blob ? resolve(blob) : reject(new ExportError('The browser could not encode the PNG.'))), 'image/png')
    } catch {
      reject(new ExportError('The browser refused to export this picture.'))
    }
  })
  const description = [`Restored by the link: ${caption.restored}`, ...(caption.annotations.length ? [`In this image: ${caption.annotations.join('; ')}`] : []), ...(caption.notRestored.length ? [`Not restored by the link: ${caption.notRestored.join('; ')}`] : []), caption.modelLabel].join('\n')
  const bytes = addPngText(new Uint8Array(await png.arrayBuffer()), [
    ['Title', caption.title],
    ['Description', description],
    ['Source', caption.link],
    ['Software', 'STEM Explorer'],
    ['STEM-Explorer-Layout', JSON.stringify(layout)],
  ])
  return { blob: new Blob([bytes as BlobPart], { type: 'image/png' }), layout }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  // Give the download a moment to start before releasing the data.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
