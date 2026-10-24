/*
 * PNG text metadata (iTXt chunks, UTF-8). Exports carry their caption as text so the image
 * describes itself to other tools (and to tests), not only as pixels.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const latin1 = (s: string) => Uint8Array.from(s, (ch) => ch.charCodeAt(0))

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(latin1(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/** Inserts uncompressed iTXt chunks right after IHDR. Keywords must be 1–79 Latin-1 characters. */
export function addPngText(png: Uint8Array, entries: readonly (readonly [string, string])[]): Uint8Array {
  if (!SIGNATURE.every((b, i) => png[i] === b)) throw new Error('Not a PNG')
  const ihdrEnd = 8 + 12 + new DataView(png.buffer, png.byteOffset).getUint32(8)
  const chunks = entries.map(([key, value]) => {
    if (!/^[\x20-\x7e]{1,79}$/.test(key)) throw new Error(`Invalid PNG keyword: ${key}`)
    const text = new TextEncoder().encode(value)
    // keyword \0, compression flag 0, method 0, empty language tag \0, empty translated keyword \0
    const data = new Uint8Array(key.length + 5 + text.length)
    data.set(latin1(key), 0)
    data.set(text, key.length + 5)
    return chunk('iTXt', data)
  })
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(png.length + total)
  out.set(png.subarray(0, ihdrEnd), 0)
  let at = ihdrEnd
  for (const c of chunks) {
    out.set(c, at)
    at += c.length
  }
  out.set(png.subarray(ihdrEnd), at)
  return out
}

/** Reads uncompressed iTXt chunks (keyword → text). Verifies each chunk's CRC. */
export function readPngText(png: Uint8Array): Record<string, string> {
  if (!SIGNATURE.every((b, i) => png[i] === b)) throw new Error('Not a PNG')
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const out: Record<string, string> = {}
  let at = 8
  while (at + 12 <= png.length) {
    const length = view.getUint32(at)
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8))
    const data = png.subarray(at + 8, at + 8 + length)
    if (crc32(png.subarray(at + 4, at + 8 + length)) !== view.getUint32(at + 8 + length)) throw new Error(`Bad CRC in ${type}`)
    if (type === 'iTXt') {
      const k = data.indexOf(0)
      const key = String.fromCharCode(...data.subarray(0, k))
      if (data[k + 1] === 0) {
        let p = k + 3
        p = data.indexOf(0, p) + 1 // language tag
        p = data.indexOf(0, p) + 1 // translated keyword
        out[key] = new TextDecoder().decode(data.subarray(p))
      }
    }
    if (type === 'IEND') break
    at += 12 + length
  }
  return out
}
