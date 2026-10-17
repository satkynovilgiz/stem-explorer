/*
 * PNG export for presentation mode. The picture is the explorer's main visual (its WebGL canvas,
 * or its largest SVG), framed with a title, the settings, the kind of model and the link that
 * reopens the same view. Nothing leaves the browser: the PNG is offered as a download.
 */

export interface ExportCaption {
  title: string
  /** Human-readable settings line. */
  settings: string
  /** What kind of picture this is, e.g. "Schematic model: simplified shapes, not to scale". */
  modelLabel: string
  /** Link that reopens the same view. */
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

async function svgImage(svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineStyles(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const text = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  try {
    return await loadImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Splits text into lines that fit `max` pixels. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Draws the visual with its caption and returns a PNG blob. */
export async function exportPng(visual: HTMLCanvasElement | SVGSVGElement, caption: ExportCaption, colors = { bg: '#0f1214', text: '#e8ecef', muted: '#a3adb5' }): Promise<Blob> {
  const rect = visual.getBoundingClientRect()
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  let picture: CanvasImageSource
  if (visual instanceof HTMLCanvasElement) {
    // A WebGL canvas reads back as blank unless it keeps its drawing buffer (all 3D views do).
    picture = visual
  } else {
    picture = await svgImage(visual, width, height)
  }

  const pad = 24
  const out = document.createElement('canvas')
  const measure = out.getContext('2d')
  if (!measure) throw new ExportError('This browser cannot create images.')
  const textWidth = width - 2 * pad
  measure.font = '600 20px system-ui, sans-serif'
  const titleLines = wrap(measure, caption.title, textWidth)
  measure.font = '14px system-ui, sans-serif'
  const settingLines = wrap(measure, caption.settings, textWidth)
  const footLines = [...wrap(measure, caption.modelLabel, textWidth), ...wrap(measure, caption.link, textWidth)]
  const header = pad + titleLines.length * 26 + settingLines.length * 20 + 8
  const footer = footLines.length * 20 + pad
  out.width = Math.round(width * scale)
  out.height = Math.round((header + height + footer) * scale)
  const ctx = out.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, width, header + height + footer)
  ctx.textBaseline = 'top'
  let y = pad
  ctx.fillStyle = colors.text
  ctx.font = '600 20px system-ui, sans-serif'
  for (const l of titleLines) {
    ctx.fillText(l, pad, y)
    y += 26
  }
  ctx.fillStyle = colors.muted
  ctx.font = '14px system-ui, sans-serif'
  for (const l of settingLines) {
    ctx.fillText(l, pad, y)
    y += 20
  }
  try {
    ctx.drawImage(picture, 0, header, width, height)
  } catch {
    throw new ExportError('The picture could not be copied into the image.')
  }
  y = header + height + 4
  for (const l of footLines) {
    ctx.fillText(l, pad, y)
    y += 20
  }
  return new Promise((resolve, reject) => {
    try {
      out.toBlob((blob) => (blob ? resolve(blob) : reject(new ExportError('The browser could not encode the PNG.'))), 'image/png')
    } catch {
      reject(new ExportError('The browser refused to export this picture.'))
    }
  })
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
