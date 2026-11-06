/**
 * Compares two folders of design screenshots (before = main, after = the pull request) and writes
 * a visual report: index.html with before / after / highlighted changes for every page and size,
 * and summary.md for the GitHub job summary.
 *
 *   node scripts/design-compare.ts <before-dir> <after-dir> <report-dir>
 *
 * Runs on Node 24 directly (TypeScript type stripping), with no extra packages.
 */
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { crc32, deflateSync } from 'node:zlib'
import { decodePng, type Png } from '../e2e/png.ts'

/** A pixel counts as changed when its colour moved by more than this (sum over R, G, B). */
const PIXEL_TOLERANCE = 24
/** A picture counts as changed when more than this share of its pixels changed. */
const CHANGED_SHARE = 0.001

export interface Comparison {
  file: string
  status: 'same' | 'changed' | 'new' | 'removed'
  changedShare: number
}

function encodePng({ width, height, rgba }: Png): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(data.length, 0)
    head.write(type, 4, 'latin1')
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0)
    return Buffer.concat([head, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

/** Share of changed pixels, and a picture of `after` with changes in magenta and the rest faded. */
export function diff(before: Png, after: Png): { share: number; picture: Png } {
  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)
  const out = new Uint8Array(width * height * 4)
  let changed = 0
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const inBefore = x < before.width && y < before.height
      const inAfter = x < after.width && y < after.height
      const a = inAfter ? after.rgba.subarray((y * after.width + x) * 4) : null
      const b = inBefore ? before.rgba.subarray((y * before.width + x) * 4) : null
      const moved = !a || !b || Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > PIXEL_TOLERANCE
      if (moved) {
        changed++
        out.set([236, 0, 140, 255], o)
      } else {
        const grey = (a![0] + a![1] + a![2]) / 3
        const v = Math.round(255 - (255 - grey) * 0.25)
        out.set([v, v, v, 255], o)
      }
    }
  return { share: changed / (width * height), picture: { width, height, rgba: out } }
}

export async function compare(beforeDir: string, afterDir: string, reportDir: string): Promise<Comparison[]> {
  const list = async (dir: string) => (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith('.png'))
  const [before, after] = [new Set(await list(beforeDir)), new Set(await list(afterDir))]
  const files = [...new Set([...before, ...after])].sort()
  for (const sub of ['before', 'after', 'diff']) await mkdir(join(reportDir, sub), { recursive: true })

  const results: Comparison[] = []
  for (const file of files) {
    if (before.has(file)) await copyFile(join(beforeDir, file), join(reportDir, 'before', file))
    if (after.has(file)) await copyFile(join(afterDir, file), join(reportDir, 'after', file))
    if (!before.has(file) || !after.has(file)) {
      results.push({ file, status: before.has(file) ? 'removed' : 'new', changedShare: 1 })
      continue
    }
    const { share, picture } = diff(decodePng(await readFile(join(beforeDir, file))), decodePng(await readFile(join(afterDir, file))))
    const status = share > CHANGED_SHARE ? 'changed' : 'same'
    if (status === 'changed') await writeFile(join(reportDir, 'diff', file), encodePng(picture))
    results.push({ file, status, changedShare: share })
  }
  await writeFile(join(reportDir, 'index.html'), html(results))
  await writeFile(join(reportDir, 'summary.md'), markdown(results))
  await writeFile(join(reportDir, 'results.json'), JSON.stringify(results, null, 2))
  return results
}

const title = (file: string) => {
  const [page, size] = file.replace(/\.png$/, '').split('--')
  return `${page.replace(/-/g, ' ')} · ${size}`
}
const percent = (share: number) => `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function markdown(results: Comparison[]): string {
  const changed = results.filter((r) => r.status !== 'same')
  const lines = ['## Design review', '']
  if (!changed.length) lines.push(`No visible design change on ${results.length} screenshots (12 pages × phone, tablet, laptop).`)
  else {
    lines.push(`**${changed.length} of ${results.length} screenshots look different from \`main\`.** Download the **design-review** artifact below and open \`index.html\` to see before, after and the changes in pink.`, '')
    lines.push('| Page · size | Change |', '| --- | --- |')
    for (const r of changed) lines.push(`| ${title(r.file)} | ${r.status === 'changed' ? `${percent(r.changedShare)} of the picture` : r.status} |`)
  }
  return lines.join('\n') + '\n'
}

