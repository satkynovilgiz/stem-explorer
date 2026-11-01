import type { SubjectId } from '../data/subjects'

/*
 * The reference library: one typed record per distinct, complete entry, shared by all five
 * subjects. Entry types have their own fields (a formula has symbols and units; a structure has a
 * location and relations), so no type is forced into another's shape.
 *
 * Passing the completeness audit (audit.ts) means an entry has every required field and its links
 * resolve. It does not mean a scientific statement has been reviewed by an expert.
 */

export type EntryType = 'formula' | 'concept' | 'structure' | 'process' | 'substance' | 'worked-example'

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  formula: 'Formula',
  concept: 'Concept',
  structure: 'Structure',
  process: 'Process',
  substance: 'Substance or molecule',
  'worked-example': 'Worked example',
}

/** Formula-like entries are labelled by what they are, not all called "formula". */
export type FormulaKind = 'equation' | 'definition' | 'law' | 'identity' | 'theorem' | 'approximation' | 'empirical'

export const FORMULA_KIND_LABELS: Record<FormulaKind, string> = {
  equation: 'Equation',
  definition: 'Definition',
  law: 'Physical law',
  identity: 'Identity',
  theorem: 'Theorem',
  approximation: 'Approximation',
  empirical: 'Empirical relationship',
}

export type Level = 'introductory' | 'intermediate' | 'advanced'

/** A citation: a registered source id plus where in it (section, table, example). */
export interface Citation {
  id: string
  locator?: string
}

/** A link from an entry to another, with why they are related (shown to the reader). */
export interface Relation {
  id: string
  why: string
}

/** An in-app place where the entry can be explored (relative link, e.g. "?bsec=enzymes#/biology"). */
export interface AppLink {
  label: string
  href: string
  kind: 'lab' | '3d' | 'tool'
}

/**
 * A worked example. Steps are text (LaTeX inside $…$ is rendered). `check` lets the test suite
 * recompute a numerical answer: `value` is computed in code from the example's inputs and must
 * equal `expected` (as stated in the answer) within the relative tolerance.
 */
export interface WorkedExample {
  title?: string
  problem: string
  /** Student layout: what is given, what we are finding, which relationship applies, conversions. */
  given?: string[]
  find?: string
  relationship?: string
  /** Unit conversions needed, or a sentence saying none are. */
  convert?: string
  /** Substitution and calculation, one step per item (values with units). */
  steps: string[]
  answer: string
  check?: { value: number; expected: number; relTol?: number; unit?: string }
}

interface BaseEntry {
  /** Stable id, unique across the library; never renamed (used in links and collections). */
  id: string
  type: EntryType
  subject: SubjectId
  /** Category within the subject (e.g. "Kinematics", "Skeletal system"). */
  category: string
  /** Optional finer topic within the category. */
  topic?: string
  title: string
  /** One or two sentences. */
  summary: string
  /** Well-established other names (searched; never counted as entries). */
  aliases?: string[]
  tags: string[]
  level: Level
  /** Ids of entries worth reading first. */
  prerequisites?: string[]
  /** Main explanation, one paragraph per item. */
  explanation: string[]
  /** Conditions, assumptions and limitations of the statement itself. */
  conditions: string[]
  /** At least one example or application. */
  examples: WorkedExample[]
  related: Relation[]
  sources: Citation[]
  /** How the app's model or diagram simplifies this (visualization limits). */
  modelLimitations?: string[]
  links?: AppLink[]
  /** Common mistakes or misconceptions, with the correction. */
  mistakes?: string[]
  /**
   * Student-first layout (used when present): the main idea in plain words, why it matters, and the
   * key terms defined before they are relied on. The fuller explanation moves into "More detail".
   */
  simple?: string
  why?: string
  keyTerms?: { term: string; meaning: string }[]
}

