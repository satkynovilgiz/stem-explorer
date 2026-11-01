import type { SubjectId } from '../data/subjects'
import type { EntryType, ReferenceEntry } from './types'

/*
 * Completeness audit for the reference library. It checks structure, not science: an entry that
 * passes has every required field, real examples, resolvable links and registered sources. It does
 * not show that a statement is correct; that needs a reader who checks it against the sources.
 */

export interface AuditIssue {
  id: string
  problem: string
}

export interface AuditReport {
  issues: AuditIssue[]
  /** Entries with no issues: the only ones counted or published. */
  qualifying: Set<string>
  counts: Record<SubjectId, Partial<Record<EntryType, number>> & { total: number }>
}

/** Words that mark unfinished text. Matched as whole words, case-insensitive. */
const PLACEHOLDER = /\b(todo|tbd|fixme|lorem|ipsum|placeholder|coming soon|to be written|xxx)\b|\?\?\?|\.\.\.$/i

const SUBJECTS: SubjectId[] = ['anatomy', 'chemistry', 'physics', 'mathematics', 'biology']

const textOf = (e: ReferenceEntry): string[] => {
  const out = [e.title, e.summary, ...e.explanation, ...e.conditions, ...(e.mistakes ?? []), ...(e.modelLimitations ?? [])]
  for (const x of e.examples) out.push(x.problem, x.answer, ...x.steps)
  return out
}

function requireText(issues: AuditIssue[], id: string, label: string, v: unknown) {
  if (typeof v !== 'string' || v.trim().length === 0) issues.push({ id, problem: `missing ${label}` })
}

function requireList(issues: AuditIssue[], id: string, label: string, v: unknown, min = 1) {
  if (!Array.isArray(v) || v.length < min || v.some((x) => typeof x === 'string' && x.trim() === '')) issues.push({ id, problem: `${label}: needs at least ${min} non-empty item${min === 1 ? '' : 's'}` })
}

function checkType(issues: AuditIssue[], e: ReferenceEntry) {
  const id = e.id
  switch (e.type) {
    case 'formula':
      requireText(issues, id, 'LaTeX', e.latex)
      requireText(issues, id, 'plain-text form', e.plain)
      requireText(issues, id, 'units note', e.units)
      requireList(issues, id, 'domain and conditions of use', e.domain)
      requireList(issues, id, 'symbol definitions', e.symbols)
      for (const s of e.symbols ?? []) if (!s.symbol?.trim() || !s.meaning?.trim() || !s.unit?.trim()) issues.push({ id, problem: `symbol "${s.symbol}" needs a meaning and a unit (or "dimensionless")` })
      if (!e.examples.some((x) => x.steps.length > 0)) issues.push({ id, problem: 'formula needs a worked example with steps' })
      if (e.subject === 'physics') {
        if (!e.examples.some((x) => x.check)) issues.push({ id, problem: 'physics formula needs a numerically checked example' })
        if (!e.vector) issues.push({ id, problem: 'physics formula must state vector, scalar or component form' })
        if (!e.exactness) issues.push({ id, problem: 'physics formula must state whether it is exact or an approximation' })
      }
      break
    case 'structure':
      requireText(issues, id, 'system', e.system)
      requireText(issues, id, 'location', e.location)
      requireList(issues, id, 'functions', e.functions)
      requireList(issues, id, 'relationships to nearby structures', e.neighbours)
      break
    case 'process':
      requireList(issues, id, 'ordered steps', e.steps, 2)
      requireList(issues, id, 'inputs', e.inputs)
      requireList(issues, id, 'outputs', e.outputs)
      requireText(issues, id, 'where it happens', e.where)
      for (const s of e.steps ?? []) if (!s.title?.trim() || !s.text?.trim()) issues.push({ id, problem: 'a step needs a title and text' })
      if (e.subject === 'chemistry' && !e.equation) issues.push({ id, problem: 'chemistry reaction needs a balanced equation' })
      break
    case 'substance':
      requireText(issues, id, 'formula', e.formula)
      requireText(issues, id, 'composition', e.composition)
      requireText(issues, id, 'bonding', e.bonding)
      requireText(issues, id, 'relevance', e.relevance)
      requireList(issues, id, 'properties', e.properties)
      for (const p of e.properties ?? []) if (!p.name?.trim() || !p.value?.trim()) issues.push({ id, problem: 'a property needs a name and value' })
      break
    case 'concept':
      break
    case 'worked-example':
      requireList(issues, id, 'formulas used', e.uses)
      break
  }
}

