import katex from 'katex'
import 'katex/dist/katex.min.css'
import { memo } from 'react'
import { mathSegments } from '../../reference/mathText'

/*
 * KaTeX output includes MathML (read by screen readers) alongside the visual HTML, which is hidden
 * from assistive technology. Rendering errors show the source text instead of breaking the page.
 */
export const Tex = memo(function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  let html: string
  try {
    html = katex.renderToString(tex, { displayMode: display, output: 'htmlAndMathml', throwOnError: true })
  } catch {
    return <code className="tex-fallback">{tex}</code>
  }
  // KaTeX escapes its input; the string is generated markup, not user content.
  return <span className={display ? 'tex tex-display' : 'tex'} dangerouslySetInnerHTML={{ __html: html }} />
})

/** Text with inline $…$ math. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {mathSegments(text).map((s, i) => (s.math ? <Tex key={i} tex={s.text} /> : <span key={i}>{s.text}</span>))}
    </>
  )
}
