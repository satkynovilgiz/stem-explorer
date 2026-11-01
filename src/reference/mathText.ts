/** Splits text with inline LaTeX ($…$) into plain and math segments. A "\$" is a literal dollar. */
export function mathSegments(text: string): { math: boolean; text: string }[] {
  const out: { math: boolean; text: string }[] = []
  const re = /(?<!\\)\$(.+?)(?<!\\)\$/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ math: false, text: text.slice(last, m.index).replace(/\\\$/g, '$') })
    out.push({ math: true, text: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ math: false, text: text.slice(last).replace(/\\\$/g, '$') })
  return out
}
