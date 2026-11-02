import { fmt, parseNumber, problem, read, solve, type Calculator } from './types'

export const quadratic: Calculator = {
  id: 'quadratic',
  keywords: ['quadratic formula', 'roots', 'discriminant', 'vertex', 'parabola', 'solve equation'],
  subject: 'mathematics',
  title: 'Quadratic equation',
  summary: 'The roots of ax² + bx + c = 0 (real or complex), the discriminant and the vertex of the parabola.',
  formula: 'x = (−b ± √(b² − 4ac)) / 2a',
  fields: [
    { kind: 'number', id: 'a', label: 'a', initial: '1' },
    { kind: 'number', id: 'b', label: 'b', initial: '-3' },
    { kind: 'number', id: 'c', label: 'c', initial: '-10' },
  ],
  compute: (v) =>
    solve(() => {
      const a = read(v, 'a', 'a', 'nonZero')
      const b = read(v, 'b', 'b', 'any')
      const c = read(v, 'c', 'c', 'any')
      const d = b * b - 4 * a * c
      const vx = -b / (2 * a)
      const vy = c - (b * b) / (4 * a)
      const steps = [`Δ = b² − 4ac = (${fmt(b)})² − 4(${fmt(a)})(${fmt(c)}) = ${fmt(d)}`]
      let roots: string
      if (d > 0) {
        const s = Math.sqrt(d)
        const x1 = (-b + s) / (2 * a)
        const x2 = (-b - s) / (2 * a)
        roots = `x = ${fmt(Math.min(x1, x2))} or x = ${fmt(Math.max(x1, x2))}`
        steps.push(`Δ > 0: two real roots.  x = (${fmt(-b)} ± √${fmt(d)}) / ${fmt(2 * a)}`)
      } else if (d === 0) {
        roots = `x = ${fmt(vx)} (a repeated root)`
        steps.push(`Δ = 0: one repeated root.  x = −b / 2a = ${fmt(vx)}`)
      } else {
        const re = vx
        const im = Math.abs(Math.sqrt(-d) / (2 * a))
        roots = `x = ${fmt(re)} ± ${fmt(im)}i`
        steps.push(`Δ < 0: no real roots; two complex roots.  x = (${fmt(-b)} ± i√${fmt(-d)}) / ${fmt(2 * a)}`)
      }
      steps.push(`Vertex: x = −b / 2a = ${fmt(vx)};  y = c − b² / 4a = ${fmt(vy)}`)
      return {
        answers: [
          { label: 'Roots', value: roots },
          { label: 'Discriminant Δ', value: fmt(d) },
          { label: 'Vertex', value: `(${fmt(vx)}, ${fmt(vy)}), a ${a > 0 ? 'minimum' : 'maximum'}` },
        ],
        steps,
      }
    }),
  assumptions: 'Real coefficients with a ≠ 0 (with a = 0 the equation is linear). Roots are rounded to 4 significant figures.',
  sourceIds: ['alg-2-5'],
  related: { label: 'Graph it: 2D functions', href: '?msec=functions&fn=quadratic#/mathematics' },
}

/** The numbers in a list typed with commas, spaces, semicolons or new lines. */
export function parseList(text: string): number[] {
  const parts = text.split(/[\s,;]+/).filter(Boolean)
  const xs = parts.map(parseNumber)
  const bad = parts.find((_, i) => !Number.isFinite(xs[i]))
  if (bad !== undefined) problem(`“${bad}” is not a number. Separate the numbers with commas or spaces.`)
  return xs
}