/**
 * Audits a library against a source registry. Pass every entry of every subject: related links may
 * cross subjects.
 */
export function auditLibrary(entries: readonly ReferenceEntry[], sourceIds: ReadonlySet<string>): AuditReport {
  const issues: AuditIssue[] = []
  const byId = new Map<string, ReferenceEntry>()
  for (const e of entries) {
    if (byId.has(e.id)) issues.push({ id: e.id, problem: 'duplicate id' })
    else byId.set(e.id, e)
  }
  const titles = new Map<string, string>()
  const explanations = new Map<string, string>()
  for (const e of entries) {
    const id = e.id
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) issues.push({ id, problem: 'id must be lower-case words joined by hyphens' })
    for (const [label, v] of [
      ['title', e.title],
      ['summary', e.summary],
      ['category', e.category],
      ['level', e.level],
      ['subject', e.subject],
    ] as const)
      requireText(issues, id, label, v)
    if (!SUBJECTS.includes(e.subject)) issues.push({ id, problem: `unknown subject ${e.subject}` })
    requireList(issues, id, 'explanation', e.explanation)
    requireList(issues, id, 'conditions, assumptions or limitations', e.conditions)
    requireList(issues, id, 'tags', e.tags)
    if (!Array.isArray(e.examples) || e.examples.length === 0) issues.push({ id, problem: 'needs at least one example or application' })
    for (const x of e.examples ?? []) {
      if (!x.problem?.trim() || !x.answer?.trim()) issues.push({ id, problem: 'empty example (problem and answer are required)' })
      if (x.check && !(Number.isFinite(x.check.value) && Number.isFinite(x.check.expected))) issues.push({ id, problem: 'example check is not a finite number' })
    }
    if (!Array.isArray(e.related) || e.related.length === 0) issues.push({ id, problem: 'needs at least one related entry' })
    for (const r of e.related ?? []) {
      if (!byId.has(r.id)) issues.push({ id, problem: `related entry "${r.id}" does not exist` })
      if (r.id === id) issues.push({ id, problem: 'related to itself' })
      if (!r.why?.trim()) issues.push({ id, problem: `relation to "${r.id}" needs a reason` })
    }
    for (const p of e.prerequisites ?? []) if (!byId.has(p)) issues.push({ id, problem: `prerequisite "${p}" does not exist` })
    if (e.type === 'worked-example') for (const u of e.uses ?? []) if (!byId.has(u)) issues.push({ id, problem: `uses unknown entry "${u}"` })
    if (!Array.isArray(e.sources) || e.sources.length === 0) issues.push({ id, problem: 'needs at least one source' })
    for (const s of e.sources ?? []) if (!sourceIds.has(s.id)) issues.push({ id, problem: `unknown source id "${s.id}"` })
    for (const l of e.links ?? []) if (!/^[?#]/.test(l.href)) issues.push({ id, problem: `in-app link "${l.href}" must be relative` })
    for (const t of textOf(e)) if (typeof t === 'string' && PLACEHOLDER.test(t)) issues.push({ id, problem: `placeholder text: "${t.slice(0, 60)}"` })

    // Inflation guards: the same title twice in a subject, or one explanation reused.
    const tKey = `${e.subject}:${e.title.trim().toLowerCase()}`
    if (titles.has(tKey)) issues.push({ id, problem: `same title as "${titles.get(tKey)}"` })
    else titles.set(tKey, id)
    const xKey = (e.explanation ?? []).join(' ').trim().toLowerCase()
    if (xKey && explanations.has(xKey)) issues.push({ id, problem: `same explanation as "${explanations.get(xKey)}"` })
    else if (xKey) explanations.set(xKey, id)

    checkType(issues, e)
  }
  const bad = new Set(issues.map((i) => i.id))
  const qualifying = new Set(entries.filter((e) => !bad.has(e.id)).map((e) => e.id))
  const counts = Object.fromEntries(SUBJECTS.map((s) => [s, { total: 0 }])) as AuditReport['counts']
  for (const e of entries) {
    if (!qualifying.has(e.id)) continue
    const c = counts[e.subject]
    c.total++
    c[e.type] = (c[e.type] ?? 0) + 1
  }
  return { issues, qualifying, counts }
}