export interface SymbolDef {
  /** LaTeX for the symbol. */
  symbol: string
  meaning: string
  /** SI unit (LaTeX allowed), or "dimensionless" / "—" with a note in `meaning`. */
  unit: string
}

export interface FormulaEntry extends BaseEntry {
  type: 'formula'
  kind: FormulaKind
  /** The relationship in LaTeX (display style). */
  latex: string
  /** Plain-text form for search and for readers without math rendering, e.g. "F = m a". */
  plain: string
  symbols: SymbolDef[]
  /** Units note: SI units, alternatives, or that the quantities are dimensionless. */
  units: string
  /** Domain restrictions and conditions of use (e.g. "x > 0", "constant acceleration"). */
  domain: string[]
  /** Physics: vector or scalar form. */
  vector?: 'vector' | 'scalar' | 'component'
  /** Exact relationship, or an approximation/model. */
  exactness?: 'exact' | 'approximation' | 'definition' | 'empirical' | 'model'
  /** General form or a special case of another (name the general form in `related`). */
  scope?: 'general' | 'special-case'
  /** Instantaneous or average quantity, where the distinction matters. */
  quantity?: 'instantaneous' | 'average'
  /** Sign and coordinate conventions. */
  conventions?: string[]
}

export interface StructureEntry extends BaseEntry {
  type: 'structure'
  /** e.g. "Skeletal", "Cell" */
  system: string
  region?: string
  location: string
  functions: string[]
  /** Relationships to nearby structures. */
  neighbours: string[]
  subdivisions?: string[]
  /** Atlas structure id(s) when the body atlas draws it; absent means reference-only. */
  atlasIds?: string[]
  /** Whether a separate left/right pair exists (described once). */
  bilateral?: boolean
}

export interface ProcessStep {
  title: string
  text: string
}

export interface ProcessEntry extends BaseEntry {
  type: 'process'
  steps: ProcessStep[]
  inputs: string[]
  outputs: string[]
  /** Where it happens (cellular location, organ, environment). */
  where: string
  /** Balanced equation (chemistry), LaTeX. */
  equation?: string
  /** Chemistry reaction type, e.g. "Combustion". */
  reactionType?: string
  /** Conditions and states, where known. */
  reactionConditions?: string
  /** Whether the app's diagram is conceptual or a quantitative simulation. */
  diagram?: 'conceptual' | 'quantitative'
}

export interface Property {
  name: string
  value: string
  /** Conditions under which the value holds (temperature, pressure, phase). */
  conditions?: string
}

export interface SubstanceEntry extends BaseEntry {
  type: 'substance'
  /** Molecular or empirical formula (LaTeX). */
  formula: string
  composition: string
  bonding: string
  geometry?: string
  properties: Property[]
  relevance: string
  /** Molecule-viewer id when the 3D viewer has it. */
  moleculeId?: string
}

export interface ConceptEntry extends BaseEntry {
  type: 'concept'
  /** Where it occurs or applies. */
  where?: string
  /** Key terms with short meanings. */
  terms?: { term: string; meaning: string }[]
}

export interface WorkedExampleEntry extends BaseEntry {
  type: 'worked-example'
  /** The formula entries the example uses. */
  uses: string[]
}

export type ReferenceEntry = FormulaEntry | StructureEntry | ProcessEntry | SubstanceEntry | ConceptEntry | WorkedExampleEntry

/** A lightweight row of the search manifest, loaded without the full catalogs. */
export interface ManifestRow {
  id: string
  type: EntryType
  subject: SubjectId
  category: string
  title: string
  summary: string
  /** Aliases, symbols, plain formulas and tags, for search. */
  terms: string[]
  /** Formula kind label for formula entries. */
  kind?: FormulaKind
  /** Has an in-app lab, 3D view or tool link. */
  interactive?: AppLink['kind'][]
}

/** Canonical route of an entry. */
export const entryHref = (e: { id: string; subject: SubjectId }) => `#/reference/${e.subject}/${e.id}`