export const descriptiveStats: Calculator = {
  id: 'statistics',
  keywords: ['mean', 'average', 'median', 'standard deviation', 'variance', 'range'],
  subject: 'mathematics',
  title: 'Mean, median and standard deviation',
  summary: 'Summary statistics of a data set, with both the sample and the population standard deviation.',
  formula: 'x̄ = Σx / n;  s = √(Σ(x − x̄)² / (n − 1));  σ = √(Σ(x − x̄)² / n)',
  fields: [{ kind: 'text', id: 'data', label: 'Data (separate with commas or spaces)', initial: '4, 8, 15, 16, 23, 42', hint: 'For example lab readings or test scores. Up to 1000 values.' }],
  compute: (v) =>
    solve(() => {
      const xs = parseList(v.data ?? '')
      if (xs.length === 0) problem('Enter at least one number.')
      if (xs.length > 1000) problem('Use at most 1000 values.')
      const n = xs.length
      const sum = xs.reduce((s, x) => s + x, 0)
      const mean = sum / n
      const sorted = [...xs].sort((p, q) => p - q)
      const median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      const ss = xs.reduce((s, x) => s + (x - mean) ** 2, 0)
      const sd = n > 1 ? Math.sqrt(ss / (n - 1)) : Number.NaN
      const pop = Math.sqrt(ss / n)
      const shown = (list: number[]) => (list.length > 12 ? `${list.slice(0, 12).map((x) => fmt(x, 6)).join(', ')}, … (${list.length} values)` : list.map((x) => fmt(x, 6)).join(', '))
      return {
        answers: [
          { label: 'Count n', value: String(n) },
          { label: 'Mean x̄', value: fmt(mean) },
          { label: 'Median', value: fmt(median) },
          { label: 'Sample standard deviation s', value: n > 1 ? fmt(sd) : 'needs at least 2 values' },
          { label: 'Population standard deviation σ', value: fmt(pop) },
          { label: 'Minimum, maximum, range', value: `${fmt(sorted[0])}, ${fmt(sorted[n - 1])}, ${fmt(sorted[n - 1] - sorted[0])}` },
        ],
        steps: [
          `Σx = ${fmt(sum, 6)};  x̄ = ${fmt(sum, 6)} / ${n} = ${fmt(mean)}`,
          `In order: ${shown(sorted)};  median = ${n % 2 ? 'the middle value' : 'the mean of the two middle values'} = ${fmt(median)}`,
          `Σ(x − x̄)² = ${fmt(ss)}`,
          ...(n > 1 ? [`s = √(${fmt(ss)} / ${n - 1}) = ${fmt(sd)}`] : []),
          `σ = √(${fmt(ss)} / ${n}) = ${fmt(pop)}`,
        ],
      }
    }),
  assumptions: 'Use s (divide by n − 1) when the data are a sample from a larger population, which is the usual case for lab data; use σ when the data are the whole population.',
  sourceIds: ['stat-2-5', 'stat-2-7'],
  related: { label: 'Statistics and probability', href: '?msec=statistics#/mathematics' },
}

export const vectors: Calculator = {
  id: 'vectors',
  keywords: ['dot product', 'cross product', 'scalar product', 'vector product', 'magnitude', 'angle between vectors'],
  subject: 'mathematics',
  title: 'Vectors: dot and cross product',
  summary: 'Lengths, sum, dot product, cross product and the angle between two 3D vectors.',
  formula: 'a·b = aₓbₓ + a_yb_y + a_zb_z = |a||b|cos θ;  a×b = (a_yb_z − a_zb_y, a_zbₓ − aₓb_z, aₓb_y − a_ybₓ)',
  fields: [
    { kind: 'number', id: 'ax', label: 'aₓ', initial: '1' },
    { kind: 'number', id: 'ay', label: 'a_y', initial: '2' },
    { kind: 'number', id: 'az', label: 'a_z', initial: '3' },
    { kind: 'number', id: 'bx', label: 'bₓ', initial: '4' },
    { kind: 'number', id: 'by', label: 'b_y', initial: '-1' },
    { kind: 'number', id: 'bz', label: 'b_z', initial: '0' },
  ],
  compute: (v) =>
    solve(() => {
      const a = (['x', 'y', 'z'] as const).map((c) => read(v, `a${c}`, `the ${c} component of a`, 'any'))
      const b = (['x', 'y', 'z'] as const).map((c) => read(v, `b${c}`, `the ${c} component of b`, 'any'))
      const vec = (u: number[]) => `(${u.map((x) => fmt(x)).join(', ')})`
      const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
      const la = Math.hypot(...a)
      const lb = Math.hypot(...b)
      const cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
      const angle = la > 0 && lb > 0 ? (Math.acos(Math.max(-1, Math.min(1, dot / (la * lb)))) * 180) / Math.PI : Number.NaN
      return {
        answers: [
          { label: '|a|, |b|', value: `${fmt(la)}, ${fmt(lb)}` },
          { label: 'a + b', value: vec(a.map((x, i) => x + b[i])) },
          { label: 'a · b', value: fmt(dot) },
          { label: 'a × b', value: vec(cross) },
          { label: 'Angle between a and b', value: Number.isFinite(angle) ? `${fmt(angle)}°` : 'undefined (a zero vector has no direction)' },
        ],
        steps: [
          `|a| = √(${a.map((x) => `${fmt(x)}²`).join(' + ')}) = ${fmt(la)};  |b| = √(${b.map((x) => `${fmt(x)}²`).join(' + ')}) = ${fmt(lb)}`,
          `a · b = ${a.map((x, i) => `(${fmt(x)})(${fmt(b[i])})`).join(' + ')} = ${fmt(dot)}`,
          `a × b = ${vec(cross)}`,
          ...(Number.isFinite(angle) ? [`cos θ = a·b / (|a||b|) = ${fmt(dot)} / (${fmt(la)} × ${fmt(lb)}) = ${fmt(dot / (la * lb))};  θ = ${fmt(angle)}°`] : []),
        ],
        note: dot === 0 && la > 0 && lb > 0 ? 'a · b = 0, so the vectors are perpendicular.' : undefined,
      }
    }),
  assumptions: 'Vectors in 3D Cartesian components. For 2D vectors, set the z components to 0: the cross product then points along z.',
  sourceIds: ['calc3-2-2', 'calc3-2-3', 'calc3-2-4'],
  related: { label: 'Vectors and transformations', href: '?msec=vectors#/mathematics' },
}

