import { normalize } from './chemistry'

/*
 * Deterministic matching of what students type, shared by every search. A question is reduced to
 * its content words: question words are dropped, plurals are singular, and a few common forms map
 * to the words the content uses ("add" also finds "sum"). No fuzzy rewriting: a query is never
 * silently changed into a different one.
 *
 * The whole typed query is always tried first, so symbols and short terms such as "I", "He" and
 * "pH" survive even though some look like ordinary words.
 */

/** Words that say what kind of question it is, not what it is about. */
const STOP = new Set([
  'what', 'whats', 'where', 'wheres', 'when', 'which', 'who', 'why', 'how', 'is', 'are', 'was', 'were', 'be', 'it', 'its', 'a', 'an', 'the', 'do', 'does', 'did',
  'i', 'we', 'you', 'my', 'me', 'our', 'to', 'of', 'in', 'on', 'at', 'for', 'from', 'by', 'can', 'could', 'should', 'would', 'will', 'much', 'many', 'and', 'or', 'with',
  'about', 'please', 'explain', 'tell', 'show', 'mean', 'means', 'meaning', 'find', 'calculate', 'calculating', 'compute', 'work', 'out', 'make', 'get', 'use', 'using', 'happen', 'happens',
  'that', 'this', 'there', 'they', 'them', 'one', 'two',
])

/** Singular form: "moles" → "mole", "molecules" → "molecule", "boxes" → "box", "properties" → "property". */
export const stem = (w: string) =>
  w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 4 && /(ch|sh|x|z|ss)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w

/** Other forms of a word that the content may use. Compared after `stem`. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  add: ['sum', 'addition', 'adding'],
  adding: ['add', 'sum', 'addition'],
  dilute: ['dilution'],
  diluting: ['dilution', 'dilute'],
  balance: ['balancing', 'balanced'],
  balancing: ['balance', 'balanced'],
  breathe: ['breathing', 'ventilation'],
  breath: ['breathing'],
  concentrated: ['concentration'],
  bend: ['bent'],
  bending: ['bent'],
  multiply: ['multiplication', 'product'],
  subtract: ['subtraction', 'difference'],
}

/** All words of a text, lower case, keeping digits and the "/" and "=" of formulas. */
export const words = (s: string) => normalize(s).replace(/(?<!\d)\.|\.(?!\d)|[^\p{L}\p{N}/=.]+/gu, ' ').trim().split(/\s+/).filter(Boolean)
/** A formula with its spacing and multiplication signs removed. */
export const squash = (s: string) => normalize(s).replace(/[\s·×*()]/g, '')
/** The words that say what a question is about, singular. */
export const contentWords = (s: string) => words(s).filter((w) => !STOP.has(w)).map(stem)
/** A question reduced to its subject: "where is the kidney" → "kidney"; "" when nothing is left. */
export const queryCore = (s: string) => contentWords(s).join(' ')

/** Words that must match whole: "mole" is not the start of "molecule". */
const WHOLE_WORD = new Set(['mole', 'moles', 'mol'])

const hasWordAt = (text: string, q: string, wholeWord: boolean) => {
  let i = text.indexOf(q)
  while (i !== -1) {
    const startsWord = i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1])
    const end = text[i + q.length]
    if (startsWord && (!wholeWord || !end || !/[\p{L}\p{N}]/u.test(end))) return true
    i = text.indexOf(q, i + 1)
  }
  return false
}

/**
 * Whether normalized `text` contains normalized `q` in a meaningful place. Up to three characters
 * must begin a word, so "ion" does not match "motion" and "ph" does not match "sphere".
 */
export function containsTerm(text: string, q: string): boolean {
  if (WHOLE_WORD.has(q)) return hasWordAt(text, q, true)
  if (q.length <= 3) return hasWordAt(text, q, false)
  return text.includes(q)
}

/** `text.startsWith(q)`, except that "mole" does not start "molecule". */
export function startsWithTerm(text: string, q: string): boolean {
  if (!text.startsWith(q)) return false
  return !WHOLE_WORD.has(q) || !/[\p{L}\p{N}]/u.test(text[q.length] ?? '')
}

export interface WordFields {
  name: string
  terms?: readonly string[]
  description?: string
}

const WORD_CACHE = new WeakMap<WordFields, { name: Set<string>; terms: Set<string>; description: Set<string> }>()
const stemmedSet = (s: string) => new Set(words(s).map(stem))
function tokens(f: WordFields) {
  let t = WORD_CACHE.get(f)
  if (!t) {
    t = { name: stemmedSet(f.name), terms: stemmedSet((f.terms ?? []).join(' ')), description: stemmedSet(f.description ?? '') }
    WORD_CACHE.set(f, t)
  }
  return t
}

const forms = (w: string) => [w, ...(ALIASES[w] ?? []).map(stem)]

/**
 * How well a question's content words match, from 0 to 1. A word counts more in the name than in
 * the terms, and little in the description. A word in the name is enough. Otherwise the text must
 * cover at least half of the question with a word beyond the description, so a stray word cannot
 * produce a result.
 */
export function wordScore(question: string, f: WordFields): number {
  const q = contentWords(question)
  if (q.length === 0) return 0
  const t = tokens(f)
  let total = 0
  let covered = 0
  let strong = false
  let named = false
  for (const w of q) {
    const all = forms(w)
    const weight = all.some((x) => t.name.has(x)) ? 1 : all.some((x) => t.terms.has(x)) ? 0.7 : all.some((x) => t.description.has(x)) ? 0.25 : 0
    if (weight) covered++
    if (weight >= 0.7) strong = true
    if (weight === 1) named = true
    total += weight
  }
  if (!named && (!strong || covered * 2 < q.length)) return 0
  return total / q.length
}

function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]
}

/**
 * Spelling suggestions for a query with no results, offered for the student to choose: never
 * applied on their own. The closest words from `vocabulary`, nearest first.
 */
export function spellingSuggestions(query: string, vocabulary: readonly string[], limit = 3): string[] {
  const q = contentWords(query)
  if (q.length === 0) return []
  const word = q.reduce((a, b) => (b.length > a.length ? b : a))
  if (word.length < 4) return []
  const seen = new Set<string>()
  return vocabulary
    .map((text) => text.toLowerCase())
    .filter((v) => (seen.has(v) ? false : (seen.add(v), v.length >= 4)))
    .map((v) => ({ v, d: editDistance(word, v) }))
    .filter((x) => x.d > 0 && x.d <= (word.length > 7 ? 3 : 2))
    .sort((a, b) => a.d - b.d || a.v.localeCompare(b.v))
    .slice(0, limit)
    .map((x) => x.v)
}