export function html(results: Comparison[]): string {
  const changed = results.filter((r) => r.status !== 'same')
  const card = (r: Comparison) => {
    const img = (dir: string, label: string) => `<figure><figcaption>${label}</figcaption><a href="${dir}/${r.file}"><img loading="lazy" src="${dir}/${r.file}" alt="${escape(title(r.file))}, ${label}"></a></figure>`
    const cols = [r.status !== 'new' ? img('before', 'Before (main)') : '', r.status !== 'removed' ? img('after', 'After (this change)') : '', r.status === 'changed' ? img('diff', 'Changes in pink') : ''].join('')
    const badge = r.status === 'same' ? 'No change' : r.status === 'changed' ? `${percent(r.changedShare)} changed` : r.status === 'new' ? 'New page' : 'Removed'
    return `<section class="card is-${r.status}"><h2>${escape(title(r.file))} <span>${badge}</span></h2><div class="row">${cols}</div></section>`
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Design review</title>
<style>
:root { color-scheme: light dark; --bg: #f6f8f7; --card: #fff; --text: #13201f; --muted: #5b6866; --line: #dde4e2; --pink: #ec008c; --green: #0f7b6c; }
@media (prefers-color-scheme: dark) { :root { --bg: #101615; --card: #18201f; --text: #e8eeec; --muted: #9aa8a5; --line: #2a3533; } }
* { box-sizing: border-box; }
body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, sans-serif; }
main { max-width: 1400px; margin: 0 auto; }
h1 { margin: 0 0 4px; font-size: 1.6rem; }
p.lead { margin: 0 0 20px; color: var(--muted); }
.filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.filters button { min-height: 40px; padding: 0 16px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--text); font: inherit; cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--green); border-color: var(--green); color: #fff; }
.card { margin-bottom: 20px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
.card h2 { display: flex; gap: 10px; align-items: center; margin: 0 0 12px; font-size: 1.05rem; text-transform: capitalize; }
.card h2 span { padding: 2px 10px; border-radius: 999px; background: var(--line); font-size: 0.8rem; font-weight: 600; text-transform: none; }
.card.is-changed h2 span, .card.is-new h2 span, .card.is-removed h2 span { background: var(--pink); color: #fff; }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; align-items: start; }
figure { margin: 0; }
figcaption { margin-bottom: 6px; color: var(--muted); font-size: 0.85rem; }
img { display: block; width: 100%; max-height: 720px; object-fit: contain; object-position: top; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
body.only-changed .card.is-same { display: none; }
</style></head>
<body class="${changed.length ? 'only-changed' : ''}"><main>
<h1>Design review</h1>
<p class="lead">${changed.length ? `${changed.length} of ${results.length} screenshots look different from main.` : `No visible change on any of the ${results.length} screenshots.`} Pictures are taken with motion switched off.</p>
<div class="filters" role="group" aria-label="Show">
<button type="button" aria-pressed="${changed.length ? 'true' : 'false'}" data-only="1">Only changes (${changed.length})</button>
<button type="button" aria-pressed="${changed.length ? 'false' : 'true'}" data-only="0">All pages (${results.length})</button>
</div>
${[...changed, ...results.filter((r) => r.status === 'same')].map(card).join('\n')}
</main>
<script>
for (const b of document.querySelectorAll('.filters button')) b.addEventListener('click', () => {
  document.body.classList.toggle('only-changed', b.dataset.only === '1')
  for (const o of document.querySelectorAll('.filters button')) o.setAttribute('aria-pressed', String(o === b))
})
</script>
</body></html>
`
}

if (import.meta.main) {
  const [beforeDir, afterDir, reportDir] = process.argv.slice(2)
  if (!beforeDir || !afterDir || !reportDir) {
    console.error('Usage: node scripts/design-compare.ts <before-dir> <after-dir> <report-dir>')
    process.exit(2)
  }
  const results = await compare(beforeDir, afterDir, reportDir)
  const changed = results.filter((r) => r.status !== 'same')
  console.log(`${changed.length} of ${results.length} screenshots changed`)
  for (const r of changed) console.log(`  ${r.file}: ${r.status} ${percent(r.changedShare)}`)
}