export const lineThroughPoints: Calculator = {
  id: 'line',
  keywords: ['slope', 'gradient', 'equation of a line', 'y = mx + b', 'distance formula', 'midpoint'],
  subject: 'mathematics',
  title: 'Line through two points',
  summary: 'The slope, the equation y = mx + b, the distance and the midpoint between two points.',
  formula: 'm = (y₂ − y₁) / (x₂ − x₁);  b = y₁ − m x₁;  d = √((x₂ − x₁)² + (y₂ − y₁)²)',
  fields: [
    { kind: 'number', id: 'x1', label: 'x₁', initial: '1' },
    { kind: 'number', id: 'y1', label: 'y₁', initial: '2' },
    { kind: 'number', id: 'x2', label: 'x₂', initial: '4' },
    { kind: 'number', id: 'y2', label: 'y₂', initial: '8' },
  ],
  compute: (v) =>
    solve(() => {
      const x1 = read(v, 'x1', 'x₁', 'any')
      const y1 = read(v, 'y1', 'y₁', 'any')
      const x2 = read(v, 'x2', 'x₂', 'any')
      const y2 = read(v, 'y2', 'y₂', 'any')
      if (x1 === x2 && y1 === y2) problem('The two points are the same, so they do not fix a line.')
      const d = Math.hypot(x2 - x1, y2 - y1)
      const mid = `(${fmt((x1 + x2) / 2)}, ${fmt((y1 + y2) / 2)})`
      if (x1 === x2) {
        return {
          answers: [
            { label: 'Slope', value: 'undefined (a vertical line)' },
            { label: 'Equation', value: `x = ${fmt(x1)}` },
            { label: 'Distance', value: fmt(d) },
            { label: 'Midpoint', value: mid },
          ],
          steps: [`x₂ − x₁ = 0, so the line is vertical: x = ${fmt(x1)}`, `d = |y₂ − y₁| = ${fmt(d)}`],
        }
      }
      const m = (y2 - y1) / (x2 - x1)
      const b = y1 - m * x1
      const eq = m === 0 ? `y = ${fmt(b)}` : b === 0 ? `y = ${fmt(m)}x` : `y = ${fmt(m)}x ${b < 0 ? '−' : '+'} ${fmt(Math.abs(b))}`
      return {
        answers: [
          { label: 'Slope m', value: fmt(m) },
          { label: 'Equation', value: eq },
          { label: 'Distance', value: fmt(d) },
          { label: 'Midpoint', value: mid },
        ],
        steps: [
          `m = (${fmt(y2)} − ${fmt(y1)}) / (${fmt(x2)} − ${fmt(x1)}) = ${fmt(y2 - y1)} / ${fmt(x2 - x1)} = ${fmt(m)}`,
          `b = y₁ − m x₁ = ${fmt(y1)} − (${fmt(m)})(${fmt(x1)}) = ${fmt(b)}`,
          `d = √((${fmt(x2 - x1)})² + (${fmt(y2 - y1)})²) = ${fmt(d)}`,
        ],
      }
    }),
  assumptions: 'Points in the plane, in Cartesian coordinates.',
  sourceIds: ['calc1-1-2'],
  related: { label: 'Graph it: 2D functions', href: '?msec=functions&fn=linear#/mathematics' },
}

export const MATHEMATICS_CALCULATORS: readonly Calculator[] = [quadratic, lineThroughPoints, descriptiveStats, vectors]
