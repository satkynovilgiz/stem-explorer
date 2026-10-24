import { inflateSync } from 'node:zlib'
import type { Download, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { readPngText } from '../src/lib/pngText.ts'

/** Mirrors `Box` and `ExportLayout` in src/lib/exportImage.ts (that module is bundler-resolved). */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export interface ExportLayout {
  version: 1
  scale: number
  picture: Box
  header: string[]
  footer: string[]
  linkLines: string[]
  annotations: { text: string; box: Box }[]
}

/** A decoded 8-bit, non-interlaced PNG as RGBA pixels (enough for the app's own exports). */
export interface Png {
  width: number
  height: number
  rgba: Uint8Array
}

export function decodePng(bytes: Uint8Array): Png {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let at = 8
  let width = 0
  let height = 0
  let colorType = 0
  const idat: Uint8Array[] = []
  while (at < bytes.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8))
    const data = bytes.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit non-interlaced PNGs are supported')
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    at += 12 + length
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!channels) throw new Error(`Unsupported colour type ${colorType}`)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = new Uint8Array(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0
      const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? pixels[(y - 1) * stride + x - channels] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      pixels[y * stride + x] = v & 0xff
    }
  }
  if (channels === 4) return { width, height, rgba: pixels }
  const rgba = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) rgba.set([pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2], 255], i * 4)
  return { width, height, rgba }
}

export const pixel = (png: Png, x: number, y: number) => [...png.rgba.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)]

/** Mean absolute RGB difference between a box of `a` and the same-sized box of `b` at another origin. */
export function meanDiff(a: Png, box: Box, b: Png, bx: number, by: number): number {
  let sum = 0
  let n = 0
  for (let y = 0; y < box.h; y++)
    for (let x = 0; x < box.w; x++) {
      const p = pixel(a, box.x + x, box.y + y)
      const q = pixel(b, bx + x, by + y)
      sum += Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2])
      n += 3
    }
  return sum / n
}

export interface ExportedPng {
  png: Png
  text: Record<string, string>
  layout: ExportLayout
}

export async function readExport(download: Download): Promise<ExportedPng> {
  const bytes = new Uint8Array(await readFile((await download.path())!))
  const text = readPngText(bytes)
  return { png: decodePng(bytes), text, layout: JSON.parse(text['STEM-Explorer-Layout']) as ExportLayout }
}

/** The stage canvas's current pixels (3D views keep their drawing buffer). */
export async function canvasPixels(page: Page): Promise<Png> {
  const url = await page.evaluate(() => document.querySelector<HTMLCanvasElement>('.chem-stage canvas')!.toDataURL('image/png'))
  return decodePng(new Uint8Array(Buffer.from(url.split(',')[1], 'base64')))
}

/** Exports the current view and returns the decoded PNG with its metadata. */
export async function exportView(page: Page): Promise<ExportedPng & { filename: string }> {
  const bar = page.getByRole('toolbar', { name: 'Presentation' })
  const [download] = await Promise.all([page.waitForEvent('download'), bar.getByRole('button', { name: 'Export PNG' }).click()])
  return { ...(await readExport(download)), filename: download.suggestedFilename() }
}
