/*
 * Line wrapping for exported captions. Words wrap at spaces; a single string wider than a line
 * (a URL, a long formula) is broken inside, preferably after a URL delimiter, never mid-grapheme.
 * No characters are dropped: for an unbroken string, joining its lines gives the string back.
 */

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

/** User-perceived characters, so emoji, flags and combining marks are never split. */
export function graphemes(s: string): string[] {
  return segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s)
}

/** Characters after which a long string may break (URL structure and list punctuation); it may also break before a %-escape. */
const BREAK_AFTER = /^[/?&=#,;:._~+\-)\]]$/

function breakLong(word: string, max: number, measure: (s: string) => number): string[] {
  const g = graphemes(word)
  const out: string[] = []
  let start = 0
  while (start < g.length) {
    // The longest run that fits, but always at least one grapheme so the loop ends.
    let end = start + 1
    while (end < g.length && measure(g.slice(start, end + 1).join('')) <= max) end++
    if (end < g.length) {
      // Prefer the last delimiter in the back two-thirds of the line, so lines are not tiny.
      for (let k = end; k > start + Math.max(1, Math.floor((end - start) / 3)); k--) {
        if (BREAK_AFTER.test(g[k - 1]) || g[k] === '%') {
          end = k
          break
        }
      }
    }
    out.push(g.slice(start, end).join(''))
    start = end
  }
  return out
}

/** Splits text into lines no wider than `max` (as reported by `measure`). Runs of whitespace become one space. */
export function wrapText(text: string, max: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate) <= max) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    line = ''
    if (measure(word) <= max) {
      line = word
      continue
    }
    const pieces = breakLong(word, max, measure)
    lines.push(...pieces.slice(0, -1))
    line = pieces[pieces.length - 1]
  }
  if (line) lines.push(line)
  return lines
}
