import { describe, expect, it } from 'vitest'
import { graphemes, wrapText } from './textWrap'
import { addPngText, crc32, readPngText } from './pngText'

// A monospace stand-in for canvas measureText: 7 px per grapheme.
const mono = (s: string) => graphemes(s).length * 7

describe('wrapText', () => {
  it('wraps words at spaces without exceeding the width', () => {
    const lines = wrapText('Schematic model: simplified shapes placed to show position and relationships, not to scale.', 140, mono)
    expect(lines.every((l) => mono(l) <= 140)).toBe(true)
    expect(lines.join(' ')).toBe('Schematic model: simplified shapes placed to show position and relationships, not to scale.')
  })

  it('breaks a long URL into lines that rejoin to the complete link, preferring delimiters', () => {
    const url = 'https://stem-explorer-nine.vercel.app/?atlas=left-biceps-brachii&bview=side&layers=skeletal%2Cmuscular%2Cnervous%2Ccardiovascular&region=upper-limbs#/anatomy'
    for (const width of [70, 140, 200, 312]) {
      const lines = wrapText(url, width, mono)
      expect(lines.join('')).toBe(url)
      expect(lines.every((l) => mono(l) <= width)).toBe(true)
      expect(lines.length).toBeGreaterThan(1)
    }
    // At a phone-sized width every line but the last ends at a URL delimiter or before a %-escape.
    const lines = wrapText(url, 312, mono)
    expect(lines.every((l, i) => i === lines.length - 1 || /[/?&=#,;:._~+\-)\]]$/.test(l) || lines[i + 1].startsWith('%'))).toBe(true)
  })

  it('splits an unbroken string with no delimiters at the width, keeping every character', () => {
    const s = 'x'.repeat(95)
    const lines = wrapText(s, 70, mono)
    expect(lines).toHaveLength(10)
    expect(lines.join('')).toBe(s)
  })

  it('never splits a grapheme: subscripts, combining marks and emoji stay whole', () => {
    const s = 'H₂O·CO₂·C₆H₁₂O₆·é·👩‍🔬·🇰🇬'.repeat(4)
    const lines = wrapText(s, 35, mono)
    expect(lines.join('')).toBe(s)
    for (const l of lines) expect(graphemes(l).every((g) => graphemes(s).includes(g))).toBe(true)
    expect(lines.some((l) => l.includes('👩‍🔬'))).toBe(true)
  })

  it('handles a width narrower than one character and long titles', () => {
    expect(wrapText('abc', 3, mono)).toEqual(['a', 'b', 'c'])
    const title = 'Hydrogen peroxide · ball and stick · Chemistry · '.repeat(5).trim()
    const lines = wrapText(title, 200, mono)
    expect(lines.every((l) => mono(l) <= 200)).toBe(true)
    expect(lines.join(' ')).toBe(title)
  })

  it('handles empty and whitespace-only text', () => {
    expect(wrapText('', 100, mono)).toEqual([])
    expect(wrapText('   ', 100, mono)).toEqual([])
  })
})

describe('PNG text metadata', () => {
  // A minimal valid 1×1 PNG.
  const tiny = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
    (c) => c.charCodeAt(0),
  )

  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('round-trips UTF-8 text and keeps the image chunks intact', () => {
    const out = addPngText(tiny, [
      ['Title', 'Water · H₂O — 104.5°'],
      ['Source', 'https://example.org/?molecule=water#/chemistry'],
    ])
    expect(readPngText(out)).toEqual({ Title: 'Water · H₂O — 104.5°', Source: 'https://example.org/?molecule=water#/chemistry' })
    expect(out.length).toBeGreaterThan(tiny.length)
    expect([...out.subarray(out.length - 12)]).toEqual([...tiny.subarray(tiny.length - 12)])
  })

  it('rejects non-PNG data and invalid keywords', () => {
    expect(() => addPngText(new Uint8Array(20), [['Title', 'x']])).toThrow('Not a PNG')
    expect(() => addPngText(tiny, [['', 'x']])).toThrow('Invalid PNG keyword')
  })
})
