/// <reference types="node" />
// Node types for writing the generated manifest; this file never runs in the browser.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { ATLAS_STRUCTURES } from '../data/anatomy/atlas'
import { MOLECULES } from '../data/chemistry/molecules'
import { canonicalize } from '../lib/explorations'
import { auditLibrary } from './audit'
import { ENTRIES as ANATOMY } from './catalogs/anatomy'
import { ENTRIES as BIOLOGY } from './catalogs/biology'
import { ENTRIES as CHEMISTRY } from './catalogs/chemistry'
import { ENTRIES as MATHEMATICS } from './catalogs/mathematics'
import { ENTRIES as PHYSICS } from './catalogs/physics'
import { buildManifest } from './manifest'
import { mathSegments } from './mathText'
import { REFERENCE_SOURCE_IDS, REFERENCE_SOURCES } from './sources'
import type { ReferenceEntry } from './types'

const ALL: readonly ReferenceEntry[] = [...ANATOMY, ...CHEMISTRY, ...PHYSICS, ...MATHEMATICS, ...BIOLOGY]
const report = auditLibrary(ALL, REFERENCE_SOURCE_IDS)
const generated = (name: string) => fileURLToPath(new URL(`./generated/${name}`, import.meta.url))

describe('reference library: completeness audit', () => {
  it('every entry passes (structure only; this is not a scientific review)', () => {
    expect(report.issues).toEqual([])
  })

  it('detects each kind of problem it is meant to catch', () => {
    const good = PHYSICS[0]
    const bad: ReferenceEntry[] = [
      good,
      { ...good, title: 'Another' },
      { ...good, id: 'b', title: 'B', examples: [] },
      { ...good, id: 'c', title: 'C', related: [{ id: 'missing', why: 'x' }] },
      { ...good, id: 'd', title: 'D', sources: [{ id: 'nope' }] },
      { ...good, id: 'e', title: 'E', summary: 'Coming soon' },
      { ...good, id: 'f', title: 'F', explanation: ['Copied'], examples: [{ problem: '', steps: [], answer: '' }] },
      { ...good, id: 'g', title: 'G', explanation: ['Copied'] },
      { ...good, id: 'h', title: 'H', explanation: ['Unique h'], symbols: [] } as ReferenceEntry,
    ]
    const r = auditLibrary(bad, REFERENCE_SOURCE_IDS)
    const problems = r.issues.map((i) => `${i.id}: ${i.problem}`).join('\n')
    expect(problems).toMatch(/free-fall-position: duplicate id/)
    expect(problems).toMatch(/b: needs at least one example/)
    expect(problems).toMatch(/c: related entry "missing" does not exist/)
    expect(problems).toMatch(/d: unknown source id "nope"/)
    expect(problems).toMatch(/e: placeholder text/)
    expect(problems).toMatch(/f: empty example/)
    expect(problems).toMatch(/g: same explanation as "f"/)
    expect(problems).toMatch(/h: symbol definitions/)
    expect(r.qualifying.has('b')).toBe(false)
  })

  it('counts only qualifying entries, by subject and type', () => {
    const total = Object.values(report.counts).reduce((a, c) => a + c.total, 0)
    expect(total).toBe(report.qualifying.size)
  })
})

describe('reference library: links, sources and examples', () => {
  it('every in-app link opens a valid state', () => {
    for (const e of ALL)
      for (const l of e.links ?? []) {
        const url = new URL(l.href, 'https://x.test/')
        const subject = url.hash.replace(/^#\//, '').split('/')[0]
        expect(canonicalize(subject, Object.fromEntries(url.searchParams)), `${e.id}: ${l.href}`).not.toBeNull()
      }
  })

  it('atlas and molecule ids exist', () => {
    const atlas = new Set(ATLAS_STRUCTURES.map((s) => s.id))
    for (const e of ALL) {
      if (e.type === 'structure') for (const id of e.atlasIds ?? []) expect(atlas.has(id), `${e.id}: atlas ${id}`).toBe(true)
      if (e.type === 'substance' && e.moleculeId) expect(MOLECULES.some((m) => m.id === e.moleculeId), `${e.id}: molecule`).toBe(true)
    }
  })

  it('numerical worked examples recompute to the stated answer', () => {
    for (const e of ALL)
      for (const x of e.examples)
        if (x.check) {
          const { value, expected, relTol = 1e-3 } = x.check
          expect(Math.abs(value - expected), `${e.id}: ${x.problem}`).toBeLessThanOrEqual(relTol * Math.max(Math.abs(expected), 1e-12))
        }
  })

  it('all mathematics renders with KaTeX without errors', () => {
    const render = (tex: string, where: string) => expect(() => katex.renderToString(tex, { throwOnError: true, strict: 'error' }), where).not.toThrow()
    for (const e of ALL) {
      if (e.type === 'formula') {
        render(e.latex, `${e.id} latex`)
        for (const s of e.symbols) {
          render(s.symbol, `${e.id} symbol`)
          // Units are text with optional $…$ math; a bare backslash means unrendered LaTeX.
          for (const seg of mathSegments(s.unit)) if (seg.math) render(seg.text, `${e.id} unit`)
            else expect(seg.text, `${e.id} unit ${s.unit}`).not.toMatch(/\\/)
        }
      }
      if (e.type === 'substance') render(e.formula, `${e.id} formula`)
      if (e.type === 'process' && e.equation) render(e.equation, `${e.id} equation`)
      for (const t of [...e.explanation, ...e.conditions, ...(e.mistakes ?? []), ...e.examples.flatMap((x) => [x.problem, x.answer, ...x.steps])])
        for (const seg of mathSegments(t)) if (seg.math) render(seg.text, `${e.id} text`)
          else expect(seg.text, `${e.id}: LaTeX outside $…$`).not.toMatch(/\\[a-z]+/i)
    }
  })

  it('every source is an https page with a label', () => {
    for (const [id, s] of Object.entries(REFERENCE_SOURCES)) {
      expect(s.url, id).toMatch(/^https:\/\//)
      expect(s.label.length, id).toBeGreaterThan(5)
    }
  })
})

describe('reference library: generated manifest', () => {
  const { rows, counts } = buildManifest(ALL, report)
  const manifest = JSON.stringify(rows) + '\n'
  const countsJson = JSON.stringify(counts, null, 2) + '\n'
  if (process.env.UPDATE_REFERENCE) {
    writeFileSync(generated('manifest.json'), manifest)
    writeFileSync(generated('counts.json'), countsJson)
  }
  it('manifest.json and counts.json match the catalogs (UPDATE_REFERENCE=1 regenerates them)', () => {
    expect(readFileSync(generated('manifest.json'), 'utf8')).toBe(manifest)
    expect(readFileSync(generated('counts.json'), 'utf8')).toBe(countsJson)
  })
})
